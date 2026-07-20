<?php

namespace App\Services;

use App\Enums\ConfidenceFeedback;
use App\Enums\RecommendationReasonCode;
use App\Enums\RecommendationStatus;
use App\Enums\RecommendationType;
use App\Enums\UserSessionStatus;
use App\Models\MemorisationProgress;
use App\Models\SessionRecommendation;
use App\Models\User;
use App\Models\UserLastPosition;
use App\Models\UserSession;
use App\Support\AyahWorkload;
use App\Support\QuranMetadata;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Personalised next-session recommender for Qur'an learning.
 *
 * Priority order after a genuine completion:
 * 1. Explicit confidence / AI Recite feedback when provided
 * 2. Hard revision for clear weakness
 * 3. Continue to the next valid range (or surah/plan complete states)
 *
 * Paused unfinished sessions never generate completion recommendations here —
 * resume remains the responsibility of SessionLifecycleService.
 */
class NextSessionRecommendationService
{
    /** Fallback ayah count when workload metadata is unavailable. */
    private const DEFAULT_SESSION_SIZE = 4;

    private const MIN_SESSION_SIZE = 1;

    /** Explicit weakness only — low mastery alone is normal after a first pass. */
    private const HARD_WEAK_MASTERY_THRESHOLD = 25;

    private const REVISION_ESCAPE_AFTER_ACCEPTS = 1;

    public function __construct(
        private readonly RepeatAdaptationService $adaptation,
        private readonly SessionLifecycleService $lifecycle,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function recommend(User $user, ?UserSession $sourceSession = null): array
    {
        $session = $sourceSession ?: $this->latestSession($user);
        $context = $this->buildContext($user, $session);

        $payload = $this->resolveRecommendation($user, $context);
        $payload = $this->attachSettings($payload, $context);
        $payload['technique'] = $this->techniquePayload($payload);
        $record = $this->persistRecommendation($user, $session, $payload);

        $payload['id'] = $record?->id;
        $payload['source_session_id'] = $session?->id;
        $payload['status'] = $record?->status instanceof RecommendationStatus
            ? $record->status->value
            : ($record?->status ?? RecommendationStatus::Generated->value);

        return $payload;
    }

    /**
     * Generate (or reuse) the recommendation tied to a completed session.
     * Safe to call repeatedly — never creates duplicate open recommendations.
     *
     * @return array<string, mixed>|null
     */
    public function recommendForCompletedSession(User $user, UserSession $session): ?array
    {
        if ($session->user_id !== $user->id) {
            abort(403);
        }

        if ($this->lifecycle->isUnfinished($session)) {
            return null;
        }

        $existing = SessionRecommendation::query()
            ->where('user_id', $user->id)
            ->where('source_session_id', $session->id)
            ->whereIn('status', [
                RecommendationStatus::Generated->value,
                RecommendationStatus::Accepted->value,
                RecommendationStatus::Started->value,
            ])
            ->latest('id')
            ->first();

        if ($existing) {
            return $this->payloadFromRecord($existing);
        }

        try {
            return $this->recommend($user, $session);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array{recommendation: array, session: UserSession}
     */
    public function acceptAndStart(User $user, SessionRecommendation $recommendation, array $overrides = []): array
    {
        $recommendation = $this->resolveMutableRecommendation($user, $recommendation);

        if ($recommendation->user_id !== $user->id) {
            abort(403);
        }

        $status = RecommendationStatus::tryFrom((string) ($recommendation->status?->value ?? $recommendation->status))
            ?? ($recommendation->accepted === true ? RecommendationStatus::Started : RecommendationStatus::Generated);

        if (in_array($status, [RecommendationStatus::Dismissed, RecommendationStatus::Superseded], true)) {
            throw ValidationException::withMessages([
                'recommendation' => ['This recommendation is no longer available.'],
            ]);
        }

        // Idempotent: already accepted and session started.
        if ($recommendation->started_session_id) {
            $existing = UserSession::query()->find($recommendation->started_session_id);
            if ($existing && $existing->user_id === $user->id) {
                return [
                    'recommendation' => $this->payloadFromRecord($recommendation),
                    'session' => $existing,
                ];
            }
        }

        if ($overrides !== []) {
            $this->saveSettingsOverrides($user, $recommendation, $overrides);
            $recommendation->refresh();
        }

        $settings = $this->resolvedSettings($recommendation);
        $payload = is_array($recommendation->payload) ? $recommendation->payload : [];
        $surah = (int) ($recommendation->surah_number ?? ($payload['surah']['id'] ?? 0));
        $from = (int) ($recommendation->ayah_start ?? ($payload['ayah_range']['from'] ?? 1));
        $to = (int) ($recommendation->ayah_end ?? ($payload['ayah_range']['to'] ?? $from));
        $mode = (string) ($recommendation->session_mode ?: ($payload['session_mode'] ?? 'new_learning'));
        $type = RecommendationType::tryFrom((string) $recommendation->recommendation_type);

        if (! $surah || ! QuranMetadata::isValidAyah($surah, $from) || ! QuranMetadata::isValidAyah($surah, $to) || $to < $from) {
            throw ValidationException::withMessages([
                'recommendation' => ['The recommended ayah range is invalid.'],
            ]);
        }

        $source = $recommendation->sourceSession;
        $attemptNumber = 1;
        $repeatedFrom = null;
        if ($type?->isRepeat() && $source) {
            $repeatedFrom = $source->id;
            $attemptNumber = max(1, (int) ($source->attempt_number ?? 1)) + 1;
        }

        $idempotencyKey = 'rec-'.$recommendation->id.'-start';

        $session = $this->lifecycle->start($user, [
            'surah_number' => $surah,
            'ayah_number' => $from,
            'current_step' => 0,
            'memorisation_mode' => $mode === 'revision' ? 'revision' : ($payload['memorisation_mode'] ?? 'advanced'),
            'repetitions_completed' => 0,
            'session_duration_seconds' => 0,
            'repeated_from_session_id' => $repeatedFrom,
            'attempt_number' => $attemptNumber,
            'recommendation_id' => $recommendation->id,
            'recommendation_source' => $type?->value,
            'start_idempotency_key' => $idempotencyKey,
            'metadata' => [
                'active' => true,
                'completed' => false,
                'mode' => $mode === 'revision' ? 'revision' : ($payload['memorisation_mode'] ?? 'advanced'),
                'config' => [
                    'chapterId' => $surah,
                    'rangeStart' => $from,
                    'rangeEnd' => $to,
                    'reciterId' => $settings['reciter'] ?? null,
                    'playbackSpeed' => $settings['playback_speed'] ?? 1,
                    'repetitionsPerStep' => $settings['repetitions'] ?? 3,
                    'ayatPerStep' => $settings['ayat_per_step'] ?? null,
                    'technique' => $settings['technique'] ?? null,
                    'focusModeEnabled' => (bool) ($settings['focus_enabled'] ?? false),
                    'blurModeEnabled' => (bool) ($settings['blur_enabled'] ?? false),
                    'talqinModeEnabled' => (bool) ($settings['talqin_enabled'] ?? ($settings['technique'] ?? '') === 'talqin'),
                ],
                'recommendation' => [
                    'id' => $recommendation->id,
                    'type' => $recommendation->recommendation_type,
                    'reason_code' => $recommendation->reason_code,
                    'session_mode' => $mode,
                ],
                'settings' => $settings,
                'queue' => $this->buildQueueKeys($surah, $from, $to),
                'updated_at' => now()->toIso8601String(),
                'started_at' => now()->toIso8601String(),
            ],
        ]);

        UserLastPosition::updateOrCreate(
            ['user_id' => $user->id],
            [
                'surah_number' => $surah ?: null,
                'ayah_number' => $from ?: null,
                'last_step' => 0,
                'last_opened_at' => now(),
                'metadata' => [
                    'source' => 'recommendation',
                    'recommendation_id' => $recommendation->id,
                    'rangeStart' => $from,
                    'rangeEnd' => $to,
                    'session_mode' => $mode,
                    'type' => $type?->value,
                    'settings' => $settings,
                ],
            ]
        );

        $recommendation->forceFill([
            'accepted' => true,
            'chose_other' => false,
            'accepted_at' => $recommendation->accepted_at ?: now(),
            'rejected_at' => null,
            'started_session_id' => $session->id,
            'status' => RecommendationStatus::Started->value,
            'recommended_technique' => $settings['technique'] ?? $recommendation->recommended_technique,
            'recommended_reciter' => $settings['reciter'] ?? $recommendation->recommended_reciter,
            'recommended_playback_speed' => $settings['playback_speed'] ?? $recommendation->recommended_playback_speed,
            'recommended_repetitions' => $settings['repetitions'] ?? $recommendation->recommended_repetitions,
            'recommended_ayat_per_step' => $settings['ayat_per_step'] ?? $recommendation->recommended_ayat_per_step,
        ])->save();

        return [
            'recommendation' => $this->payloadFromRecord($recommendation->fresh()),
            'session' => $session,
        ];
    }

    public function reject(User $user, SessionRecommendation $recommendation, bool $choseOther = true): SessionRecommendation
    {
        if ($recommendation->user_id !== $user->id) {
            abort(403);
        }

        if ($recommendation->accepted === true || $recommendation->status === RecommendationStatus::Started) {
            return $recommendation;
        }

        $recommendation->forceFill([
            'accepted' => false,
            'chose_other' => $choseOther,
            'rejected_at' => now(),
            'status' => RecommendationStatus::Dismissed->value,
        ])->save();

        return $recommendation;
    }

    /**
     * Prefer the latest open recommendation for the same completed session when
     * the client still holds a superseded / dismissed id after a confidence or
     * AI Recite update.
     */
    private function resolveMutableRecommendation(User $user, SessionRecommendation $recommendation): SessionRecommendation
    {
        if ($recommendation->user_id !== $user->id) {
            abort(403);
        }

        $status = RecommendationStatus::tryFrom((string) ($recommendation->status?->value ?? $recommendation->status))
            ?? RecommendationStatus::Generated;

        if ($status->isOpen() || $status === RecommendationStatus::Accepted) {
            return $recommendation;
        }

        if (! $recommendation->source_session_id) {
            return $recommendation;
        }

        $latestOpen = SessionRecommendation::query()
            ->where('user_id', $user->id)
            ->where('source_session_id', $recommendation->source_session_id)
            ->whereIn('status', [
                RecommendationStatus::Generated->value,
                RecommendationStatus::Accepted->value,
            ])
            ->latest('id')
            ->first();

        return $latestOpen ?: $recommendation;
    }

    /**
     * @return array<string, mixed>
     */
    public function submitConfidence(
        User $user,
        SessionRecommendation $recommendation,
        ConfidenceFeedback $feedback,
    ): array {
        $recommendation = $this->resolveMutableRecommendation($user, $recommendation);

        $status = RecommendationStatus::tryFrom((string) ($recommendation->status?->value ?? $recommendation->status))
            ?? RecommendationStatus::Generated;

        if (! $status->isOpen() && $status !== RecommendationStatus::Accepted) {
            throw ValidationException::withMessages([
                'recommendation' => ['This recommendation can no longer be updated.'],
            ]);
        }

        // Idempotent: same confidence already applied on an open recommendation.
        if ((string) $recommendation->confidence_feedback === $feedback->value
            && $status->isOpen()) {
            return $this->payloadFromRecord($recommendation);
        }

        $recommendation->forceFill([
            'confidence_feedback' => $feedback->value,
        ])->save();

        if ($feedback === ConfidenceFeedback::NeedsPractice) {
            if ($recommendation->recommendation_type === RecommendationType::RepeatCurrentRange->value
                || $recommendation->recommendation_type === RecommendationType::Revision->value) {
                return $this->payloadFromRecord($recommendation->fresh());
            }

            return $this->supersedeWithRepeat($user, $recommendation, [
                'confidence' => $feedback->value,
            ], RecommendationReasonCode::ConfidenceNeedsPractice);
        }

        // Confident — preserve progression, or upgrade a repeat back to continue.
        $payload = $this->payloadFromRecord($recommendation);
        $type = RecommendationType::tryFrom((string) ($payload['type'] ?? ''));

        if ($type?->isRepeat()) {
            return $this->strengthenContinue($user, $recommendation, RecommendationReasonCode::ConfidenceConfident);
        }

        $payload['reason_code'] = RecommendationReasonCode::ConfidenceConfident->value;
        $payload['reason'] = $this->defaultReasonText(
            RecommendationReasonCode::ConfidenceConfident,
            $payload['ayah_range'] ?? null,
            $payload['surah'] ?? null,
            $payload['next_surah'] ?? null,
        );
        $recommendation->forceFill([
            'reason_code' => $payload['reason_code'],
            'payload' => array_merge(is_array($recommendation->payload) ? $recommendation->payload : [], $payload),
        ])->save();

        return $this->payloadFromRecord($recommendation->fresh());
    }

    /**
     * @param  array<string, mixed>  $assessment  { result: strong|mixed|weak, summary?: string, weak_ayahs?: int[] }
     * @return array<string, mixed>
     */
    public function applyAiAssessment(User $user, SessionRecommendation $recommendation, array $assessment): array
    {
        $recommendation = $this->resolveMutableRecommendation($user, $recommendation);

        $status = RecommendationStatus::tryFrom((string) ($recommendation->status?->value ?? $recommendation->status))
            ?? RecommendationStatus::Generated;

        if (! $status->isOpen() && $status !== RecommendationStatus::Accepted) {
            throw ValidationException::withMessages([
                'recommendation' => ['This recommendation can no longer be updated.'],
            ]);
        }

        $result = strtolower((string) ($assessment['result'] ?? 'mixed'));
        if (! in_array($result, ['strong', 'mixed', 'weak'], true)) {
            throw ValidationException::withMessages([
                'result' => ['AI assessment result must be strong, mixed, or weak.'],
            ]);
        }

        $recommendation->forceFill([
            'ai_assessment' => array_merge($assessment, [
                'result' => $result,
                'assessed_at' => now()->toIso8601String(),
            ]),
        ])->save();

        return match ($result) {
            'strong' => $this->strengthenContinue($user, $recommendation, RecommendationReasonCode::AiReciteStrong),
            'mixed' => $this->supersedeWithRepeat($user, $recommendation, [
                'ai_result' => 'mixed',
            ], RecommendationReasonCode::AiReciteMixed),
            default => $this->supersedeWithRepeat($user, $recommendation, [
                'ai_result' => 'weak',
            ], RecommendationReasonCode::AiReciteWeak),
        };
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    public function saveSettingsOverrides(User $user, SessionRecommendation $recommendation, array $overrides): array
    {
        $recommendation = $this->resolveMutableRecommendation($user, $recommendation);

        $status = RecommendationStatus::tryFrom((string) ($recommendation->status?->value ?? $recommendation->status))
            ?? RecommendationStatus::Generated;

        if (in_array($status, [RecommendationStatus::Dismissed, RecommendationStatus::Superseded], true)
            || ($status === RecommendationStatus::Started && $recommendation->started_session_id)) {
            throw ValidationException::withMessages([
                'recommendation' => ['Settings can no longer be changed for this recommendation.'],
            ]);
        }

        $base = $this->recommendedSettingsArray($recommendation);
        $merged = $this->adaptation->mergeOverrides($base, $overrides);

        $recommendation->forceFill([
            'settings_overrides' => $overrides,
            'recommended_technique' => $merged['technique'] ?? null,
            'recommended_reciter' => $merged['reciter'] ?? null,
            'recommended_playback_speed' => $merged['playback_speed'] ?? null,
            'recommended_repetitions' => $merged['repetitions'] ?? null,
            'recommended_ayat_per_step' => $merged['ayat_per_step'] ?? null,
        ])->save();

        $payload = $this->payloadFromRecord($recommendation->fresh());
        $payload['settings'] = $merged;
        $payload['settings_modified'] = true;
        $recommendation->forceFill([
            'payload' => array_merge(is_array($recommendation->payload) ? $recommendation->payload : [], [
                'settings' => $merged,
                'settings_modified' => true,
                'technique' => $this->techniquePayload(['settings' => $merged, 'technique' => ['id' => $merged['technique'] ?? null]]),
            ]),
        ])->save();

        return $this->payloadFromRecord($recommendation->fresh());
    }

    /**
     * @return array<string, mixed>
     */
    public function resetSettingsOverrides(User $user, SessionRecommendation $recommendation): array
    {
        if ($recommendation->user_id !== $user->id) {
            abort(403);
        }

        $recommended = is_array($recommendation->recommended_settings)
            ? $recommendation->recommended_settings
            : $this->recommendedSettingsArray($recommendation);

        $recommendation->forceFill([
            'settings_overrides' => null,
            'recommended_technique' => $recommended['technique'] ?? null,
            'recommended_reciter' => $recommended['reciter'] ?? null,
            'recommended_playback_speed' => $recommended['playback_speed'] ?? null,
            'recommended_repetitions' => $recommended['repetitions'] ?? null,
            'recommended_ayat_per_step' => $recommended['ayat_per_step'] ?? null,
        ])->save();

        $payload = is_array($recommendation->payload) ? $recommendation->payload : [];
        $payload['settings'] = $recommended;
        $payload['settings_modified'] = false;
        $payload['technique'] = $this->techniquePayload(['settings' => $recommended]);
        $recommendation->forceFill(['payload' => $payload])->save();

        return $this->payloadFromRecord($recommendation->fresh());
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    private function resolveRecommendation(User $user, array $context): array
    {
        if (! $context['surah']) {
            return $this->manualPayload(RecommendationReasonCode::ManualFallback);
        }

        // A fully completed range must advance. Never loop the same ayat by default.
        if ($context['session_completed'] && ! $context['is_end_of_surah']) {
            if ($hardRevision = $this->maybeHardRevision($user, $context)) {
                return $hardRevision;
            }

            return $this->continuePayload($context);
        }

        if ($resume = $this->maybeResumeIncomplete($context)) {
            return $resume;
        }

        if ($hardRevision = $this->maybeHardRevision($user, $context)) {
            return $hardRevision;
        }

        if ($context['is_end_of_surah']) {
            return $this->endOfSurahPayload($context);
        }

        return $this->continuePayload($context);
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>|null
     */
    private function maybeResumeIncomplete(array $context): ?array
    {
        if ($context['session_completed']) {
            return null;
        }

        $meta = $context['session_meta'];
        $active = (bool) ($meta['active'] ?? false);
        $from = $context['range_start'];
        $to = $context['range_end'];
        $covered = $context['covered_through'];

        if (! $from || ! $to || ! $context['surah']) {
            return null;
        }

        $stoppedMidRange = $covered !== null && $covered >= $from && $covered < $to;
        if (! $stoppedMidRange && ! ($active && ! $context['session_completed'])) {
            return null;
        }

        $resumeFrom = $stoppedMidRange ? max($from, (int) $covered + 1) : $from;
        if ($resumeFrom > $to) {
            return null;
        }

        return $this->buildPayload(
            type: RecommendationType::Resume,
            surah: $context['surah'],
            from: $resumeFrom,
            to: $to,
            reasonCode: RecommendationReasonCode::ResumeIncompleteSession,
            requiresConfirmation: false,
            isEndOfSurah: false,
            nextSurah: null,
            memorisationMode: $context['memorisation_mode'],
            rangeKind: 'revision',
        );
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>|null
     */
    private function maybeHardRevision(User $user, array $context): ?array
    {
        if (! $context['surah'] || ! $context['range_start'] || ! $context['range_end']) {
            return null;
        }

        if ($this->recentRevisionAcceptCount($user, (int) $context['surah']['id']) >= self::REVISION_ESCAPE_AFTER_ACCEPTS) {
            return null;
        }

        if ($this->recentlyRecommendedSameRange(
            $user,
            (int) $context['surah']['id'],
            (int) $context['range_start'],
            (int) $context['range_end'],
            [RecommendationType::Revision, RecommendationType::RepeatCurrentRange],
        )) {
            return null;
        }

        /** @var Collection<int, MemorisationProgress> $progress */
        $progress = $context['range_progress'];
        if ($progress->isEmpty()) {
            return null;
        }

        $difficult = $progress->filter(fn (MemorisationProgress $row) => $this->isExplicitlyDifficult($row));
        $rangeSize = max(1, $progress->count());
        $difficultShare = $difficult->count() / $rangeSize;

        $severe = $difficult->filter(function (MemorisationProgress $row) {
            return (int) data_get($row->metadata, 'weak_count', 0) >= 2
                || (string) data_get($row->metadata, 'engine_status', '') === 'weak';
        });

        if ($severe->isEmpty() && $difficultShare < 0.5) {
            return null;
        }

        if ($difficult->isEmpty()) {
            return null;
        }

        $ayahs = $difficult->pluck('ayah_number')->sort()->values();
        $revFrom = (int) $ayahs->first();
        $revTo = (int) min($ayahs->last(), $revFrom + self::DEFAULT_SESSION_SIZE - 1);

        $reason = $severe->isNotEmpty()
            ? RecommendationReasonCode::DifficultAyahDetected
            : RecommendationReasonCode::RevisionRequired;

        return $this->buildPayload(
            type: RecommendationType::Revision,
            surah: $context['surah'],
            from: $revFrom,
            to: $revTo,
            reasonCode: $reason,
            requiresConfirmation: true,
            isEndOfSurah: false,
            nextSurah: null,
            memorisationMode: $context['memorisation_mode'],
            rangeKind: 'revision',
        );
    }

    private function isExplicitlyDifficult(MemorisationProgress $row): bool
    {
        $weakCount = (int) data_get($row->metadata, 'weak_count', 0);
        $engineStatus = (string) data_get($row->metadata, 'engine_status', '');

        if ($engineStatus === 'weak' || $weakCount >= 2) {
            return true;
        }

        return $row->status === 'reviewing' && $row->mastery_level < self::HARD_WEAK_MASTERY_THRESHOLD;
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    private function endOfSurahPayload(array $context): array
    {
        $next = QuranMetadata::nextSurah((int) $context['surah']['id']);

        if (! $next) {
            return $this->buildPayload(
                type: RecommendationType::PlanComplete,
                surah: $context['surah'],
                from: null,
                to: null,
                reasonCode: RecommendationReasonCode::LearningPlanComplete,
                requiresConfirmation: false,
                isEndOfSurah: true,
                nextSurah: null,
                memorisationMode: $context['memorisation_mode'],
                rangeKind: null,
            );
        }

        $balanced = AyahWorkload::selectBalancedRange(
            (int) $next['id'],
            1,
            self::DEFAULT_SESSION_SIZE,
        );

        return $this->buildPayload(
            type: RecommendationType::NextSurah,
            surah: $context['surah'],
            from: null,
            to: null,
            reasonCode: RecommendationReasonCode::SurahCompleted,
            requiresConfirmation: true,
            isEndOfSurah: true,
            nextSurah: $next,
            memorisationMode: $context['memorisation_mode'],
            proposedNextRange: [
                'from' => $balanced['from'],
                'to' => $balanced['to'],
                'count' => $balanced['count'],
            ],
            rangeKind: 'new',
        );
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    private function continuePayload(array $context): array
    {
        $surah = $context['surah'];
        $ayahCount = (int) $surah['ayah_count'];
        $preferredSize = (int) ($context['preferred_session_size'] ?? self::DEFAULT_SESSION_SIZE);
        $nextFrom = max(1, (int) $context['range_end'] + 1);

        if ($nextFrom > $ayahCount) {
            return $this->endOfSurahPayload($context);
        }

        $balanced = AyahWorkload::selectBalancedRange(
            (int) $surah['id'],
            $nextFrom,
            $preferredSize,
        );

        $nextTo = (int) $balanced['to'];
        $size = (int) $balanced['count'];
        $isCompletingSurah = $nextTo >= $ayahCount;

        $strong = $context['range_was_strong'];
        $reason = $isCompletingSurah
            ? RecommendationReasonCode::CompleteRemainingAyat
            : ($strong
                ? RecommendationReasonCode::StrongPreviousPerformance
                : RecommendationReasonCode::ContinueWhileFresh);

        $type = $isCompletingSurah
            ? RecommendationType::CompleteSurah
            : RecommendationType::Continue;

        $payload = $this->buildPayload(
            type: $type,
            surah: $surah,
            from: $nextFrom,
            to: $nextTo,
            reasonCode: $reason,
            requiresConfirmation: false,
            isEndOfSurah: false,
            nextSurah: null,
            memorisationMode: $context['memorisation_mode'],
            rangeKind: 'new',
        );

        $payload['workload'] = [
            'score' => $balanced['score'],
            'word_count' => $balanced['word_count'],
            'ayah_count' => $size,
            'target_min' => $balanced['target_min'],
            'target_max' => $balanced['target_max'],
            'within_band' => $balanced['within_band'],
        ];

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    private function buildContext(User $user, ?UserSession $session): array
    {
        $meta = is_array($session?->metadata) ? $session->metadata : [];
        $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
        $completionSettings = is_array($session?->completion_settings) ? $session->completion_settings : [];

        $surahNumber = (int) ($session?->surah_number
            ?: ($config['chapterId'] ?? 0)
            ?: (UserLastPosition::query()->where('user_id', $user->id)->value('surah_number') ?: 0));

        $surah = $surahNumber ? QuranMetadata::surah($surahNumber) : null;

        $rangeStart = (int) ($config['rangeStart'] ?? 0);
        $rangeEnd = (int) ($config['rangeEnd'] ?? 0);

        if ((! $rangeStart || ! $rangeEnd) && $session?->ayah_number && $surah) {
            $rangeEnd = (int) $session->ayah_number;
            $rangeStart = max(1, $rangeEnd - self::DEFAULT_SESSION_SIZE + 1);
        }

        if ($rangeStart && $rangeEnd && $rangeEnd < $rangeStart) {
            [$rangeStart, $rangeEnd] = [$rangeEnd, $rangeStart];
        }

        $preferred = $rangeStart && $rangeEnd
            ? max(1, min(self::DEFAULT_SESSION_SIZE + 2, $rangeEnd - $rangeStart + 1))
            : self::DEFAULT_SESSION_SIZE;

        $rangeProgress = collect();
        if ($surah && $rangeStart && $rangeEnd) {
            $rangeProgress = MemorisationProgress::query()
                ->where('user_id', $user->id)
                ->where('surah_number', $surah['id'])
                ->whereBetween('ayah_number', [$rangeStart, $rangeEnd])
                ->get();
        }

        $avgMastery = $rangeProgress->avg('mastery_level');
        $rangeWasStrong = $rangeProgress->isNotEmpty()
            && $avgMastery !== null
            && $avgMastery >= 70;

        $isEndOfSurah = $surah && $rangeEnd && $rangeEnd >= (int) $surah['ayah_count'];

        $coveredThrough = null;
        if ($session?->ayah_number) {
            $coveredThrough = (int) $session->ayah_number;
        }

        $sessionCompleted = (bool) ($meta['completed'] ?? false)
            || (($meta['active'] ?? null) === false && ! empty($meta['completed_at']))
            || ($session?->status === UserSessionStatus::Completed);

        if (! $sessionCompleted && isset($meta['active']) && $meta['active'] === false && $rangeStart && $rangeEnd) {
            $coveredComplete = $coveredThrough !== null && $coveredThrough >= $rangeEnd;
            $sessionCompleted = $coveredComplete || (bool) ($meta['completed'] ?? false);
        }

        $baseSettings = [
            'technique' => $completionSettings['technique']
                ?? $config['technique']
                ?? (($config['talqinModeEnabled'] ?? false) ? 'talqin' : (($config['focusModeEnabled'] ?? false) ? 'focus' : (($config['blurModeEnabled'] ?? false) ? 'blur' : null))),
            'reciter' => $completionSettings['reciter'] ?? $config['reciterId'] ?? null,
            'playback_speed' => $completionSettings['playback_speed'] ?? $config['playbackSpeed'] ?? 1.0,
            'repetitions' => $completionSettings['repetitions'] ?? $config['repetitionsPerStep'] ?? 3,
            'ayat_per_step' => $completionSettings['ayat_per_step'] ?? $config['ayatPerStep'] ?? null,
        ];

        return [
            'session' => $session,
            'session_meta' => $meta,
            'session_completed' => $sessionCompleted,
            'surah' => $surah,
            'range_start' => $rangeStart ?: null,
            'range_end' => $rangeEnd ?: null,
            'preferred_session_size' => $preferred,
            'range_progress' => $rangeProgress,
            'range_was_strong' => $rangeWasStrong,
            'is_end_of_surah' => (bool) $isEndOfSurah,
            'covered_through' => $coveredThrough,
            'memorisation_mode' => $session?->memorisation_mode ?: ($meta['mode'] ?? 'advanced'),
            'base_settings' => $baseSettings,
            'attempt_number' => (int) ($session?->attempt_number ?? 1),
        ];
    }

    /**
     * @param  array{id: int, name: string, translated_name: string, ayah_count?: int}|null  $surah
     * @param  array{id: int, name: string, translated_name: string, ayah_count?: int}|null  $nextSurah
     * @param  array{from: int, to: int, count: int}|null  $proposedNextRange
     * @return array<string, mixed>
     */
    private function buildPayload(
        RecommendationType $type,
        ?array $surah,
        ?int $from,
        ?int $to,
        RecommendationReasonCode $reasonCode,
        bool $requiresConfirmation,
        bool $isEndOfSurah,
        ?array $nextSurah,
        ?string $memorisationMode = null,
        ?array $proposedNextRange = null,
        ?string $rangeKind = null,
    ): array {
        $sessionMode = $type->sessionMode();
        if ($type === RecommendationType::NextSurah && $nextSurah && $proposedNextRange) {
            $ayahRange = $proposedNextRange;
            $targetSurah = $nextSurah;
        } else {
            $ayahRange = ($from && $to)
                ? ['from' => $from, 'to' => $to, 'count' => max(1, $to - $from + 1)]
                : null;
            $targetSurah = $type === RecommendationType::NextSurah ? $nextSurah : $surah;
        }

        return [
            'id' => null,
            'type' => $type->value,
            'session_mode' => $sessionMode,
            'range_kind' => $rangeKind,
            'surah' => $targetSurah ? [
                'id' => $targetSurah['id'],
                'name' => $targetSurah['name'],
                'translated_name' => $targetSurah['translated_name'],
                'ayah_count' => $targetSurah['ayah_count'] ?? QuranMetadata::ayahCount($targetSurah['id']),
            ] : null,
            'completed_surah' => ($type === RecommendationType::NextSurah && $surah) ? [
                'id' => $surah['id'],
                'name' => $surah['name'],
                'translated_name' => $surah['translated_name'],
            ] : null,
            'ayah_range' => $ayahRange,
            'reason' => $this->defaultReasonText($reasonCode, $ayahRange, $surah, $nextSurah),
            'reason_code' => $reasonCode->value,
            'requires_confirmation' => $requiresConfirmation,
            'is_end_of_surah' => $isEndOfSurah,
            'next_surah' => $nextSurah ? [
                'id' => $nextSurah['id'],
                'name' => $nextSurah['name'],
                'translated_name' => $nextSurah['translated_name'],
                'ayah_count' => $nextSurah['ayah_count'] ?? null,
            ] : null,
            'confirmation' => $this->confirmationKeys($type),
            'memorisation_mode' => $memorisationMode,
            'source_session_id' => null,
            'status' => RecommendationStatus::Generated->value,
            'settings' => null,
            'settings_modified' => false,
            'adaptations' => [],
            'adaptation_explanations' => [],
            'panel_title_key' => $this->panelTitleKey($type, $rangeKind),
            'available_actions' => $this->availableActions($type, $ayahRange),
            'primary_action_label_key' => $this->primaryActionLabelKey($type, $ayahRange),
            'workload' => null,
        ];
    }

    private function panelTitleKey(RecommendationType $type, ?string $rangeKind): string
    {
        if ($type->isRepeat() || $rangeKind === 'repeated' || $rangeKind === 'revision') {
            return 'revisionSetTitle';
        }
        if ($type === RecommendationType::NextSurah || $type === RecommendationType::SurahComplete) {
            return 'nextSurahTitle';
        }

        return 'nextSetTitle';
    }

    /**
     * @param  array{from: int, to: int, count: int}|null  $range
     * @return list<string>
     */
    private function availableActions(RecommendationType $type, ?array $range): array
    {
        $actions = ['start_different_session'];
        if ($type->isRepeat()) {
            $actions[] = 'repeat_range';
        } elseif ($range && isset($range['from'], $range['to'])) {
            $actions[] = 'continue_range';
        } elseif ($type === RecommendationType::NextSurah) {
            $actions[] = 'continue_next_surah';
        }
        $actions[] = 'test_ai_recite';

        return array_values(array_unique($actions));
    }

    /**
     * @param  array{from: int, to: int, count: int}|null  $range
     */
    private function primaryActionLabelKey(RecommendationType $type, ?array $range): string
    {
        if ($type->isRepeat()) {
            return 'repeatThisSession';
        }
        if ($type === RecommendationType::NextSurah) {
            return 'continueToNextSurah';
        }
        if ($type === RecommendationType::Resume) {
            return 'startRecommendedRevision';
        }
        if ($range && isset($range['from'], $range['to'])) {
            return 'continueToAyat';
        }

        return 'startRecommendedNextSession';
    }

    /**
     * @return array<string, mixed>
     */
    private function manualPayload(RecommendationReasonCode $reasonCode): array
    {
        return $this->buildPayload(
            type: RecommendationType::ManualSelection,
            surah: null,
            from: null,
            to: null,
            reasonCode: $reasonCode,
            requiresConfirmation: false,
            isEndOfSurah: false,
            nextSurah: null,
        );
    }

    /**
     * @return array{title_key: string, primary_action_key: string, secondary_action_key: string}|null
     */
    private function confirmationKeys(RecommendationType $type): ?array
    {
        return match ($type) {
            RecommendationType::Revision, RecommendationType::RepeatCurrentRange, RecommendationType::Resume => [
                'title_key' => 'reviewAgain',
                'primary_action_key' => 'startRevision',
                'secondary_action_key' => 'chooseSomethingElse',
            ],
            RecommendationType::NextSurah => [
                'title_key' => 'continueNextSurah',
                'primary_action_key' => 'continueToNextSurah',
                'secondary_action_key' => 'chooseSomethingElse',
            ],
            RecommendationType::Continue, RecommendationType::ContinueNextRange, RecommendationType::CompleteSurah => [
                'title_key' => 'continueNextAyat',
                'primary_action_key' => 'startSession',
                'secondary_action_key' => 'chooseSomethingElse',
            ],
            default => null,
        };
    }

    /**
     * @param  array{from: int, to: int, count: int}|null  $range
     * @param  array{id: int, name: string, translated_name: string}|null  $surah
     * @param  array{id: int, name: string, translated_name: string}|null  $nextSurah
     */
    private function defaultReasonText(
        RecommendationReasonCode $code,
        ?array $range,
        ?array $surah,
        ?array $nextSurah,
    ): string {
        $count = $range['count'] ?? null;
        $surahName = $surah['name'] ?? '';
        $nextName = $nextSurah['name'] ?? '';

        return match ($code) {
            RecommendationReasonCode::StrongPreviousPerformance => 'MashaAllah — you recited well. Continue gently with the next ayat.',
            RecommendationReasonCode::ContinueCurrentSurah,
            RecommendationReasonCode::ContinueWhileFresh => 'This continues directly from the range you completed while it is still fresh.',
            RecommendationReasonCode::RevisionRequired,
            RecommendationReasonCode::NeedsMorePractice,
            RecommendationReasonCode::ConfidenceNeedsPractice => 'We recommend repeating this range with additional guidance so the sequence becomes more familiar and easier to recall.',
            RecommendationReasonCode::DifficultAyahDetected => 'One ayah needs care. Revise it gently before moving on.',
            RecommendationReasonCode::CompleteRemainingAyat => $count && $count <= 2
                ? "Only {$count} ayah remain — complete this surah with presence."
                : 'This short range completes the section you began.',
            RecommendationReasonCode::SurahCompleted => $surahName
                ? "Masha’Allah, you have completed the final ayat of Surah {$surahName}."
                : 'Masha’Allah, you have completed the final ayat of this Surah.',
            RecommendationReasonCode::ResumeIncompleteSession => 'You left a few ayah unfinished. Resume with sincerity where you paused.',
            RecommendationReasonCode::ReinforceRecentRange => 'A quiet return to these ayat will help them settle in the heart.',
            RecommendationReasonCode::LearningPlanComplete => 'You have reached the end. Returning to earlier surahs is a beautiful next step.',
            RecommendationReasonCode::ManualFallback => 'Choose what you would like to recite next — there is no rush.',
            RecommendationReasonCode::AiReciteStrong,
            RecommendationReasonCode::ConfidenceConfident => 'Continue while the previous ayat are still fresh.',
            RecommendationReasonCode::AiReciteMixed => 'Nearly there — review this range once more with a little more support.',
            RecommendationReasonCode::AiReciteWeak => 'A little more practice will help. Repeat this range with more guidance.',
        };
    }

    /**
     * @param  array<string, mixed>  $context
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function attachSettings(array $payload, array $context): array
    {
        $type = RecommendationType::tryFrom((string) ($payload['type'] ?? ''));
        $base = is_array($context['base_settings'] ?? null) ? $context['base_settings'] : [];
        $mode = strtolower((string) ($context['memorisation_mode'] ?? 'advanced'));
        $isBeginner = in_array($mode, ['beginner', 'guided', 'easy'], true);

        $defaultTechnique = $this->adaptation->normaliseTechnique($base['technique'] ?? null);
        if (! $defaultTechnique) {
            if ($type?->isRepeat() || $type === RecommendationType::Resume) {
                $defaultTechnique = 'blur';
            } elseif ($isBeginner || $type?->isContinue() || $type === RecommendationType::NextSurah) {
                $defaultTechnique = 'talqin';
            } else {
                $defaultTechnique = 'focus';
            }
        }

        if ($type?->isRepeat()) {
            $settings = $this->adaptation->resolve($base + ['technique' => $defaultTechnique], [
                'attempt_number' => (int) ($context['attempt_number'] ?? 1),
                'range_ayah_count' => (int) ($payload['ayah_range']['count'] ?? (($context['range_end'] ?? 1) - ($context['range_start'] ?? 1) + 1)),
                'confidence' => 'needs_practice',
                'range_workload_score' => (float) ($payload['workload']['score'] ?? 0),
            ]);
            $payload['adaptations'] = $settings['adaptations'] ?? [];
            $payload['adaptation_explanations'] = $this->adaptationExplanations(
                $settings['adaptations'] ?? [],
                $base + ['technique' => $defaultTechnique],
                $settings,
            );
            $payload['settings_outcome'] = 'These settings are intended to help you hear each phrase more clearly, repeat it more consistently and strengthen recall before progressing.';
        } else {
            $flags = $this->adaptation->techniqueFlags($defaultTechnique);
            $settings = [
                'technique' => $defaultTechnique,
                'reciter' => $base['reciter'] ?? null,
                'playback_speed' => $this->adaptation->clampSpeed((float) ($base['playback_speed'] ?? 1)),
                'repetitions' => $this->adaptation->clampRepetitions((int) ($base['repetitions'] ?? 3)),
                'ayat_per_step' => $base['ayat_per_step'] ?? null,
                'focus_enabled' => $flags['focus_enabled'],
                'blur_enabled' => $flags['blur_enabled'],
                'talqin_enabled' => $flags['talqin_enabled'],
                'adaptations' => [],
                'reason_code' => (string) ($payload['reason_code'] ?? ''),
            ];
            $payload['adaptations'] = [];
            $payload['adaptation_explanations'] = [];
            $payload['settings_outcome'] = null;
        }

        if (! isset($payload['workload']) && isset($payload['ayah_range']['from'], $payload['ayah_range']['to'], $payload['surah']['id'])) {
            $stats = AyahWorkload::rangeStats(
                (int) $payload['surah']['id'],
                (int) $payload['ayah_range']['from'],
                (int) $payload['ayah_range']['to'],
            );
            $payload['workload'] = [
                'score' => $stats['score'],
                'word_count' => $stats['word_count'],
                'ayah_count' => $stats['ayah_count'],
                'target_min' => AyahWorkload::TARGET_MIN,
                'target_max' => AyahWorkload::TARGET_MAX,
                'within_band' => $stats['score'] >= AyahWorkload::TARGET_MIN && $stats['score'] <= AyahWorkload::TARGET_MAX,
            ];
        }

        $payload['settings'] = $settings;
        $payload['settings_modified'] = false;
        $payload['panel_title_key'] = $this->panelTitleKey(
            $type ?? RecommendationType::ManualSelection,
            $payload['range_kind'] ?? null,
        );
        $payload['available_actions'] = $this->availableActions(
            $type ?? RecommendationType::ManualSelection,
            $payload['ayah_range'] ?? null,
        );

        return $payload;
    }

    /**
     * @param  list<string>  $adaptations
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     * @return list<array{code: string, message: string}>
     */
    private function adaptationExplanations(array $adaptations, array $before, array $after): array
    {
        $explanations = [];
        foreach ($adaptations as $code) {
            $message = match ($code) {
                'reduce_playback_speed' => sprintf(
                    'Playback reduced to %s× to make each phrase easier to follow',
                    rtrim(rtrim(number_format((float) ($after['playback_speed'] ?? 0.75), 2, '.', ''), '0'), '.')
                ),
                'increase_repetitions' => sprintf(
                    'Repetitions increased from %d to %d to reinforce recall',
                    (int) ($before['repetitions'] ?? 2),
                    (int) ($after['repetitions'] ?? 4),
                ),
                'use_talqin' => 'Talqin selected so you can listen and repeat one section at a time',
                'use_focus' => 'Focus mode selected so you can concentrate on one ayah at a time',
                'reduce_ayat_per_step' => 'Step size reduced so each section is smaller and easier to recall',
                default => null,
            };
            if ($message) {
                $explanations[] = ['code' => $code, 'message' => $message];
            }
        }

        return $explanations;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{id: string, reason_code: string}|null
     */
    private function techniquePayload(array $payload): ?array
    {
        $id = $payload['settings']['technique']
            ?? $payload['technique']['id']
            ?? null;
        $id = $this->adaptation->normaliseTechnique(is_string($id) ? $id : null);
        if (! $id) {
            return null;
        }

        $reason = match ($id) {
            'blur' => 'technique_blur_recall',
            'talqin' => 'technique_talqin_listen',
            default => 'technique_focus_one',
        };

        return ['id' => $id, 'reason_code' => $reason];
    }

    /**
     * @param  list<RecommendationType>  $types
     */
    private function recentlyRecommendedSameRange(
        User $user,
        int $surahId,
        int $from,
        int $to,
        array $types,
    ): bool {
        $typeValues = array_map(static fn (RecommendationType $type) => $type->value, $types);

        return SessionRecommendation::query()
            ->where('user_id', $user->id)
            ->where('surah_number', $surahId)
            ->where('ayah_start', $from)
            ->where('ayah_end', $to)
            ->whereIn('recommendation_type', $typeValues)
            ->where(function ($q) {
                $q->where('accepted', true)
                    ->orWhereNull('accepted')
                    ->orWhereIn('status', [
                        RecommendationStatus::Generated->value,
                        RecommendationStatus::Accepted->value,
                        RecommendationStatus::Started->value,
                    ]);
            })
            ->where('created_at', '>=', now()->subDay())
            ->exists();
    }

    private function latestSession(User $user): ?UserSession
    {
        return UserSession::query()
            ->where('user_id', $user->id)
            ->latest('last_activity_at')
            ->latest('id')
            ->first();
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function persistRecommendation(User $user, ?UserSession $session, array $payload): ?SessionRecommendation
    {
        $type = (string) ($payload['type'] ?? RecommendationType::NoRecommendation->value);
        if (in_array($type, [RecommendationType::NoRecommendation->value], true)) {
            return null;
        }

        $surahId = $payload['surah']['id'] ?? null;
        $from = $payload['ayah_range']['from'] ?? null;
        $to = $payload['ayah_range']['to'] ?? null;
        $settings = is_array($payload['settings'] ?? null) ? $payload['settings'] : [];
        $idempotencyKey = $session
            ? 'complete-'.$session->id
            : null;

        if ($idempotencyKey) {
            $byKey = SessionRecommendation::query()
                ->where('user_id', $user->id)
                ->where('idempotency_key', $idempotencyKey)
                ->first();
            if ($byKey && $this->isReusableOpenRecommendation($byKey)) {
                return $this->refreshOpenRecommendation($byKey, $payload, $session, $settings);
            }
        }

        $existing = SessionRecommendation::query()
            ->where('user_id', $user->id)
            ->where('recommendation_type', $type)
            ->where('surah_number', $surahId)
            ->where('ayah_start', $from)
            ->where('ayah_end', $to)
            ->whereIn('status', [
                RecommendationStatus::Generated->value,
                RecommendationStatus::Accepted->value,
            ])
            ->where('created_at', '>=', now()->subHour())
            ->latest('id')
            ->first();

        if ($existing) {
            return $this->refreshOpenRecommendation($existing, $payload, $session, $settings);
        }

        return SessionRecommendation::create([
            'user_id' => $user->id,
            'source_session_id' => $session?->id,
            'surah_number' => $surahId,
            'ayah_start' => $from,
            'ayah_end' => $to,
            'recommendation_type' => $type,
            'reason_code' => $payload['reason_code'],
            'session_mode' => $payload['session_mode'],
            'status' => RecommendationStatus::Generated->value,
            'range_kind' => $payload['range_kind'] ?? null,
            'recommended_technique' => $settings['technique'] ?? null,
            'recommended_reciter' => $settings['reciter'] ?? null,
            'recommended_playback_speed' => $settings['playback_speed'] ?? null,
            'recommended_repetitions' => $settings['repetitions'] ?? null,
            'recommended_ayat_per_step' => $settings['ayat_per_step'] ?? null,
            'recommended_settings' => $settings ?: null,
            'idempotency_key' => $idempotencyKey,
            'payload' => $payload,
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $settings
     */
    private function refreshOpenRecommendation(
        SessionRecommendation $existing,
        array $payload,
        ?UserSession $session,
        array $settings,
    ): SessionRecommendation {
        $existing->forceFill([
            'reason_code' => $payload['reason_code'],
            'session_mode' => $payload['session_mode'],
            'payload' => $payload,
            'source_session_id' => $session?->id ?? $existing->source_session_id,
            'status' => RecommendationStatus::Generated->value,
            'range_kind' => $payload['range_kind'] ?? $existing->range_kind,
            'recommended_technique' => $settings['technique'] ?? $existing->recommended_technique,
            'recommended_reciter' => $settings['reciter'] ?? $existing->recommended_reciter,
            'recommended_playback_speed' => $settings['playback_speed'] ?? $existing->recommended_playback_speed,
            'recommended_repetitions' => $settings['repetitions'] ?? $existing->recommended_repetitions,
            'recommended_ayat_per_step' => $settings['ayat_per_step'] ?? $existing->recommended_ayat_per_step,
            'recommended_settings' => $settings ?: $existing->recommended_settings,
        ])->save();

        return $existing;
    }

    /**
     * @return array<string, mixed>
     */
    private function payloadFromRecord(SessionRecommendation $recommendation): array
    {
        $payload = is_array($recommendation->payload) ? $recommendation->payload : [];
        $payload['id'] = $recommendation->id;
        $payload['source_session_id'] = $recommendation->source_session_id;
        $payload['status'] = $recommendation->status instanceof RecommendationStatus
            ? $recommendation->status->value
            : ($recommendation->status ?? RecommendationStatus::Generated->value);
        $payload['confidence_feedback'] = $recommendation->confidence_feedback;
        $payload['ai_assessment'] = $recommendation->ai_assessment;
        $payload['settings'] = $this->resolvedSettings($recommendation);
        $payload['settings_modified'] = is_array($recommendation->settings_overrides) && $recommendation->settings_overrides !== [];
        $payload['range_kind'] = $recommendation->range_kind ?? ($payload['range_kind'] ?? null);
        $payload['technique'] = $this->techniquePayload($payload);

        $type = RecommendationType::tryFrom((string) $recommendation->recommendation_type);
        $payload['primary_action_label_key'] = $this->primaryActionLabelKey(
            $type ?? RecommendationType::ManualSelection,
            $payload['ayah_range'] ?? null,
        );
        $payload['panel_title_key'] = $payload['panel_title_key']
            ?? $this->panelTitleKey($type ?? RecommendationType::ManualSelection, $payload['range_kind'] ?? null);
        $payload['available_actions'] = $payload['available_actions']
            ?? $this->availableActions($type ?? RecommendationType::ManualSelection, $payload['ayah_range'] ?? null);
        $payload['adaptations'] = $payload['adaptations']
            ?? ($payload['settings']['adaptations'] ?? []);
        if (
            (empty($payload['adaptation_explanations']) || ! is_array($payload['adaptation_explanations']))
            && is_array($payload['adaptations'])
            && $payload['adaptations'] !== []
        ) {
            $payload['adaptation_explanations'] = $this->adaptationExplanations(
                $payload['adaptations'],
                $this->recommendedSettingsArray($recommendation),
                $payload['settings'] ?? [],
            );
        }

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    private function recommendedSettingsArray(SessionRecommendation $recommendation): array
    {
        if (is_array($recommendation->recommended_settings) && $recommendation->recommended_settings !== []) {
            return $recommendation->recommended_settings;
        }

        $payload = is_array($recommendation->payload) ? $recommendation->payload : [];
        if (is_array($payload['settings'] ?? null)) {
            return $payload['settings'];
        }

        return [
            'technique' => $recommendation->recommended_technique ?: 'talqin',
            'reciter' => $recommendation->recommended_reciter,
            'playback_speed' => (float) ($recommendation->recommended_playback_speed ?: 1),
            'repetitions' => (int) ($recommendation->recommended_repetitions ?: 3),
            'ayat_per_step' => $recommendation->recommended_ayat_per_step,
            ...$this->adaptation->techniqueFlags($recommendation->recommended_technique ?: 'talqin'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function resolvedSettings(SessionRecommendation $recommendation): array
    {
        return $this->adaptation->mergeOverrides(
            $this->recommendedSettingsArray($recommendation),
            is_array($recommendation->settings_overrides) ? $recommendation->settings_overrides : null,
        );
    }

    /**
     * @param  array<string, mixed>  $adaptationContext
     * @return array<string, mixed>
     */
    private function supersedeWithRepeat(
        User $user,
        SessionRecommendation $current,
        array $adaptationContext,
        RecommendationReasonCode $reasonCode,
    ): array {
        $source = $current->sourceSession;
        $context = $this->buildContext($user, $source);
        $from = (int) ($context['range_start'] ?? $current->ayah_start ?? 0);
        $to = (int) ($context['range_end'] ?? $current->ayah_end ?? 0);
        $surah = $context['surah'];

        if (! $surah || ! $from || ! $to) {
            return $this->payloadFromRecord($current);
        }

        $adapted = $this->adaptation->resolve($context['base_settings'] ?? [], array_merge([
            'attempt_number' => (int) ($context['attempt_number'] ?? 1) + 1,
            'range_ayah_count' => max(1, $to - $from + 1),
        ], $adaptationContext));

        $payload = $this->buildPayload(
            type: RecommendationType::RepeatCurrentRange,
            surah: $surah,
            from: $from,
            to: $to,
            reasonCode: $reasonCode,
            requiresConfirmation: false,
            isEndOfSurah: false,
            nextSurah: null,
            memorisationMode: $context['memorisation_mode'],
            rangeKind: 'repeated',
        );
        $payload['settings'] = $adapted;
        $payload['adaptations'] = $adapted['adaptations'] ?? [];
        $payload['adaptation_explanations'] = $this->adaptationExplanations(
            $adapted['adaptations'] ?? [],
            $context['base_settings'] ?? [],
            $adapted,
        );
        $payload['settings_outcome'] = 'These settings are intended to help you hear each phrase more clearly, repeat it more consistently and strengthen recall before progressing.';
        $payload['panel_title_key'] = 'revisionSetTitle';
        $payload['available_actions'] = $this->availableActions(RecommendationType::RepeatCurrentRange, $payload['ayah_range'] ?? null);
        $payload['technique'] = $this->techniquePayload($payload);
        $payload['source_session_id'] = $source?->id ?? $current->source_session_id;

        $this->markSuperseded($current);

        $record = SessionRecommendation::create([
            'user_id' => $user->id,
            'source_session_id' => $source?->id ?? $current->source_session_id,
            'surah_number' => $surah['id'],
            'ayah_start' => $from,
            'ayah_end' => $to,
            'recommendation_type' => RecommendationType::RepeatCurrentRange->value,
            'reason_code' => $reasonCode->value,
            'session_mode' => RecommendationType::RepeatCurrentRange->sessionMode(),
            'status' => RecommendationStatus::Generated->value,
            'range_kind' => 'repeated',
            'recommended_technique' => $adapted['technique'] ?? null,
            'recommended_reciter' => $adapted['reciter'] ?? null,
            'recommended_playback_speed' => $adapted['playback_speed'] ?? null,
            'recommended_repetitions' => $adapted['repetitions'] ?? null,
            'recommended_ayat_per_step' => $adapted['ayat_per_step'] ?? null,
            'recommended_settings' => $adapted,
            'confidence_feedback' => $current->confidence_feedback,
            'ai_assessment' => $current->ai_assessment,
            'supersedes_recommendation_id' => $current->id,
            'payload' => $payload,
        ]);

        return $this->payloadFromRecord($record);
    }

    private function markSuperseded(SessionRecommendation $recommendation): void
    {
        $status = RecommendationStatus::tryFrom((string) ($recommendation->status?->value ?? $recommendation->status))
            ?? RecommendationStatus::Generated;

        if (in_array($status, [RecommendationStatus::Dismissed, RecommendationStatus::Superseded, RecommendationStatus::Started], true)) {
            return;
        }

        $recommendation->forceFill([
            'status' => RecommendationStatus::Superseded->value,
            'accepted' => false,
            // Free the completion idempotency key so a later continue can persist cleanly.
            'idempotency_key' => null,
        ])->save();
    }

    private function isReusableOpenRecommendation(SessionRecommendation $recommendation): bool
    {
        $status = RecommendationStatus::tryFrom((string) ($recommendation->status?->value ?? $recommendation->status))
            ?? RecommendationStatus::Generated;

        return $status->isOpen() || $status === RecommendationStatus::Accepted;
    }

    /**
     * @return array<string, mixed>
     */
    private function strengthenContinue(
        User $user,
        SessionRecommendation $recommendation,
        RecommendationReasonCode $reasonCode,
    ): array {
        $payload = $this->payloadFromRecord($recommendation);
        $type = RecommendationType::tryFrom((string) ($payload['type'] ?? ''));

        if ($type?->isContinue() || $type === RecommendationType::NextSurah || $type === RecommendationType::CompleteSurah) {
            $payload['reason_code'] = $reasonCode->value;
            $payload['reason'] = $this->defaultReasonText(
                $reasonCode,
                $payload['ayah_range'] ?? null,
                $payload['surah'] ?? null,
                $payload['next_surah'] ?? null,
            );
            $recommendation->forceFill([
                'reason_code' => $reasonCode->value,
                'payload' => array_merge(is_array($recommendation->payload) ? $recommendation->payload : [], $payload),
            ])->save();

            return $this->payloadFromRecord($recommendation->fresh());
        }

        // If currently a repeat, regenerate a continue from the completed source when possible.
        $source = $recommendation->sourceSession;
        if ($source) {
            $context = $this->buildContext($user, $source);
            if ($context['session_completed'] && ! $context['is_end_of_surah']) {
                $continue = $this->continuePayload($context);
                $continue = $this->attachSettings($continue, $context);
                $continue['reason_code'] = $reasonCode->value;
                $continue['reason'] = $this->defaultReasonText(
                    $reasonCode,
                    $continue['ayah_range'] ?? null,
                    $continue['surah'] ?? null,
                    null,
                );
                $continue['technique'] = $this->techniquePayload($continue);

                $this->markSuperseded($recommendation);

                $record = $this->persistRecommendation($user, $source, $continue);
                if (! $record) {
                    return $continue;
                }

                $record->forceFill([
                    'confidence_feedback' => $recommendation->confidence_feedback,
                    'ai_assessment' => $recommendation->ai_assessment,
                    'supersedes_recommendation_id' => $recommendation->id,
                ])->save();

                return $this->payloadFromRecord($record->fresh());
            }
        }

        return $payload;
    }

    /**
     * @return list<array{ayahId: string}>
     */
    private function buildQueueKeys(int $surah, int $from, int $to): array
    {
        $keys = [];
        for ($ayah = $from; $ayah <= $to; $ayah++) {
            if (! QuranMetadata::isValidAyah($surah, $ayah)) {
                break;
            }
            $keys[] = ['ayahId' => "{$surah}:{$ayah}"];
        }

        return $keys;
    }

    private function recentRevisionAcceptCount(User $user, int $surahId): int
    {
        return SessionRecommendation::query()
            ->where('user_id', $user->id)
            ->where('surah_number', $surahId)
            ->whereIn('recommendation_type', [
                RecommendationType::Revision->value,
                RecommendationType::RepeatCurrentRange->value,
            ])
            ->where('accepted', true)
            ->where('accepted_at', '>=', now()->subDays(2))
            ->count();
    }
}

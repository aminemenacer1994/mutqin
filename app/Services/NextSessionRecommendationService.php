<?php

namespace App\Services;

use App\Enums\RecommendationReasonCode;
use App\Enums\RecommendationType;
use App\Models\MemorisationProgress;
use App\Models\SessionRecommendation;
use App\Models\User;
use App\Models\UserLastPosition;
use App\Models\UserSession;
use App\Support\QuranMetadata;
use Illuminate\Support\Collection;

/**
 * Personalised next-session recommender for Qur'an learning.
 *
 * Priority order:
 * 1. Resume an incomplete session
 * 2. Ayat explicitly needing revision
 * 3. Repeatedly difficult ayat
 * 4. Recently completed ayat needing reinforcement
 * 5. Next logical 3–4 ayat in the current surah
 * 6. Complete remaining ayat in the current surah
 * 7. Ask permission to move to the next surah
 * 8. Fall back to manual session selection
 */
class NextSessionRecommendationService
{
    private const DEFAULT_SESSION_SIZE = 4;

    private const MIN_SESSION_SIZE = 3;

    /** Explicit weakness only — low mastery alone is normal after a first pass. */
    private const HARD_WEAK_MASTERY_THRESHOLD = 25;

    private const REVISION_ESCAPE_AFTER_ACCEPTS = 1;

    /**
     * @return array{
     *   id: int|null,
     *   type: string,
     *   session_mode: string,
     *   surah: array{id: int, name: string, translated_name: string, ayah_count?: int}|null,
     *   ayah_range: array{from: int, to: int, count: int}|null,
     *   reason: string,
     *   reason_code: string,
     *   requires_confirmation: bool,
     *   is_end_of_surah: bool,
     *   next_surah: array{id: int, name: string, translated_name: string, ayah_count?: int}|null,
     *   confirmation: array{title_key: string, primary_action_key: string, secondary_action_key: string}|null,
     *   source_session_id: int|null,
     *   technique: array{id: string, reason_code: string}|null
     * }
     */
    public function recommend(User $user, ?UserSession $sourceSession = null): array
    {
        $session = $sourceSession ?: $this->latestSession($user);
        $context = $this->buildContext($user, $session);

        $payload = $this->resolveRecommendation($user, $context);
        $payload['technique'] = $this->recommendTechnique($context, $payload);
        $record = $this->persistRecommendation($user, $session, $payload);

        $payload['id'] = $record?->id;
        $payload['source_session_id'] = $session?->id;

        return $payload;
    }

    /**
     * Accept a recommendation and bootstrap the next session on the backend.
     *
     * @return array{recommendation: array, session: UserSession}
     */
    public function acceptAndStart(User $user, SessionRecommendation $recommendation): array
    {
        if ($recommendation->user_id !== $user->id) {
            abort(403);
        }

        // Idempotent: already accepted and session started.
        if ($recommendation->accepted === true && $recommendation->started_session_id) {
            $existing = UserSession::query()->find($recommendation->started_session_id);
            if ($existing) {
                return [
                    'recommendation' => $this->payloadFromRecord($recommendation),
                    'session' => $existing,
                ];
            }
        }

        $payload = is_array($recommendation->payload) ? $recommendation->payload : [];
        $surah = (int) ($recommendation->surah_number ?? ($payload['surah']['id'] ?? 0));
        $from = (int) ($recommendation->ayah_start ?? ($payload['ayah_range']['from'] ?? 1));
        $to = (int) ($recommendation->ayah_end ?? ($payload['ayah_range']['to'] ?? $from));
        $mode = (string) ($recommendation->session_mode ?: ($payload['session_mode'] ?? 'new_learning'));
        $type = RecommendationType::tryFrom((string) $recommendation->recommendation_type);

        $session = UserSession::updateOrCreate(
            ['user_id' => $user->id],
            [
                'surah_number' => $surah ?: null,
                'ayah_number' => $from ?: null,
                'current_step' => 0,
                'memorisation_mode' => $mode === 'revision' ? 'revision' : ($payload['memorisation_mode'] ?? 'advanced'),
                'repetitions_completed' => 0,
                'session_duration_seconds' => 0,
                'last_activity_at' => now(),
                'metadata' => [
                    'active' => true,
                    'completed' => false,
                    'mode' => $mode === 'revision' ? 'revision' : ($payload['memorisation_mode'] ?? 'advanced'),
                    'config' => [
                        'chapterId' => $surah,
                        'rangeStart' => $from,
                        'rangeEnd' => $to,
                    ],
                    'recommendation' => [
                        'id' => $recommendation->id,
                        'type' => $recommendation->recommendation_type,
                        'reason_code' => $recommendation->reason_code,
                        'session_mode' => $mode,
                    ],
                    'queue' => $this->buildQueueKeys($surah, $from, $to),
                    'updated_at' => now()->toIso8601String(),
                    'started_at' => now()->toIso8601String(),
                ],
            ]
        );

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
                ],
            ]
        );

        $recommendation->forceFill([
            'accepted' => true,
            'chose_other' => false,
            'accepted_at' => now(),
            'rejected_at' => null,
            'started_session_id' => $session->id,
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

        if ($recommendation->accepted === true) {
            return $recommendation;
        }

        $recommendation->forceFill([
            'accepted' => false,
            'chose_other' => $choseOther,
            'rejected_at' => now(),
        ])->save();

        return $recommendation;
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
        );
    }

    /**
     * Only recommend same-range revision for clear, explicit weakness —
     * never because mastery is merely low after a first successful pass.
     *
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

        // Do not re-recommend the exact range that was already revised recently.
        if ($this->recentlyRecommendedSameRange(
            $user,
            (int) $context['surah']['id'],
            (int) $context['range_start'],
            (int) $context['range_end'],
            RecommendationType::Revision,
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

        // Require a clear majority of the range to be hard, or at least one severe weak ayah
        // with weak_count, before blocking progress.
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
        );
    }

    private function isExplicitlyDifficult(MemorisationProgress $row): bool
    {
        $weakCount = (int) data_get($row->metadata, 'weak_count', 0);
        $engineStatus = (string) data_get($row->metadata, 'engine_status', '');

        if ($engineStatus === 'weak' || $weakCount >= 2) {
            return true;
        }

        // "reviewing" alone is not enough after a completed listen pass —
        // only when also clearly weak by mastery.
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
                type: RecommendationType::ManualSelection,
                surah: $context['surah'],
                from: null,
                to: null,
                reasonCode: RecommendationReasonCode::LearningPlanComplete,
                requiresConfirmation: false,
                isEndOfSurah: true,
                nextSurah: null,
                memorisationMode: $context['memorisation_mode'],
            );
        }

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
                'from' => 1,
                'to' => min(self::DEFAULT_SESSION_SIZE, (int) $next['ayah_count']),
                'count' => min(self::DEFAULT_SESSION_SIZE, (int) $next['ayah_count']),
            ],
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
        $preferredSize = $context['preferred_session_size'];
        $nextFrom = max(1, (int) $context['range_end'] + 1);

        if ($nextFrom > $ayahCount) {
            return $this->endOfSurahPayload($context);
        }

        $remaining = $ayahCount - $nextFrom + 1;
        $size = $remaining <= self::DEFAULT_SESSION_SIZE
            ? $remaining
            : min($preferredSize, $remaining);

        // Prefer 3–4 unless fewer remain.
        if ($remaining > self::DEFAULT_SESSION_SIZE && $size < self::MIN_SESSION_SIZE) {
            $size = self::MIN_SESSION_SIZE;
        }

        $nextTo = $nextFrom + $size - 1;
        $isCompletingSurah = $nextTo >= $ayahCount;
        if ($isCompletingSurah) {
            $nextTo = $ayahCount;
            $size = $nextTo - $nextFrom + 1;
        }

        $strong = $context['range_was_strong'];
        $reason = $isCompletingSurah
            ? RecommendationReasonCode::CompleteRemainingAyat
            : ($strong
                ? RecommendationReasonCode::StrongPreviousPerformance
                : RecommendationReasonCode::ContinueCurrentSurah);

        $type = $isCompletingSurah
            ? RecommendationType::CompleteSurah
            : RecommendationType::Continue;

        return $this->buildPayload(
            type: $type,
            surah: $surah,
            from: $nextFrom,
            to: $nextTo,
            reasonCode: $reason,
            requiresConfirmation: $type === RecommendationType::NextSurah,
            isEndOfSurah: false,
            nextSurah: null,
            memorisationMode: $context['memorisation_mode'],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function buildContext(User $user, ?UserSession $session): array
    {
        $meta = is_array($session?->metadata) ? $session->metadata : [];
        $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];

        $surahNumber = (int) ($session?->surah_number
            ?: ($config['chapterId'] ?? 0)
            ?: (UserLastPosition::query()->where('user_id', $user->id)->value('surah_number') ?: 0));

        $surah = $surahNumber ? QuranMetadata::surah($surahNumber) : null;

        $rangeStart = (int) ($config['rangeStart'] ?? 0);
        $rangeEnd = (int) ($config['rangeEnd'] ?? 0);

        if ((! $rangeStart || ! $rangeEnd) && $session?->ayah_number && $surah) {
            // Fall back to a window around the latest ayah when range is missing.
            $rangeEnd = (int) $session->ayah_number;
            $rangeStart = max(1, $rangeEnd - self::DEFAULT_SESSION_SIZE + 1);
        }

        if ($rangeStart && $rangeEnd && $rangeEnd < $rangeStart) {
            [$rangeStart, $rangeEnd] = [$rangeEnd, $rangeStart];
        }

        $preferred = $rangeStart && $rangeEnd
            ? max(self::MIN_SESSION_SIZE, min(self::DEFAULT_SESSION_SIZE, $rangeEnd - $rangeStart + 1))
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
            || (($meta['active'] ?? null) === false && ! empty($meta['completed_at']));

        // Snapshot/force-complete paths often set completed without completed_at.
        if (! $sessionCompleted && isset($meta['active']) && $meta['active'] === false && $rangeStart && $rangeEnd) {
            $coveredComplete = $coveredThrough !== null && $coveredThrough >= $rangeEnd;
            $sessionCompleted = $coveredComplete || (bool) ($meta['completed'] ?? false);
        }

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
    ): array {
        $sessionMode = $type->sessionMode();
        if ($type === RecommendationType::NextSurah && $nextSurah && $proposedNextRange) {
            // Persist the proposed first range of the next surah for start flow.
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
        ];
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
            RecommendationType::Revision, RecommendationType::Resume => [
                'title_key' => 'reviewAgain',
                'primary_action_key' => 'startRevision',
                'secondary_action_key' => 'chooseSomethingElse',
            ],
            RecommendationType::NextSurah => [
                'title_key' => 'continueNextSurah',
                'primary_action_key' => 'continueToNextSurah',
                'secondary_action_key' => 'chooseSomethingElse',
            ],
            RecommendationType::Continue, RecommendationType::CompleteSurah => [
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
            RecommendationReasonCode::ContinueCurrentSurah => $count
                ? "Barakallahu feek. Continue with the next {$count} ayat to keep a steady pace."
                : 'Barakallahu feek. Continue with the next ayat to keep a steady pace.',
            RecommendationReasonCode::RevisionRequired => 'Take a calm revision — a little more practice will settle these ayat.',
            RecommendationReasonCode::DifficultAyahDetected => 'One ayah needs care. Revise it gently before moving on.',
            RecommendationReasonCode::CompleteRemainingAyat => $count && $count <= 2
                ? "Only {$count} ayah remain — complete this surah with presence."
                : 'This short range completes the section you began.',
            RecommendationReasonCode::SurahCompleted => $surahName
                ? "Alhamdulillah — you completed Surah {$surahName}. Move on when your heart feels ready."
                : 'Alhamdulillah — this surah is complete. Move on when your heart feels ready.',
            RecommendationReasonCode::ResumeIncompleteSession => 'You left a few ayah unfinished. Resume with sincerity where you paused.',
            RecommendationReasonCode::ReinforceRecentRange => 'A quiet return to these ayat will help them settle in the heart.',
            RecommendationReasonCode::LearningPlanComplete => 'You have reached the end. Returning to earlier surahs is a beautiful next step.',
            RecommendationReasonCode::ManualFallback => 'Choose what you would like to recite next — there is no rush.',
        };
    }

    /**
     * Suggest a beginner-friendly technique only when it helps the next step.
     *
     * @param  array<string, mixed>  $context
     * @param  array<string, mixed>  $payload
     * @return array{id: string, reason_code: string}|null
     */
    private function recommendTechnique(array $context, array $payload): ?array
    {
        $type = (string) ($payload['type'] ?? '');
        $mode = strtolower((string) ($context['memorisation_mode'] ?? 'advanced'));
        $isBeginner = in_array($mode, ['beginner', 'guided', 'easy'], true);

        if ($type === RecommendationType::Revision->value || $type === RecommendationType::Resume->value) {
            return ['id' => 'blur', 'reason_code' => 'technique_blur_recall'];
        }

        if ($type === RecommendationType::Continue->value || $type === RecommendationType::CompleteSurah->value) {
            if ($isBeginner) {
                return ['id' => 'talqin', 'reason_code' => 'technique_talqin_listen'];
            }

            return ['id' => 'focus', 'reason_code' => 'technique_focus_one'];
        }

        if ($type === RecommendationType::NextSurah->value && $isBeginner) {
            return ['id' => 'talqin', 'reason_code' => 'technique_talqin_listen'];
        }

        return null;
    }

    private function recentlyRecommendedSameRange(
        User $user,
        int $surahId,
        int $from,
        int $to,
        RecommendationType $type,
    ): bool {
        return SessionRecommendation::query()
            ->where('user_id', $user->id)
            ->where('surah_number', $surahId)
            ->where('ayah_start', $from)
            ->where('ayah_end', $to)
            ->where('recommendation_type', $type->value)
            ->where(function ($q) {
                $q->where('accepted', true)
                    ->orWhereNull('accepted');
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

        // Reuse a fresh identical open recommendation to avoid duplicates.
        $existing = SessionRecommendation::query()
            ->where('user_id', $user->id)
            ->where('recommendation_type', $type)
            ->where('surah_number', $surahId)
            ->where('ayah_start', $from)
            ->where('ayah_end', $to)
            ->whereNull('accepted')
            ->where('created_at', '>=', now()->subHour())
            ->latest('id')
            ->first();

        if ($existing) {
            $existing->forceFill([
                'reason_code' => $payload['reason_code'],
                'session_mode' => $payload['session_mode'],
                'payload' => $payload,
                'source_session_id' => $session?->id,
            ])->save();

            return $existing;
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
            'payload' => $payload,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function payloadFromRecord(SessionRecommendation $recommendation): array
    {
        $payload = is_array($recommendation->payload) ? $recommendation->payload : [];
        $payload['id'] = $recommendation->id;
        $payload['source_session_id'] = $recommendation->source_session_id;

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
            ->where('recommendation_type', RecommendationType::Revision->value)
            ->where('accepted', true)
            ->where('accepted_at', '>=', now()->subDays(2))
            ->count();
    }
}

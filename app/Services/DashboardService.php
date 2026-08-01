<?php

namespace App\Services;

use App\Enums\RecommendationStatus;
use App\Enums\UserSessionStatus;
use App\Models\AiReciteAttempt;
use App\Models\AyahNote;
use App\Models\LearningAnalytic;
use App\Models\MemorisationAssessment;
use App\Models\MemorisationPracticePlan;
use App\Models\MemorisationProgress;
use App\Models\MemorisationSyncState;
use App\Models\SessionRecommendation;
use App\Models\User;
use App\Models\UserLastPosition;
use App\Models\UserSession;
use App\Enums\RecommendationType;
use App\Support\QuranMetadata;
use Illuminate\Support\Carbon;

/**
 * Aggregates authenticated-user dashboard data from existing learning tables.
 * Never accepts a client-supplied user id — always scopes via the given User.
 */
class DashboardService
{
    public function __construct(
        private readonly SessionLifecycleService $lifecycle,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function build(User $user, int $chartDays = 30): array
    {
        $chartDays = in_array($chartDays, [7, 30], true) ? $chartDays : 30;

        $unfinished = $this->lifecycle->currentUnfinished($user);
        $lastPosition = UserLastPosition::query()->where('user_id', $user->id)->first();
        $activePlan = MemorisationPracticePlan::query()
            ->where('user_id', $user->id)
            ->where('status', MemorisationPracticePlan::STATUS_ACTIVE)
            ->latest('started_at')
            ->latest('id')
            ->first();
        $openRecommendation = $this->resolveOpenRecommendation($user);

        $snapshot = $this->buildSnapshot($user);
        $progress = $this->buildProgress($user, $unfinished, $lastPosition, $activePlan);
        $chart = $this->buildActivityChart($user, $chartDays);
        $weekSummary = $this->buildWeekSummary($user);
        $weaknesses = $this->buildWeaknesses($user);
        $activity = $this->buildRecentActivity($user);
        $retention = $this->buildRetention($user, $unfinished, $openRecommendation, $activePlan);
        $continue = $this->buildContinueCard(
            $user,
            $unfinished,
            $lastPosition,
            $openRecommendation,
            $activePlan,
            $retention
        );
        $recommendedNext = $this->buildRecommendedNext($openRecommendation);

        return [
            'meta' => [
                'owner_id' => (int) $user->id,
                'generated_at' => now()->toIso8601String(),
                'chart_days' => $chartDays,
            ],
            'welcome' => [
                'greeting' => 'Assalamu alaikum, '.$this->firstName($user),
                'first_name' => $this->firstName($user),
                'supporting_message' => 'Continue gently from where you left off.',
                'message_key' => 'supporting_message',
            ],
            'continue' => $continue,
            'recommended_next' => $recommendedNext,
            'snapshot' => $snapshot,
            'progress' => $progress,
            'chart' => $chart,
            'week_summary' => $weekSummary,
            'weaknesses' => $weaknesses,
            'activity' => $activity,
            'retention' => $retention,
        ];
    }

    /**
     * Full chronological activity log for the dashboard drawer.
     * Includes sessions, AI Recite checks, and notes with dates/outcomes.
     *
     * @return list<array<string, mixed>>
     */
    public function activityLog(User $user, int $limit = 100): array
    {
        $limit = max(1, min(200, $limit));
        $events = collect();

        UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->whereIn('status', [
                UserSessionStatus::Completed->value,
                UserSessionStatus::EndedEarly->value,
                UserSessionStatus::Paused->value,
            ])
            ->orderByDesc('last_activity_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->each(function (UserSession $session) use ($events) {
                $status = UserSessionStatus::tryFromMixed($session->status);
                $meta = is_array($session->metadata) ? $session->metadata : [];
                $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
                $surah = (int) ($session->surah_number ?? $config['chapterId'] ?? 0);
                $name = $surah ? QuranMetadata::name($surah) : 'Session';
                $start = (int) ($config['rangeStart'] ?? 0);
                $end = (int) ($config['rangeEnd'] ?? 0);
                $range = ($start > 0 && $end > 0)
                    ? ($start === $end ? "Ayah {$start}" : "Ayahs {$start}–{$end}")
                    : ($session->ayah_number ? 'Ayah '.$session->ayah_number : null);

                [$type, $outcome, $at] = match (true) {
                    $status === UserSessionStatus::Completed => [
                        'session',
                        'Completed',
                        $session->ended_at ?? $session->last_activity_at,
                    ],
                    $status === UserSessionStatus::EndedEarly => [
                        'session',
                        'Ended early',
                        $session->ended_at ?? $session->last_activity_at,
                    ],
                    $status === UserSessionStatus::Paused => [
                        'session',
                        'Saved',
                        $session->paused_at ?? $session->last_activity_at,
                    ],
                    default => [null, null, null],
                };

                if (! $type || ! $at) {
                    return;
                }

                $title = trim($name.($range ? ' · '.$range : ''));
                $events->push([
                    'id' => 'session-'.$session->id,
                    'type' => $type,
                    'title' => $title,
                    'outcome' => $outcome,
                    'occurred_at' => Carbon::parse($at)->toIso8601String(),
                    'href' => $this->memorisationHref(array_filter([
                        'surah' => $surah ?: null,
                        'from' => $start ?: null,
                        'to' => ($end ?: $start) ?: null,
                    ])),
                ]);
            });

        AiReciteAttempt::query()
            ->where('user_id', $user->id)
            ->latest('id')
            ->limit($limit)
            ->get()
            ->each(function (AiReciteAttempt $attempt) use ($events) {
                $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
                $surah = (int) ($range['surah'] ?? $range['surahId'] ?? $range['surah_number'] ?? 0);
                $name = $surah ? QuranMetadata::name($surah) : 'AI Recite';
                $from = (int) ($range['from'] ?? $range['start'] ?? $range['ayah_start'] ?? 0);
                $to = (int) ($range['to'] ?? $range['end'] ?? $range['ayah_end'] ?? $from);
                $context = $from > 0
                    ? ($from === $to ? "{$name} · Ayah {$from}" : "{$name} · Ayahs {$from}–{$to}")
                    : $name;

                $band = is_string($attempt->band) ? ucfirst(strtolower($attempt->band)) : null;
                $accuracy = $attempt->accuracy_percent;
                $outcomeParts = array_filter([
                    $band,
                    $accuracy !== null ? ((int) $accuracy).'%' : null,
                ]);

                $events->push([
                    'id' => 'ai-'.$attempt->id,
                    'type' => 'ai_check',
                    'title' => $context,
                    'outcome' => $outcomeParts !== [] ? implode(' · ', $outcomeParts) : 'AI check',
                    'occurred_at' => optional($attempt->created_at)->toIso8601String(),
                    'href' => $this->memorisationHref(array_filter([
                        'surah' => $surah ?: null,
                        'from' => $from ?: null,
                        'to' => ($to ?: $from) ?: null,
                    ])),
                ]);
            });

        AyahNote::query()
            ->where('user_id', $user->id)
            ->latest('updated_at')
            ->latest('id')
            ->limit($limit)
            ->get()
            ->each(function (AyahNote $note) use ($events) {
                $name = QuranMetadata::name((int) $note->surah_number) ?: 'Note';
                $body = trim((string) preg_replace('/\s+/u', ' ', (string) $note->body));
                $snippet = $body !== ''
                    ? (mb_strlen($body) > 96 ? mb_substr($body, 0, 96).'…' : $body)
                    : 'Note saved';

                $events->push([
                    'id' => 'note-'.$note->id,
                    'type' => 'note',
                    'title' => "{$name} · Ayah {$note->ayah_number}",
                    'outcome' => $snippet,
                    'occurred_at' => optional($note->updated_at ?? $note->created_at)->toIso8601String(),
                    'href' => $this->memorisationHref([
                        'surah' => (int) $note->surah_number,
                        'from' => (int) $note->ayah_number,
                        'to' => (int) $note->ayah_number,
                    ]),
                ]);
            });

        return $events
            ->filter(fn ($event) => ! empty($event['occurred_at']) && ! empty($event['title']))
            ->sortByDesc('occurred_at')
            ->take($limit)
            ->values()
            ->all();
    }

    private function resolveOpenRecommendation(User $user): ?SessionRecommendation
    {
        $lastCompletedId = UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->where('status', UserSessionStatus::Completed->value)
            ->latest('ended_at')
            ->latest('id')
            ->value('id');

        if ($lastCompletedId) {
            $fromLastSession = SessionRecommendation::query()
                ->where('user_id', $user->id)
                ->where('status', RecommendationStatus::Generated->value)
                ->where('source_session_id', $lastCompletedId)
                ->latest('id')
                ->first();
            if ($fromLastSession) {
                return $fromLastSession;
            }
        }

        return SessionRecommendation::query()
            ->where('user_id', $user->id)
            ->where('status', RecommendationStatus::Generated->value)
            ->latest('id')
            ->first();
    }

    /**
     * Secondary "Recommended next" card from the recommendation engine.
     *
     * @return array<string, mixed>|null
     */
    private function buildRecommendedNext(?SessionRecommendation $recommendation): ?array
    {
        if (! $recommendation) {
            return null;
        }

        $surah = (int) $recommendation->surah_number;
        $from = (int) $recommendation->ayah_start;
        $to = (int) ($recommendation->ayah_end ?: $from);
        if ($surah <= 0 || $from <= 0) {
            return null;
        }

        $settings = is_array($recommendation->recommended_settings)
            ? $recommendation->recommended_settings
            : [];
        $overrides = is_array($recommendation->settings_overrides)
            ? $recommendation->settings_overrides
            : [];
        $mergedSettings = array_merge($settings, $overrides);

        $technique = $recommendation->recommended_technique
            ?: $this->techniqueLabel($recommendation->session_mode, $mergedSettings);
        $speedRaw = $recommendation->recommended_playback_speed
            ?? $mergedSettings['playback_speed']
            ?? $mergedSettings['speed']
            ?? null;
        $speed = is_numeric($speedRaw) ? round((float) $speedRaw, 2) : null;

        return [
            'recommendation_id' => (int) $recommendation->id,
            'surah_number' => $surah,
            'surah_name' => QuranMetadata::name($surah) ?: ('Surah '.$surah),
            'ayah_start' => $from,
            'ayah_end' => $to,
            'technique' => $technique,
            'technique_label' => $this->formatTechniqueLabel($technique),
            'playback_speed' => $speed,
            'speed_label' => $speed !== null ? $this->formatSpeedLabel($speed) : null,
            'href' => $this->memorisationHref([
                'recommendation' => (int) $recommendation->id,
                'surah' => $surah,
                'from' => $from,
                'to' => $to,
            ]),
        ];
    }

    private function formatTechniqueLabel(?string $technique): ?string
    {
        $raw = trim((string) $technique);
        if ($raw === '') {
            return null;
        }

        $normalized = strtolower(str_replace(['-', ' '], '_', $raw));
        $labels = [
            'talqin' => 'Talqin',
            'focus' => 'Focus',
            'blur' => 'Blur',
            'chunking' => 'Chunking',
            'anchor' => 'Anchor',
            'chaining' => 'Chaining',
            'revision' => 'Revision',
            'new_learning' => 'New learning',
            'murajaah' => 'Muraja‘ah',
        ];

        return $labels[$normalized] ?? ucfirst(str_replace('_', ' ', $normalized));
    }

    private function formatSpeedLabel(float $speed): string
    {
        $formatted = rtrim(rtrim(number_format($speed, 2, '.', ''), '0'), '.');

        return $formatted.'x';
    }

    /**
     * @return array<string, mixed>
     */
    private function buildContinueCard(
        User $user,
        ?UserSession $unfinished,
        ?UserLastPosition $lastPosition,
        ?SessionRecommendation $openRecommendation,
        ?MemorisationPracticePlan $activePlan,
        array $retention,
    ): array {
        if ($unfinished) {
            $status = UserSessionStatus::tryFromMixed($unfinished->status);
            $isPausedOrInterrupted = in_array($status, [
                UserSessionStatus::Paused,
                UserSessionStatus::Interrupted,
            ], true);
            $meta = is_array($unfinished->metadata) ? $unfinished->metadata : [];
            $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
            $rangeStart = (int) ($config['rangeStart'] ?? $unfinished->ayah_number ?? 0);
            $rangeEnd = (int) ($config['rangeEnd'] ?? $unfinished->ayah_number ?? 0);
            $surah = (int) ($unfinished->surah_number ?? $config['chapterId'] ?? 0);
            $completion = $this->rangeCompletionPercent($user, $surah, $rangeStart, $rangeEnd);

            return [
                'action_type' => $isPausedOrInterrupted ? 'resume_session' : 'continue_session',
                'cta_key' => $isPausedOrInterrupted ? 'cta_resume' : 'cta_continue',
                'cta_label' => $isPausedOrInterrupted ? 'Resume session' : 'Continue session',
                'message_key' => $isPausedOrInterrupted ? 'msg_resume' : 'msg_continue',
                'href' => $this->memorisationHref([
                    'resume' => 1,
                    'session' => (int) $unfinished->id,
                ]),
                'session_id' => (int) $unfinished->id,
                'recommendation_id' => null,
                'surah_number' => $surah ?: null,
                'surah_name' => $surah ? QuranMetadata::name($surah) : null,
                'ayah_start' => $rangeStart ?: null,
                'ayah_end' => $rangeEnd ?: null,
                'last_ayah' => $unfinished->ayah_number,
                'completion_percent' => $completion,
                'last_activity_at' => optional($unfinished->last_activity_at)->toIso8601String(),
                'recommended_technique' => $this->techniqueLabel($unfinished->memorisation_mode, $meta),
                'message' => $isPausedOrInterrupted
                    ? 'Your session is waiting — resume where you paused.'
                    : 'Pick up the ayahs you were memorising.',
            ];
        }

        $incomplete = UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->where('status', UserSessionStatus::EndedEarly->value)
            ->latest('ended_at')
            ->latest('id')
            ->first();

        if ($incomplete) {
            $meta = is_array($incomplete->metadata) ? $incomplete->metadata : [];
            $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
            $surah = (int) ($incomplete->surah_number ?? $config['chapterId'] ?? 0);
            $rangeStart = (int) ($config['rangeStart'] ?? $incomplete->ayah_number ?? 0);
            $rangeEnd = (int) ($config['rangeEnd'] ?? $incomplete->ayah_number ?? 0);
            $query = array_filter([
                'surah' => $surah ?: null,
                'from' => $rangeStart ?: null,
                'to' => $rangeEnd ?: null,
            ]);

            return [
                'action_type' => 'continue_incomplete',
                'cta_key' => 'cta_continue',
                'cta_label' => 'Continue this portion',
                'message_key' => 'msg_incomplete',
                'href' => $this->memorisationHref($query !== [] ? $query : ['setup' => 1]),
                'session_id' => (int) $incomplete->id,
                'recommendation_id' => null,
                'surah_number' => $surah ?: null,
                'surah_name' => $surah ? QuranMetadata::name($surah) : null,
                'ayah_start' => $rangeStart ?: null,
                'ayah_end' => $rangeEnd ?: null,
                'last_ayah' => $incomplete->ayah_number,
                'completion_percent' => $this->rangeCompletionPercent($user, $surah, $rangeStart, $rangeEnd),
                'last_activity_at' => optional($incomplete->ended_at ?? $incomplete->last_activity_at)->toIso8601String(),
                'recommended_technique' => $this->techniqueLabel($incomplete->memorisation_mode, $meta),
                'message' => 'Return to the portion you left unfinished.',
            ];
        }

        if (! empty($retention['upcoming_review'])) {
            $review = $retention['upcoming_review'];
            $surah = (int) ($review['surah_number'] ?? 0);
            $from = (int) ($review['ayah_start'] ?? 0);
            $to = (int) ($review['ayah_end'] ?? $from);
            $recommendationId = isset($review['recommendation_id']) ? (int) $review['recommendation_id'] : null;
            $query = array_filter([
                'recommendation' => $recommendationId ?: null,
                'surah' => $surah ?: null,
                'from' => $from ?: null,
                'to' => $to ?: null,
            ]);

            return [
                'action_type' => 'start_review',
                'cta_key' => 'cta_review',
                'cta_label' => 'Start review',
                'message_key' => 'msg_review',
                'href' => $this->memorisationHref($query !== [] ? $query : ['setup' => 1]),
                'session_id' => null,
                'recommendation_id' => $recommendationId,
                'surah_number' => $surah ?: null,
                'surah_name' => $review['surah_name'] ?? ($surah ? QuranMetadata::name($surah) : null),
                'ayah_start' => $from ?: null,
                'ayah_end' => $to ?: null,
                'last_ayah' => $to ?: null,
                'completion_percent' => null,
                'last_activity_at' => $review['detected_at'] ?? null,
                'recommended_technique' => $review['technique'] ?? null,
                'message' => $review['message'] ?? 'A short review will help keep these ayahs firm.',
            ];
        }

        if ($openRecommendation) {
            $surah = (int) $openRecommendation->surah_number;
            $from = (int) $openRecommendation->ayah_start;
            $to = (int) $openRecommendation->ayah_end;

            return [
                'action_type' => 'follow_recommendation',
                'cta_key' => 'cta_recommendation',
                'cta_label' => 'Start suggestion',
                'message_key' => 'msg_recommendation',
                'href' => $this->memorisationHref([
                    'recommendation' => (int) $openRecommendation->id,
                    'surah' => $surah ?: null,
                    'from' => $from ?: null,
                    'to' => $to ?: null,
                ]),
                'session_id' => null,
                'recommendation_id' => (int) $openRecommendation->id,
                'surah_number' => $surah ?: null,
                'surah_name' => $surah ? QuranMetadata::name($surah) : null,
                'ayah_start' => $from ?: null,
                'ayah_end' => $to ?: null,
                'last_ayah' => $to ?: null,
                'completion_percent' => null,
                'last_activity_at' => optional($openRecommendation->created_at)->toIso8601String(),
                'recommended_technique' => $openRecommendation->recommended_technique
                    ?: $this->techniqueLabel($openRecommendation->session_mode, []),
                'message' => 'Your next suggested practice is ready.',
            ];
        }

        if ($activePlan) {
            $surah = (int) $activePlan->surah_number;
            $from = (int) $activePlan->start_ayah;
            $to = (int) $activePlan->end_ayah;

            return [
                'action_type' => 'follow_recommendation',
                'cta_key' => 'cta_recommendation',
                'cta_label' => 'Continue practice plan',
                'message_key' => 'msg_plan',
                'href' => $this->memorisationHref(array_filter([
                    'surah' => $surah ?: null,
                    'from' => $from ?: null,
                    'to' => $to ?: null,
                ])),
                'session_id' => null,
                'recommendation_id' => null,
                'surah_number' => $surah ?: null,
                'surah_name' => $surah ? QuranMetadata::name($surah) : null,
                'ayah_start' => $from ?: null,
                'ayah_end' => $to ?: null,
                'last_ayah' => $to ?: null,
                'completion_percent' => $this->planCompletionPercent($activePlan),
                'last_activity_at' => optional($activePlan->updated_at)->toIso8601String(),
                'recommended_technique' => $this->planTechnique($activePlan),
                'message' => 'Continue your active practice plan.',
            ];
        }

        $surah = (int) ($lastPosition?->surah_number ?? 0);
        $ayah = (int) ($lastPosition?->ayah_number ?? 0);

        $startQuery = ['setup' => 1];
        if ($surah > 0) {
            $startQuery = array_filter([
                'surah' => $surah,
                'from' => $ayah ?: null,
                'to' => $ayah ?: null,
                'setup' => $ayah > 0 ? null : 1,
            ]);
        }

        return [
            'action_type' => 'start_new',
            'cta_key' => 'cta_start',
            'cta_label' => 'Begin memorising',
            'message_key' => $surah ? 'msg_start_from_position' : 'msg_start_new',
            'href' => $this->memorisationHref($startQuery),
            'session_id' => null,
            'recommendation_id' => null,
            'surah_number' => $surah ?: null,
            'surah_name' => $surah ? QuranMetadata::name($surah) : null,
            'ayah_start' => $ayah ?: null,
            'ayah_end' => $ayah ?: null,
            'last_ayah' => $ayah ?: null,
            'completion_percent' => null,
            'last_activity_at' => optional($lastPosition?->last_opened_at)->toIso8601String(),
            'recommended_technique' => null,
            'message' => $surah
                ? 'Start from your last opened ayah.'
                : 'Open memorisation to start a new session.',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function buildSnapshot(User $user): array
    {
        $sevenDaysAgo = now()->subDays(7)->startOfDay();

        $completedTotal = UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->where('status', UserSessionStatus::Completed->value)
            ->count();

        $completedRecent = UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->where('status', UserSessionStatus::Completed->value)
            ->where('ended_at', '>=', $sevenDaysAgo)
            ->count();

        $savedTotal = $this->countSavedSessions($user);

        $memorisedTotal = MemorisationProgress::query()
            ->where('user_id', $user->id)
            ->whereIn('status', ['memorised', 'mastered'])
            ->count();

        $memorisedRecent = MemorisationProgress::query()
            ->where('user_id', $user->id)
            ->whereIn('status', ['memorised', 'mastered'])
            ->where(function ($query) use ($sevenDaysAgo) {
                $query->where('completed_at', '>=', $sevenDaysAgo)
                    ->orWhere(function ($inner) use ($sevenDaysAgo) {
                        $inner->whereNull('completed_at')
                            ->where('updated_at', '>=', $sevenDaysAgo);
                    });
            })
            ->count();

        $aiReciteTotal = AiReciteAttempt::query()->where('user_id', $user->id)->count();
        $aiReciteRecent = AiReciteAttempt::query()
            ->where('user_id', $user->id)
            ->where('created_at', '>=', $sevenDaysAgo)
            ->count();

        $notesTotal = AyahNote::query()->where('user_id', $user->id)->count();
        $notesRecent = AyahNote::query()
            ->where('user_id', $user->id)
            ->where('created_at', '>=', $sevenDaysAgo)
            ->count();

        return [
            'completed_sessions' => [
                'value' => $completedTotal,
                'change_7d' => $completedRecent,
                'label' => 'Completed sessions',
                'context' => 'Fully finished ranges only',
            ],
            'saved_sessions' => [
                'value' => $savedTotal,
                'change_7d' => null,
                'label' => 'Saved sessions',
                'context' => 'Resumable or explicitly saved',
            ],
            'memorised_ayahs' => [
                'value' => $memorisedTotal,
                'change_7d' => $memorisedRecent,
                'label' => 'Memorised ayahs',
                'context' => 'Confirmed memorisation progress',
            ],
            'ai_recite_attempts' => [
                'value' => $aiReciteTotal,
                'change_7d' => $aiReciteRecent,
                'label' => 'AI Recite attempts',
                'context' => 'Submitted recitation checks',
            ],
            'notes' => [
                'value' => $notesTotal,
                'change_7d' => $notesRecent,
                'label' => 'Notes and reflections',
                'context' => 'Your private ayah notes',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function buildProgress(
        User $user,
        ?UserSession $unfinished,
        ?UserLastPosition $lastPosition,
        ?MemorisationPracticePlan $activePlan,
    ): array {
        $meta = is_array($unfinished?->metadata) ? $unfinished->metadata : [];
        $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];

        $surah = (int) ($unfinished?->surah_number
            ?? $config['chapterId']
            ?? $lastPosition?->surah_number
            ?? $activePlan?->surah_number
            ?? 0);

        $ayahStart = (int) ($config['rangeStart'] ?? $activePlan?->start_ayah ?? 0);
        $ayahEnd = (int) ($config['rangeEnd'] ?? $activePlan?->end_ayah ?? 0);
        $currentAyah = (int) ($unfinished?->ayah_number ?? $lastPosition?->ayah_number ?? 0);

        $memorisedCount = MemorisationProgress::query()
            ->where('user_id', $user->id)
            ->whereIn('status', ['memorised', 'mastered'])
            ->when($surah > 0, fn ($q) => $q->where('surah_number', $surah))
            ->count();

        $learningCount = MemorisationProgress::query()
            ->where('user_id', $user->id)
            ->whereIn('status', ['learning', 'reviewing'])
            ->when($surah > 0, fn ($q) => $q->where('surah_number', $surah))
            ->count();

        $surahAyahCount = $surah > 0 ? (QuranMetadata::ayahCount($surah) ?? 0) : 0;
        $surahPractised = $surah > 0
            ? MemorisationProgress::query()
                ->where('user_id', $user->id)
                ->where('surah_number', $surah)
                ->whereIn('status', ['learning', 'reviewing', 'memorised', 'mastered'])
                ->count()
            : 0;
        $surahMemorised = $surah > 0
            ? MemorisationProgress::query()
                ->where('user_id', $user->id)
                ->where('surah_number', $surah)
                ->whereIn('status', ['memorised', 'mastered'])
                ->count()
            : 0;

        $rangeCompletion = ($ayahStart > 0 && $ayahEnd >= $ayahStart)
            ? $this->rangeCompletionPercent($user, $surah, $ayahStart, $ayahEnd)
            : null;

        // Keep at least 1% when any ayah has been practised so the bar stays visible.
        $surahCompletion = null;
        if ($surahAyahCount > 0) {
            if ($surahPractised <= 0) {
                $surahCompletion = 0;
            } else {
                $surahCompletion = (int) max(1, min(100, (int) round(($surahPractised / $surahAyahCount) * 100)));
            }
        }

        $lastActivity = UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->latest('last_activity_at')
            ->value('last_activity_at');

        return [
            'current_surah_number' => $surah ?: null,
            'current_surah_name' => $surah ? QuranMetadata::name($surah) : null,
            'ayah_start' => $ayahStart ?: null,
            'ayah_end' => $ayahEnd ?: null,
            'current_ayah' => $currentAyah ?: null,
            'memorised_ayah_count' => $memorisedCount,
            'learning_ayah_count' => $learningCount,
            'surah_ayah_count' => $surahAyahCount ?: null,
            'surah_practised_ayah_count' => $surahPractised,
            'surah_memorised_ayah_count' => $surahMemorised,
            'active_plan_completion_percent' => $activePlan ? $this->planCompletionPercent($activePlan) : null,
            'active_plan_title' => $activePlan?->title,
            'range_completion_percent' => $rangeCompletion,
            'surah_completion_percent' => $surahCompletion,
            'last_activity_at' => $lastActivity
                ? Carbon::parse($lastActivity)->toIso8601String()
                : optional($lastPosition?->last_opened_at)->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function buildActivityChart(User $user, int $days): array
    {
        $from = now()->subDays($days - 1)->startOfDay();
        $to = now()->endOfDay();

        $analytics = LearningAnalytic::query()
            ->where('user_id', $user->id)
            ->whereDate('session_date', '>=', $from->toDateString())
            ->whereDate('session_date', '<=', $to->toDateString())
            ->orderBy('session_date')
            ->get()
            ->keyBy(fn (LearningAnalytic $row) => $row->session_date->toDateString());

        $completedByDay = UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->where('status', UserSessionStatus::Completed->value)
            ->where('ended_at', '>=', $from)
            ->where('ended_at', '<=', $to)
            ->get(['ended_at'])
            ->groupBy(fn (UserSession $session) => optional($session->ended_at)->toDateString())
            ->map->count();

        $points = [];
        $cursor = $from->copy();
        while ($cursor->lte($to)) {
            $key = $cursor->toDateString();
            $analytic = $analytics->get($key);
            $ayahs = (int) ($analytic?->ayahs_memorised ?? 0);
            $sessions = (int) ($completedByDay[$key] ?? $analytic?->sessions_completed ?? 0);
            $points[] = [
                'date' => $key,
                'ayahs_memorised' => $ayahs,
                'sessions_completed' => $sessions,
                'primary' => $ayahs,
                'secondary' => $sessions,
            ];
            $cursor->addDay();
        }

        $totalAyahs = array_sum(array_column($points, 'primary'));
        $totalSessions = array_sum(array_column($points, 'secondary'));
        $activeDays = count(array_filter($points, fn ($p) => ($p['primary'] ?? 0) > 0 || ($p['secondary'] ?? 0) > 0));

        // Start the x-axis at the user's first session day in range so new users
        // don't see a mostly empty axis beginning far before any practice.
        if ($activeDays > 0) {
            $firstActiveIndex = null;
            foreach ($points as $index => $point) {
                if (($point['primary'] ?? 0) > 0 || ($point['secondary'] ?? 0) > 0) {
                    $firstActiveIndex = $index;
                    break;
                }
            }
            if ($firstActiveIndex !== null && $firstActiveIndex > 0) {
                $points = array_values(array_slice($points, $firstActiveIndex));
            }
        } else {
            $points = [];
        }

        $summary = $activeDays === 0
            ? 'No memorisation yet in this period. Even a few quiet minutes with the Qur’an bring barakah.'
            : sprintf(
                'In the last %d days, you kept %d ayah%s firm across %d sitting%s on %d day%s. May Allah accept it.',
                $days,
                $totalAyahs,
                $totalAyahs === 1 ? '' : 's',
                $totalSessions,
                $totalSessions === 1 ? '' : 's',
                $activeDays,
                $activeDays === 1 ? '' : 's'
            );

        return [
            'days' => $days,
            'metric' => 'ayahs_memorised',
            'secondary_metric' => 'sessions_completed',
            'points' => $points,
            'summary' => $summary,
            'summary_key' => $activeDays === 0 ? 'chart_summary_empty' : 'chart_summary',
            'summary_params' => [
                'days' => $days,
                'ayahs' => $totalAyahs,
                'sessions' => $totalSessions,
                'active_days' => $activeDays,
            ],
            'is_empty' => $activeDays === 0,
        ];
    }

    /**
     * Calendar-week activity used under the Practice over time chart.
     *
     * @return array<string, mixed>
     */
    private function buildWeekSummary(User $user): array
    {
        $from = now()->startOfWeek();
        $to = now()->endOfDay();

        $sessions = UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->where('status', UserSessionStatus::Completed->value)
            ->where('ended_at', '>=', $from)
            ->where('ended_at', '<=', $to)
            ->count();

        $aiChecks = AiReciteAttempt::query()
            ->where('user_id', $user->id)
            ->where('created_at', '>=', $from)
            ->where('created_at', '<=', $to)
            ->count();

        $analytics = LearningAnalytic::query()
            ->where('user_id', $user->id)
            ->whereDate('session_date', '>=', $from->toDateString())
            ->whereDate('session_date', '<=', $to->toDateString())
            ->get(['ayahs_memorised', 'ayahs_reviewed']);

        $ayahsPractised = (int) $analytics->sum(function (LearningAnalytic $row) {
            return (int) ($row->ayahs_memorised ?? 0) + (int) ($row->ayahs_reviewed ?? 0);
        });

        $isEmpty = $sessions === 0 && $aiChecks === 0 && $ayahsPractised === 0;

        return [
            'sessions' => $sessions,
            'ai_checks' => $aiChecks,
            'ayahs_practised' => $ayahsPractised,
            'is_empty' => $isEmpty,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
        ];
    }

    /**
     * @return array{items: list<array<string,mixed>>, total: int, has_more: bool}
     */
    private function buildWeaknesses(User $user): array
    {
        $items = collect();

        $assessments = MemorisationAssessment::query()
            ->where('user_id', $user->id)
            ->latest('id')
            ->limit(8)
            ->get();

        foreach ($assessments as $assessment) {
            $analysis = is_array($assessment->weakness_analysis) ? $assessment->weakness_analysis : [];
            $weakAyahs = is_array($analysis['weak_ayahs'] ?? null) ? $analysis['weak_ayahs'] : [];
            $weakPhrases = is_array($analysis['weak_phrases'] ?? null) ? $analysis['weak_phrases'] : [];
            $weakWords = is_array($analysis['weak_words'] ?? null) ? $analysis['weak_words'] : [];
            $surah = (int) $assessment->surah_number;
            $surahName = $assessment->surah_name ?: QuranMetadata::name($surah);

            foreach ($weakAyahs as $ayahNumber) {
                $ayah = (int) $ayahNumber;
                if ($ayah <= 0) {
                    continue;
                }
                $phrase = $this->phraseForAyah($weakPhrases, $ayah)
                    ?: $this->wordForAyah($weakWords, $ayah);
                $key = $surah.':'.$ayah;
                $items->put($key, [
                    'key' => $key,
                    'surah_number' => $surah,
                    'surah_name' => $surahName,
                    'ayah_number' => $ayah,
                    'phrase' => $phrase,
                    'explanation' => $phrase
                        ? 'This phrase needs a little more care. Review it gently and ask Allah for ease.'
                        : 'This ayah needs a little more care. A calm review can help it settle.',
                    'explanation_key' => $phrase ? 'weak_explain_phrase' : 'weak_explain_ayah',
                    'status_label' => 'Needs a gentle review',
                    'status_key' => 'status_strengthen',
                    'detected_at' => optional($assessment->created_at)->toIso8601String(),
                    'action_label' => 'Review this ayah',
                    'action_key' => 'action_review',
                    'href' => $this->memorisationHref([
                        'surah' => $surah,
                        'from' => $ayah,
                        'to' => $ayah,
                    ]),
                    'source' => 'assessment',
                ]);
            }
        }

        $plans = MemorisationPracticePlan::query()
            ->where('user_id', $user->id)
            ->whereIn('status', [
                MemorisationPracticePlan::STATUS_ACTIVE,
                MemorisationPracticePlan::STATUS_DRAFT,
            ])
            ->latest('id')
            ->limit(3)
            ->get();

        foreach ($plans as $plan) {
            $surah = (int) $plan->surah_number;
            $surahName = QuranMetadata::name($surah);
            $priorityAyahs = is_array($plan->priority_ayahs) ? $plan->priority_ayahs : [];
            $weakPhrases = is_array($plan->weak_phrases) ? $plan->weak_phrases : [];
            $weakWords = is_array($plan->weak_words) ? $plan->weak_words : [];

            foreach ($priorityAyahs as $entry) {
                $ayah = is_array($entry)
                    ? (int) ($entry['ayah_number'] ?? $entry['ayah'] ?? 0)
                    : (int) $entry;
                if ($ayah <= 0) {
                    continue;
                }
                $key = $surah.':'.$ayah;
                if ($items->has($key)) {
                    continue;
                }
                $phrase = $this->phraseForAyah($weakPhrases, $ayah)
                    ?: $this->wordForAyah($weakWords, $ayah);
                $items->put($key, [
                    'key' => $key,
                    'surah_number' => $surah,
                    'surah_name' => $surahName,
                    'ayah_number' => $ayah,
                    'phrase' => $phrase,
                    'explanation' => 'Your practice plan suggests returning to this ayah with patience.',
                    'explanation_key' => 'weak_explain_plan',
                    'status_label' => 'Worth reviewing',
                    'status_key' => 'status_review',
                    'detected_at' => optional($plan->updated_at ?? $plan->created_at)->toIso8601String(),
                    'action_label' => 'Review this ayah',
                    'action_key' => 'action_review',
                    'href' => $this->memorisationHref([
                        'surah' => $surah,
                        'from' => $ayah,
                        'to' => $ayah,
                    ]),
                    'source' => 'practice_plan',
                ]);
            }
        }

        $attempts = AiReciteAttempt::query()
            ->where('user_id', $user->id)
            ->whereIn('band', ['weak', 'mixed', 'gentle', 'focused'])
            ->latest('id')
            ->limit(5)
            ->get();

        foreach ($attempts as $attempt) {
            $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
            $surah = (int) ($range['surah'] ?? $range['surahId'] ?? $range['surah_number'] ?? 0);
            $weakWords = is_array($attempt->weak_words) ? $attempt->weak_words : [];
            foreach (array_slice($weakWords, 0, 3) as $word) {
                $ayah = (int) ($word['ayahNumber'] ?? $word['ayah_number'] ?? $word['ayah'] ?? 0);
                if ($surah <= 0 || $ayah <= 0) {
                    continue;
                }
                $key = $surah.':'.$ayah;
                if ($items->has($key)) {
                    continue;
                }
                $text = trim((string) ($word['text'] ?? $word['word'] ?? ''));
                $items->put($key, [
                    'key' => $key,
                    'surah_number' => $surah,
                    'surah_name' => QuranMetadata::name($surah),
                    'ayah_number' => $ayah,
                    'phrase' => $text !== '' ? $text : null,
                    'explanation' => 'After your last recitation check, this part could use a soft review.',
                    'explanation_key' => 'weak_explain_ai',
                    'status_label' => 'Needs a gentle review',
                    'status_key' => 'status_strengthen',
                    'detected_at' => optional($attempt->created_at)->toIso8601String(),
                    'action_label' => 'Review this ayah',
                    'action_key' => 'action_review',
                    'href' => $this->memorisationHref([
                        'surah' => $surah,
                        'from' => $ayah,
                        'to' => $ayah,
                    ]),
                    'source' => 'ai_recite',
                ]);
            }
        }

        $reviewing = MemorisationProgress::query()
            ->where('user_id', $user->id)
            ->where('status', 'reviewing')
            ->orderByDesc('updated_at')
            ->limit(6)
            ->get();

        foreach ($reviewing as $row) {
            $key = $row->surah_number.':'.$row->ayah_number;
            if ($items->has($key)) {
                continue;
            }
            $items->put($key, [
                'key' => $key,
                'surah_number' => (int) $row->surah_number,
                'surah_name' => QuranMetadata::name((int) $row->surah_number),
                'ayah_number' => (int) $row->ayah_number,
                'phrase' => null,
                'explanation' => 'A short return to this ayah can help keep it firm, insha’Allah.',
                'explanation_key' => 'weak_explain_progress',
                'status_label' => 'Worth reviewing',
                'status_key' => 'status_review',
                'detected_at' => optional($row->updated_at)->toIso8601String(),
                'action_label' => 'Review this ayah',
                'action_key' => 'action_review',
                'href' => $this->memorisationHref([
                    'surah' => (int) $row->surah_number,
                    'from' => (int) $row->ayah_number,
                    'to' => (int) $row->ayah_number,
                ]),
                'source' => 'progress',
            ]);
        }

        $sorted = $items->sortByDesc(fn ($item) => $item['detected_at'] ?? '')->values();
        $total = $sorted->count();
        $topItems = $this->enrichWeaknessStrengthLabels(
            $user,
            $sorted->take(3)->values()->all()
        );

        return [
            'items' => $topItems,
            'total' => $total,
            'has_more' => $total > 3,
            'view_all_href' => $total > 3 ? $this->memorisationHref(['setup' => 1]) : null,
            'empty_title' => 'Alhamdulillah — nothing needs special attention right now.',
            'empty_message' => 'When you complete a memorisation check, Mutqin will gently highlight ayahs that need more care.',
            'empty_title_key' => 'weak_empty_title',
            'empty_message_key' => 'weak_empty_message',
        ];
    }

    /**
     * Attach Fragile / Building / Strong from the latest AI Recite covering each ayah.
     *
     * @param  list<array<string, mixed>>  $items
     * @return list<array<string, mixed>>
     */
    private function enrichWeaknessStrengthLabels(User $user, array $items): array
    {
        if ($items === []) {
            return [];
        }

        $attempts = AiReciteAttempt::query()
            ->where('user_id', $user->id)
            ->latest('id')
            ->limit(50)
            ->get();

        return array_map(function (array $item) use ($attempts) {
            $strength = $this->resolveAyahStrengthLabel(
                (int) ($item['surah_number'] ?? 0),
                (int) ($item['ayah_number'] ?? 0),
                $attempts
            );
            if ($strength === null) {
                return $item;
            }

            $item['strength'] = $strength;
            $item['strength_label'] = match ($strength) {
                'fragile' => 'Fragile',
                'building' => 'Building',
                'strong' => 'Strong',
                default => null,
            };
            $item['strength_key'] = 'strength_'.$strength;

            return $item;
        }, $items);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, AiReciteAttempt>  $attempts
     */
    private function resolveAyahStrengthLabel(int $surah, int $ayah, $attempts): ?string
    {
        if ($surah <= 0 || $ayah <= 0) {
            return null;
        }

        foreach ($attempts as $attempt) {
            if (! $this->aiAttemptCoversAyah($attempt, $surah, $ayah)) {
                continue;
            }

            $band = strtolower(trim((string) ($attempt->band ?? '')));
            $accuracy = (int) ($attempt->accuracy_percent ?? 0);
            $errorCount = $this->countAiAttemptErrorsForAyah($attempt, $surah, $ayah);

            if (
                in_array($band, ['weak', 'gentle', 'red'], true)
                || ($accuracy > 0 && $accuracy < 55)
                || $errorCount >= 3
            ) {
                return 'fragile';
            }

            if (
                in_array($band, ['mixed', 'focused', 'amber'], true)
                || ($accuracy >= 55 && $accuracy < 80)
                || $errorCount > 0
            ) {
                return 'building';
            }

            if (in_array($band, ['strong', 'green'], true) || $accuracy >= 80) {
                return 'strong';
            }

            // Covered by an attempt with no clear band — treat as building.
            return 'building';
        }

        return null;
    }

    private function aiAttemptCoversAyah(AiReciteAttempt $attempt, int $surah, int $ayah): bool
    {
        $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
        $rangeSurah = (int) ($range['surah'] ?? $range['surahId'] ?? $range['surah_number'] ?? $range['chapterId'] ?? 0);
        $from = (int) ($range['from'] ?? $range['rangeStart'] ?? $range['start'] ?? 0);
        $to = (int) ($range['to'] ?? $range['rangeEnd'] ?? $range['end'] ?? $from);

        if ($rangeSurah === $surah && $from > 0 && $ayah >= $from && $ayah <= max($from, $to)) {
            return true;
        }

        foreach (is_array($attempt->weak_words) ? $attempt->weak_words : [] as $word) {
            if (! is_array($word)) {
                continue;
            }
            $wordSurah = (int) ($word['surahNumber'] ?? $word['surah_number'] ?? $word['surah'] ?? $rangeSurah);
            $wordAyah = (int) ($word['ayahNumber'] ?? $word['ayah_number'] ?? $word['ayah'] ?? 0);
            if ($wordSurah === $surah && $wordAyah === $ayah) {
                return true;
            }
        }

        foreach (is_array($attempt->word_statuses) ? $attempt->word_statuses : [] as $status) {
            if (! is_array($status)) {
                continue;
            }
            $statusSurah = (int) ($status['surahNumber'] ?? $status['surah_number'] ?? $status['surah'] ?? $rangeSurah);
            $statusAyah = (int) ($status['ayahNumber'] ?? $status['ayah_number'] ?? $status['ayah'] ?? 0);
            if ($statusSurah === $surah && $statusAyah === $ayah) {
                return true;
            }
        }

        return false;
    }

    private function countAiAttemptErrorsForAyah(AiReciteAttempt $attempt, int $surah, int $ayah): int
    {
        $count = 0;
        $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
        $rangeSurah = (int) ($range['surah'] ?? $range['surahId'] ?? $range['surah_number'] ?? $range['chapterId'] ?? 0);

        foreach (is_array($attempt->weak_words) ? $attempt->weak_words : [] as $word) {
            if (! is_array($word)) {
                continue;
            }
            $wordSurah = (int) ($word['surahNumber'] ?? $word['surah_number'] ?? $word['surah'] ?? $rangeSurah);
            $wordAyah = (int) ($word['ayahNumber'] ?? $word['ayah_number'] ?? $word['ayah'] ?? 0);
            if ($wordSurah === $surah && $wordAyah === $ayah) {
                $count++;
            }
        }

        if ($count > 0) {
            return $count;
        }

        foreach (is_array($attempt->word_statuses) ? $attempt->word_statuses : [] as $status) {
            if (! is_array($status)) {
                continue;
            }
            $statusSurah = (int) ($status['surahNumber'] ?? $status['surah_number'] ?? $status['surah'] ?? $rangeSurah);
            $statusAyah = (int) ($status['ayahNumber'] ?? $status['ayah_number'] ?? $status['ayah'] ?? 0);
            if ($statusSurah !== $surah || $statusAyah !== $ayah) {
                continue;
            }
            $tone = strtolower((string) ($status['status'] ?? $status['result'] ?? $status['tone'] ?? ''));
            if (in_array($tone, ['wrong', 'error', 'missed', 'incorrect', 'weak', 'extra', 'missing'], true)) {
                $count++;
            }
        }

        return $count;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildRecentActivity(User $user): array
    {
        $events = collect();

        UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->whereIn('status', [
                UserSessionStatus::Completed->value,
                UserSessionStatus::EndedEarly->value,
                UserSessionStatus::Paused->value,
                UserSessionStatus::Active->value,
            ])
            ->latest('last_activity_at')
            ->limit(12)
            ->get()
            ->each(function (UserSession $session) use ($events) {
                $status = UserSessionStatus::tryFromMixed($session->status);
                $meta = is_array($session->metadata) ? $session->metadata : [];
                $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
                $surah = (int) ($session->surah_number ?? $config['chapterId'] ?? 0);
                $name = $surah ? QuranMetadata::name($surah) : 'your session';
                $start = (int) ($config['rangeStart'] ?? 0);
                $end = (int) ($config['rangeEnd'] ?? 0);
                $range = ($start > 0 && $end > 0)
                    ? ($start === $end ? "Ayah {$start}" : "Ayahs {$start}–{$end}")
                    : ($session->ayah_number ? 'Ayah '.$session->ayah_number : null);

                [$title, $at, $type] = match (true) {
                    $status === UserSessionStatus::Completed => [
                        trim('Completed '.($name).($range ? ', '.$range : '')),
                        $session->ended_at ?? $session->last_activity_at,
                        'session_completed',
                    ],
                    $status === UserSessionStatus::EndedEarly => [
                        trim('Ended early on '.($name).($range ? ', '.$range : '')),
                        $session->ended_at ?? $session->last_activity_at,
                        'session_ended_early',
                    ],
                    $status === UserSessionStatus::Paused => [
                        trim('Saved '.($name).($range ? ', '.$range : '')),
                        $session->paused_at ?? $session->last_activity_at,
                        'session_saved',
                    ],
                    $session->resumed_at !== null && $status === UserSessionStatus::Active => [
                        trim('Resumed '.($name).($range ? ', '.$range : '')),
                        $session->resumed_at ?? $session->last_activity_at,
                        'session_resumed',
                    ],
                    default => [null, null, null],
                };

                if (! $title || ! $at) {
                    return;
                }

                $hrefQuery = match (true) {
                    in_array($type, ['session_saved', 'session_resumed'], true) => ['resume' => 1, 'session' => (int) $session->id],
                    $surah > 0 && $start > 0 => ['surah' => $surah, 'from' => $start, 'to' => ($end ?: $start)],
                    $surah > 0 && $session->ayah_number => ['surah' => $surah, 'from' => (int) $session->ayah_number, 'to' => (int) $session->ayah_number],
                    default => [],
                };

                $events->push([
                    'type' => $type,
                    'title' => $title,
                    'context' => $range ? ($name.' · '.$range) : $name,
                    'occurred_at' => Carbon::parse($at)->toIso8601String(),
                    'href' => $this->memorisationHref($hrefQuery),
                ]);
            });

        AiReciteAttempt::query()
            ->where('user_id', $user->id)
            ->latest('id')
            ->limit(8)
            ->get()
            ->each(function (AiReciteAttempt $attempt) use ($events) {
                $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
                $surah = (int) ($range['surah'] ?? $range['surahId'] ?? $range['surah_number'] ?? 0);
                $name = $surah ? QuranMetadata::name($surah) : null;
                $from = (int) ($range['from'] ?? $range['start'] ?? $range['ayah_start'] ?? 0);
                $to = (int) ($range['to'] ?? $range['end'] ?? $range['ayah_end'] ?? $from);
                $context = $name
                    ? ($from > 0 ? ($from === $to ? "{$name} · Ayah {$from}" : "{$name} · Ayahs {$from}–{$to}") : $name)
                    : null;

                $events->push([
                    'type' => 'ai_recite',
                    'title' => 'Completed an AI Recite attempt'.($name ? ' on '.$name : ''),
                    'context' => $context,
                    'occurred_at' => optional($attempt->created_at)->toIso8601String(),
                    'href' => $this->memorisationHref(array_filter([
                        'surah' => $surah ?: null,
                        'from' => $from ?: null,
                        'to' => ($to ?: $from) ?: null,
                    ])),
                ]);
            });

        MemorisationAssessment::query()
            ->where('user_id', $user->id)
            ->latest('id')
            ->limit(8)
            ->get()
            ->each(function (MemorisationAssessment $assessment) use ($events) {
                $name = $assessment->surah_name ?: QuranMetadata::name((int) $assessment->surah_number);
                $from = (int) $assessment->start_ayah;
                $to = (int) $assessment->end_ayah;
                $range = $from > 0
                    ? ($from === $to ? "Ayah {$from}" : "Ayahs {$from}–{$to}")
                    : null;

                $events->push([
                    'type' => 'assessment',
                    'title' => 'Completed a memorisation assessment'.($name ? ' on '.$name : ''),
                    'context' => $name ? ($range ? "{$name} · {$range}" : $name) : $range,
                    'occurred_at' => optional($assessment->created_at)->toIso8601String(),
                    'href' => $this->memorisationHref(array_filter([
                        'surah' => (int) $assessment->surah_number ?: null,
                        'from' => $from ?: null,
                        'to' => ($to ?: $from) ?: null,
                    ])),
                ]);
            });

        SessionRecommendation::query()
            ->where('user_id', $user->id)
            ->latest('id')
            ->limit(6)
            ->get()
            ->each(function (SessionRecommendation $recommendation) use ($events) {
                $name = QuranMetadata::name((int) $recommendation->surah_number);
                $from = (int) $recommendation->ayah_start;
                $to = (int) $recommendation->ayah_end;
                $range = $from > 0
                    ? ($from === $to ? "Ayah {$from}" : "Ayahs {$from}–{$to}")
                    : null;

                $events->push([
                    'type' => 'recommendation',
                    'title' => 'New recommendation ready'.($name ? ' for '.$name : ''),
                    'context' => $name ? ($range ? "{$name} · {$range}" : $name) : $range,
                    'occurred_at' => optional($recommendation->created_at)->toIso8601String(),
                    'href' => $this->memorisationHref(array_filter([
                        'recommendation' => (int) $recommendation->id,
                        'surah' => (int) $recommendation->surah_number ?: null,
                        'from' => $from ?: null,
                        'to' => ($to ?: $from) ?: null,
                    ])),
                ]);
            });

        AyahNote::query()
            ->where('user_id', $user->id)
            ->latest('id')
            ->limit(8)
            ->get()
            ->each(function (AyahNote $note) use ($events) {
                $name = QuranMetadata::name((int) $note->surah_number);
                $events->push([
                    'type' => 'note',
                    'title' => 'Added a note'.($name ? ' on '.$name.', Ayah '.$note->ayah_number : ''),
                    'context' => $name ? "{$name} · Ayah {$note->ayah_number}" : 'Ayah '.$note->ayah_number,
                    'occurred_at' => optional($note->created_at)->toIso8601String(),
                    'href' => $this->memorisationHref([
                        'surah' => (int) $note->surah_number,
                        'from' => (int) $note->ayah_number,
                        'to' => (int) $note->ayah_number,
                    ]),
                ]);
            });

        MemorisationProgress::query()
            ->where('user_id', $user->id)
            ->whereIn('status', ['memorised', 'mastered'])
            ->where(function ($query) {
                $query->whereNotNull('completed_at')
                    ->orWhere('updated_at', '>=', now()->subDays(60));
            })
            ->orderByDesc('completed_at')
            ->orderByDesc('updated_at')
            ->limit(8)
            ->get()
            ->each(function (MemorisationProgress $row) use ($events) {
                $name = QuranMetadata::name((int) $row->surah_number);
                $at = $row->completed_at ?? $row->updated_at;
                $events->push([
                    'type' => 'ayah_memorised',
                    'title' => 'Marked '.$name.', Ayah '.$row->ayah_number.' as memorised',
                    'context' => "{$name} · Ayah {$row->ayah_number}",
                    'occurred_at' => optional($at)->toIso8601String(),
                    'href' => $this->memorisationHref([
                        'surah' => (int) $row->surah_number,
                        'from' => (int) $row->ayah_number,
                        'to' => (int) $row->ayah_number,
                    ]),
                ]);
            });

        return $events
            ->filter(fn ($event) => ! empty($event['occurred_at']) && ! empty($event['title']))
            ->sortByDesc('occurred_at')
            ->unique(fn ($event) => $event['title'].'|'.$event['occurred_at'])
            ->take(5)
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function buildRetention(
        User $user,
        ?UserSession $unfinished,
        ?SessionRecommendation $openRecommendation,
        ?MemorisationPracticePlan $activePlan,
    ): array {
        $streakState = $this->calculateStreakState($user);
        $streak = (int) ($streakState['days'] ?? 0);
        $lastActivity = UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->latest('last_activity_at')
            ->value('last_activity_at');

        $upcomingReview = null;
        $recommendationType = RecommendationType::tryFrom(
            (string) ($openRecommendation?->recommendation_type ?? '')
        );
        $isReviewRecommendation = $recommendationType
            && (
                $recommendationType->isRepeat()
                || $recommendationType === RecommendationType::Resume
            );

        if ($openRecommendation && $isReviewRecommendation) {
            $upcomingReview = [
                'recommendation_id' => (int) $openRecommendation->id,
                'surah_number' => $openRecommendation->surah_number,
                'surah_name' => QuranMetadata::name((int) $openRecommendation->surah_number),
                'ayah_start' => $openRecommendation->ayah_start,
                'ayah_end' => $openRecommendation->ayah_end,
                'technique' => $openRecommendation->recommended_technique,
                'detected_at' => optional($openRecommendation->created_at)->toIso8601String(),
                'message' => 'A short review will help keep these ayahs firm.',
            ];
        } elseif ($activePlan) {
            $upcomingReview = [
                'recommendation_id' => null,
                'surah_number' => $activePlan->surah_number,
                'surah_name' => QuranMetadata::name((int) $activePlan->surah_number),
                'ayah_start' => $activePlan->start_ayah,
                'ayah_end' => $activePlan->end_ayah,
                'technique' => $this->planTechnique($activePlan),
                'detected_at' => optional($activePlan->updated_at)->toIso8601String(),
                'message' => 'Continue your practice plan with a short review.',
            ];
        }

        $todaysFocus = null;
        if ($unfinished) {
            $surah = (int) $unfinished->surah_number;
            $todaysFocus = [
                'label' => 'Continue where you left off',
                'detail' => ($surah ? QuranMetadata::name($surah) : 'Your session')
                    .($unfinished->ayah_number ? ' · Ayah '.$unfinished->ayah_number : ''),
            ];
        } elseif ($upcomingReview) {
            $todaysFocus = [
                'label' => 'Today’s focus',
                'detail' => trim(($upcomingReview['surah_name'] ?? '').' · review'),
            ];
        } elseif ($openRecommendation) {
            $todaysFocus = [
                'label' => 'Latest recommendation',
                'detail' => QuranMetadata::name((int) $openRecommendation->surah_number)
                    .' · Ayahs '.$openRecommendation->ayah_start.'–'.$openRecommendation->ayah_end,
            ];
        }

        return [
            'streak_days' => $streak,
            'streak_broken' => (bool) ($streakState['broken'] ?? false),
            'streak_has_history' => (bool) ($streakState['has_history'] ?? false),
            'last_activity_at' => $lastActivity ? Carbon::parse($lastActivity)->toIso8601String() : null,
            'todays_focus' => $todaysFocus,
            'upcoming_review' => $upcomingReview,
            'incomplete_session' => $unfinished ? [
                'surah_name' => QuranMetadata::name((int) $unfinished->surah_number),
                'ayah_number' => $unfinished->ayah_number,
                'status' => UserSessionStatus::tryFromMixed($unfinished->status)?->value,
            ] : null,
            'latest_recommendation' => $openRecommendation ? [
                'surah_name' => QuranMetadata::name((int) $openRecommendation->surah_number),
                'ayah_start' => $openRecommendation->ayah_start,
                'ayah_end' => $openRecommendation->ayah_end,
                'technique' => $openRecommendation->recommended_technique,
            ] : null,
        ];
    }

    private function countSavedSessions(User $user): int
    {
        $sync = MemorisationSyncState::query()->where('user_id', $user->id)->first();
        if ($sync?->state) {
            $state = json_decode($sync->state, true);
            if (is_array($state)) {
                $saved = $state['savedSessions'] ?? null;
                if (! is_array($saved) && is_array($state['workspaceState'] ?? null)) {
                    $saved = $state['workspaceState']['savedSessions'] ?? null;
                }
                if (is_array($saved)) {
                    $count = count(array_filter($saved, fn ($row) => is_array($row) && ! empty($row['id'])));
                    if ($count > 0) {
                        return $count;
                    }
                }
            }
        }

        // Fallback: unfinished/resumable sessions in the normalised table.
        return UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->whereIn('status', [
                UserSessionStatus::Active->value,
                UserSessionStatus::Paused->value,
                UserSessionStatus::Interrupted->value,
            ])
            ->count();
    }

    /**
     * @return array{days: int, broken: bool, has_history: bool}
     */
    private function calculateStreakState(User $user): array
    {
        $dates = LearningAnalytic::query()
            ->where('user_id', $user->id)
            ->where(function ($query) {
                $query->where('ayahs_memorised', '>', 0)
                    ->orWhere('sessions_completed', '>', 0)
                    ->orWhere('ayahs_reviewed', '>', 0)
                    ->orWhere('total_minutes', '>', 0);
            })
            ->orderByDesc('session_date')
            ->limit(90)
            ->pluck('session_date')
            ->map(fn ($date) => Carbon::parse($date)->toDateString())
            ->unique()
            ->values();

        if ($dates->isEmpty()) {
            // Fall back to distinct session activity days.
            $dates = UserSession::query()
                ->where('user_id', $user->id)
                ->where('is_onboarding_example', false)
                ->whereNotNull('last_activity_at')
                ->orderByDesc('last_activity_at')
                ->limit(90)
                ->pluck('last_activity_at')
                ->map(fn ($date) => Carbon::parse($date)->toDateString())
                ->unique()
                ->values();
        }

        if ($dates->isEmpty()) {
            return [
                'days' => 0,
                'broken' => false,
                'has_history' => false,
            ];
        }

        $cursor = now()->startOfDay();
        $yesterday = $cursor->copy()->subDay()->toDateString();
        $mostRecent = $dates->first();

        // No session yesterday (and none today) — streak is broken.
        if ($mostRecent !== $cursor->toDateString() && $mostRecent !== $yesterday) {
            return [
                'days' => 0,
                'broken' => true,
                'has_history' => true,
            ];
        }

        if ($mostRecent === $yesterday) {
            $cursor = $cursor->subDay();
        }

        $streak = 0;
        $set = $dates->flip();
        while ($set->has($cursor->toDateString())) {
            $streak++;
            $cursor->subDay();
        }

        return [
            'days' => $streak,
            'broken' => false,
            'has_history' => true,
        ];
    }

    private function calculateStreak(User $user): int
    {
        return (int) ($this->calculateStreakState($user)['days'] ?? 0);
    }

    private function rangeCompletionPercent(User $user, int $surah, int $start, int $end): ?int
    {
        if ($surah <= 0 || $start <= 0 || $end < $start) {
            return null;
        }

        $total = ($end - $start) + 1;
        $done = MemorisationProgress::query()
            ->where('user_id', $user->id)
            ->where('surah_number', $surah)
            ->whereBetween('ayah_number', [$start, $end])
            ->whereIn('status', ['memorised', 'mastered'])
            ->count();

        return (int) round(($done / max(1, $total)) * 100);
    }

    private function planCompletionPercent(MemorisationPracticePlan $plan): ?int
    {
        $completion = is_array($plan->completion_data) ? $plan->completion_data : [];
        if (isset($completion['percent'])) {
            return max(0, min(100, (int) $completion['percent']));
        }
        if (isset($completion['completion_percent'])) {
            return max(0, min(100, (int) $completion['completion_percent']));
        }

        $priority = is_array($plan->priority_ayahs) ? $plan->priority_ayahs : [];
        if ($priority === []) {
            return null;
        }

        $done = 0;
        foreach ($priority as $entry) {
            if (is_array($entry) && ! empty($entry['completed'])) {
                $done++;
            }
        }

        return (int) round(($done / count($priority)) * 100);
    }

    private function planTechnique(MemorisationPracticePlan $plan): ?string
    {
        $techniques = is_array($plan->techniques) ? $plan->techniques : [];
        if ($techniques === []) {
            return null;
        }
        $first = $techniques[0];
        if (is_string($first)) {
            return $first;
        }
        if (is_array($first)) {
            return (string) ($first['name'] ?? $first['label'] ?? $first['id'] ?? '');
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private function techniqueLabel(?string $mode, array $meta): ?string
    {
        $fromMeta = $meta['technique'] ?? $meta['recommended_technique'] ?? null;
        if (is_string($fromMeta) && $fromMeta !== '') {
            return $fromMeta;
        }

        return $mode ? ucfirst(str_replace('_', ' ', $mode)) : null;
    }

    /**
     * @param  list<array<string, mixed>>  $phrases
     */
    private function phraseForAyah(array $phrases, int $ayah): ?string
    {
        foreach ($phrases as $phrase) {
            if (! is_array($phrase)) {
                continue;
            }
            if ((int) ($phrase['ayah_number'] ?? $phrase['ayahNumber'] ?? 0) === $ayah) {
                $text = trim((string) ($phrase['text'] ?? ''));
                if ($text !== '') {
                    return $text;
                }
            }
        }

        return null;
    }

    /**
     * @param  list<array<string, mixed>>  $words
     */
    private function wordForAyah(array $words, int $ayah): ?string
    {
        foreach ($words as $word) {
            if (! is_array($word)) {
                continue;
            }
            if ((int) ($word['ayah_number'] ?? $word['ayahNumber'] ?? $word['ayah'] ?? 0) === $ayah) {
                $text = trim((string) ($word['text'] ?? $word['word'] ?? $word['target_word'] ?? ''));
                if ($text !== '') {
                    return $text;
                }
            }
        }

        return null;
    }

    private function firstName(User $user): string
    {
        $name = trim((string) ($user->name ?? ''));
        if ($name === '') {
            return 'friend';
        }

        $parts = preg_split('/\s+/', $name) ?: [];

        return $parts[0] ?: 'friend';
    }

    /**
     * Build a memorisation workspace URL with actionable query params.
     *
     * @param  array<string, scalar|null>  $query
     */
    private function memorisationHref(array $query = []): string
    {
        $base = route('memorisation');
        $clean = [];
        foreach ($query as $key => $value) {
            if ($value === null || $value === '' || $value === false) {
                continue;
            }
            $clean[$key] = $value;
        }

        if ($clean === []) {
            return $base;
        }

        return $base.'?'.http_build_query($clean);
    }
}


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
use App\Services\Learning\SessionAnalysisQueryService;
use App\Support\QuranMetadata;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * Aggregates authenticated-user dashboard data from existing learning tables.
 * Never accepts a client-supplied user id — always scopes via the given User.
 */
class DashboardService
{
    private const BUILD_CACHE_TTL_SECONDS = 45;

    public function __construct(
        private readonly SessionLifecycleService $lifecycle,
        private readonly MainMemorisationPositionService $mainPosition,
        private readonly SessionAnalysisQueryService $sessionAnalysis,
    ) {
    }

    public static function forgetForUser(User $user): void
    {
        try {
            Cache::forget('dashboard:v1:'.$user->id.':7');
            Cache::forget('dashboard:v1:'.$user->id.':30');
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function build(User $user, int $chartDays = 30): array
    {
        $chartDays = in_array($chartDays, [7, 30], true) ? $chartDays : 30;
        $skipCache = app()->runningUnitTests() && ! config('mutqin.perf_benchmarks', false);
        if ($skipCache) {
            return $this->buildFresh($user, $chartDays);
        }

        $cacheKey = 'dashboard:v1:'.$user->id.':'.$chartDays;

        return Cache::remember($cacheKey, self::BUILD_CACHE_TTL_SECONDS, function () use ($user, $chartDays) {
            return $this->utf8Safe($this->buildFresh($user, $chartDays));
        });
    }

    /**
     * Minimal payload so the dashboard page can render after a build failure.
     *
     * @return array<string, mixed>
     */
    public function emptyPayload(User $user, int $chartDays = 30): array
    {
        $chartDays = in_array($chartDays, [7, 30], true) ? $chartDays : 30;
        $firstName = $this->firstName($user);

        return [
            'meta' => [
                'owner_id' => (int) $user->id,
                'generated_at' => now()->toIso8601String(),
                'chart_days' => $chartDays,
            ],
            'welcome' => [
                'greeting' => 'Assalamu alaikum, '.$firstName,
                'first_name' => $firstName,
                'supporting_message' => 'Continue gently from where you left off.',
                'message_key' => 'supporting_message',
            ],
            'continue' => [
                'action_type' => 'start_new',
                'cta_key' => 'cta_start',
                'cta_label' => 'Begin memorising',
                'message_key' => 'msg_start_new',
                'href' => $this->memorisationHref(),
                'session_id' => null,
                'recommendation_id' => null,
                'surah_number' => null,
                'surah_name' => null,
                'ayah_start' => null,
                'ayah_end' => null,
                'last_ayah' => null,
                'completion_percent' => null,
                'last_activity_at' => null,
                'recommended_technique' => null,
                'message' => 'Open memorisation to start a new session.',
            ],
            'recommended_next' => null,
            'journey' => $this->emptyJourney(),
            'snapshot' => [
                'completed_sessions' => ['value' => 0, 'change_7d' => 0, 'label' => 'Completed sessions', 'context' => 'Fully finished ranges only'],
                'saved_sessions' => ['value' => 0, 'change_7d' => null, 'label' => 'Saved sessions', 'context' => 'Resumable or explicitly saved'],
                'memorised_ayahs' => ['value' => 0, 'change_7d' => 0, 'label' => 'Memorised ayahs', 'context' => 'Confirmed memorisation progress'],
                'ai_recite_attempts' => ['value' => 0, 'change_7d' => 0, 'label' => 'AI Recite attempts', 'context' => 'Submitted recitation checks'],
                'notes' => ['value' => 0, 'change_7d' => 0, 'label' => 'Notes and reflections', 'context' => 'Your private ayah notes'],
            ],
            'progress' => [
                'current_surah_number' => null,
                'current_surah_name' => null,
                'ayah_start' => null,
                'ayah_end' => null,
                'current_ayah' => null,
                'memorised_ayah_count' => 0,
                'learning_ayah_count' => 0,
                'surah_ayah_count' => null,
                'surah_practised_ayah_count' => 0,
                'surah_memorised_ayah_count' => 0,
                'active_plan_completion_percent' => null,
                'active_plan_title' => null,
                'range_completion_percent' => null,
                'surah_completion_percent' => null,
                'last_activity_at' => null,
            ],
            'chart' => [
                'days' => $chartDays,
                'metric' => 'ayahs_memorised',
                'secondary_metric' => 'sessions_completed',
                'points' => [],
                'summary' => 'No memorisation yet in this period. Even a few quiet minutes with the Qur’an bring barakah.',
                'summary_key' => 'chart_summary_empty',
                'summary_params' => [
                    'days' => $chartDays,
                    'ayahs' => 0,
                    'sessions' => 0,
                    'active_days' => 0,
                ],
                'is_empty' => true,
            ],
            'week_summary' => [
                'sessions' => 0,
                'ai_checks' => 0,
                'ayahs_practised' => 0,
                'is_empty' => true,
                'from' => now()->startOfWeek()->toDateString(),
                'to' => now()->endOfDay()->toDateString(),
            ],
            'weaknesses' => [
                'items' => [],
                'all_items' => [],
                'total' => 0,
                'has_more' => false,
                'view_all_href' => null,
                'empty_title' => 'Alhamdulillah — nothing needs special attention right now.',
                'empty_message' => 'When you complete a memorisation check, Mutqin will gently highlight ayahs that need more care.',
                'empty_title_key' => 'weak_empty_title',
                'empty_message_key' => 'weak_empty_message',
            ],
            'activity' => [],
            'retention' => [
                'streak_days' => 0,
                'streak_broken' => false,
                'has_history' => false,
                'last_activity_at' => null,
                'chips' => [],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function buildFresh(User $user, int $chartDays): array
    {
        $unfinished = $this->lifecycle->currentUnfinished($user);
        $lastPosition = UserLastPosition::query()->where('user_id', $user->id)->first();
        $activePlan = MemorisationPracticePlan::query()
            ->where('user_id', $user->id)
            ->where('status', MemorisationPracticePlan::STATUS_ACTIVE)
            ->latest('started_at')
            ->latest('id')
            ->first();
        $openRecommendation = $this->resolveOpenRecommendation($user);

        $main = $this->mainPosition->get($user);
        $snapshot = $this->buildSnapshot($user);
        $progress = $this->buildProgress($user, $unfinished, $lastPosition, $activePlan, $main);
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
            $main
        );
        $recommendedNext = $this->buildRecommendedNext($openRecommendation);
        $journey = $this->buildJourney($user, $main, $continue, $retention, $weaknesses);

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
            'journey' => $journey,
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
     * Copy is client-localised via outcome_key / structured surah+ayah fields.
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
                $start = (int) ($config['rangeStart'] ?? 0);
                $end = (int) ($config['rangeEnd'] ?? 0);
                if ($start <= 0 && $session->ayah_number) {
                    $start = (int) $session->ayah_number;
                    $end = $start;
                }

                [$outcomeKey, $at] = match (true) {
                    $status === UserSessionStatus::Completed => [
                        'session_completed',
                        $session->ended_at ?? $session->last_activity_at,
                    ],
                    $status === UserSessionStatus::EndedEarly => [
                        'session_ended_early',
                        $session->ended_at ?? $session->last_activity_at,
                    ],
                    $status === UserSessionStatus::Paused => [
                        'session_saved',
                        $session->paused_at ?? $session->last_activity_at,
                    ],
                    default => [null, null],
                };

                if (! $outcomeKey || ! $at) {
                    return;
                }

                $events->push($this->activityEvent([
                    'id' => 'session-'.$session->id,
                    'type' => 'session',
                    'source_id' => (int) $session->id,
                    'analysis_kind' => 'session',
                    'has_analysis' => false,
                    'surah_number' => $surah ?: null,
                    'surah_name' => $surah ? QuranMetadata::name($surah) : null,
                    'ayah_start' => $start > 0 ? $start : null,
                    'ayah_end' => $end > 0 ? $end : null,
                    'outcome_key' => $outcomeKey,
                    'occurred_at' => Carbon::parse($at)->toIso8601String(),
                    'href' => $this->memorisationHref(array_filter([
                        'surah' => $surah ?: null,
                        'from' => $start ?: null,
                        'to' => ($end ?: $start) ?: null,
                    ])),
                ]));
            });

        AiReciteAttempt::query()
            ->where('user_id', $user->id)
            ->latest('id')
            ->limit($limit)
            ->get()
            ->each(function (AiReciteAttempt $attempt) use ($events) {
                $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
                $surah = (int) ($range['surah'] ?? $range['surahId'] ?? $range['surah_number'] ?? 0);
                $from = (int) ($range['from'] ?? $range['start'] ?? $range['ayah_start'] ?? 0);
                $to = (int) ($range['to'] ?? $range['end'] ?? $range['ayah_end'] ?? $from);
                $band = is_string($attempt->band) ? strtolower($attempt->band) : null;
                $accuracy = $attempt->accuracy_percent !== null ? (int) $attempt->accuracy_percent : null;
                $hasResult = ($band !== null && $band !== '') || $accuracy !== null;

                $events->push($this->activityEvent([
                    'id' => 'ai-'.$attempt->id,
                    'type' => 'ai_check',
                    'source_id' => (int) $attempt->id,
                    'analysis_kind' => 'attempt',
                    'has_analysis' => true,
                    'surah_number' => $surah ?: null,
                    'surah_name' => $surah ? QuranMetadata::name($surah) : null,
                    'ayah_start' => $from > 0 ? $from : null,
                    'ayah_end' => $to > 0 ? $to : null,
                    'outcome_key' => $hasResult ? 'ai_result' : 'ai_check',
                    'outcome_params' => array_filter([
                        'band' => $band,
                        'accuracy' => $accuracy,
                    ], fn ($value) => $value !== null && $value !== ''),
                    'occurred_at' => optional($attempt->created_at)->toIso8601String(),
                    'href' => $this->memorisationHref(array_filter([
                        'surah' => $surah ?: null,
                        'from' => $from ?: null,
                        'to' => ($to ?: $from) ?: null,
                    ])),
                ]));
            });

        AyahNote::query()
            ->where('user_id', $user->id)
            ->latest('updated_at')
            ->latest('id')
            ->limit($limit)
            ->get()
            ->each(function (AyahNote $note) use ($events) {
                $body = trim((string) preg_replace('/\s+/u', ' ', (string) $note->body));
                $snippet = $body !== ''
                    ? (mb_strlen($body) > 96 ? mb_substr($body, 0, 96).'…' : $body)
                    : null;

                $events->push($this->activityEvent([
                    'id' => 'note-'.$note->id,
                    'type' => 'note',
                    'surah_number' => (int) $note->surah_number ?: null,
                    'surah_name' => QuranMetadata::name((int) $note->surah_number),
                    'ayah_start' => (int) $note->ayah_number ?: null,
                    'ayah_end' => (int) $note->ayah_number ?: null,
                    'outcome_key' => $snippet !== null ? 'note_body' : 'note_saved',
                    'outcome_params' => $snippet !== null ? ['body' => $snippet] : [],
                    'occurred_at' => optional($note->updated_at ?? $note->created_at)->toIso8601String(),
                    'href' => $this->memorisationHref([
                        'surah' => (int) $note->surah_number,
                        'from' => (int) $note->ayah_number,
                        'to' => (int) $note->ayah_number,
                    ]),
                ]));
            });

        $events = $events
            ->filter(fn ($event) => ! empty($event['occurred_at']))
            ->sortByDesc('occurred_at')
            ->take($limit)
            ->values();

        $sessionIds = $events
            ->filter(fn ($event) => ($event['analysis_kind'] ?? '') === 'session')
            ->pluck('source_id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
        $sessionModels = $sessionIds === []
            ? collect()
            : UserSession::query()
                ->where('user_id', $user->id)
                ->whereIn('id', $sessionIds)
                ->get();
        $flags = $this->sessionAnalysis->analysisFlagsForSessions($user, $sessionModels);

        return $events
            ->map(function (array $event) use ($flags) {
                if (($event['analysis_kind'] ?? '') === 'session') {
                    $event['has_analysis'] = (bool) ($flags[(int) ($event['source_id'] ?? 0)] ?? false);
                }

                return $event;
            })
            ->all();
    }

    /**
     * Normalise an activity event with stable keys for client-side i18n.
     *
     * @param  array<string, mixed>  $event
     * @return array<string, mixed>
     */
    private function activityEvent(array $event): array
    {
        $event['outcome_key'] = (string) ($event['outcome_key'] ?? '');
        $event['outcome_params'] = is_array($event['outcome_params'] ?? null)
            ? $event['outcome_params']
            : [];
        $event['surah_number'] = isset($event['surah_number']) ? (int) $event['surah_number'] ?: null : null;
        $event['ayah_start'] = isset($event['ayah_start']) ? (int) $event['ayah_start'] ?: null : null;
        $event['ayah_end'] = isset($event['ayah_end']) ? (int) $event['ayah_end'] ?: null : null;

        // English fallbacks kept for older clients / debugging.
        $event['title'] = $event['title'] ?? $this->activityTitleFallback($event);
        $event['outcome'] = $event['outcome'] ?? $this->activityOutcomeFallback($event);

        return $event;
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function activityTitleFallback(array $event): string
    {
        $name = (string) ($event['surah_name'] ?? '');
        $start = (int) ($event['ayah_start'] ?? 0);
        $end = (int) ($event['ayah_end'] ?? 0);
        $range = '';
        if ($start > 0 && $end > 0 && $start !== $end) {
            $range = "Ayahs {$start}–{$end}";
        } elseif ($start > 0) {
            $range = "Ayah {$start}";
        }

        if ($name !== '' && $range !== '') {
            return "{$name} · {$range}";
        }
        if ($name !== '') {
            return $name;
        }
        if ($range !== '') {
            return $range;
        }

        return match ((string) ($event['type'] ?? '')) {
            'session', 'session_completed', 'session_ended_early', 'session_saved', 'session_resumed' => 'Session',
            'ai_check', 'ai_recite' => 'AI check',
            'note' => 'Note',
            'assessment' => 'Assessment',
            'recommendation' => 'Recommendation',
            'ayah_memorised' => 'Memorised ayah',
            default => 'Activity',
        };
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function activityOutcomeFallback(array $event): string
    {
        $params = is_array($event['outcome_params'] ?? null) ? $event['outcome_params'] : [];

        return match ((string) ($event['outcome_key'] ?? '')) {
            'session_completed' => 'Completed',
            'session_ended_early' => 'Ended early',
            'session_saved' => 'Saved',
            'session_resumed' => 'Resumed',
            'ai_result' => trim(implode(' · ', array_filter([
                isset($params['band']) ? ucfirst((string) $params['band']) : null,
                isset($params['accuracy']) ? ((int) $params['accuracy']).'%' : null,
            ]))),
            'ai_check' => 'AI check',
            'note_body' => (string) ($params['body'] ?? ''),
            'note_saved' => 'Note saved',
            'assessment_completed' => 'Assessment completed',
            'recommendation_ready' => 'Recommendation ready',
            'ayah_memorised' => 'Memorised',
            default => '',
        };
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
        ?array $main = null,
    ): array {
        if ($unfinished && $this->sessionMatchesMain($unfinished, $main)) {
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
            $remembered = $this->mainPosition->rememberedInRange($user, [
                'surah_number' => $surah,
                'ayah_start' => $rangeStart,
                'ayah_end' => $rangeEnd,
            ]);

            return [
                'action_type' => $isPausedOrInterrupted ? 'resume_session' : 'continue_session',
                'cta_key' => $isPausedOrInterrupted ? 'cta_resume' : 'cta_continue',
                'cta_label' => $isPausedOrInterrupted ? 'Resume session' : 'Continue session',
                'message_key' => $isPausedOrInterrupted ? 'msg_resume' : 'msg_continue',
                'href' => $this->memorisationHref([
                    'resume' => 1,
                    'session' => (int) $unfinished->id,
                    'journey' => 'main',
                ]),
                'session_id' => (int) $unfinished->id,
                'recommendation_id' => null,
                'surah_number' => $surah ?: null,
                'surah_name' => $surah ? QuranMetadata::name($surah) : null,
                'ayah_start' => $rangeStart ?: null,
                'ayah_end' => $rangeEnd ?: null,
                'last_ayah' => $unfinished->ayah_number,
                'remembered_count' => $remembered['remembered_count'],
                'range_ayah_count' => $remembered['range_ayah_count'],
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

        if ($incomplete && $this->sessionMatchesMain($incomplete, $main)) {
            $meta = is_array($incomplete->metadata) ? $incomplete->metadata : [];
            $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
            $surah = (int) ($incomplete->surah_number ?? $config['chapterId'] ?? 0);
            $rangeStart = (int) ($config['rangeStart'] ?? $incomplete->ayah_number ?? 0);
            $rangeEnd = (int) ($config['rangeEnd'] ?? $incomplete->ayah_number ?? 0);
            $query = array_filter([
                'surah' => $surah ?: null,
                'from' => $rangeStart ?: null,
                'to' => $rangeEnd ?: null,
                'journey' => 'main',
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

        if ($openRecommendation && $this->recommendationContinuesMain($openRecommendation, $main)) {
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
                    'journey' => 'main',
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

        if ($activePlan && $this->rangeMatchesMain($main, (int) $activePlan->surah_number, (int) $activePlan->start_ayah, (int) $activePlan->end_ayah)) {
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
                    'journey' => 'main',
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

        if ($main) {
            $surah = (int) $main['surah_number'];
            $from = (int) $main['ayah_start'];
            $to = (int) $main['ayah_end'];
            $remembered = $this->mainPosition->rememberedInRange($user, $main);

            return [
                'action_type' => 'continue_range',
                'cta_key' => 'cta_continue_memorisation',
                'cta_label' => 'Continue',
                'message_key' => 'msg_continue',
                'href' => $this->memorisationHref([
                    'surah' => $surah,
                    'from' => $from,
                    'to' => $to,
                    'journey' => 'main',
                ]),
                'session_id' => null,
                'recommendation_id' => null,
                'surah_number' => $surah,
                'surah_name' => $main['surah_name'] ?? QuranMetadata::name($surah),
                'ayah_start' => $from,
                'ayah_end' => $to,
                'last_ayah' => $to,
                'remembered_count' => $remembered['remembered_count'],
                'range_ayah_count' => $remembered['range_ayah_count'],
                'completion_percent' => $this->rangeCompletionPercent($user, $surah, $from, $to),
                'last_activity_at' => optional($lastPosition?->last_opened_at)->toIso8601String(),
                'recommended_technique' => null,
                'message' => 'Continue your memorisation.',
            ];
        }

        return [
            'action_type' => 'start_new',
            'cta_key' => 'cta_start',
            'cta_label' => 'Begin memorising',
            'message_key' => 'msg_start_new',
            'href' => $this->memorisationHref(['setup' => 1, 'journey' => 'choose']),
            'session_id' => null,
            'recommendation_id' => null,
            'surah_number' => null,
            'surah_name' => null,
            'ayah_start' => null,
            'ayah_end' => null,
            'last_ayah' => null,
            'remembered_count' => null,
            'range_ayah_count' => null,
            'completion_percent' => null,
            'last_activity_at' => optional($lastPosition?->last_opened_at)->toIso8601String(),
            'recommended_technique' => null,
            'message' => 'Open memorisation to start a new session.',
        ];
    }

    /**
     * @param  array<string, mixed>|null  $main
     */
    private function sessionMatchesMain(UserSession $session, ?array $main): bool
    {
        if ($main === null) {
            return true;
        }

        $meta = is_array($session->metadata) ? $session->metadata : [];
        $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
        $surah = (int) ($session->surah_number ?? $config['chapterId'] ?? 0);
        $from = (int) ($config['rangeStart'] ?? $session->ayah_number ?? 0);
        $to = (int) ($config['rangeEnd'] ?? $from);

        return $this->rangeMatchesMain($main, $surah, $from, $to);
    }

    /**
     * @param  array<string, mixed>|null  $main
     */
    private function recommendationContinuesMain(SessionRecommendation $recommendation, ?array $main): bool
    {
        $type = RecommendationType::tryFrom((string) $recommendation->recommendation_type);
        if (! $type || (! $type->isContinue() && $type !== RecommendationType::NextSurah)) {
            return false;
        }

        $surah = (int) $recommendation->surah_number;
        $from = (int) $recommendation->ayah_start;
        $to = (int) $recommendation->ayah_end;

        return $this->rangeMatchesMain($main, $surah, $from, $to);
    }

    /**
     * @param  array<string, mixed>|null  $main
     */
    private function rangeMatchesMain(?array $main, int $surah, int $from, int $to): bool
    {
        if ($surah <= 0 || $from <= 0) {
            return false;
        }

        if ($main === null) {
            return true;
        }

        $to = max($from, $to);

        return $this->mainPosition->overlaps($main, $surah, $from, $to)
            || $this->mainPosition->isContinuation($main, $surah, $from, $to);
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyJourney(): array
    {
        return [
            'has_started' => false,
            'continue' => null,
            'review' => null,
            'overall' => [
                'memorised_ayah_count' => 0,
                'quran_ayah_count' => QuranMetadata::totalAyahCount(),
                'percent' => 0,
            ],
            'start_beginning_href' => $this->memorisationHref([
                'surah' => 1,
                'from' => 1,
                'to' => 7,
                'journey' => 'main',
            ]),
            'choose_start_href' => $this->memorisationHref([
                'setup' => 1,
                'journey' => 'choose',
            ]),
        ];
    }

    /**
     * @param  array<string, mixed>|null  $main
     * @param  array<string, mixed>  $continue
     * @param  array<string, mixed>  $retention
     * @param  array<string, mixed>  $weaknesses
     * @return array<string, mixed>
     */
    private function buildJourney(
        User $user,
        ?array $main,
        array $continue,
        array $retention,
        array $weaknesses,
    ): array {
        $journey = $this->emptyJourney();
        $journey['overall'] = $this->mainPosition->overallProgress($user);
        $journey['has_started'] = $main !== null;

        if ($main === null) {
            return $journey;
        }

        $remembered = $this->mainPosition->rememberedInRange($user, $main);
        $journey['continue'] = [
            'surah_number' => $continue['surah_number'] ?? $main['surah_number'],
            'surah_name' => $continue['surah_name'] ?? $main['surah_name'],
            'ayah_start' => $continue['ayah_start'] ?? $main['ayah_start'],
            'ayah_end' => $continue['ayah_end'] ?? $main['ayah_end'],
            'remembered_count' => $continue['remembered_count'] ?? $remembered['remembered_count'],
            'range_ayah_count' => $continue['range_ayah_count'] ?? $remembered['range_ayah_count'],
            'href' => $continue['href'] ?? $journey['start_beginning_href'],
            'action_type' => $continue['action_type'] ?? 'continue_range',
            'cta_key' => 'cta_continue_memorisation',
        ];
        $journey['review'] = $this->buildJourneyReview($main, $retention, $weaknesses);

        return $journey;
    }

    /**
     * @param  array<string, mixed>  $main
     * @param  array<string, mixed>  $retention
     * @param  array<string, mixed>  $weaknesses
     * @return array<string, mixed>|null
     */
    private function buildJourneyReview(array $main, array $retention, array $weaknesses): ?array
    {
        $review = $retention['upcoming_review'] ?? null;
        if (is_array($review)) {
            $surah = (int) ($review['surah_number'] ?? 0);
            $from = (int) ($review['ayah_start'] ?? 0);
            $to = (int) ($review['ayah_end'] ?? $from);
            if ($surah > 0 && ! $this->rangeMatchesMain($main, $surah, $from, $to)) {
                $recommendationId = isset($review['recommendation_id']) ? (int) $review['recommendation_id'] : null;

                return [
                    'surah_number' => $surah,
                    'surah_name' => $review['surah_name'] ?? QuranMetadata::name($surah),
                    'ayah_start' => $from ?: null,
                    'ayah_end' => $to ?: null,
                    'href' => $this->memorisationHref(array_filter([
                        'recommendation' => $recommendationId ?: null,
                        'surah' => $surah,
                        'from' => $from ?: null,
                        'to' => $to ?: null,
                    ])),
                ];
            }
        }

        $item = $weaknesses['items'][0] ?? null;
        if (! is_array($item)) {
            return null;
        }

        $surah = (int) ($item['surah_number'] ?? 0);
        $ayah = (int) ($item['ayah_number'] ?? 0);
        if ($surah <= 0 || $this->rangeMatchesMain($main, $surah, $ayah ?: 1, $ayah ?: 1)) {
            return null;
        }

        return [
            'surah_number' => $surah,
            'surah_name' => $item['surah_name'] ?? QuranMetadata::name($surah),
            'ayah_start' => $ayah ?: null,
            'ayah_end' => $ayah ?: null,
            'ayah_number' => $ayah ?: null,
            'phrase' => $item['phrase'] ?? null,
            'strength' => $item['strength'] ?? null,
            'key' => $item['key'] ?? null,
            'href' => $item['href'] ?? $this->murajaahReviewHref($surah, $ayah ?: 1),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function buildSnapshot(User $user): array
    {
        $sevenDaysAgo = now()->subDays(7)->startOfDay();

        $sessionAgg = UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->selectRaw(
                'SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed_total,
                 SUM(CASE WHEN status = ? AND ended_at >= ? THEN 1 ELSE 0 END) as completed_recent',
                [UserSessionStatus::Completed->value, UserSessionStatus::Completed->value, $sevenDaysAgo]
            )
            ->first();

        $completedTotal = (int) ($sessionAgg->completed_total ?? 0);
        $completedRecent = (int) ($sessionAgg->completed_recent ?? 0);
        $savedTotal = $this->countSavedSessions($user);

        $progressAgg = MemorisationProgress::query()
            ->where('user_id', $user->id)
            ->selectRaw(
                "SUM(CASE WHEN status IN ('memorised', 'mastered') THEN 1 ELSE 0 END) as memorised_total,
                 SUM(CASE WHEN status IN ('memorised', 'mastered')
                      AND (completed_at >= ? OR (completed_at IS NULL AND updated_at >= ?))
                      THEN 1 ELSE 0 END) as memorised_recent",
                [$sevenDaysAgo, $sevenDaysAgo]
            )
            ->first();

        $memorisedTotal = (int) ($progressAgg->memorised_total ?? 0);
        $memorisedRecent = (int) ($progressAgg->memorised_recent ?? 0);

        $aiAgg = AiReciteAttempt::query()
            ->where('user_id', $user->id)
            ->selectRaw(
                'COUNT(*) as total,
                 SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as recent',
                [$sevenDaysAgo]
            )
            ->first();

        $aiReciteTotal = (int) ($aiAgg->total ?? 0);
        $aiReciteRecent = (int) ($aiAgg->recent ?? 0);

        $notesAgg = AyahNote::query()
            ->where('user_id', $user->id)
            ->selectRaw(
                'COUNT(*) as total,
                 SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as recent',
                [$sevenDaysAgo]
            )
            ->first();

        $notesTotal = (int) ($notesAgg->total ?? 0);
        $notesRecent = (int) ($notesAgg->recent ?? 0);

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
     * @param  array<string, mixed>|null  $main
     * @return array<string, mixed>
     */
    private function buildProgress(
        User $user,
        ?UserSession $unfinished,
        ?UserLastPosition $lastPosition,
        ?MemorisationPracticePlan $activePlan,
        ?array $main = null,
    ): array {
        $meta = is_array($unfinished?->metadata) ? $unfinished->metadata : [];
        $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];

        $surah = (int) ($main['surah_number']
            ?? $unfinished?->surah_number
            ?? $config['chapterId']
            ?? $lastPosition?->surah_number
            ?? $activePlan?->surah_number
            ?? 0);

        $ayahStart = (int) ($main['ayah_start'] ?? $config['rangeStart'] ?? $activePlan?->start_ayah ?? 0);
        $ayahEnd = (int) ($main['ayah_end'] ?? $config['rangeEnd'] ?? $activePlan?->end_ayah ?? 0);
        $currentAyah = (int) ($main['ayah_start'] ?? $unfinished?->ayah_number ?? $lastPosition?->ayah_number ?? 0);

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
            ->filter(fn (LearningAnalytic $row) => $row->session_date !== null)
            ->keyBy(fn (LearningAnalytic $row) => $row->session_date->toDateString());

        $completedByDay = UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->where('status', UserSessionStatus::Completed->value)
            ->where('ended_at', '>=', $from)
            ->where('ended_at', '<=', $to)
            ->selectRaw('DATE(ended_at) as day, COUNT(*) as aggregate')
            ->groupByRaw('DATE(ended_at)')
            ->pluck('aggregate', 'day');

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

        $sessionStatuses = [
            UserSessionStatus::Completed->value,
            UserSessionStatus::Paused->value,
        ];

        $weekSessions = UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->whereIn('status', $sessionStatuses)
            ->where(function ($query) use ($from, $to) {
                $query->whereBetween('ended_at', [$from, $to])
                    ->orWhere(function ($inner) use ($from, $to) {
                        $inner->whereNull('ended_at')
                            ->whereBetween('last_activity_at', [$from, $to]);
                    });
            })
            ->get(['id', 'status', 'ended_at', 'last_activity_at', 'ayah_number', 'metadata']);

        $sessions = $weekSessions->count();

        $aiChecks = AiReciteAttempt::query()
            ->where('user_id', $user->id)
            ->where('created_at', '>=', $from)
            ->where('created_at', '<=', $to)
            ->count();

        $analytics = LearningAnalytic::query()
            ->where('user_id', $user->id)
            ->whereDate('session_date', '>=', $from->toDateString())
            ->whereDate('session_date', '<=', $to->toDateString())
            ->get(['ayahs_memorised', 'ayahs_reviewed', 'sessions_completed', 'session_date']);

        $ayahsPractised = (int) $analytics->sum(function (LearningAnalytic $row) {
            return (int) ($row->ayahs_memorised ?? 0) + (int) ($row->ayahs_reviewed ?? 0);
        });

        // Fallback: derive practised ayahs from session metadata when analytics lag behind.
        if ($ayahsPractised === 0 && $weekSessions->isNotEmpty()) {
            $ayahsPractised = (int) $weekSessions->sum(function (UserSession $session) {
                $meta = is_array($session->metadata) ? $session->metadata : [];
                $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
                $start = (int) ($config['rangeStart'] ?? $config['range_start'] ?? $session->ayah_number ?? 0);
                $end = (int) ($config['rangeEnd'] ?? $config['range_end'] ?? $start);
                if ($start <= 0) {
                    return 0;
                }

                return max(1, $end >= $start ? ($end - $start + 1) : 1);
            });
        }

        $activeDays = (int) $analytics
            ->filter(function (LearningAnalytic $row) {
                $activity = (int) ($row->ayahs_memorised ?? 0)
                    + (int) ($row->ayahs_reviewed ?? 0)
                    + (int) ($row->sessions_completed ?? 0);

                return $activity > 0;
            })
            ->unique(fn (LearningAnalytic $row) => $row->session_date?->toDateString())
            ->count();

        if ($activeDays === 0 && $weekSessions->isNotEmpty()) {
            $activeDays = (int) $weekSessions
                ->map(function (UserSession $session) {
                    $at = $session->ended_at ?? $session->last_activity_at;
                    return $at ? $at->toDateString() : null;
                })
                ->filter()
                ->unique()
                ->count();
        }

        $isEmpty = $sessions === 0 && $aiChecks === 0 && $ayahsPractised === 0;

        return [
            'sessions' => $sessions,
            'ai_checks' => $aiChecks,
            'ayahs_practised' => $ayahsPractised,
            'active_days' => $activeDays,
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
                    'href' => $this->murajaahReviewHref($surah, $ayah),
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
                    'href' => $this->murajaahReviewHref($surah, $ayah),
                    'source' => 'practice_plan',
                ]);
            }

            foreach ($this->weakAyahsFromWordRecords($weakWords, $surah) as $entry) {
                $entrySurah = (int) $entry['surah'];
                $ayah = (int) $entry['ayah'];
                if ($entrySurah <= 0 || $ayah <= 0) {
                    continue;
                }
                $key = $entrySurah.':'.$ayah;
                if ($items->has($key)) {
                    continue;
                }
                $phrase = isset($entry['phrase']) ? trim((string) $entry['phrase']) : '';
                $items->put($key, [
                    'key' => $key,
                    'surah_number' => $entrySurah,
                    'surah_name' => QuranMetadata::name($entrySurah),
                    'ayah_number' => $ayah,
                    'phrase' => $phrase !== '' ? $phrase : null,
                    'explanation' => 'Your practice plan highlighted a word here that deserves another look.',
                    'explanation_key' => 'weak_explain_plan',
                    'status_label' => 'Worth reviewing',
                    'status_key' => 'status_review',
                    'detected_at' => optional($plan->updated_at ?? $plan->created_at)->toIso8601String(),
                    'action_label' => 'Review this ayah',
                    'action_key' => 'action_review',
                    'href' => $this->murajaahReviewHref($entrySurah, $ayah),
                    'source' => 'practice_plan',
                ]);
            }
        }

        $attempts = AiReciteAttempt::query()
            ->where('user_id', $user->id)
            ->latest('id')
            ->limit(12)
            ->get()
            ->filter(function (AiReciteAttempt $attempt) {
                $band = strtolower((string) ($attempt->band ?? ''));
                if (in_array($band, ['weak', 'mixed', 'gentle', 'focused'], true)) {
                    return true;
                }

                $weakWords = is_array($attempt->weak_words) ? $attempt->weak_words : [];
                if ($weakWords !== []) {
                    return true;
                }

                return $this->weakAyahsFromAiReciteAttempt($attempt) !== [];
            })
            ->take(8)
            ->values();

        $recommendations = SessionRecommendation::query()
            ->where('user_id', $user->id)
            ->whereNotNull('ai_assessment')
            ->latest('id')
            ->limit(8)
            ->get(['id', 'surah_number', 'ai_assessment', 'updated_at', 'created_at']);

        foreach ($recommendations as $recommendation) {
            $assessment = is_array($recommendation->ai_assessment) ? $recommendation->ai_assessment : [];
            $weakAyahs = is_array($assessment['weak_ayahs'] ?? null) ? $assessment['weak_ayahs'] : [];
            $weakWords = is_array($assessment['weak_words'] ?? null) ? $assessment['weak_words'] : [];
            if ($weakAyahs === [] && $weakWords === []) {
                continue;
            }

            $range = is_array($assessment['ayah_range'] ?? null) ? $assessment['ayah_range'] : [];
            $surah = (int) $recommendation->surah_number;
            if ($surah <= 0) {
                $surah = (int) ($range['surah'] ?? $range['surahId'] ?? $range['surah_number'] ?? $range['chapterId'] ?? 0);
            }
            if ($surah <= 0) {
                continue;
            }

            $surahName = QuranMetadata::name($surah);
            $detectedAt = isset($assessment['assessed_at'])
                ? (string) $assessment['assessed_at']
                : optional($recommendation->updated_at ?? $recommendation->created_at)->toIso8601String();

            foreach ($weakAyahs as $ayahNumber) {
                $ayah = (int) $ayahNumber;
                if ($ayah <= 0) {
                    continue;
                }
                $key = $surah.':'.$ayah;
                if ($items->has($key)) {
                    continue;
                }
                $phrase = $this->wordForAyah($weakWords, $ayah);
                $items->put($key, [
                    'key' => $key,
                    'surah_number' => $surah,
                    'surah_name' => $surahName,
                    'ayah_number' => $ayah,
                    'phrase' => $phrase,
                    'explanation' => 'After your last recitation check, this ayah could use a soft review.',
                    'explanation_key' => 'weak_explain_ai',
                    'status_label' => 'Needs a gentle review',
                    'status_key' => 'status_strengthen',
                    'detected_at' => $detectedAt,
                    'action_label' => 'Review this ayah',
                    'action_key' => 'action_review',
                    'href' => $this->murajaahReviewHref($surah, $ayah),
                    'source' => 'ai_assessment',
                ]);
            }

            foreach ($this->weakAyahsFromWordRecords($weakWords, $surah) as $entry) {
                $entrySurah = (int) $entry['surah'];
                $ayah = (int) $entry['ayah'];
                if ($entrySurah <= 0 || $ayah <= 0) {
                    continue;
                }
                $key = $entrySurah.':'.$ayah;
                if ($items->has($key)) {
                    continue;
                }
                $phrase = isset($entry['phrase']) ? trim((string) $entry['phrase']) : '';
                $items->put($key, [
                    'key' => $key,
                    'surah_number' => $entrySurah,
                    'surah_name' => QuranMetadata::name($entrySurah),
                    'ayah_number' => $ayah,
                    'phrase' => $phrase !== '' ? $phrase : null,
                    'explanation' => 'After your last recitation check, this ayah could use a soft review.',
                    'explanation_key' => 'weak_explain_ai',
                    'status_label' => 'Needs a gentle review',
                    'status_key' => 'status_strengthen',
                    'detected_at' => $detectedAt,
                    'action_label' => 'Review this ayah',
                    'action_key' => 'action_review',
                    'href' => $this->murajaahReviewHref($entrySurah, $ayah),
                    'source' => 'ai_assessment',
                ]);
            }
        }

        foreach ($attempts as $attempt) {
            foreach ($this->weakAyahsFromAiReciteAttempt($attempt) as $entry) {
                $surah = (int) $entry['surah'];
                $ayah = (int) $entry['ayah'];
                if ($surah <= 0 || $ayah <= 0) {
                    continue;
                }
                $key = $surah.':'.$ayah;
                if ($items->has($key)) {
                    continue;
                }
                $phrase = isset($entry['phrase']) ? trim((string) $entry['phrase']) : '';
                $items->put($key, [
                    'key' => $key,
                    'surah_number' => $surah,
                    'surah_name' => QuranMetadata::name($surah),
                    'ayah_number' => $ayah,
                    'phrase' => $phrase !== '' ? $phrase : null,
                    'explanation' => 'After your last recitation check, this part could use a soft review.',
                    'explanation_key' => 'weak_explain_ai',
                    'status_label' => 'Needs a gentle review',
                    'status_key' => 'status_strengthen',
                    'detected_at' => optional($attempt->created_at)->toIso8601String(),
                    'action_label' => 'Review this ayah',
                    'action_key' => 'action_review',
                    'href' => $this->murajaahReviewHref($surah, $ayah),
                    'source' => 'ai_recite',
                ]);
            }
        }

        $reviewing = MemorisationProgress::query()
            ->where('user_id', $user->id)
            ->orderByDesc('updated_at')
            ->limit(20)
            ->get()
            ->filter(function (MemorisationProgress $row) {
                if ($row->status === 'reviewing') {
                    return true;
                }
                $meta = is_array($row->metadata) ? $row->metadata : [];

                return ($meta['ai_recite']['weak'] ?? false) === true;
            })
            ->take(6);

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
                'href' => $this->murajaahReviewHref((int) $row->surah_number, (int) $row->ayah_number),
                'source' => 'progress',
            ]);
        }

        $sorted = $items->sortByDesc(fn ($item) => $item['detected_at'] ?? '')->values();
        $total = $sorted->count();
        $allItems = $this->enrichWeaknessStrengthLabels(
            $user,
            $sorted->values()->all()
        );
        $previewCount = 2;

        return [
            'items' => array_slice($allItems, 0, $previewCount),
            'all_items' => $allItems,
            'total' => $total,
            'has_more' => $total > $previewCount,
            'view_all_href' => null,
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

    /**
     * @return list<array{surah: int, ayah: int, phrase: ?string}>
     */
    private function weakAyahsFromWordRecords(array $words, int $defaultSurah = 0): array
    {
        $byKey = [];
        $add = function (int $surah, int $ayah, ?string $phrase = null) use (&$byKey): void {
            if ($surah <= 0 || $ayah <= 0) {
                return;
            }
            $key = $surah.':'.$ayah;
            if (! isset($byKey[$key])) {
                $byKey[$key] = ['surah' => $surah, 'ayah' => $ayah, 'phrase' => $phrase];

                return;
            }
            if ($phrase && empty($byKey[$key]['phrase'])) {
                $byKey[$key]['phrase'] = $phrase;
            }
        };

        foreach ($words as $word) {
            if (! is_array($word)) {
                continue;
            }
            [$surah, $ayah] = $this->resolveWordAyahRef($word, $defaultSurah, null);
            $text = trim((string) ($word['text'] ?? $word['word'] ?? ''));
            $add($surah, $ayah, $text !== '' ? $text : null);
        }

        return array_values($byKey);
    }

    /**
     * @return list<array{surah: int, ayah: int, phrase: ?string}>
     */
    private function weakAyahsFromAiReciteAttempt(AiReciteAttempt $attempt): array
    {
        $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
        $rangeSurah = (int) ($range['surah'] ?? $range['surahId'] ?? $range['surah_number'] ?? $range['chapterId'] ?? 0);
        if ($rangeSurah <= 0 && $attempt->session_recommendation_id) {
            $rangeSurah = (int) (SessionRecommendation::query()
                ->whereKey($attempt->session_recommendation_id)
                ->value('surah_number') ?? 0);
        }
        $from = (int) ($range['from'] ?? $range['rangeStart'] ?? $range['start'] ?? 0);
        $to = (int) ($range['to'] ?? $range['rangeEnd'] ?? $range['end'] ?? $from);
        $singleAyah = ($from > 0 && ($to <= 0 || $to === $from)) ? $from : null;

        $byKey = [];
        foreach ($this->weakAyahsFromWordRecords(is_array($attempt->weak_words) ? $attempt->weak_words : [], $rangeSurah) as $entry) {
            $byKey[$entry['surah'].':'.$entry['ayah']] = $entry;
        }

        foreach (is_array($attempt->word_statuses) ? $attempt->word_statuses : [] as $status) {
            if (! is_array($status)) {
                continue;
            }
            $tone = strtolower((string) ($status['status'] ?? $status['result'] ?? $status['tone'] ?? ''));
            if (! in_array($tone, ['wrong', 'error', 'missed', 'incorrect', 'weak', 'extra', 'missing', 'partial', 'minor_mistake', 'amber', 'omitted'], true)) {
                continue;
            }
            [$surah, $ayah] = $this->resolveWordAyahRef($status, $rangeSurah, $singleAyah);
            $text = trim((string) ($status['text'] ?? $status['word'] ?? ''));
            $key = $surah.':'.$ayah;
            if ($surah <= 0 || $ayah <= 0) {
                continue;
            }
            if (! isset($byKey[$key])) {
                $byKey[$key] = ['surah' => $surah, 'ayah' => $ayah, 'phrase' => $text !== '' ? $text : null];
            } elseif ($text !== '' && empty($byKey[$key]['phrase'])) {
                $byKey[$key]['phrase'] = $text;
            }
        }

        $snapshot = is_array($attempt->plan_snapshot) ? $attempt->plan_snapshot : [];
        $snapshotWeakAyahs = is_array($snapshot['weak_ayahs'] ?? null)
            ? $snapshot['weak_ayahs']
            : (is_array($snapshot['weakAyahs'] ?? null) ? $snapshot['weakAyahs'] : []);
        foreach ($snapshotWeakAyahs as $ayahNumber) {
            $ayah = (int) $ayahNumber;
            if ($rangeSurah <= 0 || $ayah <= 0) {
                continue;
            }
            $key = $rangeSurah.':'.$ayah;
            if (! isset($byKey[$key])) {
                $byKey[$key] = ['surah' => $rangeSurah, 'ayah' => $ayah, 'phrase' => null];
            }
        }

        return array_values($byKey);
    }

    /**
     * @return array{0: int, 1: int}
     */
    private function resolveWordAyahRef(array $word, int $rangeSurah, ?int $singleAyah): array
    {
        $surah = (int) ($word['surahNumber'] ?? $word['surah_number'] ?? $word['surah'] ?? $word['surahId'] ?? $word['chapterId'] ?? 0);
        $ayah = (int) ($word['ayahNumber'] ?? $word['ayah_number'] ?? $word['ayah'] ?? 0);

        $verseKey = trim((string) ($word['verseKey'] ?? $word['verse_key'] ?? $word['key'] ?? ''));
        if ($verseKey !== '' && str_contains($verseKey, ':')) {
            [$keySurah, $keyAyah] = array_map('intval', explode(':', $verseKey, 2));
            if ($keySurah > 0) {
                $surah = $keySurah;
            }
            if ($keyAyah > 0) {
                $ayah = $keyAyah;
            }
        }

        if ($surah <= 0) {
            $surah = $rangeSurah;
        }
        if ($ayah <= 0 && $singleAyah !== null) {
            $ayah = $singleAyah;
        }

        return [$surah, $ayah];
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
                $start = (int) ($config['rangeStart'] ?? 0);
                $end = (int) ($config['rangeEnd'] ?? 0);
                if ($start <= 0 && $session->ayah_number) {
                    $start = (int) $session->ayah_number;
                    $end = $start;
                }

                [$outcomeKey, $at] = match (true) {
                    $status === UserSessionStatus::Completed => [
                        'session_completed',
                        $session->ended_at ?? $session->last_activity_at,
                    ],
                    $status === UserSessionStatus::EndedEarly => [
                        'session_ended_early',
                        $session->ended_at ?? $session->last_activity_at,
                    ],
                    $status === UserSessionStatus::Paused => [
                        'session_saved',
                        $session->paused_at ?? $session->last_activity_at,
                    ],
                    $session->resumed_at !== null && $status === UserSessionStatus::Active => [
                        'session_resumed',
                        $session->resumed_at ?? $session->last_activity_at,
                    ],
                    default => [null, null],
                };

                if (! $outcomeKey || ! $at) {
                    return;
                }

                $hrefQuery = match (true) {
                    in_array($outcomeKey, ['session_saved', 'session_resumed'], true) => [
                        'resume' => 1,
                        'session' => (int) $session->id,
                    ],
                    $surah > 0 && $start > 0 => ['surah' => $surah, 'from' => $start, 'to' => ($end ?: $start)],
                    $surah > 0 && $session->ayah_number => [
                        'surah' => $surah,
                        'from' => (int) $session->ayah_number,
                        'to' => (int) $session->ayah_number,
                    ],
                    default => [],
                };

                $events->push($this->activityEvent([
                    'id' => 'session-'.$session->id,
                    'type' => $outcomeKey,
                    'surah_number' => $surah ?: null,
                    'surah_name' => $surah ? QuranMetadata::name($surah) : null,
                    'ayah_start' => $start > 0 ? $start : null,
                    'ayah_end' => $end > 0 ? $end : null,
                    'outcome_key' => $outcomeKey,
                    'occurred_at' => Carbon::parse($at)->toIso8601String(),
                    'href' => $this->memorisationHref($hrefQuery),
                ]));
            });

        AiReciteAttempt::query()
            ->where('user_id', $user->id)
            ->latest('id')
            ->limit(8)
            ->get()
            ->each(function (AiReciteAttempt $attempt) use ($events) {
                $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
                $surah = (int) ($range['surah'] ?? $range['surahId'] ?? $range['surah_number'] ?? 0);
                $from = (int) ($range['from'] ?? $range['start'] ?? $range['ayah_start'] ?? 0);
                $to = (int) ($range['to'] ?? $range['end'] ?? $range['ayah_end'] ?? $from);
                $band = is_string($attempt->band) ? strtolower($attempt->band) : null;
                $accuracy = $attempt->accuracy_percent !== null ? (int) $attempt->accuracy_percent : null;
                $hasResult = ($band !== null && $band !== '') || $accuracy !== null;

                $events->push($this->activityEvent([
                    'id' => 'ai-'.$attempt->id,
                    'type' => 'ai_recite',
                    'surah_number' => $surah ?: null,
                    'surah_name' => $surah ? QuranMetadata::name($surah) : null,
                    'ayah_start' => $from > 0 ? $from : null,
                    'ayah_end' => $to > 0 ? $to : null,
                    'outcome_key' => $hasResult ? 'ai_result' : 'ai_check',
                    'outcome_params' => array_filter([
                        'band' => $band,
                        'accuracy' => $accuracy,
                    ], fn ($value) => $value !== null && $value !== ''),
                    'occurred_at' => optional($attempt->created_at)->toIso8601String(),
                    'href' => $this->memorisationHref(array_filter([
                        'surah' => $surah ?: null,
                        'from' => $from ?: null,
                        'to' => ($to ?: $from) ?: null,
                    ])),
                ]));
            });

        MemorisationAssessment::query()
            ->where('user_id', $user->id)
            ->latest('id')
            ->limit(8)
            ->get()
            ->each(function (MemorisationAssessment $assessment) use ($events) {
                $from = (int) $assessment->start_ayah;
                $to = (int) $assessment->end_ayah;

                $events->push($this->activityEvent([
                    'id' => 'assessment-'.$assessment->id,
                    'type' => 'assessment',
                    'surah_number' => (int) $assessment->surah_number ?: null,
                    'surah_name' => $assessment->surah_name ?: QuranMetadata::name((int) $assessment->surah_number),
                    'ayah_start' => $from > 0 ? $from : null,
                    'ayah_end' => $to > 0 ? $to : null,
                    'outcome_key' => 'assessment_completed',
                    'occurred_at' => optional($assessment->created_at)->toIso8601String(),
                    'href' => $this->memorisationHref(array_filter([
                        'surah' => (int) $assessment->surah_number ?: null,
                        'from' => $from ?: null,
                        'to' => ($to ?: $from) ?: null,
                    ])),
                ]));
            });

        SessionRecommendation::query()
            ->where('user_id', $user->id)
            ->latest('id')
            ->limit(6)
            ->get()
            ->each(function (SessionRecommendation $recommendation) use ($events) {
                $from = (int) $recommendation->ayah_start;
                $to = (int) $recommendation->ayah_end;

                $events->push($this->activityEvent([
                    'id' => 'recommendation-'.$recommendation->id,
                    'type' => 'recommendation',
                    'surah_number' => (int) $recommendation->surah_number ?: null,
                    'surah_name' => QuranMetadata::name((int) $recommendation->surah_number),
                    'ayah_start' => $from > 0 ? $from : null,
                    'ayah_end' => $to > 0 ? $to : null,
                    'outcome_key' => 'recommendation_ready',
                    'occurred_at' => optional($recommendation->created_at)->toIso8601String(),
                    'href' => $this->memorisationHref(array_filter([
                        'recommendation' => (int) $recommendation->id,
                        'surah' => (int) $recommendation->surah_number ?: null,
                        'from' => $from ?: null,
                        'to' => ($to ?: $from) ?: null,
                    ])),
                ]));
            });

        AyahNote::query()
            ->where('user_id', $user->id)
            ->latest('id')
            ->limit(8)
            ->get()
            ->each(function (AyahNote $note) use ($events) {
                $body = trim((string) preg_replace('/\s+/u', ' ', (string) $note->body));
                $snippet = $body !== ''
                    ? (mb_strlen($body) > 96 ? mb_substr($body, 0, 96).'…' : $body)
                    : null;

                $events->push($this->activityEvent([
                    'id' => 'note-'.$note->id,
                    'type' => 'note',
                    'surah_number' => (int) $note->surah_number ?: null,
                    'surah_name' => QuranMetadata::name((int) $note->surah_number),
                    'ayah_start' => (int) $note->ayah_number ?: null,
                    'ayah_end' => (int) $note->ayah_number ?: null,
                    'outcome_key' => $snippet !== null ? 'note_body' : 'note_saved',
                    'outcome_params' => $snippet !== null ? ['body' => $snippet] : [],
                    'occurred_at' => optional($note->created_at)->toIso8601String(),
                    'href' => $this->memorisationHref([
                        'surah' => (int) $note->surah_number,
                        'from' => (int) $note->ayah_number,
                        'to' => (int) $note->ayah_number,
                    ]),
                ]));
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
                $at = $row->completed_at ?? $row->updated_at;
                $events->push($this->activityEvent([
                    'id' => 'progress-'.$row->id,
                    'type' => 'ayah_memorised',
                    'surah_number' => (int) $row->surah_number ?: null,
                    'surah_name' => QuranMetadata::name((int) $row->surah_number),
                    'ayah_start' => (int) $row->ayah_number ?: null,
                    'ayah_end' => (int) $row->ayah_number ?: null,
                    'outcome_key' => 'ayah_memorised',
                    'occurred_at' => optional($at)->toIso8601String(),
                    'href' => $this->memorisationHref([
                        'surah' => (int) $row->surah_number,
                        'from' => (int) $row->ayah_number,
                        'to' => (int) $row->ayah_number,
                    ]),
                ]));
            });

        return $events
            ->filter(fn ($event) => ! empty($event['occurred_at']))
            ->sortByDesc('occurred_at')
            ->unique(fn ($event) => ($event['id'] ?? $event['type']).'|'.$event['occurred_at'])
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
        // Prefer the normalised lifecycle table — avoids decoding the full sync blob
        // on every dashboard build.
        $lifecycleCount = UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->whereIn('status', [
                UserSessionStatus::Active->value,
                UserSessionStatus::Paused->value,
                UserSessionStatus::Interrupted->value,
            ])
            ->count();

        if ($lifecycleCount > 0) {
            return $lifecycleCount;
        }

        $sync = MemorisationSyncState::query()
            ->where('user_id', $user->id)
            ->first(['state']);
        if ($sync?->state) {
            $state = json_decode($sync->state, true);
            if (is_array($state)) {
                $saved = $state['savedSessions'] ?? null;
                if (! is_array($saved) && is_array($state['workspaceState'] ?? null)) {
                    $saved = $state['workspaceState']['savedSessions'] ?? null;
                }
                if (is_array($saved)) {
                    return count(array_filter($saved, fn ($row) => is_array($row) && ! empty($row['id'])));
                }
            }
        }

        return 0;
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
            ->map(fn ($date) => $this->toDateStringOrNull($date))
            ->filter()
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
                ->map(fn ($date) => $this->toDateStringOrNull($date))
                ->filter()
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

    private function toDateStringOrNull(mixed $date): ?string
    {
        if ($date === null || $date === '') {
            return null;
        }

        try {
            return Carbon::parse($date)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    private function utf8Safe(mixed $value): mixed
    {
        if (is_string($value)) {
            if (! mb_check_encoding($value, 'UTF-8')) {
                $converted = @mb_convert_encoding($value, 'UTF-8', 'UTF-8');

                return is_string($converted) ? $converted : '';
            }

            return $value;
        }

        if (is_array($value)) {
            $safe = [];
            foreach ($value as $key => $item) {
                $safeKey = is_string($key) ? (string) $this->utf8Safe($key) : $key;
                $safe[$safeKey] = $this->utf8Safe($item);
            }

            return $safe;
        }

        if (is_float($value) && ! is_finite($value)) {
            return null;
        }

        return $value;
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
     * Deep-link into a muraja'ah revision session (not setup offcanvas / AI check).
     */
    private function murajaahReviewHref(int $surah, int $ayah): string
    {
        return $this->memorisationHref([
            'surah' => $surah,
            'from' => $ayah,
            'to' => $ayah,
            'review' => 1,
            'return' => 'dashboard',
        ]);
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


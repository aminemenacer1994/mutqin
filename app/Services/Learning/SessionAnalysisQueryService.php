<?php

namespace App\Services\Learning;

use App\Enums\UserSessionStatus;
use App\Models\AiReciteAttempt;
use App\Models\MemorisationAssessment;
use App\Models\MemorisationPracticePlan;
use App\Models\MemorisationWeakSpot;
use App\Models\SessionRecommendation;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Memorisation\RecitationAssessmentService;
use App\Services\Memorisation\RecitationScoringThresholds;
use App\Support\QuranMetadata;
use App\Support\RecitationAlignmentStatus;
use Illuminate\Support\Collection;

class SessionAnalysisQueryService
{
    public function __construct(
        private readonly RecitationAssessmentService $assessments,
        private readonly AiReciteAttemptAudioService $audio,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function sessionHistory(User $user): array
    {
        $sessions = UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->whereIn('status', [
                UserSessionStatus::Completed->value,
                UserSessionStatus::EndedEarly->value,
            ])
            ->orderByDesc('ended_at')
            ->orderByDesc('id')
            ->limit(100)
            ->get([
                'id',
                'status',
                'surah_number',
                'ayah_number',
                'metadata',
                'ended_at',
                'last_activity_at',
            ]);

        $flags = $this->analysisFlagsForSessions($user, $sessions);

        return $sessions->map(function (UserSession $session) use ($flags) {
            $range = $this->sessionRange($session);
            $status = $session->status instanceof UserSessionStatus
                ? $session->status->value
                : (string) $session->status;

            return [
                'id' => $session->id,
                'surah_number' => $range['surah_number'],
                'surah_name' => $range['surah_name'],
                'ayah_start' => $range['ayah_start'],
                'ayah_end' => $range['ayah_end'],
                'status' => $status,
                'occurred_at' => optional($session->ended_at ?? $session->last_activity_at)->toIso8601String(),
                'has_analysis' => (bool) ($flags[$session->id] ?? false),
            ];
        })->values()->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function attemptHistory(User $user): array
    {
        $attempts = AiReciteAttempt::query()
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        return $attempts->map(function (AiReciteAttempt $attempt) {
            $range = $this->attemptRange($attempt);

            return [
                'id' => $attempt->id,
                'user_session_id' => $attempt->user_session_id ? (int) $attempt->user_session_id : null,
                'source' => $attempt->source,
                'surah_number' => $range['surah_number'],
                'surah_name' => $range['surah_name'],
                'ayah_start' => $range['ayah_start'],
                'ayah_end' => $range['ayah_end'],
                'band' => $attempt->band,
                'accuracy_percent' => $attempt->accuracy_percent,
                'peek_used' => (bool) $attempt->peek_used,
                'occurred_at' => optional($attempt->created_at)->toIso8601String(),
                'has_analysis' => true,
                'has_audio' => $this->audio->hasPlayableAudio($attempt),
                'audio_duration_ms' => $attempt->audio_duration_ms ? (int) $attempt->audio_duration_ms : null,
            ];
        })->values()->all();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function forSession(User $user, int $sessionId): ?array
    {
        $session = UserSession::query()
            ->where('user_id', $user->id)
            ->whereKey($sessionId)
            ->first();

        if (! $session) {
            return null;
        }

        $assessment = $this->latestAssessmentForSession($user, $session->id);
        $attempt = $this->latestAttemptForSession($user, $session->id);
        $recommendation = $this->recommendationForSession($user, $session);

        return $this->buildPayload($user, $session, $assessment, $attempt, $recommendation);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function forAttempt(User $user, int $attemptId): ?array
    {
        $attempt = AiReciteAttempt::query()
            ->where('user_id', $user->id)
            ->whereKey($attemptId)
            ->first();

        if (! $attempt) {
            return null;
        }

        $session = null;
        if ($attempt->user_session_id) {
            $session = UserSession::query()
                ->where('user_id', $user->id)
                ->whereKey($attempt->user_session_id)
                ->first();
        }

        // Prefer the assessment linked to this attempt. Falling back to the
        // session's latest assessment only when the attempt has no link avoids
        // attaching a newer check's analysis to an older attempt.
        $assessment = $this->assessmentForAttempt($user, $attempt)
            ?? ($session ? $this->latestAssessmentForSession($user, (int) $session->id) : null);

        $recommendation = $session
            ? $this->recommendationForSession($user, $session)
            : $this->recommendationForAttempt($user, $attempt);

        return $this->buildPayload($user, $session, $assessment, $attempt, $recommendation);
    }

    /**
     * @return array<int, bool>
     */
    public function analysisFlagsForSessions(User $user, Collection $sessions): array
    {
        $ids = $sessions->pluck('id')->filter()->map(fn ($id) => (int) $id)->all();
        if ($ids === []) {
            return [];
        }

        $fromAssessments = MemorisationAssessment::query()
            ->select('user_session_id as session_id')
            ->where('user_id', $user->id)
            ->whereIn('user_session_id', $ids)
            ->where('status', MemorisationAssessment::STATUS_COMPLETED)
            ->whereNotNull('user_session_id');

        $fromAttempts = AiReciteAttempt::query()
            ->select('user_session_id as session_id')
            ->where('user_id', $user->id)
            ->whereIn('user_session_id', $ids)
            ->whereNotNull('user_session_id');

        $flags = [];
        foreach ($fromAssessments->union($fromAttempts)->pluck('session_id') as $id) {
            $flags[(int) $id] = true;
        }

        return $flags;
    }

    private function latestAssessmentForSession(User $user, int $sessionId): ?MemorisationAssessment
    {
        return MemorisationAssessment::query()
            ->where('user_id', $user->id)
            ->where('user_session_id', $sessionId)
            ->where('status', MemorisationAssessment::STATUS_COMPLETED)
            ->orderByDesc('completed_at')
            ->orderByDesc('id')
            ->first();
    }

    private function latestAttemptForSession(User $user, int $sessionId): ?AiReciteAttempt
    {
        return AiReciteAttempt::query()
            ->where('user_id', $user->id)
            ->where('user_session_id', $sessionId)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    public function dashboardStats(User $user): array
    {
        $attemptColumns = [
            'id',
            'memorisation_assessment_id',
            'accuracy_percent',
            'band',
            'ayah_range',
            'weak_words',
            'word_statuses',
            'peek_used',
            'created_at',
        ];

        $attempts = AiReciteAttempt::query()
            ->where('user_id', $user->id)
            // Only concrete, persisted checks belong in feedback stats. This
            // includes checks launched from either supported UI entry point.
            ->whereNotNull('memorisation_assessment_id')
            ->validScored()
            ->with(['assessment:id,model_version,algorithm_version'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(200)
            ->get($attemptColumns);

        $latest = $attempts->first();

        $accuracies = $attempts
            ->pluck('accuracy_percent')
            ->filter(fn ($value) => $value !== null)
            ->map(fn ($value) => (int) $value)
            ->values();

        $recent = $accuracies->take(5);
        $older = $accuracies->slice(5, 5);
        $improvement = null;
        if ($recent->count() >= 3 && $older->count() >= 3) {
            $improvement = (int) round($recent->avg() - $older->avg());
        }

        $ayahBuckets = [];
        $testedAyahs = [];
        $wordBuckets = [];
        foreach ($attempts as $attempt) {
            $range = $this->attemptRange($attempt);
            $surah = (int) ($range['surah_number'] ?? 0);
            $from = (int) ($range['ayah_start'] ?? 0);
            $to = (int) ($range['ayah_end'] ?? $from);
            if ($surah > 0 && $from > 0) {
                for ($ayah = $from; $ayah <= max($from, $to); $ayah++) {
                    $testedAyahs[$surah.':'.$ayah] = true;
                }
            }

            $scoredAyahs = $this->scoreAttemptAyahs($attempt);
            if ($scoredAyahs === []) {
                $scoredAyahs = $this->focusAyahsFromRange($attempt);
            }
            foreach ($scoredAyahs as $scored) {
                $ayah = (int) ($scored['ayah'] ?? 0);
                if ($surah <= 0 || $ayah <= 0) {
                    continue;
                }
                $key = $surah.':'.$ayah;
                $testedAyahs[$key] = true;
                if (! isset($ayahBuckets[$key])) {
                    $ayahBuckets[$key] = [
                        'surah_number' => $surah,
                        'surah_name' => $range['surah_name'],
                        'ayah' => $ayah,
                        'accuracy_sum' => 0,
                        'attempts' => 0,
                        'latest_needs_practice' => (bool) ($scored['needs_practice'] ?? false),
                        // Attempts are newest-first, so the first write is the latest check.
                        'last_attempted_at' => optional($attempt->created_at)?->toIso8601String(),
                    ];
                }
                $ayahBuckets[$key]['accuracy_sum'] += (int) ($scored['accuracy'] ?? 0);
                $ayahBuckets[$key]['attempts']++;
                $ayahBuckets[$key]['latest_needs_practice'] = (bool) ($scored['needs_practice'] ?? false)
                    || (bool) ($ayahBuckets[$key]['latest_needs_practice'] ?? false);
            }

            $words = is_array($attempt->weak_words) ? $attempt->weak_words : [];
            $statuses = is_array($attempt->word_statuses) ? $attempt->word_statuses : [];
            foreach ($words as $word) {
                $text = trim((string) ($word['text'] ?? $word['word'] ?? $word['target_word'] ?? ''));
                if ($text === '') {
                    continue;
                }
                $ayah = (int) ($word['ayahNumber'] ?? $word['ayah_number'] ?? $from);
                $key = mb_strtolower($text).'|'.$surah.'|'.$ayah;
                if (! isset($wordBuckets[$key])) {
                    $wordBuckets[$key] = [
                        'text' => $text,
                        'surah_number' => $surah ?: null,
                        'surah_name' => $range['surah_name'] ?? null,
                        'ayah' => $ayah ?: null,
                        'count' => 0,
                        'last_attempt_id' => null,
                    ];
                }
                $wordBuckets[$key]['count']++;
                if (! $wordBuckets[$key]['last_attempt_id']) {
                    $wordBuckets[$key]['last_attempt_id'] = (int) $attempt->id;
                }
            }
            foreach ($statuses as $status) {
                $state = strtolower((string) ($status['status'] ?? $status['result_type'] ?? ''));
                if (! in_array($state, ['wrong', 'incorrect', 'missing', 'omitted', 'minor_mistake'], true)) {
                    continue;
                }
                $text = trim((string) ($status['text'] ?? $status['target_word'] ?? $status['word'] ?? ''));
                if ($text === '') {
                    continue;
                }
                $ayah = (int) ($status['ayah_number'] ?? $status['ayahNumber'] ?? $from);
                $key = mb_strtolower($text).'|'.$surah.'|'.$ayah;
                if (! isset($wordBuckets[$key])) {
                    $wordBuckets[$key] = [
                        'text' => $text,
                        'surah_number' => $surah ?: null,
                        'surah_name' => $range['surah_name'] ?? null,
                        'ayah' => $ayah ?: null,
                        'count' => 0,
                        'last_attempt_id' => null,
                    ];
                }
                $wordBuckets[$key]['count']++;
                if (! $wordBuckets[$key]['last_attempt_id']) {
                    $wordBuckets[$key]['last_attempt_id'] = (int) $attempt->id;
                }
            }
        }

        $weakest = collect($ayahBuckets)
            ->map(function (array $row) {
                $attempts = max(1, (int) $row['attempts']);
                $accuracy = (int) round($row['accuracy_sum'] / $attempts);
                $needsPractice = $accuracy < 90 || (bool) ($row['latest_needs_practice'] ?? false);

                return [
                    'surah_number' => $row['surah_number'],
                    'surah_name' => $row['surah_name'],
                    'ayah' => $row['ayah'],
                    'attempts' => $attempts,
                    'accuracy' => $accuracy,
                    'needs_practice' => $needsPractice,
                    'last_attempted_at' => $row['last_attempted_at'] ?? null,
                ];
            })
            ->filter(fn (array $row) => $row['needs_practice'] === true)
            ->sortBy('accuracy')
            ->take(5)
            ->values()
            ->all();

        $missed = collect($wordBuckets)
            ->sortByDesc('count')
            ->take(8)
            ->values()
            ->all();

        $peekUsed = $attempts->where('peek_used', true)->count();
        $lastRange = $latest ? $this->attemptRange($latest) : null;

        return [
            'source' => AiReciteAttempt::SOURCE_DASHBOARD,
            'total_attempts' => $attempts->count(),
            'average_accuracy' => $accuracies->isEmpty() ? null : (int) round($accuracies->avg()),
            'recent_accuracy' => $recent->isEmpty() ? null : (int) round($recent->avg()),
            'best_accuracy' => $accuracies->isEmpty() ? null : (int) $accuracies->max(),
            'ayahs_tested' => count($testedAyahs),
            'peek_used_count' => $peekUsed,
            'peek_used_percent' => $attempts->isEmpty()
                ? null
                : (int) round(($peekUsed / $attempts->count()) * 100),
            'improvement' => $improvement,
            'weakest_ayahs' => $weakest,
            'missed_words' => $missed,
            'recent_attempts' => $attempts->take(12)->map(function (AiReciteAttempt $attempt) {
                $range = $this->attemptRange($attempt);
                $words = is_array($attempt->word_statuses) ? $attempt->word_statuses : [];
                $wordCounts = RecitationAlignmentStatus::countStatuses($words);

                return [
                    'id' => $attempt->id,
                    'assessment_id' => $attempt->memorisation_assessment_id ? (int) $attempt->memorisation_assessment_id : null,
                    'surah_number' => $range['surah_number'],
                    'surah_name' => $range['surah_name'],
                    'ayah_start' => $range['ayah_start'],
                    'ayah_end' => $range['ayah_end'],
                    'band' => $attempt->band,
                    'accuracy_percent' => $attempt->accuracy_percent,
                    'peek_used' => (bool) $attempt->peek_used,
                    'occurred_at' => optional($attempt->created_at)->toIso8601String(),
                    'has_analysis' => true,
                    'has_audio' => $this->audio->hasPlayableAudio($attempt),
                    'audio_duration_ms' => $attempt->audio_duration_ms ? (int) $attempt->audio_duration_ms : null,
                    'has_word_alignment' => $words !== [],
                    'flagged_word_count' => $words === [] ? null : RecitationAlignmentStatus::flaggedCount($words),
                    'word_counts' => $wordCounts,
                    'color_counts' => is_array($attempt->color_counts) ? $attempt->color_counts : null,
                    'model_version' => $attempt->assessment?->model_version,
                    'algorithm_version' => $attempt->assessment?->algorithm_version,
                    'weak_words' => collect(is_array($attempt->weak_words) ? $attempt->weak_words : [])
                        ->filter(fn ($word) => is_array($word) && trim((string) ($word['text'] ?? $word['word'] ?? $word['target_word'] ?? '')) !== '')
                        ->take(3)
                        ->values()
                        ->all(),
                ];
            })->values()->all(),
            'last_location' => ($lastRange && $lastRange['surah_number'] && $lastRange['ayah_start'])
                ? [
                    'surah_number' => $lastRange['surah_number'],
                    'ayah' => $lastRange['ayah_start'],
                    'surah_name' => $lastRange['surah_name'],
                ]
                : null,
        ];
    }

    public function markPeekUsed(User $user, int $attemptId): ?AiReciteAttempt
    {
        $attempt = AiReciteAttempt::query()
            ->where('user_id', $user->id)
            ->whereKey($attemptId)
            ->first();

        if (! $attempt) {
            return null;
        }

        if (! $attempt->peek_used) {
            $attempt->peek_used = true;
            $snapshot = is_array($attempt->plan_snapshot) ? $attempt->plan_snapshot : [];
            $snapshot['peek_used'] = true;
            $attempt->plan_snapshot = $snapshot;
            $attempt->save();
        }

        return $attempt;
    }

    private function assessmentForAttempt(User $user, AiReciteAttempt $attempt): ?MemorisationAssessment
    {
        if ($attempt->memorisation_assessment_id) {
            $byId = MemorisationAssessment::query()
                ->where('user_id', $user->id)
                ->whereKey($attempt->memorisation_assessment_id)
                ->first();
            if ($byId) {
                return $byId;
            }
        }

        if ($attempt->session_recommendation_id) {
            $linked = MemorisationAssessment::query()
                ->where('user_id', $user->id)
                ->where('session_recommendation_id', $attempt->session_recommendation_id)
                ->where('status', MemorisationAssessment::STATUS_COMPLETED)
                ->orderByDesc('completed_at')
                ->orderByDesc('id')
                ->first();
            if ($linked) {
                return $linked;
            }
        }

        return null;
    }

    private function recommendationForSession(User $user, UserSession $session): ?SessionRecommendation
    {
        $fromSource = SessionRecommendation::query()
            ->where('user_id', $user->id)
            ->where('source_session_id', $session->id)
            ->orderByDesc('id')
            ->first();
        if ($fromSource) {
            return $fromSource;
        }

        if ($session->recommendation_id) {
            return SessionRecommendation::query()
                ->where('user_id', $user->id)
                ->whereKey($session->recommendation_id)
                ->first();
        }

        return null;
    }

    private function recommendationForAttempt(User $user, AiReciteAttempt $attempt): ?SessionRecommendation
    {
        if (! $attempt->session_recommendation_id) {
            return null;
        }

        return SessionRecommendation::query()
            ->where('user_id', $user->id)
            ->whereKey($attempt->session_recommendation_id)
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function buildPayload(
        User $user,
        ?UserSession $session,
        ?MemorisationAssessment $assessment,
        ?AiReciteAttempt $attempt,
        ?SessionRecommendation $recommendation,
    ): array {
        $plan = $assessment
            ? MemorisationPracticePlan::query()
                ->where('user_id', $user->id)
                ->where('assessment_id', $assessment->id)
                ->first()
            : null;

        $weakSpots = $this->retentionSpots($user, $session, $assessment, $attempt);
        $sessionMeta = $this->transformSession($session, $assessment, $attempt);
        $hasAnalysis = $this->sessionHasPersistedRecitationCheck($assessment, $attempt);

        return [
            'has_analysis' => $hasAnalysis,
            'session' => $sessionMeta,
            'assessment' => $assessment ? $this->assessments->transformAssessment($assessment) : null,
            'word_results' => $assessment
                ? $assessment->wordResults()->get()->map(fn ($word) => [
                    'id' => $word->id,
                    'surah_number' => $word->surah_number,
                    'ayah_number' => $word->ayah_number,
                    'word_index' => $word->word_index,
                    'verse_key' => $word->verse_key,
                    'detected_token' => $word->detected_token,
                    'result_type' => $word->result_type,
                    'confidence' => $word->confidence,
                ])->values()->all()
                : [],
            'ai_attempt' => $attempt ? $this->transformAttempt($attempt) : null,
            'practice_plan' => $plan ? $this->assessments->transformPlan($plan) : null,
            'recommendation' => $recommendation ? $this->transformRecommendation($recommendation) : null,
            'retention' => [
                'weak_spots' => $weakSpots,
            ],
            'audio' => $this->audio->payload($attempt),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function retentionSpots(
        User $user,
        ?UserSession $session,
        ?MemorisationAssessment $assessment,
        ?AiReciteAttempt $attempt,
    ): array {
        $query = MemorisationWeakSpot::query()->where('user_id', $user->id);

        if ($assessment) {
            $query->where(function ($inner) use ($assessment) {
                $inner->where('source_assessment_id', $assessment->id)
                    ->orWhere('last_assessment_id', $assessment->id);
            });
        } else {
            $range = $session
                ? $this->sessionRange($session)
                : ($attempt ? $this->attemptRange($attempt) : null);
            $surah = (int) ($range['surah_number'] ?? 0);
            $from = (int) ($range['ayah_start'] ?? 0);
            $to = (int) ($range['ayah_end'] ?? $from);
            if ($surah <= 0) {
                return [];
            }
            $query->where('surah_number', $surah);
            if ($from > 0) {
                $query->whereBetween('ayah_number', [$from, max($from, $to)]);
            }
        }

        return $query
            ->orderByDesc('last_identified_at')
            ->orderByDesc('id')
            ->limit(20)
            ->get()
            ->map(fn (MemorisationWeakSpot $spot) => [
                'id' => $spot->id,
                'spot_type' => $spot->spot_type,
                'surah_number' => $spot->surah_number,
                'ayah_number' => $spot->ayah_number,
                'word_index' => $spot->word_index,
                'verse_key' => $spot->verse_key,
                'severity' => $spot->severity,
                'status' => $spot->status,
                'trend' => $spot->trend,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function transformSession(
        ?UserSession $session,
        ?MemorisationAssessment $assessment,
        ?AiReciteAttempt $attempt,
    ): array {
        $range = $session
            ? $this->sessionRange($session)
            : ($assessment ? $this->assessmentRange($assessment) : ($attempt ? $this->attemptRange($attempt) : [
                'surah_number' => null,
                'surah_name' => null,
                'ayah_start' => null,
                'ayah_end' => null,
            ]));

        $status = null;
        if ($session?->status instanceof UserSessionStatus) {
            $status = $session->status->value;
        } elseif ($session) {
            $status = (string) $session->status;
        }

        $completion = is_array($session?->completion_settings) ? $session->completion_settings : [];
        $meta = is_array($session?->metadata) ? $session->metadata : [];
        $stats = is_array($meta['stats'] ?? null) ? $meta['stats'] : [];

        return [
            'id' => $session?->id,
            'surah_number' => $range['surah_number'],
            'surah_name' => $range['surah_name'],
            'ayah_start' => $range['ayah_start'],
            'ayah_end' => $range['ayah_end'],
            'status' => $status,
            'occurred_at' => optional(
                $session?->ended_at
                ?? $session?->last_activity_at
                ?? $assessment?->completed_at
                ?? $attempt?->created_at
            )->toIso8601String(),
            'duration_seconds' => (int) (
                $session?->session_duration_seconds
                ?? $completion['session_duration_seconds']
                ?? $stats['time_spent_seconds']
                ?? 0
            ),
            'repetitions_completed' => (int) (
                $session?->repetitions_completed
                ?? $completion['repetitions']
                ?? $stats['repetitions_completed']
                ?? 0
            ),
            'verse_play_counts' => is_array($completion['verse_play_counts'] ?? null)
                ? $completion['verse_play_counts']
                : (is_array($meta['verse_play_counts'] ?? null) ? $meta['verse_play_counts'] : []),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformAttempt(AiReciteAttempt $attempt): array
    {
        $range = $this->attemptRange($attempt);

        return [
            'id' => $attempt->id,
            'user_session_id' => $attempt->user_session_id ? (int) $attempt->user_session_id : null,
            'source' => $attempt->source,
            'band' => $attempt->band,
            'accuracy_percent' => $attempt->accuracy_percent,
            'peek_used' => (bool) $attempt->peek_used,
            'duration_ms' => $attempt->duration_ms,
            'ayah_range' => $attempt->ayah_range,
            'surah_number' => $range['surah_number'],
            'surah_name' => $range['surah_name'],
            'ayah_start' => $range['ayah_start'],
            'ayah_end' => $range['ayah_end'],
            'color_counts' => $attempt->color_counts,
            'weak_words' => $attempt->weak_words,
            'word_statuses' => $attempt->word_statuses,
            'plan_snapshot' => $attempt->plan_snapshot,
            'occurred_at' => optional($attempt->created_at)->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformRecommendation(SessionRecommendation $recommendation): array
    {
        $ai = is_array($recommendation->ai_assessment) ? $recommendation->ai_assessment : null;

        return [
            'id' => $recommendation->id,
            'recommendation_type' => $recommendation->recommendation_type,
            'reason_code' => $recommendation->reason_code,
            'recommended_technique' => $recommendation->recommended_technique,
            'recommended_repetitions' => $recommendation->recommended_repetitions,
            'ayah_start' => $recommendation->ayah_start,
            'ayah_end' => $recommendation->ayah_end,
            'surah_number' => $recommendation->surah_number,
            'ai_assessment' => $ai,
        ];
    }

    private function sessionHasPersistedRecitationCheck(
        ?MemorisationAssessment $assessment,
        ?AiReciteAttempt $attempt,
    ): bool {
        if ($attempt) {
            $words = is_array($attempt->word_statuses) ? $attempt->word_statuses : [];
            if ($words !== []) {
                return true;
            }
            if ($attempt->accuracy_percent !== null || filled($attempt->band)) {
                return true;
            }
        }

        if ($assessment && $assessment->status === MemorisationAssessment::STATUS_COMPLETED) {
            if ($assessment->accuracy !== null || $assessment->overall_accuracy !== null) {
                return true;
            }

            return $assessment->wordResults()->exists();
        }

        return false;
    }

    /**
     * @return array{surah_number: int|null, surah_name: string|null, ayah_start: int|null, ayah_end: int|null}
     */
    private function sessionRange(UserSession $session): array
    {
        $meta = is_array($session->metadata) ? $session->metadata : [];
        $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
        $surah = (int) ($session->surah_number ?: ($config['chapterId'] ?? 0));
        $from = (int) ($config['rangeStart'] ?? 0);
        $to = (int) ($config['rangeEnd'] ?? $from);

        return $this->namedRange($surah, $from, $to);
    }

    /**
     * Per-ayah score from this attempt's own words. A strong attempt no longer
     * paints every ayah in the range as weak, and a weak ayah stays visible
     * when the rest of the set was recited well.
     *
     * @return list<array{ayah: int, accuracy: int, needs_practice: bool}>
     */
    private function scoreAttemptAyahs(AiReciteAttempt $attempt): array
    {
        $statuses = is_array($attempt->word_statuses) ? $attempt->word_statuses : [];
        $byAyah = [];
        foreach ($statuses as $word) {
            if (! is_array($word)) {
                continue;
            }
            $ayah = (int) ($word['ayah_number'] ?? $word['ayahNumber'] ?? $word['ayah'] ?? 0);
            if ($ayah <= 0) {
                continue;
            }
            $status = strtolower(trim((string) ($word['status'] ?? $word['result_type'] ?? '')));
            if (! isset($byAyah[$ayah])) {
                $byAyah[$ayah] = ['total' => 0, 'weight' => 0.0, 'hard' => 0, 'attempted' => 0];
            }
            $byAyah[$ayah]['total']++;
            if (in_array($status, ['correct', 'match', 'ok', 'green'], true)) {
                $byAyah[$ayah]['weight'] += 1;
                $byAyah[$ayah]['attempted']++;
            } elseif (in_array($status, ['partial', 'minor_mistake', 'amber'], true)) {
                $byAyah[$ayah]['weight'] += RecitationScoringThresholds::PARTIAL_ACCURACY_WEIGHT;
                $byAyah[$ayah]['attempted']++;
            } elseif (in_array($status, ['wrong', 'incorrect', 'missing', 'omitted', 'skipped', 'unmatched', 'deletion', 'red', 'black'], true)) {
                $byAyah[$ayah]['hard']++;
                $byAyah[$ayah]['attempted']++;
            }
        }

        $rows = [];
        foreach ($byAyah as $ayah => $stats) {
            $total = max(1, (int) $stats['total']);
            $unattempted = (int) $stats['attempted'] === 0;
            $accuracy = $unattempted ? 0 : (int) round(((float) $stats['weight'] / $total) * 100);
            $rows[] = [
                'ayah' => (int) $ayah,
                'accuracy' => $accuracy,
                'needs_practice' => $unattempted || (int) $stats['hard'] > 0 || $accuracy < 90,
            ];
        }

        return $rows;
    }

    /**
     * Attempts saved before per-word statuses existed: only the ayahs already
     * marked weak, never the whole recited range.
     *
     * @return list<array{ayah: int, accuracy: int, needs_practice: bool}>
     */
    private function focusAyahsFromRange(AiReciteAttempt $attempt): array
    {
        $stored = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
        $focus = $stored['focus_ayahs'] ?? [];
        if (! is_array($focus) || $focus === []) {
            return [];
        }

        $rows = [];
        foreach ($focus as $item) {
            $ayah = is_array($item)
                ? (int) ($item['ayah'] ?? $item['ayah_number'] ?? $item['ayahNumber'] ?? 0)
                : (int) $item;
            if ($ayah <= 0) {
                continue;
            }
            $accuracy = is_array($item) && isset($item['accuracy'])
                ? (int) $item['accuracy']
                : (int) $attempt->accuracy_percent;
            $rows[] = [
                'ayah' => $ayah,
                'accuracy' => $accuracy,
                'needs_practice' => true,
            ];
        }

        return $rows;
    }

    /**
     * @return array{surah_number: int|null, surah_name: string|null, ayah_start: int|null, ayah_end: int|null}
     */
    private function attemptRange(AiReciteAttempt $attempt): array
    {
        $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
        $surah = (int) ($range['surah'] ?? $range['chapterId'] ?? $range['surah_number'] ?? 0);
        $from = (int) ($range['from'] ?? $range['rangeStart'] ?? $range['start'] ?? 0);
        $to = (int) ($range['to'] ?? $range['rangeEnd'] ?? $range['end'] ?? $from);
        $name = isset($range['surah_name']) ? (string) $range['surah_name'] : null;

        if ($surah <= 0 || $from <= 0) {
            $words = is_array($attempt->word_statuses) ? $attempt->word_statuses : [];
            if ($words !== []) {
                $first = $words[0];
                if ($surah <= 0) {
                    $surah = (int) ($first['surah_number'] ?? $first['surahNumber'] ?? $first['chapterId'] ?? 0);
                }
                if ($from <= 0) {
                    $from = (int) ($first['ayah_number'] ?? $first['ayahNumber'] ?? 0);
                    $to = $to > 0 ? $to : $from;
                }
            }
        }

        if ($surah <= 0 && $attempt->user_session_id) {
            $session = UserSession::query()->find($attempt->user_session_id);
            if ($session) {
                $sessionRange = $this->sessionRange($session);
                $surah = (int) ($sessionRange['surah_number'] ?? 0);
                $from = $from > 0 ? $from : (int) ($sessionRange['ayah_start'] ?? 0);
                $to = $to > 0 ? $to : (int) ($sessionRange['ayah_end'] ?? $from);
                $name = $name ?: ($sessionRange['surah_name'] ?? null);
            }
        }

        return $this->namedRange($surah, $from, $to, $name);
    }

    /**
     * @return array{surah_number: int|null, surah_name: string|null, ayah_start: int|null, ayah_end: int|null}
     */
    private function assessmentRange(MemorisationAssessment $assessment): array
    {
        return $this->namedRange(
            (int) $assessment->surah_number,
            (int) $assessment->start_ayah,
            (int) $assessment->end_ayah,
            $assessment->surah_name
        );
    }

    /**
     * @return array{surah_number: int|null, surah_name: string|null, ayah_start: int|null, ayah_end: int|null}
     */
    private function namedRange(int $surah, int $from, int $to, ?string $name = null): array
    {
        return [
            'surah_number' => $surah > 0 ? $surah : null,
            'surah_name' => $surah > 0
                ? ($name ?: (QuranMetadata::name($surah) ?: ('Surah '.$surah)))
                : $name,
            'ayah_start' => $from > 0 ? $from : null,
            'ayah_end' => $to > 0 ? $to : null,
        ];
    }
}

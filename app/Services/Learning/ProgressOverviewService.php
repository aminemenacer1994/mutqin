<?php

namespace App\Services\Learning;

use App\Enums\UserSessionStatus;
use App\Models\AiReciteAttempt;
use App\Models\MemorisationProgress;
use App\Models\User;
use App\Models\UserSession;
use App\Support\QuranMetadata;
use App\Support\RecitationAlignmentStatus;
use Illuminate\Support\Carbon;

/**
 * Progress counts and revisit cards from stored rows only.
 * Listening, unfinished sessions, and checks without a transcript are not promoted into recited ayahs.
 */
class ProgressOverviewService
{
    private const REVISION_SCAN_LIMIT = 400;

    private const ATTEMPT_SCAN_LIMIT = 200;

    /**
     * @return array<string, mixed>
     */
    public static function empty(int $days): array
    {
        $days = in_array($days, [7, 30], true) ? $days : 30;

        return [
            'period_days' => $days,
            'metrics' => [
                'memorised' => self::metric(0, 'distinct_ayahs_marked_memorised_or_mastered', null),
                'revised' => self::metric(0, 'distinct_ayahs_in_completed_revision_sessions', $days),
                'recited' => self::metric(0, 'distinct_ayahs_with_stored_recitation', $days),
                'ai_checks' => self::metric(0, 'valid_completed_assessment_attempts', null),
            ],
            'revisit' => [],
            'comparable' => null,
        ];
    }

    /**
     * @param  array<string, mixed>  $weaknesses
     * @param  array<string, mixed>  $dailyRevision
     * @return array<string, mixed>
     */
    public function build(User $user, int $days, array $weaknesses = [], array $dailyRevision = []): array
    {
        $days = in_array($days, [7, 30], true) ? $days : 30;
        $from = now()->subDays($days - 1)->startOfDay();

        $memorised = $this->memorisedCount($user);
        $revised = $this->revisedAyahs($user, $from);
        $attempts = $this->validAttempts($user);
        $recited = $this->recitedAyahs($attempts, $from);
        $aiChecks = $this->aiCheckCounts($user, $from);
        $evidence = $this->ayahEvidence($attempts);
        $revisit = $this->revisitItems($user, $weaknesses, $dailyRevision, $evidence);

        return [
            'period_days' => $days,
            'metrics' => [
                'memorised' => self::metric($memorised, 'distinct_ayahs_marked_memorised_or_mastered', null),
                'revised' => array_merge(
                    self::metric($revised['distinct'], 'distinct_ayahs_in_completed_revision_sessions', $days),
                    [
                        'session_count' => $revised['sessions'],
                        'capped' => $revised['capped'],
                    ]
                ),
                'recited' => array_merge(
                    self::metric($recited['distinct'], 'distinct_ayahs_with_stored_recitation', $days),
                    [
                        'repeats' => $recited['repeats'],
                        'capped' => $recited['capped'],
                        'skipped_only' => $recited['skipped_only'],
                    ]
                ),
                'ai_checks' => array_merge(
                    self::metric($aiChecks['total'], 'valid_completed_assessment_attempts', null),
                    ['period_value' => $aiChecks['period']]
                ),
            ],
            'revisit' => $revisit,
            'comparable' => $this->comparableSummary($attempts),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function metric(int $value, string $definition, ?int $days): array
    {
        return [
            'value' => $value,
            'period_days' => $days,
            'definition' => $definition,
            'percent' => null,
        ];
    }

    private function memorisedCount(User $user): int
    {
        return MemorisationProgress::query()
            ->where('user_id', $user->id)
            ->whereIn('status', ['memorised', 'mastered'])
            ->get(['surah_number', 'ayah_number'])
            ->map(fn (MemorisationProgress $row) => (int) $row->surah_number.':'.(int) $row->ayah_number)
            ->unique()
            ->filter(fn (string $key) => ! str_starts_with($key, '0:'))
            ->count();
    }

    /**
     * @return array{distinct: int, sessions: int, capped: bool}
     */
    private function revisedAyahs(User $user, Carbon $from): array
    {
        $query = UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->where('status', UserSessionStatus::Completed->value)
            ->where(function ($inner) use ($from) {
                $inner->where('ended_at', '>=', $from)
                    ->orWhere(function ($fallback) use ($from) {
                        $fallback->whereNull('ended_at')->where('last_activity_at', '>=', $from);
                    });
            })
            ->where(function ($mode) {
                $mode->where('memorisation_mode', 'revision')
                    ->orWhere('metadata->config->sessionMode', 'revision')
                    ->orWhere('metadata->config->mode', 'revision')
                    ->orWhere('metadata->session_mode', 'revision');
            });

        $total = (clone $query)->count();
        $rows = $query
            ->orderByDesc('id')
            ->limit(self::REVISION_SCAN_LIMIT)
            ->get(['id', 'surah_number', 'ayah_number', 'memorisation_mode', 'metadata']);

        $ayahs = [];
        foreach ($rows as $session) {
            if (! $this->isRevisionSession($session)) {
                continue;
            }
            foreach ($this->sessionAyahKeys($session) as $key) {
                $ayahs[$key] = true;
            }
        }

        return [
            'distinct' => count($ayahs),
            'sessions' => $rows->count(),
            'capped' => $total > self::REVISION_SCAN_LIMIT,
        ];
    }

    private function isRevisionSession(UserSession $session): bool
    {
        $mode = strtolower(trim((string) $session->memorisation_mode));
        $meta = is_array($session->metadata) ? $session->metadata : [];
        $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
        $configMode = strtolower(trim((string) ($config['sessionMode'] ?? $config['mode'] ?? $meta['session_mode'] ?? '')));

        return $mode === 'revision' || $configMode === 'revision';
    }

    /**
     * @return list<string>
     */
    private function sessionAyahKeys(UserSession $session): array
    {
        $meta = is_array($session->metadata) ? $session->metadata : [];
        $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
        $surah = (int) ($session->surah_number ?: ($config['chapterId'] ?? 0));
        $start = (int) ($config['rangeStart'] ?? $config['range_start'] ?? 0);
        $end = (int) ($config['rangeEnd'] ?? $config['range_end'] ?? 0);
        if ($start <= 0 && (int) $session->ayah_number > 0) {
            $start = (int) $session->ayah_number;
            $end = $start;
        }
        if ($surah <= 0 || $start <= 0) {
            return [];
        }
        $limit = QuranMetadata::ayahCount($surah);
        if ($limit === null || $start > $limit) {
            return [];
        }
        if ($end < $start) {
            $end = $start;
        }
        $end = min($end, $limit);
        $keys = [];
        for ($ayah = $start; $ayah <= $end; $ayah++) {
            $keys[] = $surah.':'.$ayah;
        }

        return $keys;
    }

    /**
     * @return \Illuminate\Support\Collection<int, AiReciteAttempt>
     */
    private function validAttempts(User $user)
    {
        return AiReciteAttempt::query()
            ->where('user_id', $user->id)
            ->whereNotNull('memorisation_assessment_id')
            ->validScored()
            ->whereHas('assessment', fn ($query) => $query->validScored())
            ->with([
                'assessment:id,model_version,algorithm_version,status',
                'session:id,metadata,memorisation_mode',
            ])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(self::ATTEMPT_SCAN_LIMIT)
            ->get([
                'id',
                'user_id',
                'user_session_id',
                'memorisation_assessment_id',
                'accuracy_percent',
                'band',
                'ayah_range',
                'word_statuses',
                'plan_snapshot',
                'created_at',
            ]);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, AiReciteAttempt>  $attempts
     * @return array{distinct: int, repeats: int, capped: bool, skipped_only: int}
     */
    private function recitedAyahs($attempts, Carbon $from): array
    {
        $period = $attempts->filter(function (AiReciteAttempt $attempt) use ($from) {
            return $attempt->created_at !== null && $attempt->created_at->greaterThanOrEqualTo($from);
        });
        $distinct = [];
        $occurrences = 0;
        $skippedOnly = [];
        foreach ($period as $attempt) {
            $heard = [];
            $skipped = [];
            foreach ($this->storedWords($attempt) as $word) {
                $ayah = (int) ($word['ayah'] ?? 0);
                $surah = (int) ($word['surah'] ?? 0);
                if ($surah <= 0 || $ayah <= 0) {
                    continue;
                }
                $key = $surah.':'.$ayah;
                if (RecitationAlignmentStatus::isHeard((string) $word['state'])) {
                    $heard[$key] = true;
                } elseif ($word['state'] === RecitationAlignmentStatus::SKIPPED) {
                    $skipped[$key] = true;
                }
            }
            foreach (array_keys($heard) as $key) {
                $distinct[$key] = true;
                $occurrences++;
            }
            foreach (array_keys($skipped) as $key) {
                if (! isset($heard[$key])) {
                    $skippedOnly[$key] = true;
                }
            }
        }

        return [
            'distinct' => count($distinct),
            'repeats' => max(0, $occurrences - count($distinct)),
            'capped' => $attempts->count() >= self::ATTEMPT_SCAN_LIMIT
                && $period->count() === $attempts->count(),
            'skipped_only' => count($skippedOnly),
        ];
    }

    /**
     * @return array{total: int, period: int}
     */
    private function aiCheckCounts(User $user, Carbon $from): array
    {
        $query = AiReciteAttempt::query()
            ->where('user_id', $user->id)
            ->whereNotNull('memorisation_assessment_id')
            ->validScored()
            ->whereHas('assessment', fn ($inner) => $inner->validScored());

        return [
            'total' => (clone $query)->count(),
            'period' => (clone $query)->where('created_at', '>=', $from)->count(),
        ];
    }

    /**
     * Newest stored alignment per ayah.
     *
     * @param  \Illuminate\Support\Collection<int, AiReciteAttempt>  $attempts
     * @return array<string, array<string, mixed>>
     */
    private function ayahEvidence($attempts): array
    {
        $byAyah = [];
        foreach ($attempts as $attempt) {
            $range = $this->attemptRange($attempt);
            $grouped = [];
            foreach ($this->storedWords($attempt) as $word) {
                $ayah = (int) ($word['ayah'] ?? 0);
                if ($ayah <= 0) {
                    continue;
                }
                $grouped[$ayah][] = $word;
            }
            foreach ($grouped as $ayah => $words) {
                $surah = (int) ($words[0]['surah'] ?? $range['surah'] ?? 0);
                if ($surah <= 0) {
                    continue;
                }
                $key = $surah.':'.$ayah;
                if (isset($byAyah[$key])) {
                    continue;
                }
                $states = array_map(fn (array $word) => (string) $word['state'], $words);
                $flagged = array_values(array_filter(
                    $words,
                    fn (array $word) => RecitationAlignmentStatus::isFlagged((string) $word['state'])
                ));
                $content = array_values(array_filter(
                    $states,
                    fn (string $state) => $state !== RecitationAlignmentStatus::EXTRA
                ));
                $settled = $content !== []
                    && $flagged === []
                    && ! in_array(RecitationAlignmentStatus::UNASSESSED, $content, true);
                $byAyah[$key] = [
                    'key' => $key,
                    'surah_number' => $surah,
                    'ayah_number' => (int) $ayah,
                    'attempt_id' => (int) $attempt->id,
                    'assessment_id' => (int) $attempt->memorisation_assessment_id,
                    'occurred_at' => optional($attempt->created_at)->toIso8601String(),
                    'accuracy_percent' => $this->ayahAccuracy($words),
                    'words' => $words,
                    'flagged_count' => count($flagged),
                    'settled' => $settled,
                    'skipped_only' => $content !== [] && ! in_array(true, array_map(
                        fn (string $state) => RecitationAlignmentStatus::isHeard($state),
                        $content
                    ), true),
                    'model_version' => $attempt->assessment?->model_version,
                    'settings' => $this->settingsFor($attempt),
                ];
            }
        }

        return $byAyah;
    }

    /**
     * @param  array<string, mixed>  $weaknesses
     * @param  array<string, mixed>  $dailyRevision
     * @param  array<string, array<string, mixed>>  $evidence
     * @return list<array<string, mixed>>
     */
    private function revisitItems(User $user, array $weaknesses, array $dailyRevision, array $evidence): array
    {
        $candidates = [];
        $sources = array_merge(
            is_array($weaknesses['all_items'] ?? null) ? $weaknesses['all_items'] : [],
            is_array($dailyRevision['due_all_items'] ?? null) ? $dailyRevision['due_all_items'] : (is_array($dailyRevision['due_items'] ?? null) ? $dailyRevision['due_items'] : []),
        );
        foreach ($sources as $item) {
            if (! is_array($item)) {
                continue;
            }
            $surah = (int) ($item['surah_number'] ?? 0);
            $ayah = (int) ($item['ayah_number'] ?? 0);
            if ($surah <= 0 || $ayah <= 0) {
                continue;
            }
            $key = $surah.':'.$ayah;
            $row = $evidence[$key] ?? null;
            if (is_array($row) && ($row['settled'] ?? false) === true) {
                continue;
            }
            $score = $this->revisitScore($item, $row);
            if (! isset($candidates[$key]) || $score > $candidates[$key]['score']) {
                $candidates[$key] = $this->revisitCard($user, $item, $row, $score);
            }
        }

        foreach ($evidence as $key => $row) {
            if (($row['settled'] ?? false) === true || isset($candidates[$key])) {
                continue;
            }
            if ((int) ($row['flagged_count'] ?? 0) <= 0) {
                continue;
            }
            $candidates[$key] = $this->revisitCard($user, [
                'key' => $key,
                'surah_number' => $row['surah_number'],
                'surah_name' => QuranMetadata::name((int) $row['surah_number']),
                'ayah_number' => $row['ayah_number'],
            ], $row, 4 + (int) $row['flagged_count']);
        }

        $cards = array_values($candidates);
        usort($cards, function (array $a, array $b): int {
            return ($b['score'] <=> $a['score']) ?: strcmp((string) $b['occurred_at'], (string) $a['occurred_at']);
        });

        return array_map(function (array $card) {
            unset($card['score']);

            return $card;
        }, array_slice($cards, 0, 3));
    }

    /**
     * @param  array<string, mixed>  $item
     * @param  array<string, mixed>|null  $row
     */
    private function revisitScore(array $item, ?array $row): int
    {
        if ($row === null) {
            return isset($item['due_at']) ? 2 : 1;
        }
        $score = 3 + ((int) ($row['flagged_count'] ?? 0) * 2);
        if (($row['skipped_only'] ?? false) === true) {
            $score = 2;
        }
        if ((string) ($item['history_status'] ?? '') === 'improving') {
            $score = max(1, $score - 2);
        }

        return $score;
    }

    /**
     * @param  array<string, mixed>  $item
     * @param  array<string, mixed>|null  $row
     * @return array<string, mixed>
     */
    private function revisitCard(User $user, array $item, ?array $row, int $score): array
    {
        $surah = (int) ($item['surah_number'] ?? $row['surah_number'] ?? 0);
        $ayah = (int) ($item['ayah_number'] ?? $row['ayah_number'] ?? 0);
        $state = 'not_assessed';
        if (is_array($row)) {
            $state = ($row['skipped_only'] ?? false) === true
                ? 'skipped'
                : (((int) ($row['flagged_count'] ?? 0) > 0) ? 'flagged' : 'not_assessed');
        }
        $words = is_array($row['words'] ?? null) ? $row['words'] : [];
        $flaggedIndexes = [];
        foreach ($words as $word) {
            if (! RecitationAlignmentStatus::isFlagged((string) ($word['state'] ?? ''))) {
                continue;
            }
            if (isset($word['index']) && is_int($word['index'])) {
                $flaggedIndexes[] = $surah.':'.$ayah.':'.$word['index'];
            }
        }

        return [
            'key' => $surah.':'.$ayah,
            'surah_number' => $surah,
            'surah_name' => $item['surah_name'] ?? QuranMetadata::name($surah),
            'ayah_number' => $ayah,
            'score' => $score,
            'evidence' => $row ? 'word_alignment' : (isset($item['due_at']) ? 'due_revision' : 'not_assessed'),
            'assessment_state' => $state,
            'occurred_at' => $row['occurred_at'] ?? ($item['due_at'] ?? $item['detected_at'] ?? null),
            'accuracy_percent' => $row['accuracy_percent'] ?? null,
            'words' => $words,
            'flagged_count' => (int) ($row['flagged_count'] ?? 0),
            'attempt_id' => $row['attempt_id'] ?? null,
            'assessment_id' => $row['assessment_id'] ?? null,
            'model_version' => $row['model_version'] ?? null,
            'settings' => $row['settings'] ?? [],
            'history_status' => $item['history_status'] ?? null,
            'history_attempts' => $item['history_attempts'] ?? null,
            'href' => $this->reviewHref($surah, $ayah, array_filter([
                'attempt' => $row['attempt_id'] ?? null,
                'prior_assessment' => $row['assessment_id'] ?? null,
                'weak' => $flaggedIndexes === [] ? null : implode(',', array_slice($flaggedIndexes, 0, 24)),
            ])),
            'owner_id' => (int) $user->id,
        ];
    }

    /**
     * @param  array<string, scalar|null>  $extra
     */
    private function reviewHref(int $surah, int $ayah, array $extra = []): string
    {
        $query = array_filter(array_merge([
            'surah' => $surah,
            'from' => $ayah,
            'to' => $ayah,
            'review' => 1,
            'return' => 'dashboard',
        ], $extra), fn ($value) => $value !== null && $value !== '');

        return route('memorisation').'?'.http_build_query($query);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, AiReciteAttempt>  $attempts
     * @return array<string, mixed>|null
     */
    private function comparableSummary($attempts): ?array
    {
        $groups = [];
        foreach ($attempts as $attempt) {
            $model = trim((string) ($attempt->assessment?->model_version ?? ''));
            $algorithm = trim((string) ($attempt->assessment?->algorithm_version ?? ''));
            if ($model === '' || $attempt->accuracy_percent === null) {
                continue;
            }
            $range = $this->attemptRange($attempt);
            if ((int) ($range['surah'] ?? 0) <= 0 || (int) ($range['from'] ?? 0) <= 0) {
                continue;
            }
            $passage = $range['surah'].':'.$range['from'].'-'.$range['to'];
            $key = $passage.'|'.$model.'|'.$algorithm;
            if (! isset($groups[$key])) {
                $groups[$key] = [
                    'passage' => $passage,
                    'surah_number' => (int) $range['surah'],
                    'ayah_start' => (int) $range['from'],
                    'ayah_end' => (int) $range['to'],
                    'model_version' => $model,
                    'algorithm_version' => $algorithm !== '' ? $algorithm : null,
                    'scores' => [],
                ];
            }
            $groups[$key]['scores'][] = (int) $attempt->accuracy_percent;
        }

        $eligible = array_values(array_filter($groups, fn (array $group) => count($group['scores']) >= 2));
        if ($eligible === []) {
            return null;
        }
        usort($eligible, fn (array $a, array $b) => count($b['scores']) <=> count($a['scores']));
        $group = $eligible[0];
        $scores = $group['scores'];

        return [
            'passage' => $group['passage'],
            'surah_number' => $group['surah_number'],
            'ayah_start' => $group['ayah_start'],
            'ayah_end' => $group['ayah_end'],
            'model_version' => $group['model_version'],
            'algorithm_version' => $group['algorithm_version'],
            'attempts' => count($scores),
            'average' => (int) round(array_sum($scores) / count($scores)),
            'best' => max($scores),
            'definition' => 'estimated_word_match_same_passage_and_model',
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function storedWords(AiReciteAttempt $attempt): array
    {
        $statuses = is_array($attempt->word_statuses) ? $attempt->word_statuses : [];
        $range = $this->attemptRange($attempt);
        $words = [];
        foreach ($statuses as $word) {
            if (! is_array($word)) {
                continue;
            }
            $state = RecitationAlignmentStatus::classify($word);
            $ayah = (int) ($word['ayah_number'] ?? $word['ayahNumber'] ?? $word['ayah'] ?? 0);
            if ($ayah <= 0 && (int) ($range['from'] ?? 0) > 0 && (int) ($range['from'] ?? 0) === (int) ($range['to'] ?? 0)) {
                $ayah = (int) $range['from'];
            }
            $public = [
                'state' => $state,
                'expected' => RecitationAlignmentStatus::expectedText($word),
                'detected' => RecitationAlignmentStatus::detectedText($word),
                'index' => RecitationAlignmentStatus::expectedIndex($word),
                'ayah' => $ayah,
                'surah' => (int) ($word['surah_number'] ?? $word['surah'] ?? $range['surah'] ?? 0),
                'confidence' => RecitationAlignmentStatus::confidence($word),
                'out_of_order' => strtolower((string) ($word['status'] ?? '')) === 'out_of_order'
                    || ! empty($word['out_of_order'])
                    || ! empty($word['outOfOrder']),
            ];
            if ($public['expected'] === '' && $public['detected'] === '' && $state === RecitationAlignmentStatus::UNASSESSED) {
                continue;
            }
            $words[] = $public;
        }

        return $words;
    }

    /**
     * @param  list<array<string, mixed>>  $words
     */
    private function ayahAccuracy(array $words): ?int
    {
        $considered = 0;
        $weight = 0.0;
        foreach ($words as $word) {
            $state = (string) ($word['state'] ?? '');
            if ($state === RecitationAlignmentStatus::EXTRA || $state === RecitationAlignmentStatus::UNASSESSED) {
                continue;
            }
            $considered++;
            if ($state === RecitationAlignmentStatus::MATCHED) {
                $weight += 1;
            } elseif ($state === RecitationAlignmentStatus::UNCERTAIN) {
                $weight += 0.5;
            }
        }
        if ($considered === 0) {
            return null;
        }

        return (int) round(($weight / $considered) * 100);
    }

    /**
     * @return array{surah: int, from: int, to: int}
     */
    private function attemptRange(AiReciteAttempt $attempt): array
    {
        $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
        $surah = (int) ($range['surah'] ?? $range['surah_number'] ?? $range['surahId'] ?? 0);
        $from = (int) ($range['from'] ?? $range['start'] ?? $range['ayah_start'] ?? 0);
        $to = (int) ($range['to'] ?? $range['end'] ?? $range['ayah_end'] ?? $from);

        return [
            'surah' => $surah,
            'from' => $from,
            'to' => max($from, $to),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function settingsFor(AiReciteAttempt $attempt): array
    {
        $snapshot = is_array($attempt->plan_snapshot) ? $attempt->plan_snapshot : [];
        $planConfig = is_array($snapshot['config'] ?? null) ? $snapshot['config'] : [];
        $session = $attempt->session;
        $meta = is_array($session?->metadata) ? $session->metadata : [];
        $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
        $merged = array_merge($planConfig, $config);

        return array_filter([
            'reciter' => $merged['reciterId'] ?? $merged['reciter'] ?? null,
            'speed' => $merged['speed'] ?? $merged['playback_speed'] ?? null,
            'repetitions' => $merged['repetitionsPerStep'] ?? $merged['repetitions'] ?? null,
            'layout' => $merged['readingViewMode'] ?? $merged['layout'] ?? null,
        ], fn ($value) => $value !== null && $value !== '');
    }
}

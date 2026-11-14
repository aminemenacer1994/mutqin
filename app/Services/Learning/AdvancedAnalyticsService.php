<?php

namespace App\Services\Learning;

use App\Enums\UserSessionStatus;
use App\Models\AiReciteAttempt;
use App\Models\MemorisationAssessment;
use App\Models\MemorisationProgress;
use App\Models\User;
use App\Models\UserSession;
use App\Support\QuranMetadata;
use App\Support\RecitationAlignmentStatus;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Pro learner advanced analytics — stored sessions and scored attempts only.
 */
class AdvancedAnalyticsService
{
    private const SESSION_SCAN_LIMIT = 800;

    private const ATTEMPT_SCAN_LIMIT = 300;

    private const MAX_ATTENTION_AYAHS = 12;

    private const MAX_SURAH_PROGRESS = 20;

    private const MAX_INSIGHTS = 6;

    /**
     * Arabic surah names aligned with SessionVoiceInterpreter::ARABIC_SURAHS.
     *
     * @var array<int, string>
     */
    private const ARABIC_SURAHS = [
        1 => 'الفاتحة', 2 => 'البقرة', 3 => 'آل عمران', 4 => 'النساء', 5 => 'المائدة',
        6 => 'الأنعام', 7 => 'الأعراف', 8 => 'الأنفال', 9 => 'التوبة', 10 => 'يونس',
        11 => 'هود', 12 => 'يوسف', 13 => 'الرعد', 14 => 'إبراهيم', 15 => 'الحجر',
        16 => 'النحل', 17 => 'الإسراء', 18 => 'الكهف', 19 => 'مريم', 20 => 'طه',
        21 => 'الأنبياء', 22 => 'الحج', 23 => 'المؤمنون', 24 => 'النور', 25 => 'الفرقان',
        26 => 'الشعراء', 27 => 'النمل', 28 => 'القصص', 29 => 'العنكبوت', 30 => 'الروم',
        31 => 'لقمان', 32 => 'السجدة', 33 => 'الأحزاب', 34 => 'سبأ', 35 => 'فاطر',
        36 => 'يس', 37 => 'الصافات', 38 => 'ص', 39 => 'الزمر', 40 => 'غافر',
        41 => 'فصلت', 42 => 'الشورى', 43 => 'الزخرف', 44 => 'الدخان', 45 => 'الجاثية',
        46 => 'الأحقاف', 47 => 'محمد', 48 => 'الفتح', 49 => 'الحجرات', 50 => 'ق',
        51 => 'الذاريات', 52 => 'الطور', 53 => 'النجم', 54 => 'القمر', 55 => 'الرحمن',
        56 => 'الواقعة', 57 => 'الحديد', 58 => 'المجادلة', 59 => 'الحشر', 60 => 'الممتحنة',
        61 => 'الصف', 62 => 'الجمعة', 63 => 'المنافقون', 64 => 'التغابن', 65 => 'الطلاق',
        66 => 'التحريم', 67 => 'الملك', 68 => 'القلم', 69 => 'الحاقة', 70 => 'المعارج',
        71 => 'نوح', 72 => 'الجن', 73 => 'المزمل', 74 => 'المدثر', 75 => 'القيامة',
        76 => 'الإنسان', 77 => 'المرسلات', 78 => 'النبأ', 79 => 'النازعات', 80 => 'عبس',
        81 => 'التكوير', 82 => 'الانفطار', 83 => 'المطففين', 84 => 'الانشقاق', 85 => 'البروج',
        86 => 'الطارق', 87 => 'الأعلى', 88 => 'الغاشية', 89 => 'الفجر', 90 => 'البلد',
        91 => 'الشمس', 92 => 'الليل', 93 => 'الضحى', 94 => 'الشرح', 95 => 'التين',
        96 => 'العلق', 97 => 'القدر', 98 => 'البينة', 99 => 'الزلزلة', 100 => 'العاديات',
        101 => 'القارعة', 102 => 'التكاثر', 103 => 'العصر', 104 => 'الهمزة', 105 => 'الفيل',
        106 => 'قريش', 107 => 'الماعون', 108 => 'الكوثر', 109 => 'الكافرون', 110 => 'النصر',
        111 => 'المسد', 112 => 'الإخلاص', 113 => 'الفلق', 114 => 'الناس',
    ];

    /**
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    public function build(User $user, array $params = []): array
    {
        $period = $this->resolvePeriod($user, $params);
        $from = $period['from_carbon'];
        $to = $period['to_carbon'];
        $previousFrom = $period['previous_from_carbon'];
        $previousTo = $period['previous_to_carbon'];

        $windowFrom = $previousFrom->copy()->startOfDay();
        $windowTo = $to->copy()->endOfDay();

        $sessions = $this->loadSessions($user, $windowFrom, $windowTo);
        $attempts = $this->loadAttempts($user, $windowFrom, $windowTo);

        $currentSessions = $this->filterSessionsInRange($sessions, $from, $to);
        $previousSessions = $this->filterSessionsInRange($sessions, $previousFrom, $previousTo);
        $currentAttempts = $this->filterAttemptsInRange($attempts, $from, $to);
        $previousAttempts = $this->filterAttemptsInRange($attempts, $previousFrom, $previousTo);

        $currentKpis = $this->overviewKpis($user, $currentSessions, $currentAttempts);
        $previousKpis = $this->overviewKpis($user, $previousSessions, $previousAttempts);

        $spanDays = (int) ($period['label_days'] ?? 0);
        $grain = $this->seriesGrain($spanDays);

        $memorisedBySurah = $this->memorisedAyahsBySurah($user);
        $revisedBySurah = $this->revisedAyahsBySurah($currentSessions);
        $attentionAyahs = $this->attentionAyahs($user, $currentAttempts, $from, $to);

        return [
            'period' => [
                'preset' => $period['preset'],
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'label_days' => $spanDays,
                'previous_from' => $previousFrom->toDateString(),
                'previous_to' => $previousTo->toDateString(),
            ],
            'overview' => array_merge($currentKpis, [
                'deltas' => $this->overviewDeltas($currentKpis, $previousKpis),
            ]),
            'series' => [
                'practice_activity' => $this->practiceActivitySeries($currentSessions, $from, $to, $grain),
                'session_mix' => $this->sessionMixSeries($currentSessions, $from, $to, $grain),
                'ai_performance' => $this->aiPerformanceSeries($currentAttempts),
                'assessment_breakdown' => $this->assessmentBreakdown($currentAttempts),
                'surah_progress' => $this->surahProgress(
                    $currentSessions,
                    $memorisedBySurah,
                    $revisedBySurah,
                ),
            ],
            'attention_ayahs' => $attentionAyahs,
            'insights' => $this->insights(
                $currentKpis,
                $previousKpis,
                $spanDays,
                $currentSessions,
                count($attentionAyahs),
            ),
            'user' => [
                'display_name' => $this->displayName($user),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    private function resolvePeriod(User $user, array $params): array
    {
        $preset = (string) ($params['range'] ?? '30');
        if (! in_array($preset, ['7', '30', '90', 'all', 'custom'], true)) {
            $preset = '30';
        }

        $to = now()->endOfDay();

        if ($preset === 'custom') {
            $from = Carbon::parse((string) $params['from'])->startOfDay();
            $to = Carbon::parse((string) $params['to'])->endOfDay();
        } elseif ($preset === 'all') {
            $maxLookback = now()->subYears(2)->startOfDay();
            $earliest = $this->earliestActivityAt($user);
            $from = $earliest !== null && $earliest->greaterThan($maxLookback)
                ? $earliest->copy()->startOfDay()
                : $maxLookback;
        } else {
            $days = (int) $preset;
            $from = now()->subDays($days - 1)->startOfDay();
        }

        $labelDays = $this->inclusiveDays($from, $to);
        $previousTo = $from->copy()->subDay()->endOfDay();
        $previousFrom = $from->copy()->subDays($labelDays)->startOfDay();

        return [
            'preset' => $preset,
            'from_carbon' => $from,
            'to_carbon' => $to,
            'label_days' => $labelDays,
            'previous_from_carbon' => $previousFrom,
            'previous_to_carbon' => $previousTo,
        ];
    }

    private function earliestActivityAt(User $user): ?Carbon
    {
        $sessionAt = UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->whereIn('status', [
                UserSessionStatus::Completed->value,
                UserSessionStatus::EndedEarly->value,
            ])
            ->orderByRaw('COALESCE(ended_at, last_activity_at, started_at) ASC')
            ->value(DB::raw('COALESCE(ended_at, last_activity_at, started_at)'));

        $attemptAt = AiReciteAttempt::query()
            ->where('user_id', $user->id)
            ->whereNotNull('memorisation_assessment_id')
            ->min('created_at');

        $candidates = array_filter([
            $sessionAt ? Carbon::parse($sessionAt) : null,
            $attemptAt ? Carbon::parse($attemptAt) : null,
        ]);

        if ($candidates === []) {
            return null;
        }

        usort($candidates, fn (Carbon $a, Carbon $b) => $a <=> $b);

        return $candidates[0];
    }

    /**
     * @return Collection<int, UserSession>
     */
    private function loadSessions(User $user, Carbon $from, Carbon $to): Collection
    {
        return UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->whereIn('status', [
                UserSessionStatus::Completed->value,
                UserSessionStatus::EndedEarly->value,
            ])
            ->where(function ($query) use ($from, $to) {
                $query->where(function ($inner) use ($from, $to) {
                    $inner->whereNotNull('ended_at')->whereBetween('ended_at', [$from, $to]);
                })->orWhere(function ($fallback) use ($from, $to) {
                    $fallback->whereNull('ended_at')->whereBetween('last_activity_at', [$from, $to]);
                });
            })
            ->orderByDesc('id')
            ->limit(self::SESSION_SCAN_LIMIT)
            ->get([
                'id',
                'surah_number',
                'ayah_number',
                'memorisation_mode',
                'metadata',
                'status',
                'session_duration_seconds',
                'ended_at',
                'last_activity_at',
                'started_at',
            ]);
    }

    /**
     * @return Collection<int, AiReciteAttempt>
     */
    private function loadAttempts(User $user, Carbon $from, Carbon $to): Collection
    {
        return AiReciteAttempt::query()
            ->where('user_id', $user->id)
            ->whereNotNull('memorisation_assessment_id')
            ->whereBetween('created_at', [$from, $to])
            ->validScored()
            ->whereHas('assessment', fn ($query) => $query->validScored())
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(self::ATTEMPT_SCAN_LIMIT)
            ->get([
                'id',
                'user_id',
                'memorisation_assessment_id',
                'accuracy_percent',
                'band',
                'ayah_range',
                'word_statuses',
                'created_at',
            ]);
    }

    /**
     * @param  Collection<int, UserSession>  $sessions
     * @return Collection<int, UserSession>
     */
    private function filterSessionsInRange(Collection $sessions, Carbon $from, Carbon $to): Collection
    {
        return $sessions->filter(function (UserSession $session) use ($from, $to) {
            $at = $this->sessionOccurredAt($session);

            return $at !== null && $at->between($from, $to);
        })->values();
    }

    /**
     * @param  Collection<int, AiReciteAttempt>  $attempts
     * @return Collection<int, AiReciteAttempt>
     */
    private function filterAttemptsInRange(Collection $attempts, Carbon $from, Carbon $to): Collection
    {
        return $attempts->filter(function (AiReciteAttempt $attempt) use ($from, $to) {
            return $attempt->created_at !== null && $attempt->created_at->between($from, $to);
        })->values();
    }

    /**
     * @param  Collection<int, UserSession>  $sessions
     * @param  Collection<int, AiReciteAttempt>  $attempts
     * @return array<string, int|null>
     */
    private function overviewKpis(User $user, Collection $sessions, Collection $attempts): array
    {
        $durations = $sessions
            ->map(fn (UserSession $s) => $s->session_duration_seconds)
            ->filter(fn ($v) => $v !== null);
        $practiceTime = match (true) {
            $sessions->isEmpty() => 0,
            $durations->isEmpty() => null,
            default => (int) $durations->sum(),
        };

        $ayahKeys = [];
        foreach ($sessions as $session) {
            foreach ($this->sessionAyahKeys($session) as $key) {
                $ayahKeys[$key] = true;
            }
        }

        $practiceDays = [];
        foreach ($sessions as $session) {
            $at = $this->sessionOccurredAt($session);
            if ($at === null) {
                continue;
            }
            $practiceDays[$at->toDateString()] = true;
        }

        $revisionSessions = $sessions->filter(fn (UserSession $s) => $this->isRevisionSession($s))->count();

        $accuracies = $attempts->pluck('accuracy_percent')->filter(fn ($v) => $v !== null);
        $aiAccuracy = $accuracies->isEmpty() ? null : (int) round($accuracies->avg());
        $aiChecks = $attempts->count();

        return [
            'practice_time_seconds' => $practiceTime,
            'ayahs_practised' => count($ayahKeys),
            'memorisation_progress' => $this->memorisedCount($user),
            'revision_sessions' => $revisionSessions,
            'ai_accuracy' => $aiAccuracy,
            'ai_checks' => $aiChecks,
            'practice_days' => count($practiceDays),
        ];
    }

    /**
     * @param  array<string, int|null>  $current
     * @param  array<string, int|null>  $previous
     * @return array<string, float|int|null>
     */
    private function overviewDeltas(array $current, array $previous): array
    {
        return [
            'practice_time' => $this->percentDelta(
                $current['practice_time_seconds'] ?? null,
                $previous['practice_time_seconds'] ?? null,
            ),
            'ayahs_practised' => $this->percentDelta(
                $current['ayahs_practised'] ?? null,
                $previous['ayahs_practised'] ?? null,
            ),
            'revision_sessions' => $this->percentDelta(
                $current['revision_sessions'] ?? null,
                $previous['revision_sessions'] ?? null,
            ),
            'ai_accuracy' => $this->pointDelta(
                $current['ai_accuracy'] ?? null,
                $previous['ai_accuracy'] ?? null,
            ),
            'practice_days' => $this->percentDelta(
                $current['practice_days'] ?? null,
                $previous['practice_days'] ?? null,
            ),
        ];
    }

    private function percentDelta(?int $current, ?int $previous): ?float
    {
        if ($current === null || $previous === null || $previous <= 0) {
            return null;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }

    private function pointDelta(?int $current, ?int $previous): ?int
    {
        if ($current === null || $previous === null) {
            return null;
        }

        return $current - $previous;
    }

    private function seriesGrain(int $spanDays): string
    {
        if ($spanDays <= 31) {
            return 'day';
        }
        if ($spanDays <= 120) {
            return 'week';
        }

        return 'month';
    }

    /**
     * @param  Collection<int, UserSession>  $sessions
     * @return list<array<string, mixed>>
     */
    private function practiceActivitySeries(Collection $sessions, Carbon $from, Carbon $to, string $grain): array
    {
        $buckets = [];
        foreach ($sessions as $session) {
            $at = $this->sessionOccurredAt($session);
            if ($at === null) {
                continue;
            }
            $key = $this->bucketKey($at, $grain);
            if ($key === null) {
                continue;
            }
            if (! isset($buckets[$key])) {
                $buckets[$key] = ['sessions' => 0, 'duration_seconds' => 0, 'has_null_duration' => false];
            }
            $buckets[$key]['sessions']++;
            if ($session->session_duration_seconds === null) {
                $buckets[$key]['has_null_duration'] = true;
            } else {
                $buckets[$key]['duration_seconds'] += (int) $session->session_duration_seconds;
            }
        }

        return $this->fillSeriesBuckets($from, $to, $grain, function (string $key, string $label) use ($buckets) {
            $row = $buckets[$key] ?? ['sessions' => 0, 'duration_seconds' => 0, 'has_null_duration' => false];

            return [
                'key' => $key,
                'label' => $label,
                'sessions' => (int) $row['sessions'],
                'duration_seconds' => (int) $row['duration_seconds'],
            ];
        });
    }

    /**
     * @param  Collection<int, UserSession>  $sessions
     * @return list<array<string, mixed>>
     */
    private function sessionMixSeries(Collection $sessions, Carbon $from, Carbon $to, string $grain): array
    {
        $buckets = [];
        foreach ($sessions as $session) {
            $at = $this->sessionOccurredAt($session);
            if ($at === null) {
                continue;
            }
            $key = $this->bucketKey($at, $grain);
            if ($key === null) {
                continue;
            }
            if (! isset($buckets[$key])) {
                $buckets[$key] = ['memorisation' => 0, 'revision' => 0, 'recitation' => 0];
            }
            $kind = $this->sessionMixKind($session);
            $buckets[$key][$kind]++;
        }

        return $this->fillSeriesBuckets($from, $to, $grain, function (string $key, string $label) use ($buckets) {
            $row = $buckets[$key] ?? ['memorisation' => 0, 'revision' => 0, 'recitation' => 0];

            return [
                'key' => $key,
                'label' => $label,
                'memorisation' => (int) $row['memorisation'],
                'revision' => (int) $row['revision'],
                'recitation' => (int) $row['recitation'],
            ];
        });
    }

    /**
     * @param  Collection<int, AiReciteAttempt>  $attempts
     * @return list<array<string, mixed>>
     */
    private function aiPerformanceSeries(Collection $attempts): array
    {
        $byDay = [];
        foreach ($attempts as $attempt) {
            if ($attempt->created_at === null || $attempt->accuracy_percent === null) {
                continue;
            }
            $day = $attempt->created_at->toDateString();
            if (! isset($byDay[$day])) {
                $byDay[$day] = ['sum' => 0, 'count' => 0];
            }
            $byDay[$day]['sum'] += (int) $attempt->accuracy_percent;
            $byDay[$day]['count']++;
        }

        ksort($byDay);
        $rows = [];
        foreach ($byDay as $date => $stats) {
            $rows[] = [
                'date' => $date,
                'accuracy' => (int) round($stats['sum'] / max(1, $stats['count'])),
                'checks' => (int) $stats['count'],
            ];
        }

        return $rows;
    }

    /**
     * @param  Collection<int, AiReciteAttempt>  $attempts
     * @return array<string, int>
     */
    private function assessmentBreakdown(Collection $attempts): array
    {
        $totals = [
            'matched' => 0,
            'mismatch' => 0,
            'skipped' => 0,
            'uncertain' => 0,
            'extra' => 0,
            'unassessed' => 0,
            'evaluated' => 0,
            'total' => 0,
        ];

        foreach ($attempts as $attempt) {
            $words = is_array($attempt->word_statuses) ? $attempt->word_statuses : [];
            $counts = RecitationAlignmentStatus::countStatuses($words);
            if ($counts === null) {
                continue;
            }
            foreach (['matched', 'mismatch', 'skipped', 'uncertain', 'extra', 'unassessed', 'evaluated'] as $field) {
                $totals[$field] += (int) ($counts[$field] ?? 0);
            }
            $totals['total'] += array_sum([
                $counts['matched'] ?? 0,
                $counts['mismatch'] ?? 0,
                $counts['skipped'] ?? 0,
                $counts['uncertain'] ?? 0,
                $counts['extra'] ?? 0,
                $counts['unassessed'] ?? 0,
            ]);
        }

        if ($totals['evaluated'] === 0) {
            return [
                'matched' => 0,
                'mismatch' => 0,
                'skipped' => 0,
                'uncertain' => 0,
                'extra' => 0,
                'evaluated' => 0,
                'total' => 0,
            ];
        }

        return [
            'matched' => $totals['matched'],
            'mismatch' => $totals['mismatch'],
            'skipped' => $totals['skipped'],
            'uncertain' => $totals['uncertain'],
            'extra' => $totals['extra'],
            'evaluated' => $totals['evaluated'],
            'total' => $totals['total'],
        ];
    }

    /**
     * @param  array<int, int>  $memorisedBySurah
     * @param  array<int, array<string, true>>  $revisedBySurah
     * @return list<array<string, mixed>>
     */
    private function surahProgress(
        Collection $sessions,
        array $memorisedBySurah,
        array $revisedBySurah,
    ): array {
        $activity = [];
        foreach ($sessions as $session) {
            $at = $this->sessionOccurredAt($session);
            if ($at === null) {
                continue;
            }
            foreach ($this->sessionAyahKeys($session) as $key) {
                [$surah] = array_map('intval', explode(':', $key, 2));
                if ($surah <= 0) {
                    continue;
                }
                if (! isset($activity[$surah])) {
                    $activity[$surah] = [
                        'ayahs' => [],
                        'last_at' => $at,
                        'session_count' => 0,
                    ];
                }
                $activity[$surah]['ayahs'][$key] = true;
                if ($at->greaterThan($activity[$surah]['last_at'])) {
                    $activity[$surah]['last_at'] = $at;
                }
            }
            $meta = is_array($session->metadata) ? $session->metadata : [];
            $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
            $surah = (int) ($session->surah_number ?: ($config['chapterId'] ?? 0));
            if ($surah > 0) {
                $activity[$surah]['session_count'] = ($activity[$surah]['session_count'] ?? 0) + 1;
            }
        }

        $rows = [];
        foreach ($activity as $surah => $stats) {
            $totalAyahs = (int) (QuranMetadata::ayahCount($surah) ?? 0);
            $practisedCount = count($stats['ayahs']);
            $memorisedCount = (int) ($memorisedBySurah[$surah] ?? 0);
            $revisedCount = isset($revisedBySurah[$surah]) ? count($revisedBySurah[$surah]) : 0;
            $rows[] = [
                'surah_number' => (int) $surah,
                'surah_name' => QuranMetadata::name((int) $surah),
                'surah_name_ar' => self::ARABIC_SURAHS[$surah] ?? null,
                'ayahs_practised' => $practisedCount,
                'ayahs_memorised' => $memorisedCount,
                'revision_coverage' => $totalAyahs > 0
                    ? (int) round(($revisedCount / $totalAyahs) * 100)
                    : 0,
                'total_ayahs' => $totalAyahs,
                'last_practised_at' => $stats['last_at']->toIso8601String(),
                'practised_percent' => $totalAyahs > 0
                    ? (int) round(($practisedCount / $totalAyahs) * 100)
                    : 0,
                'memorised_percent' => $totalAyahs > 0
                    ? (int) round(($memorisedCount / $totalAyahs) * 100)
                    : 0,
                '_session_count' => (int) ($stats['session_count'] ?? 0),
            ];
        }

        usort($rows, function (array $a, array $b): int {
            return ($b['_session_count'] <=> $a['_session_count'])
                ?: strcmp((string) $b['last_practised_at'], (string) $a['last_practised_at']);
        });

        return array_map(function (array $row) {
            unset($row['_session_count']);

            return $row;
        }, array_slice($rows, 0, self::MAX_SURAH_PROGRESS));
    }

    /**
     * @param  Collection<int, AiReciteAttempt>  $attempts
     * @return list<array<string, mixed>>
     */
    private function attentionAyahs(User $user, Collection $attempts, Carbon $from, Carbon $to): array
    {
        $buckets = [];
        foreach ($attempts as $attempt) {
            $range = $this->attemptRange($attempt);
            $surah = (int) ($range['surah'] ?? 0);
            if ($surah <= 0) {
                continue;
            }

            foreach ($this->scoreAttemptAyahs($attempt) as $scored) {
                $ayah = (int) ($scored['ayah'] ?? 0);
                if ($ayah <= 0) {
                    continue;
                }
                $key = $surah.':'.$ayah;
                if (! isset($buckets[$key])) {
                    $buckets[$key] = [
                        'surah_number' => $surah,
                        'surah_name' => QuranMetadata::name($surah),
                        'surah_name_ar' => self::ARABIC_SURAHS[$surah] ?? null,
                        'ayah_number' => $ayah,
                        'accuracy_sum' => 0,
                        'attempts' => 0,
                        'needs_practice' => false,
                        'classifications' => [
                            'matched' => 0,
                            'mismatch' => 0,
                            'skipped' => 0,
                            'uncertain' => 0,
                            'extra' => 0,
                        ],
                        'source' => 'attempts',
                    ];
                }
                $buckets[$key]['accuracy_sum'] += (int) ($scored['accuracy'] ?? 0);
                $buckets[$key]['attempts']++;
                $buckets[$key]['needs_practice'] = $buckets[$key]['needs_practice']
                    || (bool) ($scored['needs_practice'] ?? false);
            }

            $words = is_array($attempt->word_statuses) ? $attempt->word_statuses : [];
            foreach ($words as $word) {
                if (! is_array($word)) {
                    continue;
                }
                $ayah = (int) ($word['ayah_number'] ?? $word['ayahNumber'] ?? $word['ayah'] ?? 0);
                if ($ayah <= 0) {
                    continue;
                }
                $key = $surah.':'.$ayah;
                if (! isset($buckets[$key])) {
                    continue;
                }
                $state = RecitationAlignmentStatus::classify($word);
                if (isset($buckets[$key]['classifications'][$state])) {
                    $buckets[$key]['classifications'][$state]++;
                }
            }
        }

        $rows = collect($buckets)
            ->map(function (array $row) {
                $attempts = max(1, (int) $row['attempts']);
                $accuracy = (int) round($row['accuracy_sum'] / $attempts);

                return array_merge($row, [
                    'key' => $row['surah_number'].':'.$row['ayah_number'],
                    'accuracy' => $accuracy,
                ]);
            })
            ->filter(function (array $row) {
                $attempts = (int) $row['attempts'];
                $accuracy = (int) $row['accuracy'];
                $needs = (bool) ($row['needs_practice'] ?? false);

                return $attempts >= 2 || ($needs && $attempts >= 1 && $accuracy < 90);
            });

        $assessments = MemorisationAssessment::query()
            ->where('user_id', $user->id)
            ->whereBetween('created_at', [$from, $to])
            ->orderByDesc('id')
            ->limit(50)
            ->get(['id', 'surah_number', 'surah_name', 'overall_accuracy', 'weakness_analysis', 'created_at']);

        $existing = $rows->mapWithKeys(fn (array $row) => [$row['key'] => true])->all();

        foreach ($assessments as $assessment) {
            $analysis = is_array($assessment->weakness_analysis) ? $assessment->weakness_analysis : [];
            $weakAyahs = is_array($analysis['weak_ayahs'] ?? null) ? $analysis['weak_ayahs'] : [];
            $surah = (int) $assessment->surah_number;
            foreach ($weakAyahs as $ayahNumber) {
                $ayah = (int) $ayahNumber;
                if ($surah <= 0 || $ayah <= 0) {
                    continue;
                }
                $key = $surah.':'.$ayah;
                if (isset($existing[$key])) {
                    continue;
                }
                $accuracy = $assessment->overall_accuracy !== null ? (int) $assessment->overall_accuracy : null;
                $rows->push([
                    'key' => $key,
                    'surah_number' => $surah,
                    'surah_name' => $assessment->surah_name ?: QuranMetadata::name($surah),
                    'surah_name_ar' => self::ARABIC_SURAHS[$surah] ?? null,
                    'ayah_number' => $ayah,
                    'accuracy' => $accuracy ?? 0,
                    'attempts' => 1,
                    'needs_practice' => true,
                    'classifications' => [
                        'matched' => 0,
                        'mismatch' => 0,
                        'skipped' => 0,
                        'uncertain' => 0,
                        'extra' => 0,
                    ],
                    'source' => 'assessment',
                ]);
                $existing[$key] = true;
            }
        }

        return $rows
            ->sortBy('accuracy')
            ->take(self::MAX_ATTENTION_AYAHS)
            ->values()
            ->map(function (array $row) {
                $surah = (int) $row['surah_number'];
                $ayah = (int) $row['ayah_number'];

                return [
                    'key' => $row['key'],
                    'surah_number' => $surah,
                    'surah_name' => $row['surah_name'],
                    'surah_name_ar' => $row['surah_name_ar'],
                    'ayah_number' => $ayah,
                    'accuracy' => (int) $row['accuracy'],
                    'attempts' => (int) $row['attempts'],
                    'needs_practice' => (bool) ($row['needs_practice'] ?? false),
                    'classifications' => $row['classifications'],
                    'source' => (string) ($row['source'] ?? 'attempts'),
                    'practise_href' => $this->practiseHref($surah, $ayah),
                ];
            })
            ->all();
    }

    /**
     * @param  array<string, int|null>  $current
     * @param  array<string, int|null>  $previous
     * @param  Collection<int, UserSession>  $sessions
     * @return list<array<string, mixed>>
     */
    private function insights(
        array $current,
        array $previous,
        int $spanDays,
        Collection $sessions,
        int $attentionCount,
    ): array {
        $deltas = $this->overviewDeltas($current, $previous);
        $insights = [];

        if ($spanDays > 0 && ($current['practice_days'] ?? 0) > 0) {
            $insights[] = [
                'key' => 'practised_days_of_period',
                'params' => [
                    'days' => (int) $current['practice_days'],
                    'span' => $spanDays,
                ],
                'tone' => 'strength',
            ];
        }

        $accuracyDelta = $deltas['ai_accuracy'] ?? null;
        if ($accuracyDelta !== null && $accuracyDelta >= 3) {
            $insights[] = [
                'key' => 'ai_accuracy_improved',
                'params' => ['points' => $accuracyDelta],
                'tone' => 'trend',
            ];
        }

        $topRevisionSurah = $this->topRevisionSurah($sessions);
        if ($topRevisionSurah !== null) {
            $insights[] = [
                'key' => 'surah_revised_n',
                'params' => $topRevisionSurah,
                'tone' => 'strength',
            ];
        }

        if ($attentionCount >= 1) {
            $insights[] = [
                'key' => 'ayahs_need_attention',
                'params' => ['count' => $attentionCount],
                'tone' => 'attention',
            ];
        }

        $timeDelta = $deltas['practice_time'] ?? null;
        if ($timeDelta !== null && $timeDelta > 0) {
            $insights[] = [
                'key' => 'practice_time_up',
                'params' => ['percent' => $timeDelta],
                'tone' => 'trend',
            ];
        }

        return array_slice($insights, 0, self::MAX_INSIGHTS);
    }

    /**
     * @param  Collection<int, UserSession>  $sessions
     * @return array<string, int>|null
     */
    private function topRevisionSurah(Collection $sessions): ?array
    {
        $counts = [];
        foreach ($sessions as $session) {
            if (! $this->isRevisionSession($session)) {
                continue;
            }
            $meta = is_array($session->metadata) ? $session->metadata : [];
            $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
            $surah = (int) ($session->surah_number ?: ($config['chapterId'] ?? 0));
            if ($surah <= 0) {
                continue;
            }
            $counts[$surah] = ($counts[$surah] ?? 0) + 1;
        }

        if ($counts === []) {
            return null;
        }

        arsort($counts);
        $surah = (int) array_key_first($counts);
        $count = (int) $counts[$surah];
        if ($count < 2) {
            return null;
        }

        return [
            'surah_number' => $surah,
            'surah_name' => QuranMetadata::name($surah),
            'revision_sessions' => $count,
        ];
    }

    /**
     * @param  callable(string, string): array<string, mixed>  $make
     * @return list<array<string, mixed>>
     */
    private function fillSeriesBuckets(Carbon $from, Carbon $to, string $grain, callable $make): array
    {
        $rows = [];
        $cursor = $this->bucketStart($from, $grain);
        $end = $this->bucketStart($to, $grain);
        $guard = 0;
        while ($cursor->lte($end) && $guard < 200) {
            $key = $this->bucketKey($cursor, $grain);
            if ($key !== null) {
                $rows[] = $make($key, $this->bucketLabel($cursor, $grain));
            }
            $this->advanceBucket($cursor, $grain);
            $guard++;
        }

        return $rows;
    }

    private function bucketStart(Carbon $moment, string $grain): Carbon
    {
        return match ($grain) {
            'week' => $moment->copy()->startOfWeek(Carbon::MONDAY)->startOfDay(),
            'month' => $moment->copy()->startOfMonth()->startOfDay(),
            default => $moment->copy()->startOfDay(),
        };
    }

    private function advanceBucket(Carbon $cursor, string $grain): void
    {
        match ($grain) {
            'week' => $cursor->addWeek(),
            'month' => $cursor->addMonth(),
            default => $cursor->addDay(),
        };
    }

    private function bucketKey(Carbon $moment, string $grain): ?string
    {
        return match ($grain) {
            'week' => $moment->copy()->startOfWeek(Carbon::MONDAY)->toDateString(),
            'month' => $moment->copy()->format('Y-m'),
            default => $moment->toDateString(),
        };
    }

    private function bucketLabel(Carbon $moment, string $grain): string
    {
        return match ($grain) {
            'week' => 'Wk '.$moment->copy()->startOfWeek(Carbon::MONDAY)->format('j M'),
            'month' => $moment->copy()->format('M Y'),
            default => $moment->format('j M'),
        };
    }

    private function sessionOccurredAt(UserSession $session): ?Carbon
    {
        return $session->ended_at ?? $session->last_activity_at ?? $session->started_at;
    }

    private function isRevisionSession(UserSession $session): bool
    {
        $mode = strtolower(trim((string) $session->memorisation_mode));
        $meta = is_array($session->metadata) ? $session->metadata : [];
        $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
        $configMode = strtolower(trim((string) ($config['sessionMode'] ?? $config['mode'] ?? $meta['session_mode'] ?? '')));
        $goal = strtolower(trim((string) ($config['sessionGoal'] ?? $config['goal'] ?? $meta['session_goal'] ?? '')));

        if ($mode === 'revision' || $configMode === 'revision') {
            return true;
        }

        return in_array($goal, ['revise', 'revision', 'murajaah', 'review'], true);
    }

    private function sessionMixKind(UserSession $session): string
    {
        if ($this->isRevisionSession($session)) {
            return 'revision';
        }

        $mode = strtolower(trim((string) $session->memorisation_mode));
        $meta = is_array($session->metadata) ? $session->metadata : [];
        $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
        $configMode = strtolower(trim((string) ($config['sessionMode'] ?? $config['mode'] ?? $meta['session_mode'] ?? '')));
        $mode = $mode !== '' ? $mode : $configMode;

        if (in_array($mode, ['test', 'ai_recite', 'recite', 'recitation'], true)) {
            return 'recitation';
        }

        return 'memorisation';
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
     * @return array<int, int>
     */
    private function memorisedAyahsBySurah(User $user): array
    {
        $rows = MemorisationProgress::query()
            ->where('user_id', $user->id)
            ->whereIn('status', ['memorised', 'mastered'])
            ->get(['surah_number', 'ayah_number']);

        $bySurah = [];
        foreach ($rows as $row) {
            $surah = (int) $row->surah_number;
            if ($surah <= 0) {
                continue;
            }
            $bySurah[$surah] = ($bySurah[$surah] ?? 0) + 1;
        }

        return $bySurah;
    }

    /**
     * @param  Collection<int, UserSession>  $sessions
     * @return array<int, array<string, true>>
     */
    private function revisedAyahsBySurah(Collection $sessions): array
    {
        $bySurah = [];
        foreach ($sessions as $session) {
            if (! $this->isRevisionSession($session)) {
                continue;
            }
            foreach ($this->sessionAyahKeys($session) as $key) {
                [$surah] = array_map('intval', explode(':', $key, 2));
                if ($surah <= 0) {
                    continue;
                }
                $bySurah[$surah][$key] = true;
            }
        }

        return $bySurah;
    }

    /**
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
            $state = RecitationAlignmentStatus::classify($word);
            if (! isset($byAyah[$ayah])) {
                $byAyah[$ayah] = ['total' => 0, 'weight' => 0.0, 'hard' => 0, 'attempted' => 0];
            }
            $byAyah[$ayah]['total']++;
            if ($state === RecitationAlignmentStatus::MATCHED) {
                $byAyah[$ayah]['weight'] += 1;
                $byAyah[$ayah]['attempted']++;
            } elseif ($state === RecitationAlignmentStatus::UNCERTAIN) {
                $byAyah[$ayah]['weight'] += 0.5;
                $byAyah[$ayah]['attempted']++;
            } elseif (in_array($state, [RecitationAlignmentStatus::MISMATCH, RecitationAlignmentStatus::SKIPPED], true)) {
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

    private function practiseHref(int $surah, int $ayah): string
    {
        $query = http_build_query([
            'surah' => $surah,
            'from' => $ayah,
            'to' => $ayah,
            'review' => 1,
            'return' => 'dashboard',
        ]);

        return route('memorisation').'?'.$query;
    }

    private function displayName(User $user): string
    {
        $name = trim((string) ($user->name ?? ''));
        if ($name === '') {
            return 'friend';
        }

        return $name;
    }

    private function inclusiveDays(Carbon $from, Carbon $to): int
    {
        return (int) abs($from->copy()->startOfDay()->diffInDays($to->copy()->startOfDay())) + 1;
    }
}

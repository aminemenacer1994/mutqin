<?php

namespace App\Services\Achievements;

use App\Models\User;
use App\Models\UserAchievement;
use App\Models\UserSession;
use App\Support\Achievements\AchievementId;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\UniqueConstraintViolationException;

/**
 * Derive progress from genuine history and award achievements idempotently.
 */
final class AchievementEvaluator
{
    public function __construct(
        private readonly AchievementCatalog $catalog,
        private readonly PracticeEvidenceService $evidence,
        private readonly PracticePreferences $preferences,
    ) {}

    /**
     * Evaluate and persist newly earned achievements.
     *
     * @return list<UserAchievement> newly inserted rows (not previously unlocked)
     */
    public function evaluate(User $user, string $unlockSource = 'evaluation'): array
    {
        $sessions = $this->evidence->qualifyingSessions($user);
        $progressMap = $this->computeProgress($user, $sessions);
        $newly = [];

        $earned = UserAchievement::query()
            ->where('user_id', $user->id)
            ->pluck('achievement_id')
            ->all();
        $earnedSet = array_fill_keys($earned, true);

        // Award independently from activity criteria — categories are organisational only.
        foreach ($this->catalog->pathIds() as $achievementId) {
            if (isset($earnedSet[$achievementId])) {
                continue;
            }

            $progress = is_array($progressMap[$achievementId] ?? null) ? $progressMap[$achievementId] : [];
            if (($progress['state'] ?? '') !== 'unlocked') {
                continue;
            }

            $unlockedAt = $progress['unlock_at'] instanceof Carbon
                ? $progress['unlock_at']
                : ($progress['unlock_at'] ? Carbon::parse($progress['unlock_at']) : now());

            $row = $this->awardOnce(
                $user,
                $achievementId,
                $unlockedAt,
                $unlockSource,
                [
                    'current' => $progress['current'] ?? 0,
                    'target' => $progress['target'] ?? 0,
                    'percent' => $progress['percent'] ?? null,
                ],
            );

            if ($row) {
                $newly[] = $row;
                $earnedSet[$achievementId] = true;
            }
        }

        return $newly;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public function computeProgress(User $user, ?Collection $sessions = null): array
    {
        $sessions ??= $this->evidence->qualifyingSessions($user);
        $dates = $this->evidence->practiceDates($user, $sessions);
        $thresholds = $this->catalog->thresholds();

        $revisionSessions = $sessions->filter(fn (UserSession $s) => $this->evidence->isRevisionSession($s))->values();
        $revisionCount = $revisionSessions->count();
        $reviserTarget = (int) ($thresholds['reviser_revision_sessions'] ?? 10);

        $consistentTarget = (int) ($thresholds['consistent_consecutive_days'] ?? 3);
        $bestStreak = $this->evidence->bestConsecutiveRun($dates, $user);
        $streakUnlockDate = $this->evidence->dateWhenConsecutiveReached($dates, $user, $consistentTarget);

        $dedicatedTarget = (int) ($thresholds['dedicated_distinct_days'] ?? 7);
        $distinctDays = count($dates);

        $weeklyGoal = $this->preferences->weeklyPracticeDaysGoal($user);
        $week = $this->preferences->currentWeekBounds($user);
        $daysThisWeek = count(array_filter(
            $dates,
            static fn (string $date) => $date >= $week['from'] && $date <= $week['to']
        ));

        // Focused: unlock when a configured weekly goal was met in any past week
        // that we can verify from history (not only the current week).
        $focused = $this->focusedProgress($user, $dates, $weeklyGoal);

        $growing = $this->growingProgress($user);

        $memorisationSessions = $sessions
            ->filter(fn (UserSession $s) => $this->evidence->isMemorisationSession($s))
            ->values();
        $memoriserTarget = (int) ($thresholds['memoriser_sessions'] ?? 5);
        $memoriserCount = $memorisationSessions->count();

        $surahs = $this->evidence->distinctSurahs($sessions);
        $explorerTarget = (int) ($thresholds['explorer_distinct_surahs'] ?? 3);
        $surahCount = count($surahs);

        $steadfastTarget = (int) ($thresholds['steadfast_distinct_days'] ?? 14);

        $aiReciteCount = $this->evidence->validAiReciteCount($user);
        $firstAiReciteAt = $this->evidence->firstValidAiReciteAt($user);

        $firstSession = $sessions->first();
        $firstUnlockAt = $firstSession?->ended_at;

        return [
            AchievementId::FIRST_STEPS => $this->progressRow(
                current: $sessions->isEmpty() ? 0 : 1,
                target: 1,
                unlockAt: $firstUnlockAt,
            ),
            AchievementId::CONSISTENT => $this->progressRow(
                current: min($bestStreak, $consistentTarget),
                target: $consistentTarget,
                unlockAt: $streakUnlockDate
                    ? $this->endOfLocalDay($user, $streakUnlockDate, $sessions)
                    : null,
            ),
            AchievementId::REVISER => $this->progressRow(
                current: min($revisionCount, $reviserTarget),
                target: $reviserTarget,
                unlockAt: $revisionCount >= $reviserTarget
                    ? $revisionSessions->values()->get($reviserTarget - 1)?->ended_at
                    : null,
            ),
            AchievementId::DEDICATED => $this->progressRow(
                current: min($distinctDays, $dedicatedTarget),
                target: $dedicatedTarget,
                unlockAt: $distinctDays >= $dedicatedTarget
                    ? $this->endOfLocalDay($user, $dates[$dedicatedTarget - 1], $sessions)
                    : null,
            ),
            AchievementId::FOCUSED => $focused,
            AchievementId::GROWING => $growing,
            AchievementId::CHECKER => $this->progressRow(
                current: $aiReciteCount > 0 ? 1 : 0,
                target: 1,
                unlockAt: $firstAiReciteAt,
            ),
            AchievementId::MEMORISER => $this->progressRow(
                current: min($memoriserCount, $memoriserTarget),
                target: $memoriserTarget,
                unlockAt: $memoriserCount >= $memoriserTarget
                    ? $memorisationSessions->get($memoriserTarget - 1)?->ended_at
                    : null,
            ),
            AchievementId::EXPLORER => $this->progressRow(
                current: min($surahCount, $explorerTarget),
                target: $explorerTarget,
                unlockAt: $surahCount >= $explorerTarget
                    ? $this->dateWhenSurahCountReached($user, $sessions, $explorerTarget)
                    : null,
            ),
            AchievementId::STEADFAST => $this->progressRow(
                current: min($distinctDays, $steadfastTarget),
                target: $steadfastTarget,
                unlockAt: $distinctDays >= $steadfastTarget
                    ? $this->endOfLocalDay($user, $dates[$steadfastTarget - 1], $sessions)
                    : null,
            ),
            '_meta' => [
                'practice_days' => $distinctDays,
                'revision_sessions' => $revisionCount,
                'memorisation_sessions' => $memoriserCount,
                'distinct_surahs' => $surahCount,
                'ai_recite_checks' => $aiReciteCount,
                'best_streak' => $bestStreak,
                'days_this_week' => $daysThisWeek,
                'weekly_goal' => $weeklyGoal,
                'week_from' => $week['from'],
                'week_to' => $week['to'],
            ],
        ];
    }

    /**
     * @param  Collection<int, UserSession>  $sessions
     */
    private function dateWhenSurahCountReached(User $user, Collection $sessions, int $needed): ?Carbon
    {
        $seen = [];
        foreach ($sessions as $session) {
            $meta = is_array($session->metadata) ? $session->metadata : [];
            $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
            $surah = (int) ($session->surah_number ?: ($config['chapterId'] ?? $config['chapter_id'] ?? 0));
            if ($surah < 1 || $surah > 114) {
                continue;
            }
            $seen[$surah] = true;
            if (count($seen) >= $needed) {
                return $session->ended_at instanceof Carbon
                    ? $session->ended_at
                    : ($session->ended_at ? Carbon::parse($session->ended_at) : null);
            }
        }

        return null;
    }

    /**
     * @param  list<string>  $dates
     * @return array<string, mixed>
     */
    private function focusedProgress(User $user, array $dates, ?int $weeklyGoal): array
    {
        if ($weeklyGoal === null || $weeklyGoal < 1) {
            return [
                'current' => 0,
                'target' => 0,
                'percent' => null,
                'state' => 'locked',
                'unlock_at' => null,
                'detail' => 'goal_unset',
            ];
        }

        $tz = $this->preferences->timezone($user);
        $bestWeekDays = 0;
        $unlockAt = null;

        $byWeek = [];
        foreach ($dates as $date) {
            $local = Carbon::parse($date, $tz)->startOfDay();
            $weekKey = $local->copy()->startOfWeek(Carbon::MONDAY)->toDateString();
            $byWeek[$weekKey][] = $date;
        }

        foreach ($byWeek as $weekStart => $weekDates) {
            $count = count(array_unique($weekDates));
            $bestWeekDays = max($bestWeekDays, $count);
            if ($count >= $weeklyGoal && $unlockAt === null) {
                sort($weekDates);
                $unlockDay = $weekDates[$weeklyGoal - 1] ?? end($weekDates);
                $unlockAt = Carbon::parse($unlockDay, $tz)->endOfDay()->utc();
            }
        }

        $currentWeek = $this->preferences->currentWeekBounds($user);
        $thisWeek = count(array_filter(
            $dates,
            static fn (string $date) => $date >= $currentWeek['from'] && $date <= $currentWeek['to']
        ));

        $current = min(max($thisWeek, $unlockAt ? $weeklyGoal : $thisWeek), $weeklyGoal);

        return $this->progressRow(
            current: min($bestWeekDays, $weeklyGoal),
            target: $weeklyGoal,
            unlockAt: $unlockAt,
            displayCurrent: $current,
        );
    }

    /**
     * Measurable improvement across compatible AI Recite assessments only.
     *
     * @return array<string, mixed>
     */
    private function growingProgress(User $user): array
    {
        $minAttempts = (int) ($this->catalog->thresholds()['growing_min_comparable_attempts'] ?? 3);
        $minDelta = (int) ($this->catalog->thresholds()['growing_min_accuracy_delta'] ?? 8);
        $minBaseline = (int) ($this->catalog->thresholds()['growing_min_baseline_score'] ?? 20);
        $maxCeiling = (int) ($this->catalog->thresholds()['growing_max_score_for_ceiling'] ?? 98);

        $attempts = $this->evidence->comparableAttempts($user);
        $groups = [];

        foreach ($attempts as $attempt) {
            $model = trim((string) ($attempt->assessment?->model_version ?? ''));
            $algorithm = trim((string) ($attempt->assessment?->algorithm_version ?? ''));
            $score = $attempt->accuracy_percent;
            if ($model === '' || $score === null) {
                continue;
            }
            $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
            $surah = (int) ($range['surah'] ?? $range['surah_number'] ?? 0);
            $from = (int) ($range['from'] ?? $range['ayah_start'] ?? 0);
            $to = (int) ($range['to'] ?? $range['ayah_end'] ?? $from);
            if ($surah <= 0 || $from <= 0) {
                continue;
            }
            // Skip near-perfect ceilings that cannot demonstrate growth meaningfully alone.
            $key = $surah.':'.$from.'-'.$to.'|'.$model.'|'.$algorithm;
            $groups[$key][] = [
                'score' => (int) $score,
                'at' => $attempt->created_at,
                'id' => (int) $attempt->id,
            ];
        }

        $bestDelta = 0;
        $unlockAt = null;
        $maxGroupSize = 0;

        foreach ($groups as $scores) {
            $maxGroupSize = max($maxGroupSize, count($scores));
            if (count($scores) < $minAttempts) {
                continue;
            }

            // Compare early baseline average vs later average — never a single peak.
            $half = (int) floor(count($scores) / 2);
            if ($half < 1) {
                continue;
            }
            $early = array_slice($scores, 0, $half);
            $late = array_slice($scores, -$half);

            $earlyAvg = array_sum(array_column($early, 'score')) / count($early);
            $lateAvg = array_sum(array_column($late, 'score')) / count($late);

            if ($earlyAvg < $minBaseline) {
                // Too little reliable signal in the baseline.
                continue;
            }
            if ($earlyAvg >= $maxCeiling) {
                // Already at ceiling — improvement is not meaningful / uncertain.
                continue;
            }

            $delta = $lateAvg - $earlyAvg;
            if ($delta > $bestDelta) {
                $bestDelta = $delta;
            }
            if ($delta >= $minDelta && $unlockAt === null) {
                $last = end($late);
                $unlockAt = $last['at'] ?? now();
            }
        }

        if ($maxGroupSize < $minAttempts) {
            return $this->progressRow(
                current: $maxGroupSize,
                target: $minAttempts,
                unlockAt: null,
                extra: [
                    'comparable_attempts' => $maxGroupSize,
                    'required_attempts' => $minAttempts,
                    'detail' => 'insufficient_data',
                ],
            );
        }

        $target = $minDelta;
        $current = (int) min($target, max(0, (int) round($bestDelta)));

        return $this->progressRow(
            current: $current,
            target: $target,
            unlockAt: $bestDelta >= $minDelta ? $unlockAt : null,
            extra: [
                'comparable_attempts' => $maxGroupSize,
                'required_attempts' => $minAttempts,
                'detail' => null,
            ],
        );
    }

    /**
     * @param  Collection<int, UserSession>  $sessions
     */
    private function endOfLocalDay(User $user, string $localDate, Collection $sessions): ?Carbon
    {
        $tz = $this->preferences->timezone($user);
        foreach ($sessions as $session) {
            if (! $session->ended_at) {
                continue;
            }
            $ended = $session->ended_at instanceof Carbon
                ? $session->ended_at
                : Carbon::parse($session->ended_at);
            if ($this->preferences->localDate($ended, $user) === $localDate) {
                return $ended;
            }
        }

        return Carbon::parse($localDate, $tz)->endOfDay()->utc();
    }

    /**
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    private function progressRow(
        int $current,
        int $target,
        mixed $unlockAt,
        ?int $displayCurrent = null,
        array $extra = [],
    ): array {
        $shown = $displayCurrent ?? $current;
        if ($target <= 0) {
            $state = 'locked';
            $percent = null;
        } elseif ($unlockAt || $current >= $target) {
            $state = 'unlocked';
            $percent = 100;
            $shown = $target;
        } elseif ($shown <= 0) {
            $state = 'locked';
            $percent = 0;
        } else {
            $state = 'in_progress';
            $percent = (int) min(99, max(1, (int) round(($shown / $target) * 100)));
        }

        return array_merge([
            'current' => $shown,
            'target' => $target,
            'percent' => $percent,
            'state' => $state,
            'unlock_at' => $unlockAt,
        ], $extra);
    }

    /**
     * @param  array<string, mixed>  $snapshot
     */
    private function awardOnce(
        User $user,
        string $achievementId,
        Carbon $unlockedAt,
        string $unlockSource,
        array $snapshot,
    ): ?UserAchievement {
        try {
            $created = false;
            $row = DB::transaction(function () use ($user, $achievementId, $unlockedAt, $unlockSource, $snapshot, &$created) {
                $existing = UserAchievement::query()
                    ->where('user_id', $user->id)
                    ->where('achievement_id', $achievementId)
                    ->lockForUpdate()
                    ->first();

                if ($existing) {
                    return null;
                }

                $created = true;

                return UserAchievement::query()->create([
                    'user_id' => $user->id,
                    'achievement_id' => $achievementId,
                    'unlocked_at' => $unlockedAt,
                    'unlock_source' => substr($unlockSource, 0, 40),
                    'progress_snapshot' => $snapshot,
                    'notified_at' => null,
                ]);
            });

            return $created ? $row : null;
        } catch (UniqueConstraintViolationException) {
            return null;
        }
    }
}

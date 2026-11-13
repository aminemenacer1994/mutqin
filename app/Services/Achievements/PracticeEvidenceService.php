<?php

namespace App\Services\Achievements;

use App\Enums\UserSessionStatus;
use App\Models\AiReciteAttempt;
use App\Models\User;
use App\Models\UserSession;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Genuine practice evidence for achievements.
 * Abandoned / ended-early / onboarding / audio-only do not qualify.
 */
final class PracticeEvidenceService
{
    public function __construct(
        private readonly AchievementCatalog $catalog,
        private readonly PracticePreferences $preferences,
    ) {}

    /**
     * @return Collection<int, UserSession>
     */
    public function qualifyingSessions(User $user): Collection
    {
        $minDuration = $this->catalog->minMeaningfulDurationSeconds();

        return UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->where('status', UserSessionStatus::Completed->value)
            ->whereNotNull('ended_at')
            ->orderBy('ended_at')
            ->orderBy('id')
            ->get([
                'id',
                'user_id',
                'surah_number',
                'ayah_number',
                'memorisation_mode',
                'status',
                'session_duration_seconds',
                'ended_at',
                'started_at',
                'last_activity_at',
                'metadata',
                'is_onboarding_example',
            ])
            ->filter(fn (UserSession $session) => $this->isMeaningfulCompletedSession($session, $minDuration))
            ->values();
    }

    public function isMeaningfulCompletedSession(UserSession $session, ?int $minDuration = null): bool
    {
        if ($session->is_onboarding_example) {
            return false;
        }

        $status = UserSessionStatus::tryFromMixed($session->status);
        if ($status !== UserSessionStatus::Completed) {
            return false;
        }

        if (! $session->ended_at) {
            return false;
        }

        $minDuration ??= $this->catalog->minMeaningfulDurationSeconds();
        $duration = (int) ($session->session_duration_seconds ?? 0);
        $meta = is_array($session->metadata) ? $session->metadata : [];

        // Explicit range completion from the lifecycle is genuine practice.
        $rangeComplete = (bool) ($meta['range_complete'] ?? $meta['completed'] ?? false);
        if ($rangeComplete && $duration >= max(1, min(10, $minDuration))) {
            return true;
        }

        if ($duration >= $minDuration) {
            return true;
        }

        // Short but fully completed single-ayah ranges still count.
        $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
        $start = (int) ($config['rangeStart'] ?? $config['range_start'] ?? 0);
        $end = (int) ($config['rangeEnd'] ?? $config['range_end'] ?? 0);
        if ($rangeComplete && $start > 0 && $end >= $start && ($end - $start) <= 2 && $duration >= 5) {
            return true;
        }

        return false;
    }

    public function isRevisionSession(UserSession $session): bool
    {
        $mode = strtolower(trim((string) $session->memorisation_mode));
        $meta = is_array($session->metadata) ? $session->metadata : [];
        $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
        $configMode = strtolower(trim((string) ($config['sessionMode'] ?? $config['mode'] ?? $meta['session_mode'] ?? $meta['mode'] ?? '')));
        $goal = strtolower(trim((string) ($config['sessionGoal'] ?? $config['goal'] ?? $meta['session_goal'] ?? '')));

        if ($mode === 'revision' || $configMode === 'revision') {
            return true;
        }

        return in_array($goal, ['revise', 'revision', 'murajaah', 'review'], true);
    }

    public function isMemorisationSession(UserSession $session): bool
    {
        return ! $this->isRevisionSession($session);
    }

    /**
     * Distinct surah numbers touched by qualifying sessions.
     *
     * @param  Collection<int, UserSession>  $sessions
     * @return list<int>
     */
    public function distinctSurahs(Collection $sessions): array
    {
        $surahs = [];
        foreach ($sessions as $session) {
            $meta = is_array($session->metadata) ? $session->metadata : [];
            $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
            $surah = (int) ($session->surah_number ?: ($config['chapterId'] ?? $config['chapter_id'] ?? 0));
            if ($surah >= 1 && $surah <= 114) {
                $surahs[$surah] = true;
            }
        }
        $list = array_map('intval', array_keys($surahs));
        sort($list);

        return $list;
    }

    public function firstValidAiReciteAt(User $user): ?Carbon
    {
        $attempt = AiReciteAttempt::query()
            ->where('user_id', $user->id)
            ->whereNotNull('memorisation_assessment_id')
            ->whereNotNull('accuracy_percent')
            ->validScored()
            ->whereHas('assessment', fn ($query) => $query->validScored())
            ->orderBy('created_at')
            ->orderBy('id')
            ->first(['id', 'created_at']);

        return $attempt?->created_at instanceof Carbon
            ? $attempt->created_at
            : ($attempt?->created_at ? Carbon::parse($attempt->created_at) : null);
    }

    public function validAiReciteCount(User $user): int
    {
        return (int) AiReciteAttempt::query()
            ->where('user_id', $user->id)
            ->whereNotNull('memorisation_assessment_id')
            ->whereNotNull('accuracy_percent')
            ->validScored()
            ->whereHas('assessment', fn ($query) => $query->validScored())
            ->count();
    }

    /**
     * Distinct local calendar dates with at least one qualifying session.
     *
     * @param  Collection<int, UserSession>  $sessions
     * @return list<string> Y-m-d ascending
     */
    public function practiceDates(User $user, Collection $sessions): array
    {
        $dates = [];
        foreach ($sessions as $session) {
            $ended = $session->ended_at instanceof Carbon
                ? $session->ended_at
                : Carbon::parse($session->ended_at);
            $date = $this->preferences->localDate($ended, $user);
            $dates[$date] = true;
        }
        $list = array_keys($dates);
        sort($list);

        return $list;
    }

    /**
     * Longest trailing consecutive streak ending on the latest practice day
     * that touches today or yesterday (local), plus best historical streak.
     *
     * @param  list<string>  $dates
     * @return array{current: int, best: int, latest: string|null}
     */
    public function consecutiveDayStats(array $dates, User $user, ?Carbon $now = null): array
    {
        if ($dates === []) {
            return ['current' => 0, 'best' => 0, 'latest' => null];
        }

        $best = 1;
        $run = 1;
        for ($i = 1; $i < count($dates); $i++) {
            $prev = Carbon::parse($dates[$i - 1], $this->preferences->timezone($user))->startOfDay();
            $curr = Carbon::parse($dates[$i], $this->preferences->timezone($user))->startOfDay();
            if ((int) round($prev->diffInDays($curr)) === 1) {
                $run++;
                $best = max($best, $run);
            } else {
                $run = 1;
            }
        }

        $latest = $dates[count($dates) - 1];
        $tz = $this->preferences->timezone($user);
        $today = ($now ?? now())->copy()->timezone($tz)->toDateString();
        $yesterday = ($now ?? now())->copy()->timezone($tz)->subDay()->toDateString();

        $current = 0;
        if ($latest === $today || $latest === $yesterday) {
            $current = 1;
            for ($i = count($dates) - 2; $i >= 0; $i--) {
                $expected = Carbon::parse($dates[$i + 1], $tz)->subDay()->toDateString();
                if ($dates[$i] === $expected) {
                    $current++;
                } else {
                    break;
                }
            }
        }

        // For unlock eligibility, also consider the best consecutive run
        // that ends on any practice day (historical unlocks).
        return [
            'current' => $current,
            'best' => max($best, $current),
            'latest' => $latest,
        ];
    }

    /**
     * Best consecutive run length across the full date list (for unlocking).
     *
     * @param  list<string>  $dates
     */
    public function bestConsecutiveRun(array $dates, User $user): int
    {
        if ($dates === []) {
            return 0;
        }
        $tz = $this->preferences->timezone($user);
        $best = 1;
        $run = 1;
        for ($i = 1; $i < count($dates); $i++) {
            $prev = Carbon::parse($dates[$i - 1], $tz)->startOfDay();
            $curr = Carbon::parse($dates[$i], $tz)->startOfDay();
            if ((int) round($prev->diffInDays($curr)) === 1) {
                $run++;
                $best = max($best, $run);
            } else {
                $run = 1;
            }
        }

        return $best;
    }

    /**
     * First date on which a consecutive run of $needed days was completed.
     *
     * @param  list<string>  $dates
     */
    public function dateWhenConsecutiveReached(array $dates, User $user, int $needed): ?string
    {
        if ($needed <= 0 || count($dates) < $needed) {
            return null;
        }
        $tz = $this->preferences->timezone($user);
        $run = 1;
        for ($i = 1; $i < count($dates); $i++) {
            $prev = Carbon::parse($dates[$i - 1], $tz)->startOfDay();
            $curr = Carbon::parse($dates[$i], $tz)->startOfDay();
            if ((int) round($prev->diffInDays($curr)) === 1) {
                $run++;
                if ($run >= $needed) {
                    return $dates[$i];
                }
            } else {
                $run = 1;
            }
        }
        if ($needed === 1) {
            return $dates[0];
        }

        return null;
    }

    /**
     * @return Collection<int, AiReciteAttempt>
     */
    public function comparableAttempts(User $user): Collection
    {
        return AiReciteAttempt::query()
            ->where('user_id', $user->id)
            ->whereNotNull('memorisation_assessment_id')
            ->whereNotNull('accuracy_percent')
            ->validScored()
            ->whereHas('assessment', fn ($query) => $query->validScored())
            ->with(['assessment:id,model_version,algorithm_version,status,overall_accuracy'])
            ->orderBy('created_at')
            ->orderBy('id')
            ->get([
                'id',
                'user_id',
                'memorisation_assessment_id',
                'accuracy_percent',
                'band',
                'ayah_range',
                'created_at',
            ]);
    }
}

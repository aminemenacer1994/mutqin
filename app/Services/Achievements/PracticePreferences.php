<?php

namespace App\Services\Achievements;

use App\Models\User;
use Illuminate\Support\Carbon;

/** Read/write optional timezone and weekly practice-day goal. */
final class PracticePreferences
{
    public function __construct(private readonly AchievementCatalog $catalog) {}

    public function timezone(User $user): string
    {
        $prefs = is_array($user->practice_preferences) ? $user->practice_preferences : [];
        $tz = trim((string) ($prefs['timezone'] ?? ''));
        if ($tz !== '' && $this->isValidTimezone($tz)) {
            return $tz;
        }

        return (string) config('app.timezone', 'UTC');
    }

    public function weeklyPracticeDaysGoal(User $user): ?int
    {
        $prefs = is_array($user->practice_preferences) ? $user->practice_preferences : [];
        if (! array_key_exists('weekly_practice_days_goal', $prefs) || $prefs['weekly_practice_days_goal'] === null) {
            return null;
        }
        $goal = (int) $prefs['weekly_practice_days_goal'];
        if ($goal < $this->catalog->weeklyGoalMin() || $goal > $this->catalog->weeklyGoalMax()) {
            return null;
        }

        return $goal;
    }

    /**
     * @param  array{timezone?: string|null, weekly_practice_days_goal?: int|null}  $input
     * @return array<string, mixed>
     */
    public function update(User $user, array $input): array
    {
        $prefs = is_array($user->practice_preferences) ? $user->practice_preferences : [];

        if (array_key_exists('timezone', $input)) {
            $tz = trim((string) ($input['timezone'] ?? ''));
            if ($tz === '') {
                unset($prefs['timezone']);
            } elseif ($this->isValidTimezone($tz)) {
                $prefs['timezone'] = $tz;
            }
        }

        if (array_key_exists('weekly_practice_days_goal', $input)) {
            $raw = $input['weekly_practice_days_goal'];
            if ($raw === null || $raw === '') {
                unset($prefs['weekly_practice_days_goal']);
            } else {
                $goal = (int) $raw;
                if ($goal >= $this->catalog->weeklyGoalMin() && $goal <= $this->catalog->weeklyGoalMax()) {
                    $prefs['weekly_practice_days_goal'] = $goal;
                }
            }
        }

        $user->forceFill(['practice_preferences' => $prefs === [] ? null : $prefs])->save();

        return $this->present($user->fresh() ?? $user);
    }

    /**
     * @return array{timezone: string, weekly_practice_days_goal: int|null, weekly_goal_editable: bool}
     */
    public function present(User $user): array
    {
        return [
            'timezone' => $this->timezone($user),
            'weekly_practice_days_goal' => $this->weeklyPracticeDaysGoal($user),
            'weekly_goal_editable' => true,
            'weekly_goal_min' => $this->catalog->weeklyGoalMin(),
            'weekly_goal_max' => $this->catalog->weeklyGoalMax(),
        ];
    }

    public function localDate(Carbon $moment, User $user): string
    {
        return $moment->copy()->timezone($this->timezone($user))->toDateString();
    }

    public function currentWeekBounds(User $user, ?Carbon $now = null): array
    {
        $tz = $this->timezone($user);
        $local = ($now ?? now())->copy()->timezone($tz);
        $from = $local->copy()->startOfWeek(Carbon::MONDAY)->startOfDay();
        $to = $local->copy()->endOfWeek(Carbon::SUNDAY)->endOfDay();

        return [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'from_utc' => $from->copy()->utc(),
            'to_utc' => $to->copy()->utc(),
        ];
    }

    private function isValidTimezone(string $tz): bool
    {
        try {
            new \DateTimeZone($tz);

            return true;
        } catch (\Throwable) {
            return false;
        }
    }
}

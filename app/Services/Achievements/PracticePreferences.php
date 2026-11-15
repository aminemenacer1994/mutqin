<?php

namespace App\Services\Achievements;

use App\Models\User;
use Illuminate\Support\Carbon;

/** Read/write optional timezone, weekly practice-day goal, and revision reminder prefs. */
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
     * @return array{in_app: bool, email: bool, snooze_hours: int, max_emails_per_day: int}
     */
    public function revisionReminders(User $user): array
    {
        $prefs = is_array($user->practice_preferences) ? $user->practice_preferences : [];
        $raw = is_array($prefs['revision_reminders'] ?? null) ? $prefs['revision_reminders'] : [];

        $snoozeDefault = (int) config('mutqin.revision_reminders.default_snooze_hours', 4);
        $emailCapDefault = (int) config('mutqin.revision_reminders.max_emails_per_day', 1);

        return [
            'in_app' => $this->toBool($raw['in_app'] ?? true, true),
            'email' => $this->toBool($raw['email'] ?? false, false),
            'snooze_hours' => $this->clampInt($raw['snooze_hours'] ?? $snoozeDefault, 1, 72, $snoozeDefault),
            'max_emails_per_day' => $this->clampInt($raw['max_emails_per_day'] ?? $emailCapDefault, 1, 5, $emailCapDefault),
        ];
    }

    /**
     * @param  array<string, mixed>  $input
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

        if (array_key_exists('revision_reminders', $input) && is_array($input['revision_reminders'])) {
            $current = $this->revisionReminders($user);
            $incoming = $input['revision_reminders'];
            if (array_key_exists('in_app', $incoming)) {
                $current['in_app'] = $this->toBool($incoming['in_app'], $current['in_app']);
            }
            if (array_key_exists('email', $incoming)) {
                $current['email'] = $this->toBool($incoming['email'], $current['email']);
            }
            if (array_key_exists('snooze_hours', $incoming)) {
                $current['snooze_hours'] = $this->clampInt(
                    $incoming['snooze_hours'],
                    1,
                    72,
                    $current['snooze_hours']
                );
            }
            if (array_key_exists('max_emails_per_day', $incoming)) {
                $current['max_emails_per_day'] = $this->clampInt(
                    $incoming['max_emails_per_day'],
                    1,
                    5,
                    $current['max_emails_per_day']
                );
            }
            $prefs['revision_reminders'] = $current;
        }

        $user->forceFill(['practice_preferences' => $prefs === [] ? null : $prefs])->save();

        return $this->present($user->fresh() ?? $user);
    }

    /**
     * @return array{
     *   timezone: string,
     *   weekly_practice_days_goal: int|null,
     *   weekly_goal_editable: bool,
     *   weekly_goal_min: int,
     *   weekly_goal_max: int,
     *   revision_reminders: array{in_app: bool, email: bool, snooze_hours: int, max_emails_per_day: int}
     * }
     */
    public function present(User $user): array
    {
        return [
            'timezone' => $this->timezone($user),
            'weekly_practice_days_goal' => $this->weeklyPracticeDaysGoal($user),
            'weekly_goal_editable' => true,
            'weekly_goal_min' => $this->catalog->weeklyGoalMin(),
            'weekly_goal_max' => $this->catalog->weeklyGoalMax(),
            'revision_reminders' => $this->revisionReminders($user),
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

    private function toBool(mixed $value, bool $fallback): bool
    {
        if ($value === true || $value === 1 || $value === '1' || $value === 'true') {
            return true;
        }
        if ($value === false || $value === 0 || $value === '0' || $value === 'false') {
            return false;
        }

        return $fallback;
    }

    private function clampInt(mixed $value, int $min, int $max, int $fallback): int
    {
        if ($value === null || $value === '') {
            return $fallback;
        }
        $n = (int) $value;

        return max($min, min($max, $n));
    }
}

<?php

namespace App\Services\RevisionReminders;

use App\Enums\RevisionReminderStatus;
use App\Mail\RevisionReminderMail;
use App\Models\RevisionReminder;
use App\Models\User;
use App\Notifications\RevisionReminderDueNotification;
use App\Services\Achievements\PracticePreferences;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;

final class RevisionReminderDispatchService
{
    public function __construct(
        private readonly PracticePreferences $preferences,
        private readonly RevisionReminderQueryService $query,
    ) {}

    /**
     * @return array{in_app: int, email: int, skipped: int}
     */
    public function dispatchDue(int $limit = 100): array
    {
        $reminders = RevisionReminder::query()
            ->whereIn('status', [
                RevisionReminderStatus::Due->value,
                RevisionReminderStatus::Overdue->value,
            ])
            ->where(function ($q) {
                $q->whereNull('notified_in_app_at')
                    ->orWhereNull('emailed_at');
            })
            ->orderBy('due_at')
            ->limit($limit)
            ->with('user')
            ->get();

        $inApp = 0;
        $email = 0;
        $skipped = 0;

        /** @var array<int, array{in_app: int, email: int}> $perUser */
        $perUser = [];

        foreach ($reminders as $reminder) {
            $user = $reminder->user;
            if (! $user) {
                $skipped++;
                continue;
            }

            $prefs = $this->preferences->revisionReminders($user);
            $userId = (int) $user->id;
            $perUser[$userId] ??= ['in_app' => 0, 'email' => 0];

            if ($this->isQuietHours($user)) {
                $skipped++;
                continue;
            }

            $presented = $this->query->present($reminder, $user);
            $sentSomething = false;

            if ($prefs['in_app']
                && $reminder->notified_in_app_at === null
                && $perUser[$userId]['in_app'] < (int) config('mutqin.revision_reminders.max_in_app_per_day', 3)
                && $this->inAppCountToday($user) < (int) config('mutqin.revision_reminders.max_in_app_per_day', 3)
            ) {
                $user->notify(new RevisionReminderDueNotification($reminder, $presented));
                $reminder->forceFill(['notified_in_app_at' => now()])->save();
                $perUser[$userId]['in_app']++;
                $inApp++;
                $sentSomething = true;
            }

            if ($prefs['email']
                && $reminder->emailed_at === null
                && $perUser[$userId]['email'] < (int) $prefs['max_emails_per_day']
                && $this->emailCountToday($user) < (int) $prefs['max_emails_per_day']
            ) {
                Mail::to($user->email)->queue(new RevisionReminderMail($user, $reminder, $presented));
                $reminder->forceFill(['emailed_at' => now()])->save();
                $perUser[$userId]['email']++;
                $email++;
                $sentSomething = true;
            }

            if (! $sentSomething) {
                $skipped++;
            }
        }

        return [
            'in_app' => $inApp,
            'email' => $email,
            'skipped' => $skipped,
        ];
    }

    private function isQuietHours(User $user): bool
    {
        $tz = $this->preferences->timezone($user);
        $hour = (int) now()->timezone($tz)->format('G');
        $start = (int) config('mutqin.revision_reminders.quiet_hours.start', 22);
        $end = (int) config('mutqin.revision_reminders.quiet_hours.end', 7);

        if ($start === $end) {
            return false;
        }

        if ($start > $end) {
            return $hour >= $start || $hour < $end;
        }

        return $hour >= $start && $hour < $end;
    }

    private function inAppCountToday(User $user): int
    {
        $bounds = $this->localDayBounds($user);

        return RevisionReminder::query()
            ->where('user_id', $user->id)
            ->whereNotNull('notified_in_app_at')
            ->whereBetween('notified_in_app_at', [$bounds['start'], $bounds['end']])
            ->count();
    }

    private function emailCountToday(User $user): int
    {
        $bounds = $this->localDayBounds($user);

        return RevisionReminder::query()
            ->where('user_id', $user->id)
            ->whereNotNull('emailed_at')
            ->whereBetween('emailed_at', [$bounds['start'], $bounds['end']])
            ->count();
    }

    /**
     * @return array{start: Carbon, end: Carbon}
     */
    private function localDayBounds(User $user): array
    {
        $tz = $this->preferences->timezone($user);
        $local = now()->timezone($tz);

        return [
            'start' => $local->copy()->startOfDay()->utc(),
            'end' => $local->copy()->endOfDay()->utc(),
        ];
    }
}

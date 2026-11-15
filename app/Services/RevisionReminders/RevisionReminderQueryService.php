<?php

namespace App\Services\RevisionReminders;

use App\Enums\RevisionReminderPriority;
use App\Enums\RevisionReminderStatus;
use App\Models\RevisionReminder;
use App\Models\User;
use App\Services\Achievements\PracticePreferences;
use App\Support\QuranMetadata;

final class RevisionReminderQueryService
{
    public function __construct(
        private readonly PracticePreferences $preferences,
        private readonly RevisionReminderHrefBuilder $hrefs,
        private readonly RevisionReminderSyncService $sync,
    ) {}

    /**
     * @return array{
     *   upcoming: list<array<string, mixed>>,
     *   due_today: list<array<string, mixed>>,
     *   overdue: list<array<string, mixed>>,
     *   outstanding_count: int,
     *   preferences: array<string, mixed>,
     *   items: list<array<string, mixed>>
     * }
     */
    public function forUser(User $user, bool $syncFirst = true): array
    {
        if ($syncFirst) {
            $this->sync->syncUser($user);
        } else {
            $this->sync->refreshOpenStatuses($user);
        }

        $rows = RevisionReminder::query()
            ->where('user_id', $user->id)
            ->whereIn('status', [
                RevisionReminderStatus::Upcoming->value,
                RevisionReminderStatus::Due->value,
                RevisionReminderStatus::Overdue->value,
                RevisionReminderStatus::Snoozed->value,
            ])
            ->orderByRaw("CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END")
            ->orderBy('due_at')
            ->limit(100)
            ->get();

        $upcoming = [];
        $dueToday = [];
        $overdue = [];
        $items = [];

        foreach ($rows as $reminder) {
            $presented = $this->present($reminder, $user);
            $items[] = $presented;
            $bucket = $presented['bucket'];
            if ($bucket === 'overdue') {
                $overdue[] = $presented;
            } elseif ($bucket === 'due_today') {
                $dueToday[] = $presented;
            } else {
                $upcoming[] = $presented;
            }
        }

        $outstanding = count($dueToday) + count($overdue);

        return [
            'upcoming' => $upcoming,
            'due_today' => $dueToday,
            'overdue' => $overdue,
            'outstanding_count' => $outstanding,
            'preferences' => $this->preferences->revisionReminders($user),
            'items' => $items,
        ];
    }

    /**
     * Compact dashboard payload for Today's Revision card.
     *
     * @return array<string, mixed>
     */
    public function dashboardCard(User $user): array
    {
        $payload = $this->forUser($user, true);
        $preview = collect($payload['overdue'])
            ->merge($payload['due_today'])
            ->merge($payload['upcoming'])
            ->take(3)
            ->values()
            ->all();

        $primary = $preview[0] ?? null;

        return [
            'outstanding_count' => $payload['outstanding_count'],
            'due_today_count' => count($payload['due_today']),
            'overdue_count' => count($payload['overdue']),
            'upcoming_count' => count($payload['upcoming']),
            'items' => $preview,
            'primary' => $primary,
            'preferences' => $payload['preferences'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function present(RevisionReminder $reminder, User $user): array
    {
        $status = $reminder->status instanceof RevisionReminderStatus
            ? $reminder->status
            : RevisionReminderStatus::tryFrom((string) $reminder->status);
        $priority = $reminder->priority instanceof RevisionReminderPriority
            ? $reminder->priority
            : RevisionReminderPriority::normalise($reminder->priority);

        $today = $this->preferences->localDate(now(), $user);
        $dueLocal = $this->preferences->localDate($reminder->due_at, $user);
        $bucket = match (true) {
            $status === RevisionReminderStatus::Snoozed => 'upcoming',
            $dueLocal < $today => 'overdue',
            $dueLocal === $today => 'due_today',
            default => 'upcoming',
        };

        $snoozeAllowed = $status !== null
            && in_array($status->value, RevisionReminderStatus::openValues(), true)
            && $status !== RevisionReminderStatus::Cancelled;

        return [
            'id' => (int) $reminder->id,
            'source_type' => $reminder->source_type instanceof \BackedEnum
                ? $reminder->source_type->value
                : (string) $reminder->source_type,
            'surah_number' => (int) $reminder->surah_number,
            'surah_name' => QuranMetadata::name((int) $reminder->surah_number),
            'ayah_start' => (int) $reminder->ayah_start,
            'ayah_end' => (int) $reminder->ayah_end,
            'due_at' => $reminder->due_at?->toIso8601String(),
            'due_local_date' => $dueLocal,
            'priority' => $priority->value,
            'status' => $status?->value ?? (string) $reminder->status,
            'bucket' => $bucket,
            'snoozed_until' => $reminder->snoozed_until?->toIso8601String(),
            'can_snooze' => $snoozeAllowed,
            'href' => $this->hrefs->forReminder($reminder),
            'session_settings' => is_array($reminder->session_settings) ? $reminder->session_settings : [],
            'teacher_assignment_recipient_id' => $reminder->teacher_assignment_recipient_id
                ? (int) $reminder->teacher_assignment_recipient_id
                : null,
        ];
    }
}

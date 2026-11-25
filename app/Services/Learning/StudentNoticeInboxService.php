<?php

namespace App\Services\Learning;

use App\Models\User;
use App\Notifications\LearningTaskNotification;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Carbon;

/**
 * Student in-app notices (assignments, feedback, deadlines). Parent copies use parent_* types.
 */
final class StudentNoticeInboxService
{
    private const STUDENT_TYPES = [
        'revision',
        'deadline',
        'lesson',
        'teacher_feedback',
        'assignment_approved',
        'assignment_correction',
    ];

    /**
     * @return array{notifications: list<array<string, mixed>>, unread_count: int, next_cursor: ?string}
     */
    public function list(User $student, int $limit = 50, ?string $cursor = null): array
    {
        $limit = max(1, min(100, $limit));

        $query = $student->notifications()
            ->where('type', LearningTaskNotification::class)
            ->orderByDesc('created_at')
            ->limit($limit + 1);

        if ($cursor !== null && $cursor !== '') {
            $anchor = $student->notifications()->whereKey($cursor)->first();
            if ($anchor instanceof DatabaseNotification) {
                $query->where('created_at', '<', $anchor->created_at);
            }
        }

        $rows = $query->get();
        $hasMore = $rows->count() > $limit;
        if ($hasMore) {
            $rows = $rows->take($limit);
        }

        $notifications = [];
        foreach ($rows as $row) {
            if (! $row instanceof DatabaseNotification) {
                continue;
            }
            $presented = $this->presentRow($row);
            if ($presented === null) {
                continue;
            }
            $notifications[] = $presented;
        }

        return [
            'notifications' => $notifications,
            'unread_count' => $this->unreadCount($student),
            'next_cursor' => $hasMore && $rows->isNotEmpty() ? (string) $rows->last()->id : null,
        ];
    }

    public function markRead(User $student, string $notificationId): bool
    {
        $row = $student->notifications()->whereKey($notificationId)->first();
        if (! $row instanceof DatabaseNotification || ! $this->isStudentNotice($row)) {
            return false;
        }

        if ($row->read_at === null) {
            $row->markAsRead();
        }

        return true;
    }

    public function markAllRead(User $student): int
    {
        $marked = 0;
        $student->unreadNotifications()
            ->where('type', LearningTaskNotification::class)
            ->get()
            ->each(function (DatabaseNotification $row) use (&$marked) {
                if (! $this->isStudentNotice($row)) {
                    return;
                }
                $row->markAsRead();
                $marked++;
            });

        return $marked;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function presentRow(DatabaseNotification $row): ?array
    {
        if (! $this->isStudentNotice($row)) {
            return null;
        }

        $data = is_array($row->data) ? $row->data : [];
        $rawHref = (string) ($data['href'] ?? '');

        return [
            'id' => (string) $row->id,
            'type' => (string) ($data['type'] ?? ''),
            'title' => (string) ($data['title'] ?? ''),
            'body' => (string) ($data['body'] ?? ''),
            'href' => $this->safeHref($rawHref),
            'href_valid' => $rawHref !== '' && $this->safeHref($rawHref) === $rawHref,
            'unread' => $row->read_at === null,
            'read_at' => $row->read_at instanceof Carbon ? $row->read_at->toIso8601String() : null,
            'created_at' => $row->created_at?->toIso8601String(),
            'due_on' => isset($data['due_on']) ? (string) $data['due_on'] : null,
            'teacher_assignment_recipient_id' => isset($data['teacher_assignment_recipient_id'])
                ? (int) $data['teacher_assignment_recipient_id']
                : null,
            'teacher_note_id' => isset($data['teacher_note_id']) ? (int) $data['teacher_note_id'] : null,
            'source_key' => (string) ($data['source_key'] ?? ''),
        ];
    }

    private function isStudentNotice(DatabaseNotification $row): bool
    {
        $data = is_array($row->data) ? $row->data : [];
        $type = (string) ($data['type'] ?? '');

        if ($type === '' || str_starts_with($type, 'parent_')) {
            return false;
        }

        return in_array($type, self::STUDENT_TYPES, true);
    }

    private function safeHref(string $href): string
    {
        if ($href === '') {
            return route('dashboard');
        }

        if (str_starts_with($href, '/memorisation')) {
            return $href;
        }

        if (str_starts_with($href, '/dashboard')) {
            return $href;
        }

        $dashboard = route('dashboard');
        if ($href === $dashboard || str_starts_with($href, $dashboard.'?')) {
            return $href;
        }

        return route('dashboard');
    }

    private function unreadCount(User $student): int
    {
        $count = 0;
        $student->unreadNotifications()
            ->where('type', LearningTaskNotification::class)
            ->get()
            ->each(function (DatabaseNotification $row) use (&$count) {
                if ($this->isStudentNotice($row)) {
                    $count++;
                }
            });

        return $count;
    }
}
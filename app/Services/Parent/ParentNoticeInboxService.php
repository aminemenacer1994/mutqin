<?php

namespace App\Services\Parent;

use App\Enums\ParentGuardianPermission;
use App\Models\User;
use App\Notifications\LearningTaskNotification;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Carbon;

/**
 * Guardian notification inbox: read state, child attribution, and safe deep links.
 */
final class ParentNoticeInboxService
{
    public function __construct(
        private readonly ParentAccessAuthorizer $access,
    ) {}

    /**
     * @return array{notifications: list<array<string, mixed>>, unread_count: int}
     */
    public function list(User $parent, int $limit = 50, ?string $cursor = null): array
    {
        $limit = max(1, min(100, $limit));
        $childNames = $this->childNames($parent);

        $query = $parent->notifications()
            ->where('type', LearningTaskNotification::class)
            ->orderByDesc('created_at')
            ->limit($limit + 1);

        if ($cursor !== null && $cursor !== '') {
            $anchor = $parent->notifications()->whereKey($cursor)->first();
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
            $presented = $this->presentRow($parent, $row, $childNames);
            if ($presented === null) {
                continue;
            }
            $notifications[] = $presented;
        }

        return [
            'notifications' => $notifications,
            'unread_count' => $this->unreadCount($parent),
            'next_cursor' => $hasMore && $rows->isNotEmpty() ? (string) $rows->last()->id : null,
        ];
    }

    public function markRead(User $parent, string $notificationId): bool
    {
        $row = $parent->notifications()->whereKey($notificationId)->first();
        if (! $row instanceof DatabaseNotification || ! $this->isParentNotice($row)) {
            return false;
        }

        if ($row->read_at === null) {
            $row->markAsRead();
        }

        return true;
    }

    public function markAllRead(User $parent): int
    {
        $marked = 0;
        $parent->unreadNotifications()
            ->where('type', LearningTaskNotification::class)
            ->get()
            ->each(function (DatabaseNotification $row) use (&$marked) {
                if (! $this->isParentNotice($row)) {
                    return;
                }
                $row->markAsRead();
                $marked++;
            });

        return $marked;
    }

    /**
     * @param  array<int, string>  $childNames
     * @return array<string, mixed>|null
     */
    private function presentRow(User $parent, DatabaseNotification $row, array $childNames): ?array
    {
        $data = is_array($row->data) ? $row->data : [];
        $type = (string) ($data['type'] ?? '');
        if (! str_starts_with($type, 'parent_')) {
            return null;
        }

        $childId = (int) ($data['child_user_id'] ?? 0);
        if ($childId <= 0) {
            $childId = $this->childIdFromHref((string) ($data['href'] ?? ''));
        }

        $rawHref = (string) ($data['href'] ?? '');
        $href = $this->safeHref($parent, $rawHref, $type, $childId);

        return [
            'id' => (string) $row->id,
            'type' => $type,
            'title' => (string) ($data['title'] ?? ''),
            'body' => (string) ($data['body'] ?? ''),
            'href' => $href,
            'href_valid' => $rawHref !== '' && $href === $rawHref,
            'child_id' => $childId > 0 ? $childId : null,
            'child_name' => $childId > 0 ? ($childNames[$childId] ?? null) : null,
            'unread' => $row->read_at === null,
            'read_at' => $row->read_at instanceof Carbon ? $row->read_at->toIso8601String() : null,
            'created_at' => $row->created_at?->toIso8601String(),
            'source_key' => (string) ($data['source_key'] ?? ''),
        ];
    }

    private function isParentNotice(DatabaseNotification $row): bool
    {
        $data = is_array($row->data) ? $row->data : [];
        $type = (string) ($data['type'] ?? '');

        return str_starts_with($type, 'parent_');
    }

    /**
     * @return array<int, string>
     */
    private function childNames(User $parent): array
    {
        $ids = $this->access->authorizedStudentIds($parent)->values()->all();
        if ($ids === []) {
            return [];
        }

        return User::query()
            ->whereIn('id', $ids)
            ->pluck('name', 'id')
            ->mapWithKeys(fn (mixed $name, mixed $id) => [(int) $id => (string) $name])
            ->all();
    }

    private function childIdFromHref(string $href): int
    {
        if ($href === '' || ! str_starts_with($href, '/parent')) {
            return 0;
        }
        $query = parse_url($href, PHP_URL_QUERY);
        if (! is_string($query) || $query === '') {
            return 0;
        }
        parse_str($query, $params);

        return isset($params['child']) && is_numeric($params['child']) ? (int) $params['child'] : 0;
    }

    private function safeHref(User $parent, string $href, string $type, int $childId): string
    {
        if ($href === '' || ! str_starts_with($href, '/parent')) {
            return '/parent';
        }

        if ($childId <= 0) {
            return '/parent';
        }

        $student = User::query()->find($childId);
        if (! $student instanceof User) {
            return '/parent';
        }

        if ($type === 'parent_learning_report') {
            $allowed = $this->access->allows($parent, $student, ParentGuardianPermission::ReceiveReports->value)
                || $this->access->allows($parent, $student, ParentGuardianPermission::ViewAssignments->value)
                || $this->access->allows($parent, $student, ParentGuardianPermission::ViewProgress->value)
                || $this->access->allows($parent, $student, ParentGuardianPermission::ViewMessages->value);
            if (! $allowed) {
                return '/parent';
            }
        } else {
            $permission = $this->permissionForType($type, $href);
            if ($permission !== null && ! $this->access->allows($parent, $student, $permission)) {
                return '/parent';
            }
        }

        if (! $this->access->allows($parent, $student)) {
            return '/parent';
        }

        return $href;
    }

    private function permissionForType(string $type, string $href): ?string
    {
        return match ($type) {
            'parent_message', 'parent_message_report', 'parent_feedback' => ParentGuardianPermission::ViewMessages->value,
            'parent_homework', 'parent_deadline', 'parent_overdue', 'parent_learning_update' => ParentGuardianPermission::ViewAssignments->value,
            'parent_weekly_summary' => ParentGuardianPermission::ViewProgress->value,
            'parent_learning_report' => ParentGuardianPermission::ReceiveReports->value,
            'parent_attendance' => ParentGuardianPermission::ViewAttendance->value,
            default => $this->permissionForView($href),
        };
    }

    private function unreadCount(User $parent): int
    {
        $count = 0;
        $parent->unreadNotifications()
            ->where('type', LearningTaskNotification::class)
            ->get()
            ->each(function (DatabaseNotification $row) use (&$count) {
                if ($this->isParentNotice($row)) {
                    $count++;
                }
            });

        return $count;
    }

    private function permissionForView(string $href): ?string
    {
        $query = parse_url($href, PHP_URL_QUERY);
        if (! is_string($query)) {
            return null;
        }
        parse_str($query, $params);
        $view = (string) ($params['view'] ?? '');

        return match ($view) {
            'messages' => ParentGuardianPermission::ViewMessages->value,
            'learning' => ParentGuardianPermission::ViewAssignments->value,
            'progress' => ParentGuardianPermission::ViewProgress->value,
            'reports' => ParentGuardianPermission::ReceiveReports->value,
            default => null,
        };
    }
}
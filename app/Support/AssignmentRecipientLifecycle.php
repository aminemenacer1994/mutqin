<?php

namespace App\Support;

use App\Enums\AssignmentStatus;
use App\Models\TeacherAssignmentRecipient;
use Illuminate\Support\Carbon;

/**
 * Cancelled and reassigned tasks keep submission history in completion_evidence.
 * Lifecycle transitions are appended, never overwritten.
 */
final class AssignmentRecipientLifecycle
{
    public const CLOSURE_CANCELLED = 'cancelled';

    public const CLOSURE_REASSIGNED = 'reassigned';

    public const EVENT_CANCELLED = 'cancelled';

    public const EVENT_REASSIGNED = 'reassigned';

    public static function isClosed(TeacherAssignmentRecipient $recipient): bool
    {
        $status = $recipient->status instanceof AssignmentStatus
            ? $recipient->status->value
            : (string) $recipient->status;

        return $status === AssignmentStatus::Cancelled->value;
    }

    /**
     * @return self::CLOSURE_*|null
     */
    public static function closure(TeacherAssignmentRecipient $recipient): ?string
    {
        if (! self::isClosed($recipient)) {
            return null;
        }

        $evidence = is_array($recipient->completion_evidence) ? $recipient->completion_evidence : [];

        return ($evidence['lifecycle_closure'] ?? null) === self::CLOSURE_REASSIGNED
            ? self::CLOSURE_REASSIGNED
            : self::CLOSURE_CANCELLED;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function events(TeacherAssignmentRecipient $recipient): array
    {
        $evidence = is_array($recipient->completion_evidence) ? $recipient->completion_evidence : [];
        $events = is_array($evidence['lifecycle_events'] ?? null) ? $evidence['lifecycle_events'] : [];

        return array_values(array_filter($events, fn ($row) => is_array($row)));
    }

    public static function predecessorRecipientId(TeacherAssignmentRecipient $recipient): ?int
    {
        $evidence = is_array($recipient->completion_evidence) ? $recipient->completion_evidence : [];
        $id = (int) ($evidence['predecessor_recipient_id'] ?? 0);

        return $id > 0 ? $id : null;
    }

    public static function successorRecipientId(TeacherAssignmentRecipient $recipient): ?int
    {
        foreach (array_reverse(self::events($recipient)) as $event) {
            $id = (int) ($event['successor_recipient_id'] ?? 0);
            if ($id > 0) {
                return $id;
            }
        }

        $evidence = is_array($recipient->completion_evidence) ? $recipient->completion_evidence : [];
        $id = (int) ($evidence['successor_recipient_id'] ?? 0);

        return $id > 0 ? $id : null;
    }

    /**
     * @param  array<string, mixed>  $evidence
     * @param  array<string, mixed>  $meta
     * @return array<string, mixed>
     */
    public static function appendEvent(array $evidence, string $type, array $meta = []): array
    {
        $events = is_array($evidence['lifecycle_events'] ?? null) ? $evidence['lifecycle_events'] : [];
        $events[] = array_merge([
            'type' => $type,
            'at' => Carbon::now()->toIso8601String(),
        ], $meta);
        $evidence['lifecycle_events'] = $events;

        return $evidence;
    }

    /**
     * @return array<string, mixed>
     */
    public static function present(TeacherAssignmentRecipient $recipient): array
    {
        $closure = self::closure($recipient);

        return [
            'closed' => self::isClosed($recipient),
            'closure' => $closure,
            'events' => self::events($recipient),
            'predecessor_recipient_id' => self::predecessorRecipientId($recipient),
            'successor_recipient_id' => self::successorRecipientId($recipient),
        ];
    }
}
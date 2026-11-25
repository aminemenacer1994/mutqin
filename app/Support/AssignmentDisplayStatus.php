<?php

namespace App\Support;

use App\Enums\AssignmentStatus;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;

/**
 * One display-status mapping for teacher, learner and parent surfaces.
 */
final class AssignmentDisplayStatus
{
    public static function resolve(
        TeacherAssignmentRecipient $recipient,
        ?string $reviewState,
        ?TeacherAssignment $assignment = null,
    ): string {
        if (AssignmentRecipientLifecycle::isClosed($recipient)) {
            $closure = AssignmentRecipientLifecycle::closure($recipient);

            return $closure === AssignmentRecipientLifecycle::CLOSURE_REASSIGNED
                ? 'reassigned'
                : 'cancelled';
        }

        if ($reviewState === 'needs_correction') {
            return 'needs_correction';
        }
        if ($reviewState === 'approved') {
            return 'completed';
        }
        if ($reviewState === 'submitted') {
            return 'awaiting_confirmation';
        }

        $assignment ??= $recipient->assignment;
        $status = $recipient->status instanceof AssignmentStatus
            ? $recipient->status->value
            : (string) $recipient->status;
        if ($status === AssignmentStatus::Overdue->value) {
            $status = $recipient->started_at !== null
                ? AssignmentStatus::InProgress->value
                : AssignmentStatus::Pending->value;
        }

        if (self::isDateOverdue($recipient, $assignment) && $status !== AssignmentStatus::Completed->value) {
            return 'overdue';
        }

        return $status;
    }

    public static function isDateOverdue(TeacherAssignmentRecipient $recipient, ?TeacherAssignment $assignment = null): bool
    {
        $status = $recipient->status instanceof AssignmentStatus
            ? $recipient->status->value
            : (string) $recipient->status;
        if ($status === AssignmentStatus::Completed->value || AssignmentRecipientLifecycle::isClosed($recipient)) {
            return false;
        }

        $due = ($assignment ?? $recipient->assignment)?->due_at;

        return $due !== null && $due->copy()->endOfDay()->isPast();
    }
}
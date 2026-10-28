<?php

namespace App\Support;

use App\Enums\AssignmentStatus;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

final class TeacherTaskState
{
    public const NOT_STARTED = 'NOT_STARTED';

    public const IN_PROGRESS = 'IN_PROGRESS';

    public const WAITING_REVIEW = 'WAITING_REVIEW';

    public const DONE = 'DONE';

    /** Display overlay when past due and not done. */
    public const OVERDUE = 'OVERDUE';

    /**
     * @param  array<string, mixed>|null  $assignment
     */
    public static function resolveBaseState(
        ?string $status,
        ?string $reviewState,
        ?CarbonInterface $startedAt,
        ?CarbonInterface $studentSubmittedAt,
    ): string {
        $status = $status ?? AssignmentStatus::Pending->value;

        if ($status === AssignmentStatus::Completed->value
            && ($reviewState === 'approved' || $studentSubmittedAt === null)) {
            return self::DONE;
        }

        if ($status === AssignmentStatus::AwaitingConfirmation->value || $reviewState === 'submitted') {
            return self::WAITING_REVIEW;
        }

        if ($reviewState === 'needs_correction'
            || $status === AssignmentStatus::InProgress->value
            || $status === AssignmentStatus::Overdue->value) {
            if ($startedAt !== null) {
                return self::IN_PROGRESS;
            }

            return self::NOT_STARTED;
        }

        if ($startedAt !== null || $status === AssignmentStatus::InProgress->value) {
            return self::IN_PROGRESS;
        }

        return self::NOT_STARTED;
    }

    public static function isOverdueOverlay(?CarbonInterface $dueAt, string $baseState): bool
    {
        if ($baseState === self::DONE || $dueAt === null) {
            return false;
        }

        return $dueAt->copy()->endOfDay()->isPast();
    }

    public static function displayState(
        ?string $status,
        ?string $reviewState,
        ?CarbonInterface $startedAt,
        ?CarbonInterface $studentSubmittedAt,
        ?CarbonInterface $dueAt,
    ): string {
        $base = self::resolveBaseState($status, $reviewState, $startedAt, $studentSubmittedAt);

        if (self::isOverdueOverlay($dueAt, $base)) {
            return self::OVERDUE;
        }

        return $base;
    }

    /**
     * @return array{text: string, tone: string, days_remaining: int|null}
     */
    public static function dueUrgency(?CarbonInterface $dueAt, bool $done, ?CarbonInterface $now = null): array
    {
        if ($done || $dueAt === null) {
            return ['text' => '', 'tone' => 'neutral', 'days_remaining' => null];
        }

        $now = ($now ?? now())->copy()->startOfDay();
        $dueDay = $dueAt->copy()->startOfDay();
        $daysRemaining = (int) $now->diffInDays($dueDay, false);

        if ($daysRemaining < 0) {
            return ['text' => 'Overdue', 'tone' => 'danger', 'days_remaining' => $daysRemaining];
        }

        if ($daysRemaining === 0) {
            return ['text' => 'Due today', 'tone' => 'warn', 'days_remaining' => 0];
        }

        if ($daysRemaining === 1) {
            return ['text' => 'Deadline tomorrow', 'tone' => 'warn', 'days_remaining' => 1];
        }

        if ($daysRemaining <= 3) {
            return [
                'text' => "Deadline in {$daysRemaining} days",
                'tone' => 'warning',
                'days_remaining' => $daysRemaining,
            ];
        }

        return [
            'text' => 'Due '.$dueAt->copy()->locale('en')->isoFormat('D MMM YYYY'),
            'tone' => 'neutral',
            'days_remaining' => $daysRemaining,
        ];
    }

    /**
     * @return array{base: string, display: string, overdue_overlay: bool}
     */
    public static function snapshot(
        ?string $status,
        ?string $reviewState,
        ?CarbonInterface $startedAt,
        ?CarbonInterface $studentSubmittedAt,
        ?CarbonInterface $dueAt,
    ): array {
        $base = self::resolveBaseState($status, $reviewState, $startedAt, $studentSubmittedAt);
        $overdue = self::isOverdueOverlay($dueAt, $base);

        return [
            'base' => $base,
            'display' => $overdue ? self::OVERDUE : $base,
            'overdue_overlay' => $overdue,
        ];
    }
}

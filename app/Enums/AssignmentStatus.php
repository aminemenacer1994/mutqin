<?php

namespace App\Enums;

enum AssignmentStatus: string
{
    case Pending = 'pending';
    case InProgress = 'in_progress';
    case AwaitingConfirmation = 'awaiting_confirmation';
    case Completed = 'completed';
    case Overdue = 'overdue';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}

<?php

namespace App\Enums;

enum RevisionReminderStatus: string
{
    case Upcoming = 'upcoming';
    case Due = 'due';
    case Overdue = 'overdue';
    case Snoozed = 'snoozed';
    case Completed = 'completed';
    case Cancelled = 'cancelled';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * @return list<string>
     */
    public static function openValues(): array
    {
        return [
            self::Upcoming->value,
            self::Due->value,
            self::Overdue->value,
            self::Snoozed->value,
        ];
    }
}

<?php

namespace App\Enums;

enum ParentGuardianPermission: string
{
    case ViewProgress = 'view_progress';
    case ViewAssignments = 'view_assignments';
    case ViewAttendance = 'view_attendance';
    case ViewMessages = 'view_messages';
    case ReceiveReports = 'receive_reports';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Default permissions granted when a link is approved.
     *
     * @return list<string>
     */
    public static function defaultGranted(): array
    {
        return self::values();
    }
}

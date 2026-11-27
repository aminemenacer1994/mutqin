<?php

namespace App\Enums;

enum StudentProgressReportStatus: string
{
    case Draft = 'draft';
    case Approved = 'approved';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
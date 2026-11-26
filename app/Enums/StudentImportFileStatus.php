<?php

namespace App\Enums;

enum StudentImportFileStatus: string
{
    case Pending = 'pending';
    case Parsed = 'parsed';
    case Unsupported = 'unsupported';
    case Failed = 'failed';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
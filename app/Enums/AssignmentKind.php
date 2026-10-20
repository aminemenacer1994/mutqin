<?php

namespace App\Enums;

enum AssignmentKind: string
{
    case Practice = 'practice';
    case AiRecite = 'ai_recite';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}

<?php

namespace App\Enums;

enum TeacherNoteKind: string
{
    case Note = 'note';
    case Feedback = 'feedback';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}

<?php

namespace App\Enums;

enum TeacherNoteKind: string
{
    case Note = 'note';
    case Feedback = 'feedback';
    case TeacherMessage = 'message_teacher';
    case StudentMessage = 'message_student';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}

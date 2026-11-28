<?php

namespace App\Enums;

enum TeacherAssignmentAudioRole: string
{
    case Instruction = 'instruction';
    case RecitationDemo = 'recitation_demo';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
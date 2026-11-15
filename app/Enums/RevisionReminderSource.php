<?php

namespace App\Enums;

enum RevisionReminderSource: string
{
    case Progress = 'progress';
    case TeacherAssignment = 'teacher_assignment';
    case PracticePlan = 'practice_plan';
    case Session = 'session';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}

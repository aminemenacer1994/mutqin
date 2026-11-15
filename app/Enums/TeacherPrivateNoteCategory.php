<?php

namespace App\Enums;

enum TeacherPrivateNoteCategory: string
{
    case Strengths = 'strengths';
    case Difficulties = 'difficulties';
    case LearningNeeds = 'learning_needs';
    case LessonObservations = 'lesson_observations';
    case Recommendations = 'recommendations';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}

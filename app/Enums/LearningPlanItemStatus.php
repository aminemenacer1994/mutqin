<?php

namespace App\Enums;

enum LearningPlanItemStatus: string
{
    case Planned = 'planned';
    case Released = 'released';
    case Skipped = 'skipped';
    case Paused = 'paused';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}

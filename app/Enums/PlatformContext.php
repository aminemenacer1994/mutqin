<?php

namespace App\Enums;

enum PlatformContext: string
{
    case Learner = 'learner';
    case Teacher = 'teacher';
    case Parent = 'parent';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}

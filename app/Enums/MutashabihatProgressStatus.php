<?php

namespace App\Enums;

enum MutashabihatProgressStatus: string
{
    case New = 'new';
    case NeedsPractice = 'needs_practice';
    case Improving = 'improving';
    case Strong = 'strong';

    public function label(): string
    {
        return match ($this) {
            self::New => 'New',
            self::NeedsPractice => 'Needs Practice',
            self::Improving => 'Improving',
            self::Strong => 'Strong',
        };
    }
}

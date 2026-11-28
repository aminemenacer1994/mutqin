<?php

namespace App\Enums;

enum MushafAnnotationCategory: string
{
    case Memorisation = 'memorisation';
    case Tajweed = 'tajweed';
    case Makharij = 'makharij';
    case Pronunciation = 'pronunciation';
    case Hesitation = 'hesitation';
    case Fluency = 'fluency';
    case Other = 'other';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(static fn (self $case) => $case->value, self::cases());
    }
}
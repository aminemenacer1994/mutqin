<?php

namespace App\Support;

/**
 * Teacher coaching focus keys that denote Tajweed (not wording match or hifz slip).
 */
final class TeacherTajweedFocus
{
    /** @var list<string> */
    public const TAJWEED_FOCI = [
        'makharij',
        'sifaat',
        'madd',
        'ghunnah',
        'noon_meem',
        'qalqalah',
        'waqf',
    ];

    public static function isTajweedFocus(?string $focus): bool
    {
        return $focus !== null && $focus !== '' && in_array($focus, self::TAJWEED_FOCI, true);
    }

    public static function isTajweedAssessmentArea(?string $area): bool
    {
        return $area === 'tajweed';
    }
}
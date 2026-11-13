<?php

namespace App\Support\Achievements;

/** Stable achievement identifiers (never display names). */
final class AchievementId
{
    public const FIRST_STEPS = 'first_steps';

    public const CONSISTENT = 'consistent';

    public const REVISER = 'reviser';

    public const DEDICATED = 'dedicated';

    public const FOCUSED = 'focused';

    public const GROWING = 'growing';

    public const CHECKER = 'checker';

    public const MEMORISER = 'memoriser';

    public const EXPLORER = 'explorer';

    public const STEADFAST = 'steadfast';

    /**
     * Ordered learning path (Beginner → Intermediate → Advanced).
     *
     * @return list<string>
     */
    public static function all(): array
    {
        return [
            self::FIRST_STEPS,
            self::CHECKER,
            self::CONSISTENT,
            self::MEMORISER,
            self::EXPLORER,
            self::DEDICATED,
            self::REVISER,
            self::GROWING,
            self::FOCUSED,
            self::STEADFAST,
        ];
    }

    public static function isKnown(string $id): bool
    {
        return in_array($id, self::all(), true);
    }
}

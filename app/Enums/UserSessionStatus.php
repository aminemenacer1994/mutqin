<?php

namespace App\Enums;

enum UserSessionStatus: string
{
    case None = 'none';
    case Active = 'active';
    case Paused = 'paused';
    case Interrupted = 'interrupted';
    case EndedEarly = 'ended_early';
    case Completed = 'completed';
    case Abandoned = 'abandoned';

    public function isUnfinished(): bool
    {
        return in_array($this, [
            self::Active,
            self::Paused,
            self::Interrupted,
        ], true);
    }

    /** Deliberately finished before completing the selected range. */
    public function isEndedEarly(): bool
    {
        return $this === self::EndedEarly;
    }

    /** Fully completed every required ayah/repetition in the selected range. */
    public function isFullyCompleted(): bool
    {
        return $this === self::Completed;
    }

    public static function tryFromMixed(mixed $value): ?self
    {
        if ($value instanceof self) {
            return $value;
        }

        if (! is_string($value) || $value === '') {
            return null;
        }

        return self::tryFrom(strtolower($value));
    }
}

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

    /**
     * SQL values that should be treated as unfinished, including legacy
     * frontend lifecycle labels that were persisted before canonicalisation.
     *
     * @return list<string>
     */
    public static function unfinishedDatabaseValues(): array
    {
        return [
            self::Active->value,
            self::Paused->value,
            self::Interrupted->value,
            'interrupted_resumable',
            'resumable',
            'starting',
            'resuming',
            'playing',
            'pausing',
        ];
    }

    public static function tryFromMixed(mixed $value): ?self
    {
        if ($value instanceof self) {
            return $value;
        }

        if (! is_string($value) || $value === '') {
            return null;
        }

        $normalized = str_replace('-', '_', strtolower(trim($value)));

        return self::tryFrom($normalized) ?? match ($normalized) {
            'interrupted_resumable', 'resumable' => self::Interrupted,
            'starting', 'resuming', 'playing' => self::Active,
            'pausing' => self::Paused,
            'completing', 'ended', 'completion_modal_open' => self::Completed,
            'ending', 'ended_manually' => self::EndedEarly,
            'ready', 'ready_to_start', 'hydrating', 'uninitialised', 'uninitialized' => self::None,
            default => null,
        };
    }
}

<?php

namespace App\Enums;

enum RevisionReminderPriority: string
{
    case Low = 'low';
    case Normal = 'normal';
    case High = 'high';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public static function normalise(mixed $value): self
    {
        $raw = is_string($value) ? strtolower(trim($value)) : '';

        return self::tryFrom($raw) ?? self::Normal;
    }
}

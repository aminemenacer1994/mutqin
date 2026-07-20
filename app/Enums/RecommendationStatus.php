<?php

namespace App\Enums;

enum RecommendationStatus: string
{
    case Generated = 'generated';
    case Accepted = 'accepted';
    case Started = 'started';
    case Dismissed = 'dismissed';
    case Superseded = 'superseded';

    public function isOpen(): bool
    {
        return $this === self::Generated;
    }

    public function canAccept(): bool
    {
        return in_array($this, [self::Generated, self::Accepted], true);
    }
}

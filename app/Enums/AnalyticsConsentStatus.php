<?php

namespace App\Enums;

enum AnalyticsConsentStatus: string
{
    case None = 'none';
    case Granted = 'granted';
    case Revoked = 'revoked';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}

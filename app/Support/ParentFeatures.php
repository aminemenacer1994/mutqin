<?php

namespace App\Support;

/**
 * Server-side switch for the Parent Platform.
 *
 * Off unless MUTQIN_PARENT_FEATURES_ENABLED=true (see config/mutqin.php).
 */
final class ParentFeatures
{
    public static function enabled(): bool
    {
        return (bool) config('mutqin.parent_features_enabled', false);
    }

    public static function abortUnlessEnabled(): void
    {
        if (! self::enabled()) {
            abort(404);
        }
    }
}

<?php

namespace App\Support;

/**
 * Donation page stays off public deployment until it is ready to ship.
 */
final class DonationVisibility
{
    public static function enabled(): bool
    {
        return filter_var(config('mutqin.show_donate', false), FILTER_VALIDATE_BOOL);
    }

    public static function abortUnlessEnabled(): void
    {
        if (! self::enabled()) {
            abort(404);
        }
    }
}

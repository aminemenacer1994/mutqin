<?php

namespace App\Support;

/**
 * The /features hub (How it works) stays local until walkthrough videos are ready.
 */
final class HowItWorksVisibility
{
    public static function enabled(): bool
    {
        return filter_var(config('mutqin.show_how_it_works', false), FILTER_VALIDATE_BOOL);
    }

    public static function abortUnlessEnabled(): void
    {
        if (! self::enabled()) {
            abort(404);
        }
    }
}

<?php

namespace App\Support;

/**
 * The /features hub (How it works) is public by default, including production.
 * Set MUTQIN_SHOW_HOW_IT_WORKS=false to hide the page, nav link, and sitemap entry.
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

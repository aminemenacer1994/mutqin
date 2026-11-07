<?php

namespace App\Support;

/**
 * File-based /articles pages stay local until they are ready for production.
 */
final class ArticlesVisibility
{
    public static function enabled(): bool
    {
        return filter_var(config('mutqin.show_articles', false), FILTER_VALIDATE_BOOL);
    }

    public static function abortUnlessEnabled(): void
    {
        if (! self::enabled()) {
            abort(404);
        }
    }
}

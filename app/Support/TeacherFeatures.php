<?php

namespace App\Support;

/**
 * Server-side switch for teacher and student management.
 *
 * The value comes from config, which is filled from
 * MUTQIN_TEACHER_FEATURES_ENABLED at boot (and by config:cache on deploy).
 * Application code must not call env() for this flag.
 */
final class TeacherFeatures
{
    public static function enabled(): bool
    {
        return (bool) config('mutqin.teacher_features_enabled', false);
    }

    public static function abortUnlessEnabled(): void
    {
        if (! self::enabled()) {
            abort(404);
        }
    }
}

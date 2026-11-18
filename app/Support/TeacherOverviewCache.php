<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

class TeacherOverviewCache
{
    public static function forget(int $teacherId): void
    {
        if ($teacherId < 1) {
            return;
        }

        foreach ([7, 30, 90] as $days) {
            foreach (['', '.v2', '.v3', '.v4', '.v5', '.v6'] as $version) {
                Cache::forget(sprintf('teacher.overview%s.%d.%d', $version, $teacherId, $days));
            }
        }
    }
}

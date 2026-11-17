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
            Cache::forget(sprintf('teacher.overview.%d.%d', $teacherId, $days));
            Cache::forget(sprintf('teacher.overview.v2.%d.%d', $teacherId, $days));
        }
    }
}

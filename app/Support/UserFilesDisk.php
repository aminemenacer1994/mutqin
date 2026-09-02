<?php

namespace App\Support;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Storage;

/**
 * Resolves the disk used for durable user-owned files (feedback screenshots).
 * Never use this for ephemeral AI learner-audio scratch files.
 */
class UserFilesDisk
{
    public static function name(): string
    {
        $disk = (string) config('mutqin.user_files.disk', 'local');

        return $disk !== '' ? $disk : 'local';
    }

    public static function disk(): Filesystem
    {
        return Storage::disk(self::name());
    }

    public static function screenshotPrefix(): string
    {
        $prefix = trim((string) config('mutqin.user_files.screenshot_prefix', 'feedback-screenshots'), '/');

        return $prefix !== '' ? $prefix : 'feedback-screenshots';
    }

    /**
     * True when user files are stored on a remote (object storage) disk.
     */
    public static function isRemote(): bool
    {
        $driver = (string) config('filesystems.disks.'.self::name().'.driver', 'local');

        return $driver !== 'local';
    }
}

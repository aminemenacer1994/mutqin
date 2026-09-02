<?php

namespace App\Services\Backup;

use App\Support\MutqinLog;
use App\Support\UserFilesDisk;
use Illuminate\Support\Facades\File;
use Throwable;

/**
 * Stages remote user-file objects into the local path Spatie zips, then cleans up.
 */
class UserFilesBackupStaging
{
    public function stageFeedbackScreenshots(): int
    {
        if (! UserFilesDisk::isRemote()) {
            $this->ensureLocalScreenshotDirectory();

            return 0;
        }

        $prefix = UserFilesDisk::screenshotPrefix();
        $localRoot = storage_path('app/private/'.$prefix);
        File::ensureDirectoryExists($localRoot);

        $staged = 0;
        $disk = UserFilesDisk::disk();

        foreach ($disk->allFiles($prefix) as $path) {
            $relative = str_starts_with($path, $prefix.'/')
                ? substr($path, strlen($prefix) + 1)
                : basename($path);

            if ($relative === '' || str_contains($relative, '..')) {
                continue;
            }

            $target = $localRoot.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $relative);
            File::ensureDirectoryExists(dirname($target));
            File::put($target, $disk->get($path));
            $staged++;
        }

        MutqinLog::info('backup.user_files.staged', [
            'disk' => UserFilesDisk::name(),
            'prefix' => $prefix,
            'count' => $staged,
        ]);

        return $staged;
    }

    public function cleanupStagedFeedbackScreenshots(): void
    {
        if (! UserFilesDisk::isRemote()) {
            return;
        }

        $localRoot = storage_path('app/private/'.UserFilesDisk::screenshotPrefix());

        try {
            if (is_dir($localRoot)) {
                File::deleteDirectory($localRoot);
            }
        } catch (Throwable $e) {
            MutqinLog::warning('backup.user_files.stage_cleanup_failed', [
                'message' => $e->getMessage(),
            ]);
            report($e);
        }

        $this->ensureLocalScreenshotDirectory();
    }

    public function ensureLocalScreenshotDirectory(): void
    {
        $path = storage_path('app/private/'.UserFilesDisk::screenshotPrefix());
        File::ensureDirectoryExists($path);

        $gitignore = $path.DIRECTORY_SEPARATOR.'.gitignore';
        if (! is_file($gitignore)) {
            File::put($gitignore, "*\n!.gitignore\n");
        }
    }
}

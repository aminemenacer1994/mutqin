<?php

namespace App\Console\Commands;

use App\Services\Backup\UserFilesBackupStaging;
use App\Support\MutqinLog;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Throwable;

class BackupRunCommand extends Command
{
    protected $signature = 'mutqin:backup
                            {--only-db : Skip file staging and zip only the database dump}
                            {--only-files : Skip the database dump}
                            {--disable-notifications : Pass through to backup:run}';

    protected $description = 'Run an encrypted Mutqin backup (DB + durable user files) via spatie/laravel-backup.';

    public function handle(UserFilesBackupStaging $staging): int
    {
        if (! filter_var(config('mutqin.backup.enabled'), FILTER_VALIDATE_BOOL)) {
            $this->warn('MUTQIN_BACKUP_ENABLED is false — refusing to run. See docs/backups.md.');
            MutqinLog::warning('backup.run.skipped_disabled');

            return self::FAILURE;
        }

        if (filter_var(config('mutqin.backup.require_encryption'), FILTER_VALIDATE_BOOL)
            && blank(config('backup.backup.password'))) {
            $this->error('BACKUP_ARCHIVE_PASSWORD is required when BACKUP_REQUIRE_ENCRYPTION=true.');
            MutqinLog::error('backup.run.skipped_missing_password');

            return self::FAILURE;
        }

        $onlyDb = (bool) $this->option('only-db');
        $onlyFiles = (bool) $this->option('only-files');

        if (! $onlyDb) {
            try {
                $staged = $staging->stageFeedbackScreenshots();
                if ($staged > 0) {
                    $this->info("Staged {$staged} remote feedback screenshot(s) for the archive.");
                }
            } catch (Throwable $e) {
                MutqinLog::error('backup.user_files.stage_failed', [
                    'message' => $e->getMessage(),
                ]);
                report($e);
                $this->error('Failed to stage user files: '.$e->getMessage());

                return self::FAILURE;
            }
        }

        $params = [];
        if ($onlyDb) {
            $params['--only-db'] = true;
        }
        if ($onlyFiles) {
            $params['--only-files'] = true;
        }
        if ($this->option('disable-notifications')) {
            $params['--disable-notifications'] = true;
        }

        try {
            $exit = Artisan::call('backup:run', $params, $this->output);
        } catch (Throwable $e) {
            MutqinLog::error('backup.run.exception', [
                'message' => $e->getMessage(),
            ]);
            report($e);
            $this->error($e->getMessage());
            $exit = self::FAILURE;
        } finally {
            if (! $onlyDb) {
                $staging->cleanupStagedFeedbackScreenshots();
            }
        }

        if ($exit === self::SUCCESS) {
            MutqinLog::info('backup.run.completed', [
                'only_db' => $onlyDb,
                'only_files' => $onlyFiles,
            ]);
        }

        return $exit === 0 ? self::SUCCESS : self::FAILURE;
    }
}

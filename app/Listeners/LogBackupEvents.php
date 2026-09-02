<?php

namespace App\Listeners;

use App\Support\MutqinLog;
use Spatie\Backup\Events\BackupHasFailed;
use Spatie\Backup\Events\BackupWasSuccessful;
use Spatie\Backup\Events\CleanupHasFailed;
use Spatie\Backup\Events\UnhealthyBackupWasFound;

class LogBackupEvents
{
    public function handleBackupFailed(BackupHasFailed $event): void
    {
        MutqinLog::error('backup.run.failed', [
            'disk' => $event->diskName,
            'backup_name' => $event->backupName,
            'message' => $event->exception->getMessage(),
            'exception' => $event->exception::class,
        ]);

        report($event->exception);
    }

    public function handleBackupSucceeded(BackupWasSuccessful $event): void
    {
        MutqinLog::info('backup.run.succeeded', [
            'disk' => $event->diskName,
            'backup_name' => $event->backupName,
        ]);
    }

    public function handleCleanupFailed(CleanupHasFailed $event): void
    {
        MutqinLog::error('backup.cleanup.failed', [
            'disk' => $event->diskName,
            'backup_name' => $event->backupName,
            'message' => $event->exception->getMessage(),
            'exception' => $event->exception::class,
        ]);

        report($event->exception);
    }

    public function handleUnhealthy(UnhealthyBackupWasFound $event): void
    {
        MutqinLog::error('backup.monitor.unhealthy', [
            'disk' => $event->diskName,
            'backup_name' => $event->backupName,
            'failures' => $event->failureMessages->all(),
        ]);
    }
}

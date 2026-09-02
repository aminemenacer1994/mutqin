<?php

use App\Support\MutqinLog;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Scheduler + queue-worker freshness heartbeats (see docs/monitoring.md).
Schedule::command('mutqin:health-heartbeat')->everyMinute();

Schedule::command('mutqin:health-evaluate')
    ->everyFiveMinutes()
    ->when(fn () => filter_var(config('monitoring.evaluate_enabled', true), FILTER_VALIDATE_BOOL));

Schedule::command('mutqin:purge-learning-history --soft-delete-assessments')
    ->daily()
    ->when(fn () => (int) config('mutqin.learning_history.assessment_soft_delete_days', 0) > 0);

// Always run temp-audio + sync scrub so temporary recordings cannot linger indefinitely.
Schedule::command('mutqin:purge-learning-history --purge-temp-audio --strip-sync-audio')
    ->hourly();

Schedule::command('mutqin:speechmatics-usage-report')
    ->dailyAt('23:50')
    ->timezone('UTC')
    ->when(fn () => filter_var(config('services.speechmatics.usage_cap.enabled', true), FILTER_VALIDATE_BOOL));

// App-level encrypted backups (spatie). Gated until MUTQIN_BACKUP_ENABLED=true in the host env.
// Laravel Cloud MySQL snapshots remain the primary DB recovery path — see docs/backups.md.
$backupEnabled = static fn () => filter_var(config('mutqin.backup.enabled'), FILTER_VALIDATE_BOOL);

Schedule::command('backup:clean')
    ->dailyAt((string) config('mutqin.backup.clean_at', '01:00'))
    ->timezone('UTC')
    ->when($backupEnabled)
    ->onFailure(static function (): void {
        MutqinLog::error('backup.schedule.clean_failed');
    });

Schedule::command('mutqin:backup')
    ->dailyAt((string) config('mutqin.backup.run_at', '01:30'))
    ->timezone('UTC')
    ->when($backupEnabled)
    ->onFailure(static function (): void {
        MutqinLog::error('backup.schedule.run_failed');
    });

Schedule::command('backup:monitor')
    ->dailyAt((string) config('mutqin.backup.monitor_at', '02:00'))
    ->timezone('UTC')
    ->when($backupEnabled)
    ->onFailure(static function (): void {
        MutqinLog::error('backup.schedule.monitor_failed');
    });

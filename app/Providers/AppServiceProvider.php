<?php

namespace App\Providers;

use App\Listeners\LogBackupEvents;
use App\Models\User;
use App\Services\Memorisation\LearningHistoryRetentionService;
use App\Services\SpeechmaticsRateLimit;
use App\Support\DatabaseDeploySafety;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Pagination\Paginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Spatie\Backup\Events\BackupHasFailed;
use Spatie\Backup\Events\BackupWasSuccessful;
use Spatie\Backup\Events\CleanupHasFailed;
use Spatie\Backup\Events\UnhealthyBackupWasFound;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Block migrate:fresh / refresh / reset / rollback / db:wipe in production.
        // Deployments must use php artisan migrate --force only (see docs/database-deploy-safety.md).
        DB::prohibitDestructiveCommands(
            DatabaseDeploySafety::isProtectedEnvironment()
        );

        Password::defaults(static fn () => Password::min(8));

        Gate::define('access-admin', function ($user) {
            // Authorization uses the authenticated persisted user only (never request email).
            return $user instanceof User && $user->isAdmin();
        });
        Paginator::useBootstrapFive();

        RateLimiter::for('public-proxy', function (Request $request) {
            return Limit::perMinute(120)->by($request->ip());
        });

        RateLimiter::for(SpeechmaticsRateLimit::NAME, function (Request $request) {
            return app(SpeechmaticsRateLimit::class)->limitsFor($request);
        });

        // Ensure learner-audio temp dir exists with a .gitignore so backups/logs never
        // accidentally treat scratch recordings as durable assets.
        try {
            app(LearningHistoryRetentionService::class)
                ->ensureTemporaryAudioDirectory();
        } catch (\Throwable $e) {
            // Boot must not fail if storage is read-only in some environments.
            report($e);
        }

        Event::listen(BackupHasFailed::class, [LogBackupEvents::class, 'handleBackupFailed']);
        Event::listen(BackupWasSuccessful::class, [LogBackupEvents::class, 'handleBackupSucceeded']);
        Event::listen(CleanupHasFailed::class, [LogBackupEvents::class, 'handleCleanupFailed']);
        Event::listen(UnhealthyBackupWasFound::class, [LogBackupEvents::class, 'handleUnhealthy']);
    }
}

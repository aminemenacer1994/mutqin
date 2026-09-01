<?php

namespace App\Providers;

use App\Services\SpeechmaticsRateLimit;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Pagination\Paginator;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

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
        Gate::define('access-admin', function ($user) {
            // Authorization uses the authenticated persisted user only (never request email).
            return $user instanceof \App\Models\User && $user->isAdmin();
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
            app(\App\Services\Memorisation\LearningHistoryRetentionService::class)
                ->ensureTemporaryAudioDirectory();
        } catch (\Throwable $e) {
            // Boot must not fail if storage is read-only in some environments.
            report($e);
        }
    }
}

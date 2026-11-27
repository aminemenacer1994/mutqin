<?php

namespace App\Providers;

use App\Enums\TeacherNoteKind;
use App\Listeners\LogBackupEvents;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\Organisation;
use App\Models\ParentStudentLink;
use App\Models\TeacherNote;
use App\Models\StudentImportBatch;
use App\Models\TeacherPrivateNote;
use App\Models\User;
use App\Policies\GroupMembershipPolicy;
use App\Policies\LearningGroupPolicy;
use App\Policies\OrganisationPolicy;
use App\Policies\ParentStudentLinkPolicy;
use App\Policies\StudentImportBatchPolicy;
use App\Policies\TeacherPrivateNotePolicy;
use App\Services\Learning\LearningTaskNotifier;
use App\Services\Memorisation\LearningHistoryRetentionService;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Services\Parent\LocalParentAssistantComposer;
use App\Services\Parent\ParentAccessAuthorizer;
use App\Services\Parent\ParentAssistantComposer;
use App\Services\Parent\ParentLearningReportCollector;
use App\Services\Parent\RecordParentLearningReportCollector;
use App\Services\SpeechmaticsRateLimit;
use App\Services\TajweedAcoustic\Contracts\PhonemeRecognitionProvider;
use App\Services\TajweedAcoustic\Providers\HisnLabsCliPhonemeProvider;
use App\Services\TajweedAcoustic\Providers\NullPhonemeRecognitionProvider;
use App\Support\DatabaseDeploySafety;
use App\Support\PreviewSandbox;
use App\Support\PublicAppUrl;
use App\Support\Registration\OrganisationRegistrationCatalog;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Mail\Events\MessageSending;
use Illuminate\Pagination\Paginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\View;
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
        $this->app->bind(ParentAssistantComposer::class, LocalParentAssistantComposer::class);
        $this->app->bind(ParentLearningReportCollector::class, RecordParentLearningReportCollector::class);

        $this->app->bind(PhonemeRecognitionProvider::class, function () {
            $provider = (string) config('mutqin.acoustic_tajweed.provider', 'null');
            if ($provider === HisnLabsCliPhonemeProvider::PROVIDER_ID) {
                return new HisnLabsCliPhonemeProvider(
                    (string) config('mutqin.acoustic_tajweed.hisnlabs.python', 'python3'),
                    base_path('scripts/experimental/hisnlabs_phoneme_infer.py'),
                    max(10, (int) config('mutqin.acoustic_tajweed.hisnlabs.timeout_seconds', 90)),
                );
            }

            return new NullPhonemeRecognitionProvider();
        });
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

        PublicAppUrl::apply();

        Gate::define('access-admin', function ($user) {
            // Authorization uses the authenticated persisted user only (never request email).
            return $user instanceof User && $user->isAdmin();
        });

        Gate::define('manage-waitlist-launch-email', function ($user) {
            return $user instanceof User && $user->isSuperAdmin();
        });

        Gate::define('manage-registered-user-broadcast-email', function ($user) {
            return $user instanceof User && $user->isSuperAdmin();
        });

        TeacherNote::created(function (TeacherNote $note): void {
            $kind = $note->kind instanceof TeacherNoteKind
                ? $note->kind
                : TeacherNoteKind::tryFrom((string) $note->kind);
            if ($kind === TeacherNoteKind::Feedback) {
                app(LearningTaskNotifier::class)->publishedFeedback($note);
            }
        });

        Gate::policy(Organisation::class, OrganisationPolicy::class);
        Gate::policy(LearningGroup::class, LearningGroupPolicy::class);
        Gate::policy(GroupMembership::class, GroupMembershipPolicy::class);
        Gate::policy(ParentStudentLink::class, ParentStudentLinkPolicy::class);
        Gate::policy(TeacherPrivateNote::class, TeacherPrivateNotePolicy::class);
        Gate::policy(StudentImportBatch::class, StudentImportBatchPolicy::class);
        Gate::define('view-student-analytics', function (User $actor, User $student): bool {
            return app(StudentAccessAuthorizer::class)->allows($actor, $student);
        });
        Gate::define('view-student-as-parent', function (User $actor, User $student, ?string $permission = null): bool {
            return app(ParentAccessAuthorizer::class)->allows($actor, $student, $permission);
        });
        Paginator::useBootstrapFive();

        RateLimiter::for('public-proxy', function (Request $request) {
            return Limit::perMinute(120)->by($request->ip());
        });

        RateLimiter::for(SpeechmaticsRateLimit::NAME, function (Request $request) {
            return app(SpeechmaticsRateLimit::class)->limitsFor($request);
        });

        RateLimiter::for('ask-mutqin-interpret', function (Request $request) {
            $userId = optional($request->user())->id;

            return Limit::perMinute(20)->by($userId ? 'user:'.$userId : 'ip:'.$request->ip());
        });

        RateLimiter::for('preview-sandbox-enter', function (Request $request) {
            $perMinute = max(1, (int) config('mutqin.preview_sandbox.enter_per_minute', 12));

            return Limit::perMinute($perMinute)->by(PreviewSandbox::rateLimitKey($request));
        });

        if ((bool) config('mutqin.preview_sandbox.suppress_outbound_mail', true)) {
            Event::listen(MessageSending::class, function (MessageSending $event) {
                $request = request();
                if ($request !== null && PreviewSandbox::suppressesSideEffects($request)) {
                    return false;
                }
            });
        }

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

        View::composer('auth.register', function ($view): void {
            if (! $view->offsetExists('organisationOptions')) {
                $view->with('organisationOptions', OrganisationRegistrationCatalog::options());
            }
        });
    }
}

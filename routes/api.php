<?php

use App\Http\Controllers\Api\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\Admin\FeedbackController as AdminFeedbackController;
use App\Http\Controllers\Api\FeedbackController;
use App\Http\Controllers\Api\ClientErrorController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\Learning\AiReciteAttemptController;
use App\Http\Controllers\Api\Learning\AnalyticsController;
use App\Http\Controllers\Api\Learning\AyahNoteController;
use App\Http\Controllers\Api\Learning\ContinueController;
use App\Http\Controllers\Api\Learning\HifzPlanController;
use App\Http\Controllers\Api\Learning\MigrateLocalStorageController;
use App\Http\Controllers\Api\Learning\ProgressController;
use App\Http\Controllers\Api\Learning\RecommendationController;
use App\Http\Controllers\Api\Learning\SessionController;
use App\Http\Controllers\Api\Learning\StateSyncController;
use App\Http\Controllers\Api\Memorisation\MemorisationDetectionController;
use App\Http\Controllers\Api\Memorisation\MemorisationHistoryController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\ContactSubmissionController;
use App\Http\Controllers\MadaniMushafPageController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\WaitingListController;
use Illuminate\Support\Facades\Route;

// Public Quran Mushaf page API (immutable layout data, no credentials).
Route::prefix('quran/mushaf')->group(function () {
    Route::get('/pages/{page}', [MadaniMushafPageController::class, 'show'])
        ->where('page', '[1-9][0-9]{0,2}')
        ->name('api.quran.mushaf.page');
    Route::get('/resolve', [MadaniMushafPageController::class, 'resolve'])
        ->name('api.quran.mushaf.resolve');
    Route::get('/manifest', [MadaniMushafPageController::class, 'manifest'])
        ->name('api.quran.mushaf.manifest');
});

Route::post('/client-errors', [ClientErrorController::class, 'store'])
    ->middleware('throttle:20,1')
    ->name('api.client-errors.store');

Route::post('/stripe/webhook', [BillingController::class, 'webhook'])->name('stripe.webhook');
Route::post('/contact', [ContactSubmissionController::class, 'store'])
    ->middleware('throttle:5,1')
    ->name('api.contact.store');
Route::post('/waiting-list', [WaitingListController::class, 'store'])
    ->middleware('throttle:5,1')
    ->name('api.waiting-list.store');

// Backend-driven learning persistence (Sanctum SPA cookie auth, user scoped).
Route::middleware('auth:sanctum')->group(function () {
    Route::middleware('can:access-admin')->group(function () {
        Route::get('/admin/dashboard', [AdminDashboardController::class, 'show'])->name('api.admin.dashboard.show');
        Route::get('/admin/users', [AdminDashboardController::class, 'users'])->name('api.admin.users');
        Route::post('/admin/users', [AdminDashboardController::class, 'userStore'])->name('api.admin.users.store');
        Route::post('/admin/users/bulk', [AdminDashboardController::class, 'usersBulk'])->name('api.admin.users.bulk');
        Route::get('/admin/users/{user}', [AdminDashboardController::class, 'userShow'])->name('api.admin.users.show');
        Route::patch('/admin/users/{user}', [AdminDashboardController::class, 'userUpdate'])->name('api.admin.users.update');
        Route::delete('/admin/users/{user}', [AdminDashboardController::class, 'userDestroy'])->name('api.admin.users.destroy');
        Route::get('/admin/activity', [AdminDashboardController::class, 'activity'])->name('api.admin.activity');
        Route::get('/admin/sessions', [AdminDashboardController::class, 'sessions'])->name('api.admin.sessions');
        Route::get('/admin/ai-checks', [AdminDashboardController::class, 'aiChecks'])->name('api.admin.ai-checks');
        Route::get('/admin/notes', [AdminDashboardController::class, 'notes'])->name('api.admin.notes');
        Route::delete('/admin/notes/{note}', [AdminDashboardController::class, 'noteDestroy'])->name('api.admin.notes.destroy');
        Route::get('/admin/contacts', [AdminDashboardController::class, 'contacts'])->name('api.admin.contacts');
        Route::patch('/admin/contacts/{contactMessage}/resolve', [AdminDashboardController::class, 'resolveContact'])
            ->name('api.admin.contacts.resolve');
        Route::delete('/admin/contacts/{contactMessage}', [AdminDashboardController::class, 'destroyContact'])
            ->name('api.admin.contacts.destroy');
        Route::get('/admin/feedback', [AdminFeedbackController::class, 'index'])->name('api.admin.feedback.index');
        Route::get('/admin/feedback/metrics', [AdminFeedbackController::class, 'metrics'])->name('api.admin.feedback.metrics');
        Route::get('/admin/feedback/{feedback}', [AdminFeedbackController::class, 'show'])->name('api.admin.feedback.show');
        Route::patch('/admin/feedback/{feedback}', [AdminFeedbackController::class, 'update'])->name('api.admin.feedback.update');
        Route::get('/admin/feedback/{feedback}/screenshot', [AdminFeedbackController::class, 'screenshot'])->name('api.admin.feedback.screenshot');
    });

    // Preferences remain available while waiting to verify email.
    Route::patch('/profile/locale', [ProfileController::class, 'updateLocale'])->name('api.profile.locale');
    Route::patch('/profile/theme', [ProfileController::class, 'updateTheme'])->name('api.profile.theme');
    Route::get('/profile/ai-audio-consent', [ProfileController::class, 'showAiAudioConsent'])
        ->name('api.profile.ai-audio-consent.show');
    Route::patch('/profile/ai-audio-consent', [ProfileController::class, 'updateAiAudioConsent'])
        ->name('api.profile.ai-audio-consent.update');

    Route::middleware('verified')->group(function () {
        Route::post('/feedback', [FeedbackController::class, 'store'])
            ->middleware('throttle:10,1')
            ->name('api.feedback.store');

        Route::get('/dashboard', [DashboardController::class, 'show'])->name('api.dashboard.show');
        Route::get('/dashboard/activity', [DashboardController::class, 'activity'])->name('api.dashboard.activity');

        Route::get('/session', [SessionController::class, 'show'])->name('api.session.show');
        Route::get('/session/current', [SessionController::class, 'current'])->name('api.session.current');
        Route::get('/sessions/history', [SessionController::class, 'history'])->name('api.sessions.history');
        Route::post('/session', [SessionController::class, 'store'])->middleware('throttle:60,1')->name('api.session.store');
        Route::post('/session/start', [SessionController::class, 'start'])->middleware('throttle:60,1')->name('api.session.start');
        Route::post('/session/pause', [SessionController::class, 'pause'])->middleware('throttle:60,1')->name('api.session.pause');
        Route::post('/session/resume', [SessionController::class, 'resume'])->middleware('throttle:60,1')->name('api.session.resume');
        Route::post('/session/end', [SessionController::class, 'end'])->middleware('throttle:60,1')->name('api.session.end');

        Route::get('/ai-recite-attempts', [AiReciteAttemptController::class, 'index'])->name('api.ai-recite-attempts.index');

        Route::get('/continue', [ContinueController::class, 'show'])->name('api.continue.show');
        Route::post('/continue', [ContinueController::class, 'store'])->name('api.continue.store');

        Route::get('/progress', [ProgressController::class, 'index'])->name('api.progress.index');
        Route::post('/progress', [ProgressController::class, 'store'])->name('api.progress.store');

        Route::get('/hifz-plan', [HifzPlanController::class, 'show'])->name('api.hifz-plan.show');
        Route::put('/hifz-plan', [HifzPlanController::class, 'upsert'])
            ->name('api.hifz-plan.upsert');
        Route::delete('/hifz-plan', [HifzPlanController::class, 'destroy'])
            ->name('api.hifz-plan.destroy');

        // Private per-āyah notes & reflections (user-scoped).
        Route::get('/ayah-notes/counts', [AyahNoteController::class, 'counts'])->name('api.ayah-notes.counts');
        Route::get('/ayah-notes', [AyahNoteController::class, 'index'])->name('api.ayah-notes.index');
        Route::post('/ayah-notes', [AyahNoteController::class, 'store'])->name('api.ayah-notes.store');
        Route::put('/ayah-notes/{ayahNote}', [AyahNoteController::class, 'update'])->name('api.ayah-notes.update');
        Route::delete('/ayah-notes/{ayahNote}', [AyahNoteController::class, 'destroy'])->name('api.ayah-notes.destroy');

        Route::get('/analytics', [AnalyticsController::class, 'index'])->name('api.analytics.index');
        Route::post('/analytics', [AnalyticsController::class, 'store'])->name('api.analytics.store');

        // Personalised next-session recommendations.
        Route::get('/recommendations/next', [RecommendationController::class, 'show'])->name('api.recommendations.next');
        Route::get('/recommendations/history', [RecommendationController::class, 'history'])->name('api.recommendations.history');
        Route::post('/recommendations/start', [RecommendationController::class, 'start'])->name('api.recommendations.start');
        Route::post('/recommendations/reject', [RecommendationController::class, 'reject'])->name('api.recommendations.reject');
        Route::post('/recommendations/confidence', [RecommendationController::class, 'confidence'])->name('api.recommendations.confidence');
        Route::post('/recommendations/settings', [RecommendationController::class, 'settings'])->name('api.recommendations.settings');
        Route::post('/recommendations/ai-assessment', [RecommendationController::class, 'aiAssessment'])
            ->name('api.recommendations.ai-assessment');
        Route::post('/recommendations/adaptive-assessment', [RecommendationController::class, 'adaptiveAssessment'])
            ->name('api.recommendations.adaptive-assessment');

        // AI Memorisation Detection — assessment, personalised plan, practice execution.
        Route::post('/memorisation/assessments', [MemorisationDetectionController::class, 'storeAssessment'])
            ->middleware('throttle:20,1')
            ->name('api.memorisation.assessments.store');
        Route::post('/memorisation/assessments/failed', [MemorisationDetectionController::class, 'storeFailedAssessment'])
            ->middleware('throttle:20,1')
            ->name('api.memorisation.assessments.failed');
        Route::get('/memorisation/assessments', [MemorisationHistoryController::class, 'attemptIndex'])
            ->name('api.memorisation.assessments.index');
        Route::get('/memorisation/assessments/{assessment}', [MemorisationHistoryController::class, 'attemptShow'])
            ->name('api.memorisation.assessments.show');
        Route::get('/memorisation/sessions/history', [MemorisationHistoryController::class, 'sessionIndex'])
            ->name('api.memorisation.sessions.history');
        Route::get('/memorisation/weak-spots', [MemorisationHistoryController::class, 'weakSpots'])
            ->name('api.memorisation.weak-spots');
        Route::get('/memorisation/practice-plans', [MemorisationHistoryController::class, 'recommendations'])
            ->name('api.memorisation.practice-plans.index');
        Route::get('/memorisation/comparisons/lookup', [MemorisationHistoryController::class, 'comparisonLookup'])
            ->name('api.memorisation.comparisons.lookup');
        Route::get('/memorisation/comparisons/{comparison}', [MemorisationHistoryController::class, 'comparisonShow'])
            ->name('api.memorisation.comparisons.show');
        Route::get('/memorisation/history/dashboard', [MemorisationHistoryController::class, 'dashboard'])
            ->name('api.memorisation.history.dashboard');
        Route::patch('/memorisation/practice-plans/{practicePlan}', [MemorisationDetectionController::class, 'adjustPlan'])
            ->name('api.memorisation.practice-plans.adjust');
        Route::post('/memorisation/practice-plans/{practicePlan}/accept', [MemorisationDetectionController::class, 'acceptPlan'])
            ->name('api.memorisation.practice-plans.accept');
        Route::post('/memorisation/practice-plans/{practicePlan}/dismiss', [MemorisationDetectionController::class, 'dismissPlan'])
            ->name('api.memorisation.practice-plans.dismiss');
        Route::post('/memorisation/practice-plans/{practicePlan}/start', [MemorisationDetectionController::class, 'startPlan'])
            ->name('api.memorisation.practice-plans.start');
        Route::post('/memorisation/practice-plans/{practicePlan}/complete', [MemorisationDetectionController::class, 'completePlan'])
            ->name('api.memorisation.practice-plans.complete');
        Route::post('/memorisation/practice-plans/{practicePlan}/retest', [MemorisationDetectionController::class, 'retestPlan'])
            ->name('api.memorisation.practice-plans.retest');

        // Full-fidelity state blob used as the live persistence boundary.
        Route::get('/state', [StateSyncController::class, 'show'])->name('api.state.show');
        Route::post('/state', [StateSyncController::class, 'store'])
            ->middleware('throttle:30,1')
            ->name('api.state.store');

        Route::post('/migrate-local-storage', [MigrateLocalStorageController::class, 'store'])
            ->middleware('throttle:5,1')
            ->name('api.migrate-local-storage');
    });
});

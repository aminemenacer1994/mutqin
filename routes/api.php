<?php

use App\Http\Controllers\ContactSubmissionController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\Learning\AiReciteAttemptController;
use App\Http\Controllers\Api\Learning\AnalyticsController;
use App\Http\Controllers\Api\Learning\AyahNoteController;
use App\Http\Controllers\Api\Learning\ContinueController;
use App\Http\Controllers\Api\Learning\MigrateLocalStorageController;
use App\Http\Controllers\Api\Learning\ProgressController;
use App\Http\Controllers\Api\Learning\RecommendationController;
use App\Http\Controllers\Api\Learning\SessionController;
use App\Http\Controllers\Api\Learning\StateSyncController;
use App\Http\Controllers\Api\Memorisation\MemorisationDetectionController;
use Illuminate\Support\Facades\Route;

Route::post('/stripe/webhook', [BillingController::class, 'webhook'])->name('stripe.webhook');
Route::post('/contact', [ContactSubmissionController::class, 'store'])->name('api.contact.store');

// Backend-driven learning persistence (Sanctum SPA cookie auth, user scoped).
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'show'])->name('api.dashboard.show');
    Route::get('/dashboard/activity', [DashboardController::class, 'activity'])->name('api.dashboard.activity');

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

    Route::get('/session', [SessionController::class, 'show'])->name('api.session.show');
    Route::get('/session/current', [SessionController::class, 'current'])->name('api.session.current');
    Route::get('/sessions/history', [SessionController::class, 'history'])->name('api.sessions.history');
    Route::post('/session', [SessionController::class, 'store'])->name('api.session.store');
    Route::post('/session/start', [SessionController::class, 'start'])->name('api.session.start');
    Route::post('/session/pause', [SessionController::class, 'pause'])->name('api.session.pause');
    Route::post('/session/resume', [SessionController::class, 'resume'])->name('api.session.resume');
    Route::post('/session/end', [SessionController::class, 'end'])->name('api.session.end');

    Route::get('/ai-recite-attempts', [AiReciteAttemptController::class, 'index'])->name('api.ai-recite-attempts.index');

    Route::get('/continue', [ContinueController::class, 'show'])->name('api.continue.show');
    Route::post('/continue', [ContinueController::class, 'store'])->name('api.continue.store');

    Route::get('/progress', [ProgressController::class, 'index'])->name('api.progress.index');
    Route::post('/progress', [ProgressController::class, 'store'])->name('api.progress.store');

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
    Route::post('/recommendations/ai-assessment', [RecommendationController::class, 'aiAssessment'])->name('api.recommendations.ai-assessment');
    Route::post('/recommendations/adaptive-assessment', [RecommendationController::class, 'adaptiveAssessment'])->name('api.recommendations.adaptive-assessment');

    // AI Memorisation Detection — assessment, personalised plan, practice execution.
    Route::post('/memorisation/assessments', [MemorisationDetectionController::class, 'storeAssessment'])
        ->name('api.memorisation.assessments.store');
    Route::patch('/memorisation/practice-plans/{practicePlan}', [MemorisationDetectionController::class, 'adjustPlan'])
        ->name('api.memorisation.practice-plans.adjust');
    Route::post('/memorisation/practice-plans/{practicePlan}/start', [MemorisationDetectionController::class, 'startPlan'])
        ->name('api.memorisation.practice-plans.start');
    Route::post('/memorisation/practice-plans/{practicePlan}/complete', [MemorisationDetectionController::class, 'completePlan'])
        ->name('api.memorisation.practice-plans.complete');
    Route::post('/memorisation/practice-plans/{practicePlan}/retest', [MemorisationDetectionController::class, 'retestPlan'])
        ->name('api.memorisation.practice-plans.retest');

    // Full-fidelity state blob used as the live persistence boundary.
    Route::get('/state', [StateSyncController::class, 'show'])->name('api.state.show');
    Route::post('/state', [StateSyncController::class, 'store'])->name('api.state.store');

    Route::post('/migrate-local-storage', [MigrateLocalStorageController::class, 'store'])->name('api.migrate-local-storage');

    Route::patch('/profile/locale', [ProfileController::class, 'updateLocale'])->name('api.profile.locale');
});

<?php

use App\Http\Controllers\ContactSubmissionController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Api\Learning\AnalyticsController;
use App\Http\Controllers\Api\Learning\ContinueController;
use App\Http\Controllers\Api\Learning\MigrateLocalStorageController;
use App\Http\Controllers\Api\Learning\ProgressController;
use App\Http\Controllers\Api\Learning\RecommendationController;
use App\Http\Controllers\Api\Learning\SessionController;
use App\Http\Controllers\Api\Learning\StateSyncController;
use Illuminate\Support\Facades\Route;

Route::post('/stripe/webhook', [BillingController::class, 'webhook'])->name('stripe.webhook');
Route::post('/contact', [ContactSubmissionController::class, 'store'])->name('api.contact.store');

// Backend-driven learning persistence (Sanctum SPA cookie auth, user scoped).
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/session', [SessionController::class, 'show'])->name('api.session.show');
    Route::get('/session/current', [SessionController::class, 'current'])->name('api.session.current');
    Route::post('/session', [SessionController::class, 'store'])->name('api.session.store');
    Route::post('/session/start', [SessionController::class, 'start'])->name('api.session.start');
    Route::post('/session/pause', [SessionController::class, 'pause'])->name('api.session.pause');
    Route::post('/session/resume', [SessionController::class, 'resume'])->name('api.session.resume');
    Route::post('/session/end', [SessionController::class, 'end'])->name('api.session.end');

    Route::get('/continue', [ContinueController::class, 'show'])->name('api.continue.show');
    Route::post('/continue', [ContinueController::class, 'store'])->name('api.continue.store');

    Route::get('/progress', [ProgressController::class, 'index'])->name('api.progress.index');
    Route::post('/progress', [ProgressController::class, 'store'])->name('api.progress.store');

    Route::get('/analytics', [AnalyticsController::class, 'index'])->name('api.analytics.index');
    Route::post('/analytics', [AnalyticsController::class, 'store'])->name('api.analytics.store');

    // Personalised next-session recommendations.
    Route::get('/recommendations/next', [RecommendationController::class, 'show'])->name('api.recommendations.next');
    Route::post('/recommendations/start', [RecommendationController::class, 'start'])->name('api.recommendations.start');
    Route::post('/recommendations/reject', [RecommendationController::class, 'reject'])->name('api.recommendations.reject');
    Route::post('/recommendations/confidence', [RecommendationController::class, 'confidence'])->name('api.recommendations.confidence');
    Route::post('/recommendations/settings', [RecommendationController::class, 'settings'])->name('api.recommendations.settings');
    Route::post('/recommendations/ai-assessment', [RecommendationController::class, 'aiAssessment'])->name('api.recommendations.ai-assessment');
    Route::post('/recommendations/adaptive-assessment', [RecommendationController::class, 'adaptiveAssessment'])->name('api.recommendations.adaptive-assessment');

    // Full-fidelity state blob used as the live persistence boundary.
    Route::get('/state', [StateSyncController::class, 'show'])->name('api.state.show');
    Route::post('/state', [StateSyncController::class, 'store'])->name('api.state.store');

    Route::post('/migrate-local-storage', [MigrateLocalStorageController::class, 'store'])->name('api.migrate-local-storage');

    Route::patch('/profile/locale', [ProfileController::class, 'updateLocale'])->name('api.profile.locale');
});

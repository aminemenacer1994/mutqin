<?php

use App\Http\Controllers\ContactSubmissionController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Api\Learning\AnalyticsController;
use App\Http\Controllers\Api\Learning\ContinueController;
use App\Http\Controllers\Api\Learning\MigrateLocalStorageController;
use App\Http\Controllers\Api\Learning\ProgressController;
use App\Http\Controllers\Api\Learning\SessionController;
use App\Http\Controllers\Api\Learning\StateSyncController;
use Illuminate\Support\Facades\Route;

Route::post('/stripe/webhook', [BillingController::class, 'webhook'])->name('stripe.webhook');
Route::post('/contact', [ContactSubmissionController::class, 'store'])->name('api.contact.store');

// Backend-driven learning persistence (Sanctum SPA cookie auth, user scoped).
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/session', [SessionController::class, 'show'])->name('api.session.show');
    Route::post('/session', [SessionController::class, 'store'])->name('api.session.store');

    Route::get('/continue', [ContinueController::class, 'show'])->name('api.continue.show');
    Route::post('/continue', [ContinueController::class, 'store'])->name('api.continue.store');

    Route::get('/progress', [ProgressController::class, 'index'])->name('api.progress.index');
    Route::post('/progress', [ProgressController::class, 'store'])->name('api.progress.store');

    Route::get('/analytics', [AnalyticsController::class, 'index'])->name('api.analytics.index');
    Route::post('/analytics', [AnalyticsController::class, 'store'])->name('api.analytics.store');

    // Full-fidelity state blob used as the live persistence boundary.
    Route::get('/state', [StateSyncController::class, 'show'])->name('api.state.show');
    Route::post('/state', [StateSyncController::class, 'store'])->name('api.state.store');

    Route::post('/migrate-local-storage', [MigrateLocalStorageController::class, 'store'])->name('api.migrate-local-storage');

    Route::patch('/profile/locale', [ProfileController::class, 'updateLocale'])->name('api.profile.locale');
    Route::patch('/profile/ai-recall-mode', [ProfileController::class, 'updateAiRecallMode'])->name('api.profile.ai-recall-mode');
});

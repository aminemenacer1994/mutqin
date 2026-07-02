<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\Admin\ContactMessageController;
use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\MemorisationSyncController;

// Authentication routes (from laravel/ui)
Auth::routes();

Route::get('/auth/redirect', [GoogleAuthController::class, 'redirect'])->name('auth.google.redirect');
Route::get('/auth/callback', [GoogleAuthController::class, 'callback'])->name('auth.google.callback');

// Public routes
Route::get('/', function () {
    return view('home');
})->name('home');

Route::get('/onboarding', function () {
    return redirect()->route('memorisation');
})->name('onboarding.page');

Route::get('/billing', [BillingController::class, 'index'])->name('billing.index');
Route::post('/checkout', [BillingController::class, 'checkout'])->name('checkout');
Route::post('/billing/checkout', [BillingController::class, 'checkout'])->name('billing.checkout');
Route::get('/billing/success', [BillingController::class, 'success'])->name('billing.success');

Route::get('/memorisation', function () {
    return view('memorisation');
})->name('memorisation');

Route::view('/about', 'content.about-us')->name('about');
Route::view('/about-us', 'content.about-us')->name('about-us');
Route::view('/our-mission', 'content.our-mission')->name('our-mission');
Route::view('/donate', 'content.donate')->name('donate');

Route::get('/memorisation/audio-download', function (Request $request) {
    $url = (string) $request->query('url', '');
    $filename = (string) $request->query('filename', 'ayah.mp3');

    if (!$url) {
        abort(400, 'Missing audio URL');
    }

    $parts = parse_url($url);
    $host = $parts['host'] ?? '';
    $scheme = $parts['scheme'] ?? '';

    if ($scheme !== 'https' || $host !== 'cdn.islamic.network') {
        abort(403, 'Unsupported audio host');
    }

    $safeFilename = preg_replace('/[^A-Za-z0-9._-]/', '-', $filename) ?: 'ayah.mp3';
    $response = Http::withOptions(['stream' => true])->get($url);

    if (!$response->successful()) {
        abort($response->status() ?: 502, 'Failed to fetch audio');
    }

    $stream = $response->toPsrResponse()->getBody();

    return response()->streamDownload(function () use ($stream) {
        while (!$stream->eof()) {
            echo $stream->read(8192);
        }
    }, $safeFilename, [
        'Content-Type' => 'audio/mpeg',
    ]);
})->name('memorisation.audio-download');

// Protected routes (require authentication)
Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', [HomeController::class, 'index'])->name('dashboard');
    Route::get('/profile', [ProfileController::class, 'show'])->name('profile.show');
    Route::put('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::put('/profile/password', [ProfileController::class, 'updatePassword'])->name('profile.password.update');
    Route::post('/billing/portal', [BillingController::class, 'portal'])->name('billing.portal');
    Route::post('/memorisation/transcription-token', function () {
        $apiKey = trim((string) config('services.speechmatics.api_key', ''));
        $configuredRegion = strtolower(trim((string) config('services.speechmatics.region', '')));
        $keySuffix = strlen($apiKey) >= 6 ? substr($apiKey, -6) : $apiKey;
        $region = match ($configuredRegion) {
            'eu', 'eu1', 'europe' => [
                'code' => 'eu',
                'host' => 'eu.rt.speechmatics.com',
            ],
            'us', 'us1', 'usa', 'united-states' => [
                'code' => 'us',
                'host' => 'us.rt.speechmatics.com',
            ],
            default => null,
        };

        if (!$apiKey) {
            return response()->json([
                'message' => 'Speechmatics API key is not configured.',
            ], 422);
        }

        if (!$region) {
            return response()->json([
                'message' => 'Speechmatics region is not configured.',
            ], 422);
        }

        try {
            $response = Http::withToken($apiKey)
                ->acceptJson()
                ->timeout(12)
                ->post('https://mp.speechmatics.com/v1/api_keys?type=rt', [
                    'ttl' => 120,
                ]);
        } catch (\Throwable $error) {
            Log::warning('Speechmatics token request failed before receiving a response.', [
                'user_id' => optional(request()->user())->id,
                'key_suffix' => $keySuffix ?: null,
                'exception' => $error->getMessage(),
            ]);

            return response()->json([
                'message' => 'Speechmatics token request failed before Speechmatics responded.',
            ], 502);
        }

        if (!$response->successful()) {
            $payload = $response->json();
            if (!is_array($payload)) {
                $payload = [
                    'raw_body' => trim((string) $response->body()),
                ];
            }

            $status = $response->status() ?: 502;
            $upstreamMessage = trim((string) ($payload['detail'] ?? $payload['message'] ?? $payload['reason'] ?? ''));
            $message = $upstreamMessage !== '' ? $upstreamMessage : 'Speechmatics token request failed.';

            if (in_array($status, [401, 403], true) || str_contains(strtolower($message), 'not author')) {
                $message = 'Speechmatics rejected the configured server key for temporary token creation.';
            }

            Log::warning('Speechmatics token request was rejected.', [
                'user_id' => optional(request()->user())->id,
                'status' => $status,
                'key_suffix' => $keySuffix ?: null,
                'upstream_message' => $upstreamMessage ?: null,
                'payload' => $payload,
            ]);

            $errorPayload = [
                'message' => $message,
            ];

            if (config('app.debug')) {
                $errorPayload['speechmatics_status'] = $status;
                $errorPayload['speechmatics_message'] = $upstreamMessage ?: null;
                $errorPayload['configured_key_suffix'] = $keySuffix ?: null;
                if (in_array($status, [401, 403], true)) {
                    $errorPayload['hint'] = 'Use a Speechmatics API key that can create realtime temporary keys, then run php artisan config:clear so Laravel stops using any older cached key.';
                }
            }

            return response()->json(array_filter($errorPayload, fn ($value) => $value !== null && $value !== ''), $status);
        }

        return response()->json([
            'access_token' => $response->json('key_value'),
            'expires_in' => 120,
            'region' => $region['code'],
            'websocket_host' => $region['host'],
        ]);
    })->name('memorisation.transcription-token');
    Route::get('/memorisation/sync-state', [MemorisationSyncController::class, 'show'])->name('memorisation.sync.show');
    Route::put('/memorisation/sync-state', [MemorisationSyncController::class, 'update'])->name('memorisation.sync.update');
});

Route::middleware(['auth', 'can:access-admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/contact-messages', [ContactMessageController::class, 'index'])->name('contact-messages.index');
    Route::patch('/contact-messages/{contactMessage}/resolve', [ContactMessageController::class, 'resolve'])->name('contact-messages.resolve');
    Route::delete('/contact-messages/{contactMessage}', [ContactMessageController::class, 'destroy'])->name('contact-messages.destroy');
});

Route::get('/home', function () {
    return redirect()->route('home');
})->name('home.legacy');

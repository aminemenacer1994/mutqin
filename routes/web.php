<?php

use App\Http\Controllers\Admin\ContactMessageController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\WaitingListController as AdminWaitingListController;
use App\Http\Controllers\Auth\DemoLoginController;
use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\MushafPageImageController;
use App\Http\Controllers\QuranProxyController;
use App\Services\SpeechmaticsUsageCap;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;

// Authentication routes (from laravel/ui)
Auth::routes(['verify' => true]);

Route::post('/login/demo', DemoLoginController::class)
    ->middleware('guest')
    ->name('login.demo');

Route::get('/auth/google', [GoogleAuthController::class, 'redirect']);
Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect'])->name('auth.google.redirect');
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->name('auth.google.callback');
Route::get('/auth/redirect', [GoogleAuthController::class, 'redirect']);
Route::get('/auth/callback', [GoogleAuthController::class, 'callback']);

// Public routes
Route::get('/', function () {
    return view('home');
})->name('home');

Route::get('/onboarding', function () {
    return redirect()->route('memorisation');
})->name('onboarding.page');

Route::get('/billing', [BillingController::class, 'index'])->name('billing.index');
Route::get('/billing/success', [BillingController::class, 'success'])->name('billing.success');

Route::get('/memorisation', function (Request $request) {
    $justRegistered = (bool) $request->session()->pull('mutqin_just_registered', false);
    // Consumed here (not on /dashboard) so Welcome Back survives post-login overview.
    $justLoggedIn = (bool) $request->session()->pull('mutqin_just_logged_in', false);

    return view('memorisation', [
        'justRegistered' => $justRegistered,
        'justLoggedIn' => $justLoggedIn,
    ]);
})->middleware('auth')->name('memorisation');

Route::get('/memorisation/demo', function () {
    return view('memorisation', ['demoMode' => true]);
})->name('memorisation.demo');

// Same-origin proxy — browsers cannot call alquran.cloud / quran.com due to CORS.
Route::get('/memorisation/quran-proxy/{provider}/{path}', QuranProxyController::class)
    ->middleware('throttle:public-proxy')
    ->where('provider', 'alquran|qurancom')
    ->where('path', '.*')
    ->name('memorisation.quran-proxy');

Route::get('/memorisation/mushaf-page/{page}.png', MushafPageImageController::class)
    ->middleware('throttle:public-proxy')
    ->where('page', '[1-9][0-9]{0,2}')
    ->name('memorisation.mushaf-page');

Route::view('/about', 'content.about-us')->name('about');
Route::view('/about-us', 'content.about-us')->name('about-us');
Route::view('/pricing', 'content.pricing')->name('pricing');
Route::view('/our-mission', 'content.our-mission')->name('our-mission');
Route::view('/donate', 'content.donate')->name('donate');
Route::view('/waiting-list', 'content.waiting-list')->name('waiting-list');

// Protected routes (require authentication)
Route::middleware(['auth'])->group(function () {
    Route::post('/checkout', [BillingController::class, 'checkout'])->name('checkout');
    Route::post('/billing/checkout', [BillingController::class, 'checkout'])->name('billing.checkout');
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/profile', [ProfileController::class, 'show'])->name('profile.show');
    Route::put('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::put('/profile/password', [ProfileController::class, 'updatePassword'])->name('profile.password.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::post('/billing/portal', [BillingController::class, 'portal'])->name('billing.portal');

    Route::get('/memorisation/audio-download', function (Request $request) {
        $url = (string) $request->query('url', '');
        $filename = (string) $request->query('filename', 'ayah.mp3');
        $mode = (string) $request->query('mode', 'download');

        if (! $url) {
            abort(400, 'Missing audio URL');
        }

        $allowedHosts = ['cdn.islamic.network', 'cdn.alquran.cloud'];
        $candidates = [];
        $pushCandidate = static function (string $candidate) use (&$candidates, $allowedHosts) {
            $parts = parse_url($candidate);
            $host = $parts['host'] ?? '';
            $scheme = $parts['scheme'] ?? '';
            if ($scheme !== 'https' || ! in_array($host, $allowedHosts, true)) {
                return;
            }
            if (! in_array($candidate, $candidates, true)) {
                $candidates[] = $candidate;
            }
        };

        $pushCandidate($url);
        if (preg_match('#/(?:quran/audio/\d+|media/audio/ayah)/([a-z0-9.]+)/(\d+)(?:\.mp3)?#i', $url, $match)) {
            $reciter = $match[1];
            $ayah = $match[2];
            $pushCandidate("https://cdn.islamic.network/quran/audio/128/{$reciter}/{$ayah}.mp3");
            $pushCandidate("https://cdn.islamic.network/quran/audio/128/ar.alafasy/{$ayah}.mp3");
            $pushCandidate("https://cdn.alquran.cloud/media/audio/ayah/{$reciter}/{$ayah}");
            $pushCandidate("https://cdn.alquran.cloud/media/audio/ayah/ar.alafasy/{$ayah}");
        }

        if ($candidates === []) {
            abort(403, 'Unsupported audio host');
        }

        $response = null;
        $lastStatus = 502;
        foreach ($candidates as $candidate) {
            $attempt = Http::timeout(20)
                ->withOptions(['stream' => $mode !== 'play'])
                ->get($candidate);
            if ($attempt->successful()) {
                $response = $attempt;
                break;
            }
            $lastStatus = $attempt->status() ?: 502;
        }

        if (! $response) {
            abort($lastStatus, 'Failed to fetch audio');
        }

        $safeFilename = preg_replace('/[^A-Za-z0-9._-]/', '-', $filename) ?: 'ayah.mp3';

        if ($mode === 'play') {
            $body = $response->body();

            return response($body, 200, [
                'Content-Type' => 'audio/mpeg',
                'Content-Length' => (string) strlen($body),
                'Content-Disposition' => 'inline; filename="'.$safeFilename.'"',
                'Cache-Control' => 'public, max-age=86400',
                'X-Content-Type-Options' => 'nosniff',
            ]);
        }

        $stream = $response->toPsrResponse()->getBody();

        return response()->streamDownload(function () use ($stream) {
            while (! $stream->eof()) {
                echo $stream->read(8192);
            }
        }, $safeFilename, [
            'Content-Type' => 'audio/mpeg',
        ]);
    })
        ->name('memorisation.audio-download');

    Route::post('/memorisation/transcription-token', function (SpeechmaticsUsageCap $usageCap) {
        $userId = optional(request()->user())->id;
        $cap = $usageCap->inspect($userId);
        if (! $cap['allowed']) {
            return response()->json([
                'available' => false,
                'reason' => SpeechmaticsUsageCap::REASON,
                'message' => SpeechmaticsUsageCap::LEARNER_MESSAGE,
                'speechmatics_status' => 429,
            ]);
        }

        $apiKey = trim((string) config('services.speechmatics.api_key', ''));
        $configuredRegion = strtolower(trim((string) config('services.speechmatics.region', '')));
        $keySuffix = strlen($apiKey) >= 6 ? substr($apiKey, -6) : $apiKey;
        $tokenTtl = $usageCap->tokenTtlSeconds();
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

        if (! $apiKey) {
            Log::warning('Speechmatics token request skipped: API key is not configured.', [
                'user_id' => $userId,
            ]);

            return response()->json([
                'available' => false,
                'reason' => 'unavailable',
                'message' => SpeechmaticsUsageCap::LEARNER_UNAVAILABLE,
                'speechmatics_status' => 422,
            ]);
        }

        if (! $region) {
            Log::warning('Speechmatics token request skipped: region is not configured.', [
                'user_id' => $userId,
            ]);

            return response()->json([
                'available' => false,
                'reason' => 'unavailable',
                'message' => SpeechmaticsUsageCap::LEARNER_UNAVAILABLE,
                'speechmatics_status' => 422,
            ]);
        }

        try {
            $response = Http::withToken($apiKey)
                ->acceptJson()
                ->timeout(12)
                ->post('https://mp.speechmatics.com/v1/api_keys?type=rt', [
                    'ttl' => $tokenTtl,
                ]);
        } catch (Throwable $error) {
            Log::warning('Speechmatics token request failed before receiving a response.', [
                'user_id' => optional(request()->user())->id,
                'key_suffix' => $keySuffix ?: null,
                'exception' => $error->getMessage(),
            ]);

            return response()->json([
                'available' => false,
                'reason' => 'unavailable',
                'message' => SpeechmaticsUsageCap::LEARNER_UNAVAILABLE,
                'speechmatics_status' => 502,
            ]);
        }

        if (! $response->successful()) {
            $payload = $response->json();
            if (! is_array($payload)) {
                $payload = [
                    'raw_body' => trim((string) $response->body()),
                ];
            }

            $status = $response->status() ?: 502;
            $upstreamMessage = trim((string) ($payload['detail'] ?? $payload['message'] ?? $payload['reason'] ?? ''));

            Log::warning('Speechmatics token request was rejected.', [
                'user_id' => optional(request()->user())->id,
                'status' => $status,
                'key_suffix' => $keySuffix ?: null,
                'upstream_message' => $upstreamMessage ?: null,
                'payload' => $payload,
            ]);

            return response()->json([
                'available' => false,
                'reason' => 'unavailable',
                'message' => SpeechmaticsUsageCap::LEARNER_UNAVAILABLE,
                'speechmatics_status' => $status,
            ]);
        }

        $usageCap->recordSuccessfulMint($userId);

        return response()->json([
            'access_token' => $response->json('key_value'),
            'expires_in' => $tokenTtl,
            'region' => $region['code'],
            'websocket_host' => $region['host'],
        ]);
    })
        ->middleware('throttle:40,1')
        ->name('memorisation.transcription-token');
});

Route::middleware(['auth', 'can:access-admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');
    Route::get('/contact-messages', [ContactMessageController::class, 'index'])->name('contact-messages.index');
    Route::patch('/contact-messages/{contactMessage}/resolve', [ContactMessageController::class, 'resolve'])->name('contact-messages.resolve');
    Route::delete('/contact-messages/{contactMessage}', [ContactMessageController::class, 'destroy'])->name('contact-messages.destroy');
    Route::get('/waiting-list', [AdminWaitingListController::class, 'index'])->name('waiting-list.index');
});

Route::get('/home', function () {
    return redirect()->route('home');
})->name('home.legacy');

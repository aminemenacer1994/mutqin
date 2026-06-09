<?php

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\MemorisationSyncController;
use Laravel\Socialite\Facades\Socialite;



// Authentication routes (from laravel/ui)
Auth::routes();

Route::get('/auth/redirect', function () {
    $provider = Socialite::driver('google');

    if (method_exists($provider, 'stateless')) {
        $provider = $provider->stateless();
    }

    return $provider->redirect();
})->name('auth.google.redirect');

Route::get('/auth/callback', function () {
    try {
        $provider = Socialite::driver('google');

        if (method_exists($provider, 'stateless')) {
            $provider = $provider->stateless();
        }

        $googleUser = $provider->user();
        
        $user = User::updateOrCreate(
            ['email' => $googleUser->email],
            [
                'name' => $googleUser->name,
                'google_id' => $googleUser->id,
                'avatar' => $googleUser->avatar,
                'password' => bcrypt(uniqid()), // ← ADD THIS LINE
                'email_verified_at' => now(),
            ]
        );
        
        Auth::login($user);
        
        return redirect()->route('memorisation');
        
    } catch (\Exception $e) {
        return redirect()->route('login')->with('error', 'Google login failed: ' . $e->getMessage());
    }
})->name('auth.google.callback');

// Logout Route
Route::post('/logout', function () {
    Auth::logout();
    request()->session()->invalidate();
    request()->session()->regenerateToken();

    return redirect()->route('home');
})->name('logout');

// Public routes
Route::get('/', function () {
    return view('home');
})->name('home');

Route::get('/onboarding', function () {
    return redirect()->route('home');
})->name('onboarding.page');

Route::get('/billing', [BillingController::class, 'index'])->name('billing.index');
Route::post('/billing/checkout', [BillingController::class, 'checkout'])->name('billing.checkout');
Route::get('/billing/success', [BillingController::class, 'success'])->name('billing.success');

Route::get('/memorisation', function () {
    return view('memorisation');
})->name('memorisation');

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
    Route::get('/dashboard', [App\Http\Controllers\HomeController::class, 'index'])->name('dashboard');
    Route::post('/billing/portal', [BillingController::class, 'portal'])->name('billing.portal');
    Route::post('/memorisation/deepgram-token', function () {
        $apiKey = config('services.deepgram.api_key');

        if (!$apiKey) {
            return response()->json([
                'message' => 'Deepgram API key is not configured.',
            ], 422);
        }

        $response = Http::withToken($apiKey, 'Token')
            ->timeout(12)
            ->post('https://api.deepgram.com/v1/auth/grant', [
                'ttl_seconds' => 120,
            ]);

        if (!$response->successful()) {
            return response()->json([
                'message' => $response->json('err_msg') ?: $response->json('message') ?: 'Deepgram token request failed.',
            ], $response->status() ?: 502);
        }

        return response()->json([
            'access_token' => $response->json('access_token'),
            'expires_in' => $response->json('expires_in'),
        ]);
    })->name('memorisation.deepgram-token');
    Route::get('/memorisation/sync-state', [MemorisationSyncController::class, 'show'])->name('memorisation.sync.show');
    Route::put('/memorisation/sync-state', [MemorisationSyncController::class, 'update'])->name('memorisation.sync.update');
});

Route::get('/home', function () {
    return redirect('/');
})->name('home.legacy');

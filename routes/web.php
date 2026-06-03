<?php

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\MemorisationSyncController;
use Laravel\Socialite\Facades\Socialite;



// Authentication routes (from laravel/ui)
Auth::routes();

Route::get('/auth/redirect', function () {
    return Socialite::driver('google')->stateless()->redirect();
})->name('auth.google.redirect');

Route::get('/auth/callback', function () {
    try {
        $googleUser = Socialite::driver('google')->stateless()->user();
        
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
});

// Logout Route
Route::post('/logout', function () {
    Auth::logout();
    return redirect('/login');
})->name('logout');

// Public routes
Route::get('/', function () {
    if (Auth::check()) {
        return redirect()->route('memorisation');
    }

    return view('onboarding');
})->name('onboarding');

Route::get('/onboarding', function () {
    if (Auth::check()) {
        return redirect()->route('memorisation');
    }

    return view('onboarding');
})->name('onboarding.page');

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

Route::post('/memorisation/recitation-check/transcribe', function (Request $request) {
    $request->validate([
        'audio' => ['required', 'file', 'max:25600'],
    ]);

    $file = $request->file('audio');
    $model = config('services.huggingface.asr_model', 'openai/whisper-large-v3');
    $token = config('services.huggingface.token');

    $contentType = $file->getMimeType() ?: 'audio/webm';
    if (in_array($contentType, ['video/webm', 'application/octet-stream'], true)) {
        $contentType = 'audio/webm';
    }

    $headers = [
        'Content-Type' => $contentType,
    ];

    if ($token) {
        $headers['Authorization'] = "Bearer {$token}";
    }

    $audioBytes = file_get_contents($file->getRealPath());
    $endpoint = "https://router.huggingface.co/hf-inference/models/{$model}";

    try {
        $response = Http::withHeaders($headers)
            ->timeout(120)
            ->withBody($audioBytes, $headers['Content-Type'])
            ->post($endpoint);
    } catch (ConnectionException $error) {
        return response()->json([
            'message' => 'Unable to reach Hugging Face from this server. Check DNS/internet access for router.huggingface.co.',
        ], 502);
    } catch (\Throwable $error) {
        return response()->json([
            'message' => 'The Hugging Face transcription request failed before a response was received.',
        ], 502);
    }

    if (!$response->successful() && str_contains($response->body(), 'HyperErrorLegacy')) {
        return response()->json([
            'message' => 'Hugging Face transcription is temporarily unavailable. Browser speech recognition fallback will be used when available.',
        ], 422);
    }

    $responseJson = null;
    try {
        $responseJson = $response->json();
    } catch (\Throwable $error) {
        $responseJson = null;
    }

    if (!$response->successful()) {
        $message = is_array($responseJson)
            ? ($responseJson['error'] ?? $responseJson['message'] ?? null)
            : null;
        $message = $message ?: trim($response->body()) ?: 'Unable to transcribe recitation with Hugging Face.';
        if (is_string($message) && (str_contains($message, 'HyperErrorLegacy') || str_contains($message, 'invalid URL, scheme is not http'))) {
            $message = 'Hugging Face transcription is temporarily unavailable. Use browser speech recognition fallback or try again later.';
        }
        if (is_string($message) && strlen($message) > 500) {
            $message = substr($message, 0, 500) . '...';
        }

        $status = $response->status();
        $clientStatus = $status >= 500 ? 422 : ($status ?: 422);

        return response()->json([
            'message' => is_array($message) ? implode(' ', $message) : $message,
        ], $clientStatus);
    }

    $text = '';
    if (is_array($responseJson)) {
        $text = $responseJson['text']
            ?? $responseJson['generated_text']
            ?? data_get($responseJson, '0.text')
            ?? data_get($responseJson, '0.generated_text')
            ?? '';
    }

    return response()->json([
        'text' => trim((string) $text),
    ]);
})->name('memorisation.recitation-check.transcribe');

// Protected routes (require authentication)
Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', [App\Http\Controllers\HomeController::class, 'index'])->name('dashboard');
    Route::get('/memorisation/sync-state', [MemorisationSyncController::class, 'show'])->name('memorisation.sync.show');
    Route::put('/memorisation/sync-state', [MemorisationSyncController::class, 'update'])->name('memorisation.sync.update');
});

Route::get('/home', [App\Http\Controllers\HomeController::class, 'index'])->name('home');

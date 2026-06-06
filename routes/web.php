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
        'target_text' => ['nullable', 'string', 'max:8000'],
    ]);

    $file = $request->file('audio');
    $targetText = trim((string) $request->input('target_text', ''));
    $promptTargetText = '';
    if ($targetText !== '') {
        $targetWords = preg_split('/\s+/u', $targetText, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $promptTargetText = implode(' ', array_slice($targetWords, 0, 180));
    }
    $groqApiKey = config('services.groq.api_key'); // Add this to config/services.php
    
    if (!$groqApiKey) {
        return response()->json([
            'message' => 'Groq API key is not configured.',
        ], 422);
    }

    try {
        $response = Http::withToken($groqApiKey)
            ->timeout(120)
            ->attach('file', file_get_contents($file->getRealPath()), $file->getClientOriginalName() ?: 'recitation-check.webm', [
                'Content-Type' => $file->getMimeType() ?: 'audio/webm',
            ])
            ->post('https://api.groq.com/openai/v1/audio/transcriptions', array_filter([
                'model' => 'whisper-large-v3-turbo',
                'response_format' => 'json',
                'language' => 'ar',
                'temperature' => '0',
                'prompt' => $promptTargetText
                    ? 'Arabic Quran recitation. Write exactly the Arabic words that are audibly recited, in order. Do not infer, complete, add, or correct missing or misread words from the reference. Ignore pauses, fillers, and noise. The reference is only for Arabic spelling of words actually heard: ' . $promptTargetText
                    : 'Arabic Quran recitation. Write exactly the Arabic words that are audibly recited, in order. Do not infer, complete, add, or correct missing or misread words.',
            ], fn ($value) => $value !== null && $value !== ''));
        
        if (!$response->successful()) {
            $error = $response->json();
            $message = $error['error']['message'] ?? 'Groq API transcription failed';
            
            return response()->json([
                'message' => $message,
            ], $response->status());
        }
        
        $data = $response->json();
        $transcript = trim($data['text'] ?? '');
        
        return response()->json(['text' => $transcript]);
        
    } catch (ConnectionException $error) {
        return response()->json([
            'message' => 'Unable to reach Groq API. Please try again.',
        ], 502);
    } catch (\Throwable $error) {
        return response()->json([
            'message' => 'Transcription failed: ' . $error->getMessage(),
        ], 500);
    }
})->name('memorisation.recitation-check.transcribe');

// Protected routes (require authentication)
Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', [App\Http\Controllers\HomeController::class, 'index'])->name('dashboard');
    Route::get('/memorisation/sync-state', [MemorisationSyncController::class, 'show'])->name('memorisation.sync.show');
    Route::put('/memorisation/sync-state', [MemorisationSyncController::class, 'update'])->name('memorisation.sync.update');
});

Route::get('/home', [App\Http\Controllers\HomeController::class, 'index'])->name('home');

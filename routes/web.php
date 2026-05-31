<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\MemorisationSyncController;

// Authentication routes (from laravel/ui)
Auth::routes();

// Public routes
Route::get('/', function () {
    return redirect()->route('memorisation');
})->name('onboarding');

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
    Route::get('/memorisation/sync-state', [MemorisationSyncController::class, 'show'])->name('memorisation.sync.show');
    Route::put('/memorisation/sync-state', [MemorisationSyncController::class, 'update'])->name('memorisation.sync.update');
});

Route::get('/home', [App\Http\Controllers\HomeController::class, 'index'])->name('home');

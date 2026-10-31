<?php

use App\Http\Controllers\ArticleController;
use App\Http\Controllers\WaitingListController;
use App\Support\MutqinDomains;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::view('/', 'home')->name('marketing.home');

Route::view('/waiting-list', 'content.waiting-list')->name('marketing.waiting-list');
Route::view('/articles', 'content.articles')->name('marketing.articles');
Route::get('/articles/{slug}', [ArticleController::class, 'show'])
    ->where('slug', '[a-z0-9\-]+')
    ->name('marketing.articles.show');
Route::post('/waiting-list', [WaitingListController::class, 'store'])
    ->middleware('throttle:5,1')
    ->name('marketing.waiting-list.store');

Route::fallback(function (Request $request) {
    $path = ltrim($request->path(), '/');
    if ($path !== '') {
        $candidate = public_path($path);
        $publicRoot = realpath(public_path()) ?: public_path();
        $resolved = realpath($candidate);
        if ($resolved !== false && str_starts_with($resolved, $publicRoot) && is_file($resolved)) {
            return response()->file($resolved);
        }
    }

    $targetPath = '/'.ltrim($request->path(), '/');
    $target = MutqinDomains::appUrl($targetPath === '//' ? '/' : $targetPath);
    $query = $request->getQueryString();

    if (is_string($query) && $query !== '') {
        $target .= '?'.$query;
    }

    return redirect()->away($target);
});

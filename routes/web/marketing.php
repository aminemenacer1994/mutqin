<?php

use App\Http\Controllers\WaitingListController;
use App\Support\MutqinDomains;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::view('/', 'home')->name('marketing.home');

Route::view('/waiting-list', 'content.waiting-list')->name('marketing.waiting-list');
Route::post('/waiting-list', [WaitingListController::class, 'store'])
    ->middleware('throttle:5,1')
    ->name('marketing.waiting-list.store');

Route::fallback(function (Request $request) {
    $path = '/'.ltrim($request->path(), '/');
    $target = MutqinDomains::appUrl($path === '//' ? '/' : $path);
    $query = $request->getQueryString();

    if (is_string($query) && $query !== '') {
        $target .= '?'.$query;
    }

    return redirect()->away($target);
});

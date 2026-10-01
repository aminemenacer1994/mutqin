<?php

use App\Http\Controllers\WaitingListController;
use App\Support\MutqinDomains;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/waiting-list', 302);

Route::view('/waiting-list', 'content.waiting-list')->name('waiting-list');
Route::post('/waiting-list', [WaitingListController::class, 'store'])
    ->middleware('throttle:5,1')
    ->name('waiting-list.store');

Route::fallback(function (Request $request) {
    $path = '/'.ltrim($request->path(), '/');
    $target = MutqinDomains::appUrl($path === '//' ? '/' : $path);
    $query = $request->getQueryString();

    if (is_string($query) && $query !== '') {
        $target .= '?'.$query;
    }

    return redirect()->away($target);
});

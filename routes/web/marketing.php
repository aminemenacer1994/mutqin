<?php

use App\Http\Controllers\HealthController;
use App\Support\MutqinDomains;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('home');
})->name('home');

Route::view('/about', 'content.about-us')->name('about');
Route::view('/about-us', 'content.about-us')->name('about-us');
Route::view('/pricing', 'content.pricing')->name('pricing');
Route::view('/privacy', 'content.privacy')->name('privacy');
Route::view('/our-mission', 'content.our-mission')->name('our-mission');
Route::view('/donate', 'content.donate')->name('donate');
Route::view('/waiting-list', 'content.waiting-list')->name('waiting-list');

Route::get('/health', HealthController::class)->name('health');

Route::get('/home', function () {
    return redirect()->route('home');
})->name('home.legacy');

Route::fallback(function (Request $request) {
    $path = '/'.ltrim($request->path(), '/');
    $target = MutqinDomains::appUrl($path === '//' ? '/' : $path);
    $query = $request->getQueryString();

    if (is_string($query) && $query !== '') {
        $target .= '?'.$query;
    }

    return redirect()->away($target);
});

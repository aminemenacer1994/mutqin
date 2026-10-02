<?php

use App\Http\Controllers\Admin\WaitingListController as AdminWaitingListController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\WaitingListController;
use App\Support\MutqinDomains;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/waiting-list', 302);

Route::view('/waiting-list', 'content.waiting-list')->name('waiting-list');
Route::post('/waiting-list', [WaitingListController::class, 'store'])
    ->middleware('throttle:5,1')
    ->name('waiting-list.store');

Route::middleware('guest')->group(function (): void {
    Route::get('login', [LoginController::class, 'showLoginForm']);
    Route::post('login', [LoginController::class, 'login']);
});

Route::post('logout', [LoginController::class, 'logout'])
    ->middleware('auth')
    ->name('logout');

Route::middleware(['auth', 'can:access-admin'])->prefix('admin')->name('marketing.admin.')->group(function (): void {
    Route::get('/waiting-list', [AdminWaitingListController::class, 'index'])->name('waiting-list.index');
    Route::get('/waiting-list/export', [AdminWaitingListController::class, 'export'])->name('waiting-list.export');
});

Route::fallback(function (Request $request) {
    $path = '/'.ltrim($request->path(), '/');
    $target = MutqinDomains::appUrl($path === '//' ? '/' : $path);
    $query = $request->getQueryString();

    if (is_string($query) && $query !== '') {
        $target .= '?'.$query;
    }

    return redirect()->away($target);
});

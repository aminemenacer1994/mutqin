<?php

use App\Support\MutqinDomains;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/waiting-list', 302);

Route::view('/waiting-list', 'content.waiting-list')->name('waiting-list');

Route::fallback(function (Request $request) {
    $path = '/'.ltrim($request->path(), '/');
    $target = MutqinDomains::appUrl($path === '//' ? '/' : $path);
    $query = $request->getQueryString();

    if (is_string($query) && $query !== '') {
        $target .= '?'.$query;
    }

    return redirect()->away($target);
});

<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\HomeController;

// Authentication routes (from laravel/ui)
Auth::routes();

// Public routes
Route::get('/', function () {
    return view('home');
})->name('home');

Route::get('/memorisation', function () {
    return view('memorisation');
})->name('memorisation');

// Protected routes (require authentication)
Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', [App\Http\Controllers\HomeController::class, 'index'])->name('dashboard');
});

Route::get('/home', [App\Http\Controllers\HomeController::class, 'index'])->name('home');

<?php

use App\Http\Controllers\ContactSubmissionController;
use App\Http\Controllers\BillingController;
use Illuminate\Support\Facades\Route;

Route::post('/stripe/webhook', [BillingController::class, 'webhook'])->name('stripe.webhook');
Route::post('/contact', [ContactSubmissionController::class, 'store'])->name('api.contact.store');

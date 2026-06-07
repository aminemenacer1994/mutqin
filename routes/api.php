<?php

use App\Http\Controllers\BillingController;
use Illuminate\Support\Facades\Route;

Route::post('/stripe/webhook', [BillingController::class, 'webhook'])->name('stripe.webhook');

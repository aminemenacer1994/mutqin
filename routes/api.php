<?php

use App\Http\Controllers\AlquranProxyController;
use Illuminate\Support\Facades\Route;

Route::prefix('alquran')->group(function () {
    Route::get('ayah/{ayah}/{edition}', [AlquranProxyController::class, 'ayahEdition']);
    Route::get('edition', [AlquranProxyController::class, 'edition']);
    Route::get('edition/language/{language}', [AlquranProxyController::class, 'editionByLanguage']);
    Route::get('surah/{surah}/editions/{editions}', [AlquranProxyController::class, 'surahEditions']);
    Route::get('surah/{surah}/{edition}', [AlquranProxyController::class, 'surahEdition']);
    Route::get('quran/{edition}', [AlquranProxyController::class, 'quranEdition']);
});

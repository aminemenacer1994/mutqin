<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('mutqin:purge-learning-history --soft-delete-assessments')
    ->daily()
    ->when(fn () => (int) config('mutqin.learning_history.assessment_soft_delete_days', 0) > 0);

// Always run temp-audio + sync scrub so temporary recordings cannot linger indefinitely.
Schedule::command('mutqin:purge-learning-history --purge-temp-audio --strip-sync-audio')
    ->hourly();

<?php

namespace App\Services\TajweedAcoustic\Providers;

use App\Services\TajweedAcoustic\Contracts\PhonemeRecognitionProvider;

final class NullPhonemeRecognitionProvider implements PhonemeRecognitionProvider
{
    public function recognize(string $audioPath, array $context = []): array
    {
        return [
            'status' => 'unavailable',
            'provider' => 'null',
            'version' => null,
            'reason' => 'phoneme_provider_disabled',
        ];
    }
}
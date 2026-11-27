<?php

namespace App\Services\TajweedAcoustic\Contracts;

/**
 * Provider-independent phoneme recognition output for rule detectors.
 */
interface PhonemeRecognitionProvider
{
    /**
     * @param  array<string, mixed>  $context
     * @return array{
     *   status: string,
     *   provider: string,
     *   version: string|null,
     *   phonemes?: list<array<string, mixed>>,
     *   reason?: string
     * }
     */
    public function recognize(string $audioPath, array $context = []): array;
}
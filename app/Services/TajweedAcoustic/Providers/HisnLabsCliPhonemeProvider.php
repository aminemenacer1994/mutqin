<?php

namespace App\Services\TajweedAcoustic\Providers;

use App\Services\TajweedAcoustic\Contracts\PhonemeRecognitionProvider;
use Illuminate\Support\Facades\Process;

/**
 * Experimental: invokes scripts/experimental/hisnlabs_phoneme_infer.py when configured.
 * Returns unassessable when the script or ONNX runtime is missing — never fabricated phonemes.
 */
final class HisnLabsCliPhonemeProvider implements PhonemeRecognitionProvider
{
    public const PROVIDER_ID = 'hisnlabs_cli';

    public function __construct(
        private readonly string $pythonBinary,
        private readonly string $scriptPath,
        private readonly int $timeoutSeconds,
    ) {}

    public function recognize(string $audioPath, array $context = []): array
    {
        if (! is_readable($audioPath)) {
            return [
                'status' => 'unavailable',
                'provider' => self::PROVIDER_ID,
                'version' => null,
                'reason' => 'audio_not_readable',
            ];
        }

        if (! is_readable($this->scriptPath)) {
            return [
                'status' => 'unavailable',
                'provider' => self::PROVIDER_ID,
                'version' => null,
                'reason' => 'inference_script_missing',
            ];
        }

        $qiraat = (string) ($context['qiraat'] ?? 'hafs');
        $text = (string) ($context['target_text'] ?? '');

        $result = Process::timeout($this->timeoutSeconds)->run([
            $this->pythonBinary,
            $this->scriptPath,
            '--audio', $audioPath,
            '--qiraat', $qiraat,
            '--text', $text,
        ]);

        if (! $result->successful()) {
            return [
                'status' => 'unavailable',
                'provider' => self::PROVIDER_ID,
                'version' => null,
                'reason' => 'cli_failed',
            ];
        }

        $decoded = json_decode(trim($result->output()), true);
        if (! is_array($decoded)) {
            return [
                'status' => 'unavailable',
                'provider' => self::PROVIDER_ID,
                'version' => null,
                'reason' => 'invalid_cli_json',
            ];
        }

        $status = (string) ($decoded['status'] ?? 'unavailable');
        if ($status !== 'ok') {
            return [
                'status' => 'unavailable',
                'provider' => self::PROVIDER_ID,
                'version' => isset($decoded['model_version']) ? (string) $decoded['model_version'] : null,
                'reason' => (string) ($decoded['reason'] ?? 'provider_unavailable'),
            ];
        }

        $phonemes = is_array($decoded['phonemes'] ?? null) ? $decoded['phonemes'] : [];

        return [
            'status' => 'ok',
            'provider' => self::PROVIDER_ID,
            'version' => isset($decoded['model_version']) ? (string) $decoded['model_version'] : null,
            'phonemes' => $phonemes,
        ];
    }
}
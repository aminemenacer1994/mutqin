<?php

namespace App\Support;

final class DemoRecitationAudio
{
    /**
     * Short silent WAV playable in browsers (16-bit mono PCM).
     */
    public static function silentWavBytes(int $durationMs = 600, int $sampleRate = 8000): string
    {
        $durationMs = max(100, min(5000, $durationMs));
        $numSamples = (int) round($sampleRate * $durationMs / 1000);
        $dataSize = $numSamples * 2;
        $header = pack(
            'a4Va4a4VvvVVvv',
            'RIFF',
            36 + $dataSize,
            'WAVE',
            'fmt ',
            16,
            1,
            1,
            $sampleRate,
            $sampleRate * 2,
            2,
            16,
        ).pack('a4V', 'data', $dataSize);

        return $header.str_repeat("\0", $dataSize);
    }

    /**
     * Minimal WebM header prefix (matches teacher dashboard message audio tests).
     */
    public static function minimalWebmBytes(int $padding = 1024): string
    {
        $prefix = hex2bin('1A45DFA39F4286810142F7810142F2810442F381084282847765626D4287810242858102');
        if (! is_string($prefix)) {
            return str_repeat("\0", max(256, $padding));
        }

        return $prefix.str_repeat("\0", max(0, $padding));
    }
}

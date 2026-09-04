<?php

namespace App\Support;

/**
 * Strip secrets, raw audio, reset tokens, and unnecessary personal/Qur'an text
 * from arrays that may be written to logs or error tracking.
 */
class SensitiveDataRedactor
{
    private const REDACTED = '[redacted]';

    /**
     * Key fragments matched case-insensitively against array keys.
     *
     * @var list<string>
     */
    private const SENSITIVE_KEY_FRAGMENTS = [
        'password',
        'passwd',
        'secret',
        'token',
        'signature',
        'api_key',
        'apikey',
        'authorization',
        'bearer',
        'cookie',
        'csrf',
        'xsrf',
        'jwt',
        'remember_token',
        'reset_token',
        'client_secret',
        'private_key',
        'audio',
        'recording',
        'microphone',
        'pcm',
        'learner_blob',
        'raw_audio',
        'audio_blob',
        'audio_data',
        'transcript',
        'transcription',
        'text_uthmani',
        'text_qpc',
        'ayah_text',
        'verse_text',
        'quran_text',
        'glyph',
        'credit_card',
        'card_number',
        'cvv',
        'ssn',
        'email',
        'phone',
    ];

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public static function redact(array $payload, int $depth = 0): array
    {
        if ($depth > 8) {
            return ['_truncated' => true];
        }

        $clean = [];

        foreach ($payload as $key => $value) {
            $name = is_string($key) ? $key : (string) $key;
            if (self::isSensitiveKey($name)) {
                $clean[$name] = self::REDACTED;

                continue;
            }

            $clean[$name] = self::redactValue($value, $depth);
        }

        return $clean;
    }

    public static function redactString(mixed $value, int $maxLength = 400): string
    {
        if (! is_scalar($value) && $value !== null) {
            return self::REDACTED;
        }

        $text = trim((string) $value);
        if ($text === '') {
            return '';
        }

        if (self::looksSecret($text) || self::looksAudio($text) || self::looksScriptureOrPii($text)) {
            return self::REDACTED;
        }

        if (strlen($text) > $maxLength) {
            return substr($text, 0, $maxLength).'…';
        }

        return $text;
    }

    public static function isSensitiveKey(string $key): bool
    {
        $normalized = strtolower($key);
        $normalized = str_replace(['-', ' '], '_', $normalized);

        foreach (self::SENSITIVE_KEY_FRAGMENTS as $fragment) {
            if ($normalized === $fragment || str_contains($normalized, $fragment)) {
                return true;
            }
        }

        return false;
    }

    private static function redactValue(mixed $value, int $depth): mixed
    {
        if (is_array($value)) {
            return self::redact($value, $depth + 1);
        }

        if (is_bool($value) || is_int($value) || is_float($value) || $value === null) {
            return $value;
        }

        if (! is_string($value)) {
            return self::REDACTED;
        }

        return self::redactString($value);
    }

    private static function looksSecret(string $value): bool
    {
        if (preg_match('#/password/reset/[A-Za-z0-9._~-]+#', $value) === 1) {
            return true;
        }

        if (preg_match('#/email/verify/\d+/[A-Za-z0-9._~-]+#', $value) === 1) {
            return true;
        }

        if (str_contains($value, 'signature=') && str_contains($value, 'expires=')) {
            return true;
        }

        if (preg_match('/^bearer\s+\S+/i', $value) === 1) {
            return true;
        }

        if (preg_match('/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/', $value) === 1) {
            return true;
        }

        if (strlen($value) > 180 && preg_match('/^[A-Za-z0-9+\/=_-]{180,}$/', $value) === 1) {
            return true;
        }

        return false;
    }

    private static function looksAudio(string $value): bool
    {
        return preg_match('/^data:audio\//i', $value) === 1
            || preg_match('/^blob:/i', $value) === 1;
    }

    /**
     * Long Arabic runs are typically Qur'an text or learner notes — never needed in error telemetry.
     */
    private static function looksScriptureOrPii(string $value): bool
    {
        return mb_strlen($value) > 40
            && preg_match_all('/[\x{0600}-\x{06FF}]/u', $value) >= 20;
    }
}

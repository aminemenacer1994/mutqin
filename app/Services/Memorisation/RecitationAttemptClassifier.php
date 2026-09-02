<?php

namespace App\Services\Memorisation;

/**
 * Server-side AI recitation attempt classification.
 *
 * Invalid audio / provider failures must never count as bad memorisation.
 * Only `valid_check` may affect accuracy, session score, recommendations,
 * memorisation progress, or spaced-retention scheduling.
 */
class RecitationAttemptClassifier
{
    public const VALID_CHECK = 'valid_check';

    public const SILENCE_NO_SPEECH = 'silence_no_speech';

    public const RECORDING_TOO_SHORT = 'recording_too_short';

    public const MICROPHONE_DENIED = 'microphone_denied';

    public const UNUSABLE_AUDIO = 'unusable_audio';

    public const EMPTY_LOW_CONFIDENCE_TRANSCRIPT = 'empty_low_confidence_transcript';

    public const PROVIDER_NETWORK_ERROR = 'provider_network_error';

    public const CANCELLED_STALE = 'cancelled_stale';

    public const MIN_RECORDING_SECONDS = RecitationScoringThresholds::MIN_RECORDING_SECONDS;

    public const MIN_USABLE_SPEECH_SECONDS = RecitationScoringThresholds::MIN_USABLE_SPEECH_SECONDS;

    public const MIN_RECOGNITION_CONFIDENCE = RecitationScoringThresholds::MIN_RECOGNITION_CONFIDENCE;

    public const RELIABLE_WORD_CONFIDENCE = RecitationScoringThresholds::UNCERTAIN_CONFIDENCE;

    /**
     * @return list<string>
     */
    public static function classes(): array
    {
        return [
            self::VALID_CHECK,
            self::SILENCE_NO_SPEECH,
            self::RECORDING_TOO_SHORT,
            self::MICROPHONE_DENIED,
            self::UNUSABLE_AUDIO,
            self::EMPTY_LOW_CONFIDENCE_TRANSCRIPT,
            self::PROVIDER_NETWORK_ERROR,
            self::CANCELLED_STALE,
        ];
    }

    public static function isValidCheck(string $class): bool
    {
        return $class === self::VALID_CHECK;
    }

    /**
     * @param  array<string, mixed>  $classification
     */
    public static function affectsScoring(array $classification): bool
    {
        return ($classification['valid_check'] ?? false) === true
            && self::isValidCheck((string) ($classification['class'] ?? ''));
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{
     *   class: string,
     *   valid_check: bool,
     *   affects_scoring: bool,
     *   reason: string|null,
     *   retryable: bool,
     *   retry_guidance: string,
     * }
     */
    public static function classifyPayload(array $payload): array
    {
        $explicit = self::explicitInvalidClass(
            $payload['attempt_class']
            ?? $payload['failure_reason']
            ?? $payload['failureReason']
            ?? null
        );
        if ($explicit !== null) {
            return self::build(
                $explicit,
                self::normaliseToken($payload['failure_reason'] ?? $payload['attempt_class'] ?? $explicit),
                $explicit !== self::MICROPHONE_DENIED && $explicit !== self::CANCELLED_STALE
            );
        }

        $durationMs = isset($payload['duration_ms']) && is_numeric($payload['duration_ms'])
            ? (int) $payload['duration_ms']
            : null;
        $durationSeconds = $durationMs !== null && $durationMs > 0
            ? $durationMs / 1000
            : (isset($payload['duration_seconds']) && is_numeric($payload['duration_seconds'])
                ? (float) $payload['duration_seconds']
                : null);

        $words = self::usableRecognitionWords(
            is_array($payload['recognition_words'] ?? null) ? $payload['recognition_words'] : []
        );
        $transcript = trim((string) ($payload['transcript'] ?? ''));

        if (
            $durationSeconds !== null
            && $durationSeconds > 0
            && $durationSeconds < self::MIN_RECORDING_SECONDS
        ) {
            return self::build(self::RECORDING_TOO_SHORT, 'short_recording', true);
        }

        $speechSeconds = self::usableSpeechSeconds($words, $payload);
        if ($speechSeconds !== null && $speechSeconds < self::MIN_USABLE_SPEECH_SECONDS) {
            return self::build(self::RECORDING_TOO_SHORT, 'short_speech', true);
        }

        if ($words === [] && $transcript === '') {
            if ($durationSeconds !== null && $durationSeconds > 0) {
                return self::build(self::SILENCE_NO_SPEECH, 'no_speech', true);
            }

            return self::build(self::EMPTY_LOW_CONFIDENCE_TRANSCRIPT, 'empty_transcript', true);
        }

        $meanConfidence = self::meanConfidence($words);
        $hasReliableWord = self::hasReliableWord($words);
        if (
            $words !== []
            && $meanConfidence !== null
            && $meanConfidence < self::MIN_RECOGNITION_CONFIDENCE
            && ! $hasReliableWord
        ) {
            return self::build(self::EMPTY_LOW_CONFIDENCE_TRANSCRIPT, 'low_confidence', true);
        }

        return self::build(self::VALID_CHECK, null, false);
    }

    public static function retryGuidance(string $class): string
    {
        return match ($class) {
            self::SILENCE_NO_SPEECH => 'We didn’t hear any recitation. Recite clearly, then try again.',
            self::RECORDING_TOO_SHORT => 'That recording was too short. Recite a little longer, then try again.',
            self::MICROPHONE_DENIED => 'Microphone access is blocked. Allow the microphone, then try again.',
            self::UNUSABLE_AUDIO => 'The audio wasn’t clear enough to assess. Recite closer to the microphone, then try again.',
            self::EMPTY_LOW_CONFIDENCE_TRANSCRIPT => 'We couldn’t understand the recitation. Recite clearly, then try again.',
            self::PROVIDER_NETWORK_ERROR => 'The recitation service didn’t respond. Your session is safe — try again.',
            self::CANCELLED_STALE => 'This check was cancelled. Start a new recording when you are ready.',
            default => '',
        };
    }

    public static function classFromToken(string $token): string
    {
        return self::explicitInvalidClass($token) ?? (
            self::normaliseToken($token) === self::VALID_CHECK
                ? self::VALID_CHECK
                : self::UNUSABLE_AUDIO
        );
    }

    public static function explicitInvalidClass(mixed $token): ?string
    {
        $value = self::normaliseToken($token);
        if ($value === '' || $value === self::VALID_CHECK) {
            return null;
        }
        if (in_array($value, self::classes(), true)) {
            return $value;
        }

        return match (true) {
            (bool) preg_match('/cancel|stale|superseded|discard/', $value) => self::CANCELLED_STALE,
            (bool) preg_match('/mic|permission|denied|notallowed/', $value) => self::MICROPHONE_DENIED,
            (bool) preg_match('/short|empty_blob|missing_blob|too.?short/', $value) => self::RECORDING_TOO_SHORT,
            (bool) preg_match('/empty|transcript|low.?confidence/', $value) => self::EMPTY_LOW_CONFIDENCE_TRANSCRIPT,
            (bool) preg_match('/no.?speech|silence/', $value) => self::SILENCE_NO_SPEECH,
            (bool) preg_match('/timeout|network|provider|speechmatics|process|usage_cap|rate_limit/', $value) => self::PROVIDER_NETWORK_ERROR,
            (bool) preg_match('/unusable|invalid_audio|invalid_mime/', $value) => self::UNUSABLE_AUDIO,
            default => null,
        };
    }

    /**
     * @return array{
     *   class: string,
     *   valid_check: bool,
     *   affects_scoring: bool,
     *   reason: string|null,
     *   retryable: bool,
     *   retry_guidance: string,
     * }
     */
    private static function build(string $class, ?string $reason, bool $retryable): array
    {
        $valid = $class === self::VALID_CHECK;

        return [
            'class' => $class,
            'valid_check' => $valid,
            'affects_scoring' => $valid,
            'reason' => $valid ? null : ($reason ?: $class),
            'retryable' => $valid ? false : $retryable,
            'retry_guidance' => self::retryGuidance($class),
        ];
    }

    /**
     * @param  list<mixed>  $recognitionWords
     * @return list<array{word: string, confidence: float, start: ?float, end: ?float}>
     */
    private static function usableRecognitionWords(array $recognitionWords): array
    {
        $out = [];
        foreach ($recognitionWords as $entry) {
            if (is_string($entry)) {
                $word = trim($entry);
                if ($word === '') {
                    continue;
                }
                $out[] = ['word' => $word, 'confidence' => 1.0, 'start' => null, 'end' => null];

                continue;
            }
            if (! is_array($entry)) {
                continue;
            }
            $word = trim((string) ($entry['word'] ?? $entry['text'] ?? ''));
            if ($word === '') {
                continue;
            }
            $confidence = is_numeric($entry['confidence'] ?? null) ? (float) $entry['confidence'] : 1.0;
            $start = is_numeric($entry['start'] ?? null) ? (float) $entry['start'] : null;
            $end = is_numeric($entry['end'] ?? null) ? (float) $entry['end'] : null;
            $out[] = [
                'word' => $word,
                'confidence' => $confidence,
                'start' => $start,
                'end' => $end,
            ];
        }

        return $out;
    }

    /**
     * @param  list<array{confidence: float}>  $words
     */
    private static function meanConfidence(array $words): ?float
    {
        if ($words === []) {
            return null;
        }
        $sum = 0.0;
        foreach ($words as $word) {
            $sum += (float) ($word['confidence'] ?? 0);
        }

        return $sum / count($words);
    }

    /**
     * @param  list<array{confidence: float}>  $words
     */
    private static function hasReliableWord(array $words): bool
    {
        foreach ($words as $word) {
            if ((float) ($word['confidence'] ?? 0) >= self::RELIABLE_WORD_CONFIDENCE) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  list<array{start: ?float, end: ?float}>  $words
     * @param  array<string, mixed>  $payload
     */
    private static function usableSpeechSeconds(array $words, array $payload): ?float
    {
        if (isset($payload['usable_speech_seconds']) && is_numeric($payload['usable_speech_seconds'])) {
            return max(0.0, (float) $payload['usable_speech_seconds']);
        }

        $starts = [];
        $ends = [];
        foreach ($words as $word) {
            if ($word['start'] !== null) {
                $starts[] = $word['start'];
            }
            if ($word['end'] !== null) {
                $ends[] = $word['end'];
            }
        }
        if ($starts === [] || $ends === []) {
            return null;
        }

        return max(0.0, max($ends) - min($starts));
    }

    private static function normaliseToken(mixed $value): string
    {
        if (! is_string($value) && ! is_numeric($value)) {
            return '';
        }

        return strtolower(trim((string) $value));
    }
}

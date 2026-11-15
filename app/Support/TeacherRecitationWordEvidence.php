<?php

namespace App\Support;

use App\Models\AiReciteAttempt;

/**
 * Teacher-facing word rows from a stored recitation alignment.
 * Timings, confidence, and error types are copied only when the checker stored them.
 */
final class TeacherRecitationWordEvidence
{
    public const LIST_LIMIT = 250;

    public const PLAYBACK_LIMIT = 800;

    /**
     * @return list<array<string, mixed>>
     */
    public static function fromAttempt(AiReciteAttempt $attempt, int $limit = self::LIST_LIMIT): array
    {
        $primary = is_array($attempt->word_statuses) ? $attempt->word_statuses : [];
        $fallback = [];
        if ($attempt->relationLoaded('assessment')) {
            $stored = data_get($attempt->assessment?->recognition_data, 'alignment.word_results');
            $fallback = is_array($stored) ? $stored : [];
        }

        $fallbackByKey = [];
        foreach ($fallback as $word) {
            if (! is_array($word)) {
                continue;
            }
            $key = self::key($word);
            if ($key !== null) {
                $fallbackByKey[$key] = $word;
            }
        }

        $source = $primary !== [] ? $primary : $fallback;
        $presented = [];
        foreach ($source as $word) {
            if (! is_array($word)) {
                continue;
            }
            $merged = $word;
            $key = self::key($word);
            if ($key !== null && isset($fallbackByKey[$key]) && self::seconds($word, 'start') === null) {
                $donor = $fallbackByKey[$key];
                foreach (['start', 'start_time', 'startTime', 'end', 'end_time', 'endTime', 'confidence', 'speechmatics_confidence', 'type'] as $field) {
                    if (! array_key_exists($field, $merged) && array_key_exists($field, $donor)) {
                        $merged[$field] = $donor[$field];
                    }
                }
            }
            $row = self::present($merged);
            if ($row === null) {
                continue;
            }
            $presented[] = $row;
            if (count($presented) >= $limit) {
                break;
            }
        }

        return $presented;
    }

    /**
     * @param  array<string, mixed>  $word
     * @return array<string, mixed>|null
     */
    public static function present(array $word): ?array
    {
        $text = trim((string) (
            $word['expected_word']
            ?? $word['displayText']
            ?? $word['text']
            ?? $word['expected']
            ?? $word['word']
            ?? ''
        ));
        $ayah = isset($word['ayah_number'])
            ? (int) $word['ayah_number']
            : (isset($word['ayah']) ? (int) $word['ayah'] : null);
        $wordIndex = isset($word['ayah_word_index'])
            ? (int) $word['ayah_word_index']
            : (isset($word['word_index']) ? (int) $word['word_index'] : null);

        if ($text === '' && ($ayah === null || $wordIndex === null)) {
            return null;
        }

        $recognised = trim((string) (
            $word['recognised_word']
            ?? $word['recognized_word']
            ?? $word['detected_token']
            ?? $word['detected']
            ?? $word['actual']
            ?? $word['recognised']
            ?? ''
        ));

        $payload = [
            'status' => (string) ($word['status'] ?? 'unknown'),
            'type' => isset($word['type']) ? (string) $word['type'] : null,
            'detected' => $recognised !== '' ? $recognised : null,
            'ayah' => $ayah,
            'word_index' => $wordIndex,
        ];

        if ($text !== '' && ! preg_match('/^word$/iu', $text)) {
            $expected = mb_substr($text, 0, 120);
            $payload['text'] = $expected;
            $payload['expected'] = $expected;
        }
        if ($recognised !== '') {
            $payload['recognised'] = mb_substr($recognised, 0, 120);
        }

        $start = self::seconds($word, 'start');
        if ($start !== null) {
            $payload['start'] = $start;
        }
        $end = self::seconds($word, 'end');
        if ($end !== null && ($start === null || $end >= $start)) {
            $payload['end'] = $end;
        }

        $confidence = self::confidence($word);
        if ($confidence !== null) {
            $payload['confidence'] = $confidence;
        }

        $errorType = trim((string) ($word['type'] ?? ''));
        if ($errorType !== '' && self::isStoredErrorType($errorType, $word)) {
            $payload['error_type'] = $errorType;
        }

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $word
     */
    private static function key(array $word): ?string
    {
        $ayah = isset($word['ayah_number'])
            ? (int) $word['ayah_number']
            : (isset($word['ayah']) ? (int) $word['ayah'] : 0);
        $index = isset($word['ayah_word_index'])
            ? (int) $word['ayah_word_index']
            : (isset($word['word_index']) ? (int) $word['word_index'] : -1);
        if ($ayah < 1 || $index < 0) {
            return null;
        }

        return $ayah.':'.$index;
    }

    /**
     * @param  array<string, mixed>  $word
     */
    private static function seconds(array $word, string $which): ?float
    {
        $keys = $which === 'end'
            ? ['end', 'end_time', 'endTime']
            : ['start', 'start_time', 'startTime'];
        foreach ($keys as $key) {
            if (! array_key_exists($key, $word) || ! is_numeric($word[$key])) {
                continue;
            }
            $value = (float) $word[$key];
            if ($value < 0 || ! is_finite($value)) {
                continue;
            }

            return $value;
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $word
     */
    private static function confidence(array $word): ?float
    {
        foreach (['confidence', 'speechmatics_confidence', 'classification_confidence'] as $key) {
            if (! array_key_exists($key, $word) || ! is_numeric($word[$key])) {
                continue;
            }
            $value = (float) $word[$key];
            if (! is_finite($value) || $value < 0) {
                continue;
            }

            return $value;
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $word
     */
    private static function isStoredErrorType(string $type, array $word): bool
    {
        if (in_array(strtoupper($type), ['MATCH', 'REALIGNMENT', 'UNASSESSED'], true)) {
            return false;
        }

        $state = RecitationAlignmentStatus::classify($word);

        return in_array($state, [
            RecitationAlignmentStatus::MISMATCH,
            RecitationAlignmentStatus::UNCERTAIN,
            RecitationAlignmentStatus::SKIPPED,
            RecitationAlignmentStatus::EXTRA,
        ], true);
    }
}

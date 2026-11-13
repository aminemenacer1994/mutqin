<?php

namespace App\Support;

/**
 * Maps a stored alignment record onto one semantic state.
 * Missing fields stay unassessed. Nothing is inferred from the ayah text.
 */
final class RecitationAlignmentStatus
{
    public const MATCHED = 'matched';

    public const MISMATCH = 'mismatch';

    public const UNCERTAIN = 'uncertain';

    public const SKIPPED = 'skipped';

    public const EXTRA = 'extra';

    public const UNASSESSED = 'unassessed';

    /**
     * @param  array<string, mixed>  $word
     */
    public static function classify(array $word): string
    {
        $status = strtolower(trim((string) ($word['status'] ?? $word['result_type'] ?? '')));
        $type = strtoupper(trim((string) ($word['type'] ?? '')));

        if ($status === '' && $type !== '') {
            $status = match ($type) {
                'DELETION' => 'omitted',
                'EXTRA', 'ADDITIONAL' => 'extra',
                'UNASSESSED' => 'unassessed',
                'DIVERGENCE' => 'wrong',
                default => '',
            };
        }

        if (in_array($status, ['extra', 'additional'], true)) {
            return self::EXTRA;
        }
        if (in_array($status, ['not_recited', 'unassessed', 'pending', 'unknown', ''], true)) {
            return self::UNASSESSED;
        }
        if (in_array($status, ['omitted', 'missing', 'skipped', 'deletion', 'black'], true)) {
            return self::SKIPPED;
        }
        if (in_array($status, ['wrong', 'incorrect', 'substitution', 'unmatched', 'red', 'out_of_order'], true)) {
            return self::MISMATCH;
        }
        if (in_array($status, ['close_match', 'minor_mistake', 'partial', 'uncertain', 'low_confidence', 'amber'], true)) {
            return self::UNCERTAIN;
        }
        if (in_array($status, ['correct', 'match', 'ok', 'matched', 'green'], true)) {
            $confidence = self::confidence($word);
            if ($confidence !== null && $confidence > 0 && $confidence < 0.55) {
                return self::UNCERTAIN;
            }

            return self::MATCHED;
        }

        return self::UNASSESSED;
    }

    public static function isHeard(string $state): bool
    {
        return in_array($state, [self::MATCHED, self::MISMATCH, self::UNCERTAIN], true);
    }

    public static function isFlagged(string $state): bool
    {
        return in_array($state, [self::MISMATCH, self::UNCERTAIN, self::SKIPPED], true);
    }

    /**
     * @param  list<mixed>  $words
     */
    public static function flaggedCount(array $words): int
    {
        $count = 0;
        foreach ($words as $word) {
            if (! is_array($word)) {
                continue;
            }
            if (self::isFlagged(self::classify($word))) {
                $count++;
            }
        }

        return $count;
    }

    /**
     * Count semantic alignment states for compact feedback summaries.
     * Evaluated excludes extras and unassessed words.
     *
     * @param  list<mixed>  $words
     * @return array{
     *     matched: int,
     *     uncertain: int,
     *     mismatch: int,
     *     skipped: int,
     *     extra: int,
     *     unassessed: int,
     *     evaluated: int,
     *     attention: int
     * }|null
     */
    public static function countStatuses(array $words): ?array
    {
        if ($words === []) {
            return null;
        }

        $counts = [
            self::MATCHED => 0,
            self::UNCERTAIN => 0,
            self::MISMATCH => 0,
            self::SKIPPED => 0,
            self::EXTRA => 0,
            self::UNASSESSED => 0,
        ];

        foreach ($words as $word) {
            if (! is_array($word)) {
                continue;
            }
            $state = self::classify($word);
            if (! array_key_exists($state, $counts)) {
                continue;
            }
            $counts[$state]++;
        }

        $evaluated = $counts[self::MATCHED]
            + $counts[self::UNCERTAIN]
            + $counts[self::MISMATCH]
            + $counts[self::SKIPPED];

        return [
            'matched' => $counts[self::MATCHED],
            'uncertain' => $counts[self::UNCERTAIN],
            'mismatch' => $counts[self::MISMATCH],
            'skipped' => $counts[self::SKIPPED],
            'extra' => $counts[self::EXTRA],
            'unassessed' => $counts[self::UNASSESSED],
            'evaluated' => $evaluated,
            // Align with flaggedCount(): extras are insertions, not reference words to review.
            'attention' => $counts[self::UNCERTAIN]
                + $counts[self::MISMATCH]
                + $counts[self::SKIPPED],
        ];
    }

    /**
     * @param  array<string, mixed>  $word
     */
    public static function confidence(array $word): ?float
    {
        $raw = $word['classification_confidence'] ?? $word['confidence'] ?? null;
        if (! is_numeric($raw)) {
            return null;
        }
        $value = (float) $raw;
        if ($value <= 0 || $value > 1) {
            return null;
        }

        return $value;
    }

    /**
     * @param  array<string, mixed>  $word
     */
    public static function expectedText(array $word): string
    {
        foreach (['expected_word', 'text', 'target_word', 'displayText', 'word'] as $key) {
            $text = trim((string) ($word[$key] ?? ''));
            if ($text !== '') {
                return $text;
            }
        }

        return '';
    }

    /**
     * @param  array<string, mixed>  $word
     */
    public static function detectedText(array $word): string
    {
        foreach (['recognised_word', 'recognized_word', 'detected_token', 'actual', 'display_word', 'raw_word'] as $key) {
            $text = trim((string) ($word[$key] ?? ''));
            if ($text !== '') {
                return $text;
            }
        }

        return '';
    }

    /**
     * @param  array<string, mixed>  $word
     */
    public static function expectedIndex(array $word): ?int
    {
        foreach (['ayah_word_index', 'ayahWordIndex', 'word_index', 'wordIndex', 'expected_index', 'target_index'] as $key) {
            if (! array_key_exists($key, $word) || $word[$key] === null || $word[$key] === '') {
                continue;
            }
            if (! is_numeric($word[$key])) {
                continue;
            }
            $index = (int) $word[$key];
            if ($index >= 0 && $index <= 80) {
                return $index;
            }
        }

        return null;
    }
}

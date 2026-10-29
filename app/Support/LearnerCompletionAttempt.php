<?php

namespace App\Support;

use App\Models\AiReciteAttempt;
use App\Services\Learning\AiReciteAttemptAudioService;

/**
 * Normalises learner-facing recitation attempt data for completed-task result cards.
 *
 * @phpstan-type LearnerMistake array{
 *     ayah: int,
 *     wordIndex?: int,
 *     type: 'missed'|'wrong'|'tajweed',
 *     expected?: string,
 *     heard?: string,
 *     rule?: string,
 *     startMs?: int,
 *     endMs?: int,
 *     referenceUrl?: string|null
 * }
 */
final class LearnerCompletionAttempt
{
    private const DEFAULT_REFERENCE_RECITER = 'ar.alafasy';

    /**
     * @return array{
     *     mistakes: list<LearnerMistake>,
     *     recording_url: string|null,
     *     recording_available: bool,
     *     data_gaps: list<string>
     * }|null
     */
    public static function present(?AiReciteAttempt $attempt, AiReciteAttemptAudioService $audio): ?array
    {
        if ($attempt === null) {
            return null;
        }

        $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
        $surah = (int) ($range['surah'] ?? $range['surah_number'] ?? 0);

        $mistakes = self::mistakesFromWordStatuses($attempt, $surah);
        $audioPayload = $audio->payload($attempt);
        $recordingUrl = ($audioPayload['available'] ?? false)
            ? ($audioPayload['url'] ?? null)
            : null;

        $gaps = [];
        if ($recordingUrl === null || $recordingUrl === '') {
            $gaps[] = 'recording_url';
        }

        $missingReferenceAyahs = [];
        foreach ($mistakes as $index => $mistake) {
            if (($mistake['reference_url'] ?? null) === null) {
                $missingReferenceAyahs[$mistake['ayah']] = true;
            }
            if (! isset($mistake['start_ms'], $mistake['end_ms'])) {
                $gaps[] = 'mistake_segment_ms:'.$index;
            }
        }
        foreach (array_keys($missingReferenceAyahs) as $ayah) {
            $gaps[] = 'reference_url:ayah_'.$ayah;
        }

        return [
            'mistakes' => $mistakes,
            'recording_url' => $recordingUrl,
            'recording_available' => $recordingUrl !== null && $recordingUrl !== '',
            'data_gaps' => array_values(array_unique($gaps)),
        ];
    }

    /**
     * @return list<LearnerMistake>
     */
    private static function mistakesFromWordStatuses(AiReciteAttempt $attempt, int $surah): array
    {
        $words = is_array($attempt->word_statuses) ? $attempt->word_statuses : [];
        $referenceByAyah = [];
        $mistakes = [];

        foreach ($words as $word) {
            if (! is_array($word)) {
                continue;
            }

            $type = self::mapMistakeType($word);
            if ($type === null) {
                continue;
            }

            $ayah = isset($word['ayah_number'])
                ? (int) $word['ayah_number']
                : (isset($word['ayah']) ? (int) $word['ayah'] : 0);
            if ($ayah < 1) {
                continue;
            }

            $wordIndex = isset($word['ayah_word_index'])
                ? (int) $word['ayah_word_index']
                : (isset($word['word_index']) ? (int) $word['word_index'] : null);

            $expected = self::expectedWord($word);
            $heard = self::heardWord($word);
            $rule = self::tajweedRule($word);

            if (! isset($referenceByAyah[$ayah])) {
                $referenceByAyah[$ayah] = self::referenceUrlForAyah($surah, $ayah);
            }

            $startMs = self::nullableInt($word['start_ms'] ?? $word['startMs'] ?? null);
            $endMs = self::nullableInt($word['end_ms'] ?? $word['endMs'] ?? null);

            $payload = [
                'ayah' => $ayah,
                'type' => $type,
                'reference_url' => $referenceByAyah[$ayah],
            ];

            if ($wordIndex !== null) {
                $payload['word_index'] = $wordIndex;
            }
            if ($expected !== null) {
                $payload['expected'] = $expected;
            }
            if ($heard !== null) {
                $payload['heard'] = $heard;
            }
            if ($rule !== null) {
                $payload['rule'] = $rule;
            }
            if ($startMs !== null) {
                $payload['start_ms'] = $startMs;
            }
            if ($endMs !== null) {
                $payload['end_ms'] = $endMs;
            }

            $mistakes[] = $payload;
        }

        usort($mistakes, static function (array $a, array $b): int {
            if ($a['ayah'] !== $b['ayah']) {
                return $a['ayah'] <=> $b['ayah'];
            }

            return ($a['word_index'] ?? -1) <=> ($b['word_index'] ?? -1);
        });

        return $mistakes;
    }

    /**
     * @param  array<string, mixed>  $word
     */
    private static function mapMistakeType(array $word): ?string
    {
        $type = strtolower(trim((string) ($word['type'] ?? '')));
        if ($type === 'tajweed') {
            return 'tajweed';
        }

        $status = strtolower(trim((string) ($word['status'] ?? '')));
        if ($status === 'tajweed') {
            return 'tajweed';
        }
        if (in_array($status, ['skipped', 'pending', 'missing', 'omitted'], true)) {
            return 'missed';
        }
        if (in_array($status, ['incorrect', 'partial', 'wrong'], true)) {
            return 'wrong';
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $word
     */
    private static function expectedWord(array $word): ?string
    {
        foreach (['expected_word', 'displayText', 'text', 'expected', 'word'] as $key) {
            $value = trim((string) ($word[$key] ?? ''));
            if ($value !== '' && ! preg_match('/^word$/iu', $value)) {
                return mb_substr($value, 0, 120);
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $word
     */
    private static function heardWord(array $word): ?string
    {
        foreach ([
            'recognised_word',
            'recognized_word',
            'detected_token',
            'detected',
            'actual',
            'heard',
        ] as $key) {
            $value = trim((string) ($word[$key] ?? ''));
            if ($value !== '') {
                return mb_substr($value, 0, 120);
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $word
     */
    private static function tajweedRule(array $word): ?string
    {
        foreach (['tajweed_rule', 'rule', 'tajweedRule', 'rule_name'] as $key) {
            $value = trim((string) ($word[$key] ?? ''));
            if ($value !== '') {
                return mb_substr($value, 0, 160);
            }
        }

        return null;
    }

    private static function referenceUrlForAyah(int $surah, int $ayah): ?string
    {
        if ($surah < 1) {
            return null;
        }

        $global = QuranMetadata::globalAyahNumber($surah, $ayah);
        if ($global === null) {
            return null;
        }

        return '/audio/ayah/'.self::DEFAULT_REFERENCE_RECITER.'/'.$global.'.mp3';
    }

    private static function nullableInt(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        $n = (int) $value;

        return $n >= 0 ? $n : null;
    }
}

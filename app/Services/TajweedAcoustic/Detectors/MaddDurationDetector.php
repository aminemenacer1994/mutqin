<?php

namespace App\Services\TajweedAcoustic\Detectors;

/**
 * Priority 1: madd hold duration from client practice segments + word timings.
 * Does not claim phoneme-level verification.
 */
final class MaddDurationDetector
{
    public const DETECTOR_ID = 'madd_duration_v1';

    /**
     * @param  array<string, mixed>|null  $recognitionData
     * @return list<array<string, mixed>>
     */
    public function detect(?array $recognitionData, int $surah, int $startAyah, int $endAyah): array
    {
        $data = is_array($recognitionData) ? $recognitionData : [];
        $practice = is_array($data['tajweed_practice_check'] ?? null)
            ? $data['tajweed_practice_check']
            : [];
        if (empty($practice['assessed'])) {
            return [];
        }

        $segments = is_array($practice['segments'] ?? null) ? $practice['segments'] : [];
        $wordResults = is_array($data['alignment']['word_results'] ?? null)
            ? $data['alignment']['word_results']
            : [];

        $findings = [];
        foreach ($segments as $segment) {
            if (! is_array($segment)) {
                continue;
            }
            if ((string) ($segment['ruleKey'] ?? '') !== 'madd') {
                continue;
            }
            $hold = (string) ($segment['hold'] ?? '');
            if (! in_array($hold, ['short', 'long', 'uneven'], true)) {
                continue;
            }
            $outcome = (string) ($segment['outcome'] ?? '');
            if (! in_array($outcome, ['practice', 'review'], true)) {
                continue;
            }

            $verseKey = (string) ($segment['verseKey'] ?? '');
            [$segSurah, $segAyah] = $this->parseVerseKey($verseKey, $surah);
            if ($segSurah !== $surah || $segAyah < $startAyah || $segAyah > $endAyah) {
                continue;
            }

            $wordIndex = isset($segment['wordIndex']) ? (int) $segment['wordIndex'] : null;
            $timing = $this->timingForWord($wordResults, $segAyah, $wordIndex);

            $findings[] = [
                'detector' => self::DETECTOR_ID,
                'category' => 'tajweed',
                'rule' => 'madd',
                'surah' => $surah,
                'ayah' => $segAyah,
                'word_index' => $wordIndex,
                'letter_index' => null,
                'expected' => 'canonical_madd_duration',
                'observed' => $hold,
                'mistake_kind' => $hold === 'short' ? 'madd_too_short' : ($hold === 'long' ? 'madd_too_long' : 'madd_uneven'),
                'start_sec' => $timing['start'],
                'end_sec' => $timing['end'],
                'confidence' => $timing['start'] !== null ? 0.55 : 0.35,
                'evidence' => [
                    'source' => 'tajweed_practice_check_timing',
                    'word' => (string) ($segment['word'] ?? ''),
                    'phoneme_verified' => false,
                ],
                'uncertainty' => 'timing_only_not_phoneme_verified',
                'corrective_hint' => $hold === 'short'
                    ? 'Lengthen the madd to the expected count for this segment.'
                    : 'Match the taught madd length; avoid rushing or over-holding.',
            ];
        }

        return array_slice($findings, 0, 40);
    }

    /**
     * @param  list<array<string, mixed>>  $wordResults
     * @return array{start: float|null, end: float|null}
     */
    private function timingForWord(array $wordResults, int $ayah, ?int $wordIndex): array
    {
        if ($wordIndex === null) {
            return ['start' => null, 'end' => null];
        }
        foreach ($wordResults as $word) {
            if (! is_array($word)) {
                continue;
            }
            $a = (int) ($word['ayah'] ?? $word['ayah_number'] ?? 0);
            $wi = (int) ($word['word_index'] ?? $word['wordIndex'] ?? -1);
            if ($a === $ayah && $wi === $wordIndex) {
                return [
                    'start' => $this->floatOrNull($word['start'] ?? $word['start_time'] ?? null),
                    'end' => $this->floatOrNull($word['end'] ?? $word['end_time'] ?? null),
                ];
            }
        }

        return ['start' => null, 'end' => null];
    }

  /**
     * @return array{0: int, 1: int}
     */
    private function parseVerseKey(string $verseKey, int $fallbackSurah): array
    {
        if (preg_match('/^(\d{1,3}):(\d{1,3})$/', $verseKey, $m)) {
            return [(int) $m[1], (int) $m[2]];
        }

        return [$fallbackSurah, 0];
    }

    private function floatOrNull(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }
        $n = (float) $value;

        return is_finite($n) ? $n : null;
    }
}
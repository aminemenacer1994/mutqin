<?php

namespace App\Services\TajweedAcoustic\Detectors;

/**
 * Priority 1: consonant/vowel substitution when a phoneme provider returns aligned symbols.
 */
final class BasicPhonemeSubstitutionDetector
{
    public const DETECTOR_ID = 'phoneme_substitution_v1';

    /**
     * @param  array<string, mixed>  $providerResult
     * @return list<array<string, mixed>>
     */
    public function detect(array $providerResult, int $surah, int $startAyah, int $endAyah): array
    {
        if (($providerResult['status'] ?? '') !== 'ok') {
            return [];
        }

        $phonemes = is_array($providerResult['phonemes'] ?? null) ? $providerResult['phonemes'] : [];
        $findings = [];
        foreach ($phonemes as $entry) {
            if (! is_array($entry)) {
                continue;
            }
            $type = (string) ($entry['type'] ?? '');
            if (! in_array($type, ['substitution', 'deletion', 'insertion'], true)) {
                continue;
            }
            $ayah = (int) ($entry['ayah'] ?? 0);
            if ($ayah < $startAyah || $ayah > $endAyah) {
                continue;
            }
            $confidence = isset($entry['confidence']) ? (float) $entry['confidence'] : 0.0;
            if ($confidence > 0 && $confidence < 0.45) {
                continue;
            }

            $findings[] = [
                'detector' => self::DETECTOR_ID,
                'category' => 'pronunciation',
                'rule' => null,
                'surah' => $surah,
                'ayah' => $ayah,
                'word_index' => isset($entry['word_index']) ? (int) $entry['word_index'] : null,
                'letter_index' => isset($entry['phoneme_index']) ? (int) $entry['phoneme_index'] : null,
                'expected' => (string) ($entry['expected'] ?? ''),
                'observed' => (string) ($entry['observed'] ?? ''),
                'mistake_kind' => 'phoneme_'.$type,
                'start_sec' => isset($entry['start']) ? (float) $entry['start'] : null,
                'end_sec' => isset($entry['end']) ? (float) $entry['end'] : null,
                'confidence' => max(0.0, min(1.0, $confidence)),
                'evidence' => [
                    'source' => 'phoneme_provider',
                    'provider' => (string) ($providerResult['provider'] ?? ''),
                    'phoneme_verified' => true,
                ],
                'uncertainty' => $confidence < 0.65 ? 'low_confidence_phoneme' : null,
                'corrective_hint' => (string) ($entry['hint'] ?? 'Review the sound of this letter with your teacher.'),
            ];
        }

        return array_slice($findings, 0, 60);
    }
}
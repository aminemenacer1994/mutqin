<?php

namespace App\Services\Memorisation;

class WeaknessAnalysisService
{
    /**
     * @param  list<array<string,mixed>>  $wordResults
     * @param  list<array<string,mixed>>  $extraWords
     * @param  array{green?:int,amber?:int,red?:int,black?:int,grey?:int,uncertain?:int}  $colorCounts
     * @return array<string,mixed>
     */
    public function analyse(array $wordResults, array $extraWords = [], array $colorCounts = [], int $accuracy = 0): array
    {
        $weakWords = [];
        $byAyah = [];
        $errorTypes = [
            'minor_mistake' => 0,
            'wrong' => 0,
            'missing' => 0,
            'extra' => count($extraWords),
            'uncertain' => 0,
        ];

        foreach ($wordResults as $word) {
            $status = (string) ($word['status'] ?? '');
            $ayah = (int) ($word['ayah_number'] ?? 0);
            if (! isset($byAyah[$ayah])) {
                $byAyah[$ayah] = [
                    'ayah_number' => $ayah,
                    'total' => 0,
                    'correct' => 0,
                    'minor_mistake' => 0,
                    'wrong' => 0,
                    'missing' => 0,
                    'extra' => 0,
                    'uncertain' => 0,
                    'score' => 0,
                ];
            }
            $byAyah[$ayah]['total']++;
            if (isset($byAyah[$ayah][$status])) {
                $byAyah[$ayah][$status]++;
            }

            if (in_array($status, ['minor_mistake', 'wrong', 'missing', 'uncertain'], true)) {
                if (isset($errorTypes[$status])) {
                    $errorTypes[$status]++;
                }
                $weight = match ($status) {
                    'wrong', 'missing' => 2,
                    'minor_mistake' => 1,
                    default => 0,
                };
                $byAyah[$ayah]['score'] += $weight;

                if ($weight > 0 || $status === 'uncertain') {
                    $weakWords[] = [
                        'surahId' => $this->surahFromKey((string) ($word['ayah_key'] ?? '')),
                        'ayahNumber' => $ayah,
                        'wordIndex' => (int) ($word['ayah_word_index'] ?? $word['target_index'] ?? 0),
                        'text' => (string) ($word['text'] ?? $word['target_word'] ?? ''),
                        'status' => $status,
                        'severity' => match ($status) {
                            'wrong' => 'red',
                            'missing' => 'black',
                            'minor_mistake' => 'amber',
                            default => 'gray',
                        },
                        'reason' => $status,
                        'verseKey' => (string) ($word['ayah_key'] ?? ''),
                        'confidence' => (float) ($word['confidence'] ?? 0),
                    ];
                }
            }
        }

        $ayahResults = [];
        $weakAyahs = [];
        foreach ($byAyah as $ayahNumber => $stats) {
            if ($ayahNumber <= 0) {
                continue;
            }
            $total = max(1, (int) $stats['total']);
            $correctWeight = (int) $stats['correct'] + (0.65 * (int) $stats['minor_mistake']);
            $ayahAccuracy = (int) round(($correctWeight / $total) * 100);
            $priority = $this->ayahPriority($ayahAccuracy, (int) $stats['score'], $total);
            $ayahResults[] = [
                'ayah_number' => (int) $ayahNumber,
                'accuracy' => $ayahAccuracy,
                'correct' => (int) $stats['correct'],
                'minor_mistake' => (int) $stats['minor_mistake'],
                'wrong' => (int) $stats['wrong'],
                'missing' => (int) $stats['missing'],
                'extra' => (int) $stats['extra'],
                'uncertain' => (int) $stats['uncertain'],
                'confidence' => $ayahAccuracy >= 80 ? 0.85 : ($ayahAccuracy >= 55 ? 0.7 : 0.55),
                'priority' => $priority,
                'label' => match ($priority) {
                    'priority' => 'Priority practice',
                    'attention' => 'Needs attention',
                    default => 'Strong',
                },
            ];
            if ($priority !== 'strong') {
                $weakAyahs[] = (int) $ayahNumber;
            }
        }

        usort($ayahResults, fn ($a, $b) => $a['ayah_number'] <=> $b['ayah_number']);
        sort($weakAyahs);

        $weakPhrases = $this->buildWeakPhrases($wordResults);
        $clusters = $this->detectClusters($weakWords);
        $pattern = $this->errorPattern($weakAyahs, $weakWords, $clusters);

        $strongAyahs = array_values(array_map(
            fn ($a) => $a['ayah_number'],
            array_filter($ayahResults, fn ($a) => $a['priority'] === 'strong')
        ));

        return [
            'weak_ayahs' => $weakAyahs,
            'strong_ayahs' => $strongAyahs,
            'weak_words' => array_slice($weakWords, 0, 40),
            'weak_phrases' => $weakPhrases,
            'ayah_results' => $ayahResults,
            'error_types' => $errorTypes,
            'error_clusters' => $clusters,
            'error_pattern' => $pattern,
            'color_counts' => $colorCounts,
            'overall_accuracy' => $accuracy,
            'priority' => $accuracy < 55 ? 'high' : ($accuracy < 80 ? 'medium' : 'low'),
            'confidence' => $accuracy >= 70 ? 0.8 : 0.65,
        ];
    }

    private function ayahPriority(int $accuracy, int $score, int $total): string
    {
        if ($accuracy < 55 || ($total >= 4 && $score / max(1, $total) >= 0.55)) {
            return 'priority';
        }
        if ($accuracy < 80 || $score >= 2) {
            return 'attention';
        }

        return 'strong';
    }

    /**
     * @param  list<array<string,mixed>>  $wordResults
     * @return list<array<string,mixed>>
     */
    private function buildWeakPhrases(array $wordResults): array
    {
        $phrases = [];
        $buffer = [];
        $currentAyah = null;

        $flush = function () use (&$buffer, &$phrases, &$currentAyah) {
            if (count($buffer) >= 2) {
                $phrases[] = [
                    'ayah_number' => $currentAyah,
                    'text' => implode(' ', array_map(fn ($w) => (string) ($w['text'] ?? ''), $buffer)),
                    'word_indexes' => array_map(fn ($w) => (int) ($w['ayah_word_index'] ?? 0), $buffer),
                    'mistake_count' => count($buffer),
                ];
            }
            $buffer = [];
        };

        foreach ($wordResults as $word) {
            $ayah = (int) ($word['ayah_number'] ?? 0);
            $status = (string) ($word['status'] ?? '');
            $isWeak = in_array($status, ['wrong', 'missing', 'minor_mistake'], true);
            if ($currentAyah !== null && $ayah !== $currentAyah) {
                $flush();
                $currentAyah = $ayah;
            }
            if ($currentAyah === null) {
                $currentAyah = $ayah;
            }
            if ($isWeak) {
                $buffer[] = $word;
            } else {
                $flush();
            }
        }
        $flush();

        return array_slice($phrases, 0, 12);
    }

    /**
     * @param  list<array<string,mixed>>  $weakWords
     * @return list<array<string,mixed>>
     */
    private function detectClusters(array $weakWords): array
    {
        $byAyah = [];
        foreach ($weakWords as $word) {
            $ayah = (int) ($word['ayahNumber'] ?? 0);
            if ($ayah <= 0) {
                continue;
            }
            $byAyah[$ayah][] = $word;
        }
        $clusters = [];
        foreach ($byAyah as $ayah => $words) {
            if (count($words) >= 2) {
                $clusters[] = [
                    'ayah_number' => $ayah,
                    'size' => count($words),
                    'words' => array_map(fn ($w) => (string) ($w['text'] ?? ''), $words),
                    'type' => count($words) >= 4 ? 'dense' : 'local',
                ];
            }
        }

        return $clusters;
    }

    /**
     * @param  list<int>  $weakAyahs
     * @param  list<array<string,mixed>>  $weakWords
     * @param  list<array<string,mixed>>  $clusters
     */
    private function errorPattern(array $weakAyahs, array $weakWords, array $clusters): string
    {
        if ($weakWords === []) {
            return 'strong';
        }
        if (count($clusters) === 1 && count($weakAyahs) <= 1) {
            return 'concentrated';
        }
        if (count($weakAyahs) >= 3 && count($clusters) >= 2) {
            return 'scattered';
        }
        if (count($weakWords) <= 4) {
            return 'word_focus';
        }

        return 'mixed';
    }

    private function surahFromKey(string $key): ?int
    {
        if (! str_contains($key, ':')) {
            return null;
        }
        $part = (int) explode(':', $key, 2)[0];

        return $part > 0 ? $part : null;
    }
}

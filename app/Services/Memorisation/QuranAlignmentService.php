<?php

namespace App\Services\Memorisation;

/**
 * Quran-aware word alignment. Expected ayah text is the source of truth;
 * recognition words are a noisy input only.
 */
class QuranAlignmentService
{
    /**
     * @param  array<int, array{ayah_number?:int,ayahNumber?:int,text?:string,words?:array<int,string>}>  $ayahs
     * @param  array<int, array{word?:string,text?:string,confidence?:float|int}|string>  $recognitionWords
     * @return array{
     *   word_results: list<array<string,mixed>>,
     *   extra_words: list<array<string,mixed>>,
     *   transcript: string,
     *   accuracy: int,
     *   confidence: float,
     *   color_counts: array{green:int,amber:int,red:int,black:int,grey:int,uncertain:int}
     * }
     */
    public function align(array $ayahs, array $recognitionWords, string $targetText = ''): array
    {
        $units = $this->buildTargetUnits($ayahs, $targetText);
        $heard = $this->normaliseHeardWords($recognitionWords);
        $targetWords = array_map(fn ($u) => $u['word'], $units);
        $displayWords = array_map(fn ($u) => $u['display'], $units);
        $heardWords = array_map(fn ($w) => $w['word'], $heard);

        $targetCount = count($targetWords);
        $heardCount = count($heardWords);

        $matrix = [];
        for ($t = 0; $t <= $targetCount; $t++) {
            for ($h = 0; $h <= $heardCount; $h++) {
                $matrix[$t][$h] = ['cost' => INF, 'prev' => null, 'op' => 'start', 'similarity' => 0.0];
            }
        }
        $matrix[0][0] = ['cost' => 0.0, 'prev' => null, 'op' => 'start', 'similarity' => 0.0];

        for ($t = 1; $t <= $targetCount; $t++) {
            $matrix[$t][0] = [
                'cost' => $matrix[$t - 1][0]['cost'] + 1.0,
                'prev' => [$t - 1, 0],
                'op' => 'omission',
                'similarity' => 0.0,
            ];
        }
        for ($h = 1; $h <= $heardCount; $h++) {
            $matrix[0][$h] = [
                'cost' => $matrix[0][$h - 1]['cost'] + $this->extraCost($heard, $h - 1),
                'prev' => [0, $h - 1],
                'op' => 'extra',
                'similarity' => 0.0,
            ];
        }

        for ($t = 1; $t <= $targetCount; $t++) {
            for ($h = 1; $h <= $heardCount; $h++) {
                $similarity = $this->similarity($targetWords[$t - 1], $heardWords[$h - 1]);
                $confidence = max(0.35, min(1.0, (float) ($heard[$h - 1]['confidence'] ?? 1)));
                $matchCost = $this->matchCost($targetWords[$t - 1], $heardWords[$h - 1], $similarity, $confidence);

                $candidates = [
                    [
                        'cost' => $matrix[$t - 1][$h - 1]['cost'] + $matchCost,
                        'prev' => [$t - 1, $h - 1],
                        'op' => 'match',
                        'similarity' => $similarity,
                    ],
                    [
                        'cost' => $matrix[$t - 1][$h]['cost'] + 1.02,
                        'prev' => [$t - 1, $h],
                        'op' => 'omission',
                        'similarity' => 0.0,
                    ],
                    [
                        'cost' => $matrix[$t][$h - 1]['cost'] + $this->extraCost($heard, $h - 1),
                        'prev' => [$t, $h - 1],
                        'op' => 'extra',
                        'similarity' => 0.0,
                    ],
                ];
                usort($candidates, function ($a, $b) {
                    if ($a['cost'] === $b['cost']) {
                        return $this->opTie($a['op']) <=> $this->opTie($b['op']);
                    }

                    return $a['cost'] <=> $b['cost'];
                });
                $matrix[$t][$h] = $candidates[0];
            }
        }

        $statuses = [];
        foreach ($units as $index => $unit) {
            $statuses[$index] = [
                'text' => $displayWords[$index],
                'target_word' => $targetWords[$index],
                'status' => 'missing',
                'note' => 'Word was not recited.',
                'actual' => '',
                'confidence' => 0.0,
                'similarity' => 0.0,
                'target_index' => $index,
                'ayah_number' => $unit['ayah_number'],
                'ayah_key' => $unit['ayah_key'],
                'ayah_word_index' => $unit['ayah_word_index'],
                'visual_status' => 'black',
            ];
        }

        $extraWords = [];
        $t = $targetCount;
        $h = $heardCount;
        while ($t > 0 || $h > 0) {
            $cell = $matrix[$t][$h] ?? null;
            if (! $cell || $cell['prev'] === null && $t === 0 && $h === 0) {
                break;
            }
            if (($cell['op'] ?? '') === 'match') {
                $statuses[$t - 1] = $this->classifyMatch(
                    $displayWords[$t - 1],
                    $targetWords[$t - 1],
                    $heard[$h - 1],
                    (float) $cell['similarity'],
                    $t - 1,
                    $units[$t - 1]
                );
                [$t, $h] = $cell['prev'];
            } elseif (($cell['op'] ?? '') === 'extra') {
                $repeated = $h > 1
                    && (($heard[$h - 1]['word'] ?? null) === ($heard[$h - 2]['word'] ?? null));
                $extraWords[] = [
                    'word' => $heard[$h - 1]['word'] ?? '',
                    'confidence' => (float) ($heard[$h - 1]['confidence'] ?? 1),
                    'status' => 'extra',
                    'type' => $repeated ? 'repetition' : 'extra',
                    'visual_status' => 'grey',
                ];
                [$t, $h] = $cell['prev'];
            } elseif (($cell['op'] ?? '') === 'omission') {
                [$t, $h] = $cell['prev'];
            } else {
                break;
            }
        }
        $extraWords = array_reverse($extraWords);

        $accuracy = $this->scoreAccuracy($statuses, $extraWords);
        $confidence = $this->evaluationConfidence($statuses, $heard);
        $colorCounts = $this->colorCounts($statuses, $extraWords);

        return [
            'word_results' => array_values($statuses),
            'extra_words' => $extraWords,
            'transcript' => implode(' ', $heardWords),
            'accuracy' => $accuracy,
            'confidence' => $confidence,
            'color_counts' => $colorCounts,
        ];
    }

    public function normalizeArabic(string $text): string
    {
        $value = preg_replace('/[\x{0610}-\x{061A}\x{064B}-\x{065F}\x{0670}\x{06D6}-\x{06ED}]/u', '', $text) ?? $text;
        $value = str_replace("\u{0640}", '', $value);
        $value = preg_replace('/[إأآٱ]/u', 'ا', $value) ?? $value;
        $value = str_replace(['ؤ', 'ئ', 'ى', 'ة'], ['و', 'ي', 'ي', 'ه'], $value);
        $value = preg_replace('/[^\x{0621}-\x{064A}\s]/u', ' ', $value) ?? $value;
        $value = preg_replace('/\s+/u', ' ', $value) ?? $value;

        return trim($value);
    }

    /**
     * Map internal status to API status vocabulary.
     */
    public function toApiStatus(string $status): string
    {
        return match ($status) {
            'correct' => 'correct',
            'partial', 'minor_mistake' => 'minor_mistake',
            'incorrect', 'wrong' => 'wrong',
            'omitted', 'missing', 'pending' => 'missing',
            'extra' => 'extra',
            'uncertain', 'skipped', 'notAttempted' => 'uncertain',
            default => 'uncertain',
        };
    }

    /**
     * @param  array<int, array{ayah_number?:int,ayahNumber?:int,text?:string,words?:array<int,string>}>  $ayahs
     * @return list<array{word:string,display:string,ayah_number:int,ayah_key:string,ayah_word_index:int}>
     */
    private function buildTargetUnits(array $ayahs, string $targetText): array
    {
        $units = [];
        if ($ayahs !== []) {
            foreach ($ayahs as $ayah) {
                $ayahNumber = (int) ($ayah['ayah_number'] ?? $ayah['ayahNumber'] ?? 0);
                $surah = (int) ($ayah['surah_number'] ?? $ayah['surahNumber'] ?? $ayah['surahId'] ?? 0);
                $words = $ayah['words'] ?? null;
                if (! is_array($words) || $words === []) {
                    $text = (string) ($ayah['text'] ?? $ayah['arabic'] ?? '');
                    $words = $this->tokenizeDisplay($text);
                }
                $ayahKey = $surah > 0 && $ayahNumber > 0
                    ? $surah.':'.$ayahNumber
                    : (string) ($ayah['key'] ?? $ayah['ayah_key'] ?? $ayahNumber);
                foreach (array_values($words) as $index => $word) {
                    $display = trim((string) $word);
                    if ($display === '') {
                        continue;
                    }
                    $units[] = [
                        'word' => $this->normalizeArabic($display),
                        'display' => $display,
                        'ayah_number' => $ayahNumber,
                        'ayah_key' => $ayahKey,
                        'ayah_word_index' => $index,
                    ];
                }
            }
        }

        if ($units === [] && $targetText !== '') {
            foreach ($this->tokenizeDisplay($targetText) as $index => $display) {
                $units[] = [
                    'word' => $this->normalizeArabic($display),
                    'display' => $display,
                    'ayah_number' => 0,
                    'ayah_key' => '',
                    'ayah_word_index' => $index,
                ];
            }
        }

        return $units;
    }

    /**
     * @return list<string>
     */
    private function tokenizeDisplay(string $text): array
    {
        $cleaned = preg_replace('/<[^>]+>/', ' ', $text) ?? $text;
        $cleaned = preg_replace('/[^\x{0621}-\x{064A}\x{0671}\x{0670}\x{064B}-\x{065F}\s]/u', ' ', $cleaned) ?? $cleaned;
        $cleaned = preg_replace('/\s+/u', ' ', $cleaned) ?? $cleaned;
        $cleaned = trim($cleaned);
        if ($cleaned === '') {
            return [];
        }

        return preg_split('/\s+/u', $cleaned) ?: [];
    }

    /**
     * @param  array<int, array{word?:string,text?:string,confidence?:float|int}|string>  $recognitionWords
     * @return list<array{word:string,confidence:float}>
     */
    private function normaliseHeardWords(array $recognitionWords): array
    {
        $out = [];
        foreach ($recognitionWords as $entry) {
            if (is_string($entry)) {
                $word = $this->normalizeArabic($entry);
                if ($word !== '') {
                    $out[] = ['word' => $word, 'confidence' => 1.0];
                }
                continue;
            }
            $raw = (string) ($entry['word'] ?? $entry['text'] ?? '');
            $word = $this->normalizeArabic($raw);
            if ($word === '') {
                continue;
            }
            $confidence = is_numeric($entry['confidence'] ?? null) ? (float) $entry['confidence'] : 1.0;
            // Keep low-confidence tokens in alignment so classifyMatch can mark them
            // uncertain instead of turning dropped ASR into learner "missing" mistakes.
            if ($confidence < 0.15) {
                continue;
            }
            // Keep adjacent duplicates so intentional learner repetitions survive.
            // DP marks them as extras with a cheaper repetition cost.
            $out[] = ['word' => $word, 'confidence' => $confidence];
        }

        return $out;
    }

    private function stripArticle(string $word): string
    {
        if (str_starts_with($word, 'ال') && mb_strlen($word) > 3) {
            return mb_substr($word, 2);
        }
        if (str_starts_with($word, 'لل') && mb_strlen($word) > 3) {
            return 'ل'.mb_substr($word, 2);
        }

        return $word;
    }

    private function stripClitics(string $word): string
    {
        $value = $word;
        if ($value === '') {
            return $value;
        }
        // Only و/ف + ال (والشمس). Bare و must not equate واحد with أحد.
        if (preg_match('/^[وف]ال/u', $value) === 1 && mb_strlen($value) > 4) {
            $value = mb_substr($value, 3);
        }

        return $this->stripArticle($value);
    }

    private function softenAsrForms(string $text): string
    {
        $value = preg_replace('/[قك]/u', 'ك', $text) ?? $text;
        $value = preg_replace('/[طت]/u', 'ت', $value) ?? $value;
        $value = preg_replace('/[ظضذ]/u', 'ذ', $value) ?? $value;
        $value = preg_replace('/[غخ]/u', 'غ', $value) ?? $value;

        return preg_replace('/[صسث]/u', 'س', $value) ?? $value;
    }

    private function similarity(string $left, string $right): float
    {
        if ($left === '' || $right === '') {
            return 0.0;
        }
        if ($left === $right) {
            return 1.0;
        }
        $a = $this->stripArticle($left);
        $b = $this->stripArticle($right);
        $cliticA = $this->stripClitics($left);
        $cliticB = $this->stripClitics($right);
        if ($a !== '' && $a === $b) {
            return 1.0;
        }
        if ($cliticA !== '' && $cliticA === $cliticB) {
            return 1.0;
        }

        $hardBest = max(
            $this->levenshteinSimilarity($left, $right),
            $this->levenshteinSimilarity($a, $b),
            $this->levenshteinSimilarity($cliticA, $cliticB)
        );
        $softRaw = max(
            $this->levenshteinSimilarity($this->softenAsrForms($left), $this->softenAsrForms($right)),
            $this->levenshteinSimilarity($this->softenAsrForms($a), $this->softenAsrForms($b)),
            $this->levenshteinSimilarity($this->softenAsrForms($cliticA), $this->softenAsrForms($cliticB))
        );
        // Soft letter conflation may lift toward amber, never alone to green.
        $softCap = 0.74;
        $softCapped = $softRaw > $hardBest
            ? max($hardBest, min($softRaw, $softCap))
            : $softRaw;

        return max($hardBest, $softCapped);
    }

    private function levenshteinSimilarity(string $a, string $b): float
    {
        if ($a === '' || $b === '') {
            return 0.0;
        }
        if ($a === $b) {
            return 1.0;
        }
        $len = max(mb_strlen($a), mb_strlen($b));
        if ($len === 0) {
            return 1.0;
        }
        // Use byte-safe fallback for latin; for Arabic use grapheme-aware split.
        $aChars = preg_split('//u', $a, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $bChars = preg_split('//u', $b, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $rows = count($aChars) + 1;
        $cols = count($bChars) + 1;
        $matrix = [];
        for ($i = 0; $i < $rows; $i++) {
            $matrix[$i][0] = $i;
        }
        for ($j = 0; $j < $cols; $j++) {
            $matrix[0][$j] = $j;
        }
        for ($i = 1; $i < $rows; $i++) {
            for ($j = 1; $j < $cols; $j++) {
                $cost = $aChars[$i - 1] === $bChars[$j - 1] ? 0 : 1;
                $matrix[$i][$j] = min(
                    $matrix[$i - 1][$j] + 1,
                    $matrix[$i][$j - 1] + 1,
                    $matrix[$i - 1][$j - 1] + $cost
                );
            }
        }
        $distance = $matrix[count($aChars)][count($bChars)];

        return 1 - ($distance / max(count($aChars), count($bChars)));
    }

    private function matchCost(string $target, string $heard, float $similarity, float $confidence): float
    {
        if ($target === $heard
            || $this->stripArticle($target) === $this->stripArticle($heard)
            || $this->stripClitics($target) === $this->stripClitics($heard)) {
            return 0.0;
        }
        if ($similarity >= 0.92) {
            return 0.22 + ((1 - $confidence) * 0.12);
        }
        if ($similarity >= 0.85) {
            return 0.42 + ((1 - $confidence) * 0.16);
        }
        if ($similarity >= 0.35) {
            return 0.78 + ((1 - $confidence) * 0.24);
        }

        return 1.45;
    }

    /**
     * @param  list<array{word:string,confidence:float}>  $heard
     */
    private function extraCost(array $heard, int $index): float
    {
        if ($index > 0 && ($heard[$index]['word'] ?? null) === ($heard[$index - 1]['word'] ?? null)) {
            return 0.34;
        }

        return 0.78;
    }

    private function opTie(string $op): int
    {
        return match ($op) {
            'match' => 0,
            'omission' => 1,
            default => 2,
        };
    }

    /**
     * @param  array<string,mixed>  $unit
     * @param  array{word:string,confidence:float}  $heardWord
     * @return array<string,mixed>
     */
    private function classifyMatch(
        string $display,
        string $expected,
        array $heardWord,
        float $similarity,
        int $targetIndex,
        array $unit
    ): array {
        $actual = (string) ($heardWord['word'] ?? '');
        $confidence = (float) ($heardWord['confidence'] ?? 1);
        $base = [
            'text' => $display,
            'target_word' => $expected,
            'actual' => $actual,
            'confidence' => $confidence,
            'similarity' => $similarity,
            'target_index' => $targetIndex,
            'ayah_number' => $unit['ayah_number'] ?? null,
            'ayah_key' => $unit['ayah_key'] ?? '',
            'ayah_word_index' => $unit['ayah_word_index'] ?? $targetIndex,
        ];

        $articleMatch = $expected !== ''
            && $actual !== ''
            && (
                $this->stripArticle($expected) === $this->stripArticle($actual)
                || $this->stripClitics($expected) === $this->stripClitics($actual)
            );
        $exactOrArticle = $expected !== '' && ($expected === $actual || $articleMatch);
        $shortSubstitution = $expected !== ''
            && $actual !== ''
            && ! $exactOrArticle
            && mb_strlen($expected) <= 2
            && mb_strlen($expected) === mb_strlen($actual);

        if ($expected !== '' && ($exactOrArticle || (! $shortSubstitution && $similarity >= 0.78))) {
            return array_merge($base, [
                'status' => 'correct',
                'note' => 'Correct.',
                'similarity' => 1.0,
                'visual_status' => 'green',
            ]);
        }

        // Recognition uncertainty must not become a learner mistake.
        if ($expected !== '' && $actual !== '' && ! $exactOrArticle && $confidence < 0.55) {
            return array_merge($base, [
                'status' => 'uncertain',
                'note' => 'Low recognition confidence.',
                'visual_status' => 'uncertain',
            ]);
        }

        if ($expected !== '' && $actual !== '' && ! $shortSubstitution && $similarity >= 0.35) {
            return array_merge($base, [
                'status' => 'minor_mistake',
                'note' => "Close. Expected {$display}; heard {$actual}.",
                'visual_status' => 'amber',
            ]);
        }

        return array_merge($base, [
            'status' => 'wrong',
            'note' => "Expected {$display}; heard {$actual}.",
            'visual_status' => 'red',
        ]);
    }

    /**
     * @param  list<array<string,mixed>>  $statuses
     * @param  list<array<string,mixed>>  $extraWords
     */
    private function scoreAccuracy(array $statuses, array $extraWords): int
    {
        $total = max(1, count($statuses));
        $correct = 0.0;
        foreach ($statuses as $word) {
            $status = (string) ($word['status'] ?? '');
            if ($status === 'correct') {
                $correct += 1.0;
            } elseif ($status === 'minor_mistake') {
                $confidence = max(0.4, min(1.0, (float) ($word['confidence'] ?? 1)));
                $correct += 0.65 * $confidence;
            } elseif ($status === 'uncertain') {
                $correct += 0.35;
            }
        }
        $penalty = min(8, count($extraWords) * 0.2);

        return (int) max(0, min(100, round((($correct - $penalty) / $total) * 100)));
    }

    /**
     * @param  list<array<string,mixed>>  $statuses
     * @param  list<array{word:string,confidence:float}>  $heard
     */
    private function evaluationConfidence(array $statuses, array $heard): float
    {
        if ($heard === []) {
            return 0.2;
        }
        $sum = 0.0;
        $n = 0;
        foreach ($heard as $word) {
            $sum += (float) ($word['confidence'] ?? 1);
            $n++;
        }
        $avg = $n > 0 ? $sum / $n : 0.5;
        $uncertain = count(array_filter($statuses, fn ($w) => ($w['status'] ?? '') === 'uncertain'));
        $ratio = count($statuses) > 0 ? $uncertain / count($statuses) : 0;

        return round(max(0.15, min(0.99, $avg * (1 - ($ratio * 0.35)))), 4);
    }

    /**
     * @param  list<array<string,mixed>>  $statuses
     * @param  list<array<string,mixed>>  $extraWords
     * @return array{green:int,amber:int,red:int,black:int,grey:int,uncertain:int}
     */
    private function colorCounts(array $statuses, array $extraWords): array
    {
        $counts = [
            'green' => 0,
            'amber' => 0,
            'red' => 0,
            'black' => 0,
            'grey' => count($extraWords),
            'uncertain' => 0,
        ];
        foreach ($statuses as $word) {
            match ((string) ($word['status'] ?? '')) {
                'correct' => $counts['green']++,
                'minor_mistake' => $counts['amber']++,
                'wrong' => $counts['red']++,
                'missing' => $counts['black']++,
                'uncertain' => $counts['uncertain']++,
                default => $counts['uncertain']++,
            };
        }

        return $counts;
    }
}

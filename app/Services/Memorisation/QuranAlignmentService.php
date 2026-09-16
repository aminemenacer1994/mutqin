<?php

namespace App\Services\Memorisation;

/**
 * Quran-aware word alignment. Expected ayah text is the source of truth;
 * recognition words are a noisy input only.
 */
class QuranAlignmentService
{
    public const ALIGNMENT_VERSION = 'mutqin-quran-aligner-v2';

    public const TYPE_MATCH = 'MATCH';

    public const TYPE_SUBSTITUTION = 'SUBSTITUTION';

    public const TYPE_DELETION = 'DELETION';

    public const TYPE_INSERTION = 'INSERTION';

    public const TYPE_REPETITION = 'REPETITION';

    public const TYPE_SELF_CORRECTION = 'SELF_CORRECTION';

    public const TYPE_HESITATION = 'HESITATION';

    public const TYPE_RESTART = 'RESTART';

    public const TYPE_OUT_OF_RANGE = 'OUT_OF_RANGE';

    public const TYPE_DIVERGENCE = 'DIVERGENCE';

    public const TYPE_REALIGNMENT = 'REALIGNMENT';

    public const TYPE_UNASSESSED = 'UNASSESSED';

    private QuranTextNormalizer $normalizer;

    private RecitationConfidencePolicy $confidencePolicy;

    public function __construct(?QuranTextNormalizer $normalizer = null, ?RecitationConfidencePolicy $confidencePolicy = null)
    {
        $this->normalizer = $normalizer ?? new QuranTextNormalizer;
        $this->confidencePolicy = $confidencePolicy ?? new RecitationConfidencePolicy;
    }

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
    public function align(array $ayahs, array $recognitionWords, string $targetText = '', array $options = []): array
    {
        $units = $this->buildTargetUnits($ayahs, $targetText);
        $heard = $this->normaliseHeardWords($recognitionWords);
        $targetWords = array_map(fn ($u) => $u['word'], $units);
        $displayWords = array_map(fn ($u) => $u['display'], $units);
        $heardWords = array_map(fn ($w) => $w['word'], $heard);
        $isFinal = (($options['mode'] ?? $options['lifecycle'] ?? 'final') !== 'live');

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

        $operations = [];
        $t = $targetCount;
        $h = $heardCount;
        while ($t > 0 || $h > 0) {
            $cell = $matrix[$t][$h] ?? null;
            if (! $cell || $cell['prev'] === null && $t === 0 && $h === 0) {
                break;
            }
            if (($cell['op'] ?? '') === 'match') {
                $operations[] = [
                    'op' => 'match',
                    'expected_index' => $t - 1,
                    'recognised_index' => $h - 1,
                    'similarity' => (float) $cell['similarity'],
                ];
                [$t, $h] = $cell['prev'];
            } elseif (($cell['op'] ?? '') === 'extra') {
                $operations[] = [
                    'op' => 'extra',
                    'expected_index' => $t,
                    'recognised_index' => $h - 1,
                    'similarity' => 0.0,
                ];
                [$t, $h] = $cell['prev'];
            } elseif (($cell['op'] ?? '') === 'omission') {
                $operations[] = [
                    'op' => 'omission',
                    'expected_index' => $t - 1,
                    'recognised_index' => null,
                    'similarity' => 0.0,
                ];
                [$t, $h] = $cell['prev'];
            } else {
                break;
            }
        }
        $operations = array_reverse($operations);

        $operations = $this->classifyOperationContext($operations, $targetWords, $heard, $isFinal);
        [$statuses, $extraWords, $events] = $this->materialiseOperations($operations, $units, $heard, $isFinal);
        $events = array_merge($events, $this->detectHesitations($statuses));

        $accuracy = $this->scoreAccuracy($statuses, $extraWords);
        $confidence = $this->evaluationConfidence($statuses, $heard);
        $colorCounts = $this->colorCounts($statuses, $extraWords);

        return [
            'word_results' => array_values($statuses),
            'extra_words' => $extraWords,
            'events' => $events,
            'transcript' => implode(' ', $heardWords),
            'normalised_transcript' => implode(' ', $heardWords),
            'comparison_tokens' => $targetWords,
            'accuracy' => $accuracy,
            'confidence' => $confidence,
            'color_counts' => $colorCounts,
            'scenario_counts' => $this->scenarioCounts($statuses, $extraWords, $events),
            'metadata' => [
                'alignment_version' => self::ALIGNMENT_VERSION,
                'normalizer_version' => QuranTextNormalizer::VERSION,
                'confidence_policy_version' => RecitationConfidencePolicy::VERSION,
                'lifecycle' => $isFinal ? 'final' : 'live',
            ],
        ];
    }

    public function normalizeArabic(string $text): string
    {
        return $this->normalizer->normalizeComparisonText($text);
    }

    private function stripAlefForCompare(string $word): string
    {
        return str_replace('ا', '', $word);
    }

    private function alefOptionalEqual(string $left, string $right): bool
    {
        if ($left === '' || $right === '') {
            return false;
        }
        if ($left === $right) {
            return true;
        }
        $a = $this->stripAlefForCompare($left);
        $b = $this->stripAlefForCompare($right);

        return $a !== '' && $a === $b;
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
                        'display_word' => $display,
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
                    'display_word' => $display,
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
        return $this->normalizer->tokenizeDisplayText($text);
    }

    /**
     * @param  array<int, array{word?:string,text?:string,confidence?:float|int}|string>  $recognitionWords
     * @return list<array{word:string,confidence:float}>
     */
    private function normaliseHeardWords(array $recognitionWords): array
    {
        $out = [];
        foreach ($recognitionWords as $index => $entry) {
            if (is_string($entry)) {
                $word = $this->normalizeArabic($entry);
                if ($word !== '') {
                    $out[] = [
                        'word' => $word,
                        'raw_word' => $entry,
                        'recognised_index' => $index,
                        'confidence' => 1.0,
                    ];
                }
                continue;
            }
            $raw = (string) ($entry['raw_word'] ?? $entry['rawWord'] ?? $entry['display'] ?? $entry['word'] ?? $entry['text'] ?? '');
            $word = $this->normalizeArabic((string) ($entry['word'] ?? $entry['text'] ?? $raw));
            if ($word === '') {
                continue;
            }
            $confidence = is_numeric($entry['confidence'] ?? null) ? (float) $entry['confidence'] : 1.0;
            // Keep low-confidence tokens in alignment so classifyMatch can mark them
            // uncertain instead of turning dropped ASR into learner "missing" mistakes.
            if (! $this->confidencePolicy->isRecognitionUsable($confidence)) {
                continue;
            }
            $heard = [
                'word' => $word,
                'raw_word' => $raw !== '' ? $raw : $word,
                'recognised_index' => $index,
                'confidence' => $confidence,
            ];
            if (is_numeric($entry['start'] ?? $entry['startTime'] ?? null)) {
                $heard['start'] = (float) ($entry['start'] ?? $entry['startTime']);
            }
            if (is_numeric($entry['end'] ?? $entry['endTime'] ?? null)) {
                $heard['end'] = (float) ($entry['end'] ?? $entry['endTime']);
            }
            // Keep adjacent duplicates so intentional learner repetitions survive.
            // DP marks them as extras with a cheaper repetition cost.
            $out[] = $heard;
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
        // Keep ض/ظ/ذ/د soft for ASR (ض↔د is a common recognition swap).
        $value = preg_replace('/[ظضذد]/u', 'ذ', $value) ?? $value;
        $value = preg_replace('/[غخ]/u', 'غ', $value) ?? $value;

        return preg_replace('/[صسث]/u', 'س', $value) ?? $value;
    }

    private function differsOnlyBySoftAsrLetters(string $left, string $right): bool
    {
        if ($left === '' || $right === '' || $left === $right) {
            return false;
        }
        $a = $this->stripArticle($left);
        $b = $this->stripArticle($right);
        $cliticA = $this->stripClitics($left);
        $cliticB = $this->stripClitics($right);
        if ($a !== '' && $a === $b) {
            return false;
        }
        if ($cliticA !== '' && $cliticA === $cliticB) {
            return false;
        }
        if ($this->softenAsrForms($left) === $this->softenAsrForms($right)) {
            return true;
        }
        if ($a !== '' && $b !== '' && $this->softenAsrForms($a) === $this->softenAsrForms($b)) {
            return true;
        }
        if ($cliticA !== '' && $cliticB !== '' && $this->softenAsrForms($cliticA) === $this->softenAsrForms($cliticB)) {
            return true;
        }

        return false;
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
        // Mushaf dagger-alef expansions vs plain ASR (العالمين/العلمين, ملك/مالك).
        if ($this->alefOptionalEqual($left, $right)) {
            return 1.0;
        }
        if ($this->alefOptionalEqual($a, $b)) {
            return 1.0;
        }
        if ($this->alefOptionalEqual($cliticA, $cliticB)) {
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
        $softCap = RecitationScoringThresholds::SOFT_SIMILARITY_CAP;
        // صراط↔سراط etc. can still clear the green floor via raw Levenshtein —
        // cap soft-letter-only diffs to amber.
        if ($this->differsOnlyBySoftAsrLetters($left, $right)) {
            return min(max($hardBest, min($softRaw, $softCap)), $softCap);
        }
        $softCapped = $softRaw > $hardBest
            ? max($hardBest, min($softRaw, $softCap))
            : $softRaw;
        $score = max($hardBest, $softCapped);
        // One substitution/insertion/deletion still clears ~0.80–0.86 via 1 − 1/n.
        if ($this->isSingleEditMismatch($left, $right)) {
            $score = min($score, $softCap);
        }

        return $score;
    }

    private function isSingleEditMismatch(string $left, string $right): bool
    {
        if ($left === '' || $right === '' || $left === $right) {
            return false;
        }
        if ($this->alefOptionalEqual($left, $right)) {
            return false;
        }
        $a = $this->stripArticle($left);
        $b = $this->stripArticle($right);
        $cliticA = $this->stripClitics($left);
        $cliticB = $this->stripClitics($right);
        if ($a !== '' && $a === $b) {
            return false;
        }
        if ($cliticA !== '' && $cliticA === $cliticB) {
            return false;
        }
        if ($this->alefOptionalEqual($a, $b) || $this->alefOptionalEqual($cliticA, $cliticB)) {
            return false;
        }
        $best = min(
            $this->levenshteinDistance($left, $right),
            $this->levenshteinDistance($a, $b),
            $this->levenshteinDistance($cliticA, $cliticB)
        );

        return $best === 1;
    }

    private function levenshteinDistance(string $a, string $b): int
    {
        if ($a === '' && $b === '') {
            return 0;
        }
        if ($a === '' || $b === '') {
            return max(mb_strlen($a), mb_strlen($b));
        }
        if ($a === $b) {
            return 0;
        }
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

        return (int) $matrix[count($aChars)][count($bChars)];
    }

    private function levenshteinSimilarity(string $a, string $b): float
    {
        if ($a === '' || $b === '') {
            return 0.0;
        }
        if ($a === $b) {
            return 1.0;
        }
        $aChars = preg_split('//u', $a, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $bChars = preg_split('//u', $b, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $len = max(count($aChars), count($bChars));
        if ($len === 0) {
            return 1.0;
        }
        $distance = $this->levenshteinDistance($a, $b);

        return 1 - ($distance / $len);
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
        // Soft-capped near-misses (~0.74) must stay cheaper than omit+later-match.
        if ($similarity >= 0.72) {
            return 0.5 + ((1 - $confidence) * 0.18);
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
     * @param  list<array<string,mixed>>  $operations
     * @param  list<string>  $targetWords
     * @param  list<array<string,mixed>>  $heard
     * @return list<array<string,mixed>>
     */
    private function classifyOperationContext(array $operations, array $targetWords, array $heard, bool $isFinal): array
    {
        $count = count($operations);
        for ($i = 0; $i < $count; $i++) {
            $op = (string) ($operations[$i]['op'] ?? '');
            if ($op === 'extra') {
                $operations[$i]['type'] = $this->classifyExtraOperation($operations, $i, $targetWords, $heard);
                continue;
            }
            if ($op === 'omission') {
                $operations[$i]['type'] = $isFinal ? self::TYPE_DELETION : self::TYPE_UNASSESSED;
                continue;
            }
            if ($op === 'match') {
                $operations[$i]['type'] = self::TYPE_MATCH;
            }
        }

        for ($i = 0; $i < $count; $i++) {
            if (($operations[$i]['op'] ?? '') !== 'match') {
                continue;
            }
            $expectedIndex = (int) ($operations[$i]['expected_index'] ?? -1);
            $recognisedIndex = (int) ($operations[$i]['recognised_index'] ?? -1);
            $expected = $targetWords[$expectedIndex] ?? '';
            $actual = (string) ($heard[$recognisedIndex]['word'] ?? '');
            if ($expected !== '' && $actual !== '' && $this->similarity($expected, $actual) < RecitationScoringThresholds::CORRECT_SIMILARITY) {
                $operations[$i]['type'] = self::TYPE_SUBSTITUTION;
            }
        }

        $i = 0;
        while ($i < $count) {
            if ($this->isResolvedMatchOperation($operations[$i] ?? [], $targetWords, $heard)) {
                $i++;
                continue;
            }

            $start = $i;
            $hasExpected = false;
            while ($i < $count && ! $this->isResolvedMatchOperation($operations[$i] ?? [], $targetWords, $heard)) {
                if (($operations[$i]['op'] ?? '') !== 'extra') {
                    $hasExpected = true;
                }
                $i++;
            }
            $length = $i - $start;
            $hasRecovery = $i < $count && $this->isResolvedMatchOperation($operations[$i] ?? [], $targetWords, $heard);
            if ($hasExpected && $hasRecovery && $length >= 3) {
                for ($j = $start; $j < $i; $j++) {
                    if (($operations[$j]['op'] ?? '') !== 'extra') {
                        $operations[$j]['type'] = self::TYPE_DIVERGENCE;
                    }
                }
                $operations[$i]['type'] = self::TYPE_REALIGNMENT;
            }
        }

        return $operations;
    }

    /**
     * @param  list<array<string,mixed>>  $operations
     * @param  list<string>  $targetWords
     * @param  list<array<string,mixed>>  $heard
     */
    private function classifyExtraOperation(array $operations, int $index, array $targetWords, array $heard): string
    {
        $recognisedIndex = (int) ($operations[$index]['recognised_index'] ?? -1);
        $expectedIndex = (int) ($operations[$index]['expected_index'] ?? -1);
        $word = (string) ($heard[$recognisedIndex]['word'] ?? '');

        if ($expectedIndex >= count($targetWords)) {
            return self::TYPE_OUT_OF_RANGE;
        }

        $previousRecognised = $recognisedIndex > 0 ? (string) ($heard[$recognisedIndex - 1]['word'] ?? '') : '';
        if ($word !== '' && $previousRecognised !== '' && $word === $previousRecognised) {
            return self::TYPE_REPETITION;
        }

        $earlier = array_slice($targetWords, 0, max(0, $expectedIndex));
        if ($word !== '' && in_array($word, $earlier, true)) {
            return self::TYPE_RESTART;
        }
        if ($word !== '' && in_array($word, $targetWords, true)) {
            for ($i = $index + 1, $n = count($operations); $i < $n; $i++) {
                if (! $this->isResolvedMatchOperation($operations[$i], $targetWords, $heard)) {
                    continue;
                }
                $laterExpected = $targetWords[(int) ($operations[$i]['expected_index'] ?? -1)] ?? '';
                if ($laterExpected === $word) {
                    return self::TYPE_RESTART;
                }
            }
        }

        $next = $operations[$index + 1] ?? null;
        $nextIsExpectedMatch = is_array($next)
            && ($next['op'] ?? '') === 'match'
            && (int) ($next['expected_index'] ?? -2) === $expectedIndex
            && $this->isResolvedMatchOperation($next, $targetWords, $heard);
        if ($nextIsExpectedMatch && $this->pauseAfter($heard, $recognisedIndex) >= $this->selfCorrectionPauseSeconds()) {
            return self::TYPE_SELF_CORRECTION;
        }

        return self::TYPE_INSERTION;
    }

    /**
     * @param  array<string,mixed>  $operation
     * @param  list<string>  $targetWords
     * @param  list<array<string,mixed>>  $heard
     */
    private function isResolvedMatchOperation(array $operation, array $targetWords, array $heard): bool
    {
        if (($operation['op'] ?? '') !== 'match') {
            return false;
        }
        $expected = $targetWords[(int) ($operation['expected_index'] ?? -1)] ?? '';
        $actual = (string) ($heard[(int) ($operation['recognised_index'] ?? -1)]['word'] ?? '');

        return $expected !== '' && $actual !== '' && $this->similarity($expected, $actual) >= RecitationScoringThresholds::CORRECT_SIMILARITY;
    }

    /**
     * @param  list<array<string,mixed>>  $operations
     * @param  list<array<string,mixed>>  $units
     * @param  list<array<string,mixed>>  $heard
     * @return array{0:list<array<string,mixed>>,1:list<array<string,mixed>>,2:list<array<string,mixed>>}
     */
    private function materialiseOperations(array $operations, array $units, array $heard, bool $isFinal): array
    {
        $statuses = [];
        foreach ($units as $index => $unit) {
            $statuses[$index] = $this->deletionStatus($unit, $index, $isFinal);
        }

        $extraWords = [];
        $events = [];
        foreach ($operations as $operation) {
            $type = (string) ($operation['type'] ?? self::TYPE_UNASSESSED);
            if (($operation['op'] ?? '') === 'match') {
                $expectedIndex = (int) ($operation['expected_index'] ?? -1);
                $recognisedIndex = (int) ($operation['recognised_index'] ?? -1);
                if (! isset($units[$expectedIndex], $heard[$recognisedIndex])) {
                    continue;
                }
                $status = $this->classifyMatch(
                    (string) $units[$expectedIndex]['display'],
                    (string) $units[$expectedIndex]['word'],
                    $heard[$recognisedIndex],
                    (float) ($operation['similarity'] ?? 0.0),
                    $expectedIndex,
                    $units[$expectedIndex]
                );
                if (in_array($type, [self::TYPE_DIVERGENCE, self::TYPE_REALIGNMENT], true)) {
                    $status = $this->applyOperationType($status, $type);
                }
                $statuses[$expectedIndex] = $status;
                continue;
            }

            if (($operation['op'] ?? '') === 'omission') {
                $expectedIndex = (int) ($operation['expected_index'] ?? -1);
                if (isset($statuses[$expectedIndex])) {
                    $statuses[$expectedIndex] = $this->applyOperationType($statuses[$expectedIndex], $type);
                }
                continue;
            }

            if (($operation['op'] ?? '') === 'extra') {
                $extra = $this->extraWordPayload($operation, $heard, $units, $type);
                $extraWords[] = $extra;
                $events[] = $extra;
            }
        }

        return [array_values($statuses), $extraWords, $events];
    }

    /**
     * @param  array<string,mixed>  $unit
     * @return array<string,mixed>
     */
    private function deletionStatus(array $unit, int $index, bool $isFinal): array
    {
        $type = $isFinal ? self::TYPE_DELETION : self::TYPE_UNASSESSED;
        $status = $isFinal ? 'missing' : 'uncertain';

        return [
            'text' => (string) ($unit['display'] ?? ''),
            'displayText' => (string) ($unit['display'] ?? ''),
            'comparisonText' => (string) ($unit['word'] ?? ''),
            'target_word' => (string) ($unit['word'] ?? ''),
            'expected_word' => (string) ($unit['display'] ?? ''),
            'expected_index' => $index,
            'recognised_word' => '',
            'recognised_index' => null,
            'speechmatics_confidence' => null,
            'classification_confidence' => $isFinal ? 0.86 : 0.2,
            'type' => $type,
            'status' => $status,
            'note' => $isFinal ? 'Word was not recited.' : 'Not assessed while recording.',
            'actual' => '',
            'raw_word' => '',
            'display_word' => '',
            'confidence' => 0.0,
            'similarity' => 0.0,
            'target_index' => $index,
            'ayah_number' => $unit['ayah_number'] ?? null,
            'ayah_key' => $unit['ayah_key'] ?? '',
            'ayah_word_index' => $unit['ayah_word_index'] ?? $index,
            'visual_status' => $isFinal ? 'black' : 'uncertain',
            'highlight' => $isFinal ? 'red' : 'neutral',
        ];
    }

    /**
     * @param  array<string,mixed>  $status
     * @return array<string,mixed>
     */
    private function applyOperationType(array $status, string $type): array
    {
        $status['type'] = $type;
        if ($type === self::TYPE_DIVERGENCE) {
            $status['status'] = 'wrong';
            $status['visual_status'] = 'red';
            $status['highlight'] = 'red';
            $status['note'] = 'Recitation diverged before realigning.';
        } elseif ($type === self::TYPE_REALIGNMENT) {
            $status['status'] = 'correct';
            $status['visual_status'] = 'green';
            $status['highlight'] = 'green';
            $status['realigned'] = true;
        } elseif ($type === self::TYPE_UNASSESSED) {
            $status['status'] = 'uncertain';
            $status['visual_status'] = 'uncertain';
            $status['highlight'] = 'neutral';
        }

        return $status;
    }

    /**
     * @param  array<string,mixed>  $operation
     * @param  list<array<string,mixed>>  $heard
     * @param  list<array<string,mixed>>  $units
     * @return array<string,mixed>
     */
    private function extraWordPayload(array $operation, array $heard, array $units, string $type): array
    {
        $recognisedIndex = (int) ($operation['recognised_index'] ?? -1);
        $expectedIndex = (int) ($operation['expected_index'] ?? 0);
        $word = $heard[$recognisedIndex] ?? [];
        $expectedUnit = $units[max(0, min(count($units) - 1, $expectedIndex))] ?? null;
        $visual = in_array($type, [self::TYPE_REPETITION, self::TYPE_SELF_CORRECTION, self::TYPE_RESTART], true)
            ? 'amber'
            : ($type === self::TYPE_INSERTION ? 'red' : 'grey');

        $payload = [
            'word' => (string) ($word['word'] ?? ''),
            'raw_word' => (string) ($word['raw_word'] ?? $word['word'] ?? ''),
            'display_word' => '',
            'expected_word' => $expectedUnit['display'] ?? '',
            'expected_index' => $expectedIndex,
            'recognised_word' => (string) ($word['raw_word'] ?? $word['word'] ?? ''),
            'recognised_index' => $recognisedIndex,
            'speechmatics_confidence' => (float) ($word['confidence'] ?? 1),
            'classification_confidence' => in_array($type, [self::TYPE_REPETITION, self::TYPE_RESTART], true) ? 0.9 : 0.72,
            'confidence' => (float) ($word['confidence'] ?? 1),
            'status' => 'extra',
            'type' => $type,
            'legacy_type' => $type === self::TYPE_REPETITION ? 'repetition' : 'extra',
            'visual_status' => $visual,
            'highlight' => $type === self::TYPE_INSERTION
                ? 'red'
                : ($type === self::TYPE_OUT_OF_RANGE ? 'neutral' : 'amber'),
        ];
        if (isset($word['start'])) {
            $payload['start_time'] = (float) $word['start'];
            $payload['start'] = (float) $word['start'];
        }
        if (isset($word['end'])) {
            $payload['end_time'] = (float) $word['end'];
            $payload['end'] = (float) $word['end'];
        }

        return $payload;
    }

    /**
     * @param  list<array<string,mixed>>  $heard
     */
    private function pauseAfter(array $heard, int $recognisedIndex): float
    {
        $currentEnd = isset($heard[$recognisedIndex]['end']) && is_numeric($heard[$recognisedIndex]['end'])
            ? (float) $heard[$recognisedIndex]['end']
            : null;
        $nextStart = isset($heard[$recognisedIndex + 1]['start']) && is_numeric($heard[$recognisedIndex + 1]['start'])
            ? (float) $heard[$recognisedIndex + 1]['start']
            : null;
        if ($currentEnd === null || $nextStart === null) {
            return 0.0;
        }

        return max(0.0, $nextStart - $currentEnd);
    }

    private function hesitationPauseSeconds(): float
    {
        return $this->configFloat('mutqin.ai_recite.pause_thresholds.hesitation_seconds', 1.35);
    }

    private function selfCorrectionPauseSeconds(): float
    {
        return $this->configFloat('mutqin.ai_recite.pause_thresholds.self_correction_seconds', 0.55);
    }

    private function configFloat(string $key, float $fallback): float
    {
        try {
            if (function_exists('config')) {
                $value = config($key, $fallback);
                if (is_numeric($value)) {
                    return (float) $value;
                }
            }
        } catch (\Throwable) {
            //
        }

        return $fallback;
    }

    /**
     * @param  list<array<string,mixed>>  $statuses
     * @return list<array<string,mixed>>
     */
    private function detectHesitations(array $statuses): array
    {
        $events = [];
        $previous = null;
        foreach ($statuses as $status) {
            if (($status['status'] ?? '') !== 'correct') {
                continue;
            }
            if ($previous !== null
                && isset($previous['end_time'], $status['start_time'])
                && is_numeric($previous['end_time'])
                && is_numeric($status['start_time'])
            ) {
                $gap = max(0.0, (float) $status['start_time'] - (float) $previous['end_time']);
                if ($gap >= $this->hesitationPauseSeconds()) {
                    $events[] = [
                        'type' => self::TYPE_HESITATION,
                        'status' => 'extra',
                        'visual_status' => 'amber',
                        'highlight' => 'amber',
                        'expected_word' => $status['expected_word'] ?? $status['text'] ?? '',
                        'expected_index' => $status['expected_index'] ?? $status['target_index'] ?? null,
                        'start_time' => (float) $previous['end_time'],
                        'end_time' => (float) $status['start_time'],
                        'duration_seconds' => $gap,
                        'classification_confidence' => 0.82,
                    ];
                }
            }
            $previous = $status;
        }

        return $events;
    }

    /**
     * @param  list<array<string,mixed>>  $statuses
     * @param  list<array<string,mixed>>  $extraWords
     * @param  list<array<string,mixed>>  $events
     * @return array<string,int>
     */
    private function scenarioCounts(array $statuses, array $extraWords, array $events): array
    {
        $counts = [
            'correct_words' => 0,
            'wrong_words' => 0,
            'skipped_words' => 0,
            'extra_words' => 0,
            'repetitions' => 0,
            'self_corrections' => 0,
            'hesitations' => 0,
            'restarts' => 0,
            'out_of_range_words' => 0,
            'divergence_events' => 0,
            'unassessed_events' => 0,
        ];

        foreach ($statuses as $status) {
            $type = (string) ($status['type'] ?? '');
            if ($type === self::TYPE_MATCH || $type === self::TYPE_REALIGNMENT) {
                $counts['correct_words']++;
            } elseif ($type === self::TYPE_DELETION) {
                $counts['skipped_words']++;
            } elseif ($type === self::TYPE_DIVERGENCE) {
                $counts['divergence_events']++;
                $counts['wrong_words']++;
            } elseif ($type === self::TYPE_UNASSESSED) {
                $counts['unassessed_events']++;
            } elseif ($type === self::TYPE_SUBSTITUTION) {
                $counts['wrong_words']++;
            }
        }

        foreach ($extraWords as $extra) {
            $type = (string) ($extra['type'] ?? '');
            match ($type) {
                self::TYPE_REPETITION => $counts['repetitions']++,
                self::TYPE_SELF_CORRECTION => $counts['self_corrections']++,
                self::TYPE_RESTART => $counts['restarts']++,
                self::TYPE_OUT_OF_RANGE => $counts['out_of_range_words']++,
                self::TYPE_UNASSESSED => $counts['unassessed_events']++,
                default => $counts['extra_words']++,
            };
        }

        foreach ($events as $event) {
            if (($event['type'] ?? '') === self::TYPE_HESITATION) {
                $counts['hesitations']++;
            }
        }

        return $counts;
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
        $rawWord = (string) ($heardWord['raw_word'] ?? $heardWord['rawWord'] ?? $heardWord['display'] ?? $actual);
        $base = [
            'text' => $display,
            'displayText' => $display,
            'comparisonText' => $expected,
            'target_word' => $expected,
            'expected_word' => $display,
            'expected_index' => $targetIndex,
            'recognised_word' => $rawWord,
            'recognised_index' => isset($heardWord['recognised_index']) ? (int) $heardWord['recognised_index'] : null,
            'speechmatics_confidence' => $confidence,
            'actual' => $actual,
            'raw_word' => $rawWord,
            'display_word' => '',
            'confidence' => $confidence,
            'classification_confidence' => 0.5,
            'type' => self::TYPE_UNASSESSED,
            'similarity' => $similarity,
            'target_index' => $targetIndex,
            'ayah_number' => $unit['ayah_number'] ?? null,
            'ayah_key' => $unit['ayah_key'] ?? '',
            'ayah_word_index' => $unit['ayah_word_index'] ?? $targetIndex,
        ];
        if (isset($heardWord['start'])) {
            $base['start'] = (float) $heardWord['start'];
            $base['start_time'] = (float) $heardWord['start'];
        }
        if (isset($heardWord['end'])) {
            $base['end'] = (float) $heardWord['end'];
            $base['end_time'] = (float) $heardWord['end'];
        }

        $articleMatch = $expected !== ''
            && $actual !== ''
            && (
                $this->stripArticle($expected) === $this->stripArticle($actual)
                || $this->stripClitics($expected) === $this->stripClitics($actual)
                || $this->alefOptionalEqual($expected, $actual)
                || $this->alefOptionalEqual($this->stripArticle($expected), $this->stripArticle($actual))
                || $this->alefOptionalEqual($this->stripClitics($expected), $this->stripClitics($actual))
            );
        $exactOrArticle = $expected !== '' && ($expected === $actual || $articleMatch);
        $shortSubstitution = $expected !== ''
            && $actual !== ''
            && ! $exactOrArticle
            && mb_strlen($expected) <= 2
            && mb_strlen($expected) === mb_strlen($actual);
        $similarityLooksCorrect = ! $shortSubstitution
            && $similarity >= RecitationScoringThresholds::CORRECT_SIMILARITY;
        // Exact / orthographic equals may be green at any confidence. Similarity-only
        // greens require enough provider confidence — never fabricate correct from noise.
        if ($expected !== '' && (
            $exactOrArticle
            || ($similarityLooksCorrect
                && $confidence >= RecitationScoringThresholds::MIN_CONFIDENCE_FOR_SIMILARITY_CORRECT)
        )) {
            return array_merge($base, [
                'status' => 'correct',
                'type' => self::TYPE_MATCH,
                'note' => 'Correct.',
                'similarity' => $exactOrArticle ? 1.0 : $similarity,
                'classification_confidence' => $this->confidencePolicy->classificationConfidence($similarity, $confidence, true, 2),
                'visual_status' => 'green',
                'highlight' => 'green',
                'display_word' => $display,
            ]);
        }

        // Recognition uncertainty must not become a learner mistake.
        if ($expected !== '' && $actual !== '' && $this->confidencePolicy->shouldUnassessMismatch($confidence, $exactOrArticle)) {
            return array_merge($base, [
                'status' => 'uncertain',
                'type' => self::TYPE_UNASSESSED,
                'note' => 'Low recognition confidence.',
                'classification_confidence' => $this->confidencePolicy->classificationConfidence($similarity, $confidence, false),
                'visual_status' => 'uncertain',
                'highlight' => 'neutral',
            ]);
        }

        if ($expected !== '' && $actual !== '' && $shortSubstitution) {
            return array_merge($base, [
                'status' => 'wrong',
                'type' => self::TYPE_SUBSTITUTION,
                'note' => "Expected {$display}; heard {$actual}.",
                'classification_confidence' => $this->confidencePolicy->classificationConfidence($similarity, $confidence, false, 1),
                'visual_status' => 'red',
                'highlight' => 'red',
            ]);
        }

        if ($expected !== '' && $actual !== '' && $similarity >= RecitationScoringThresholds::PARTIAL_SIMILARITY) {
            return array_merge($base, [
                'status' => 'minor_mistake',
                'type' => self::TYPE_SUBSTITUTION,
                'note' => "Close. Expected {$display}; heard {$actual}.",
                'classification_confidence' => $this->confidencePolicy->classificationConfidence($similarity, $confidence, false),
                'visual_status' => 'amber',
                'highlight' => 'amber',
            ]);
        }

        return array_merge($base, [
            'status' => 'wrong',
            'type' => self::TYPE_SUBSTITUTION,
            'note' => "Expected {$display}; heard {$actual}.",
            'classification_confidence' => $this->confidencePolicy->classificationConfidence($similarity, $confidence, false, 1),
            'visual_status' => 'red',
            'highlight' => 'red',
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
                $confidence = max(0.25, min(1.0, (float) ($word['confidence'] ?? 1)));
                $correct += RecitationScoringThresholds::PARTIAL_ACCURACY_WEIGHT * $confidence;
            } elseif ($status === 'uncertain') {
                $correct += RecitationScoringThresholds::UNCERTAIN_ACCURACY_WEIGHT;
            }
        }
        $penalty = min(8, count($extraWords) * RecitationScoringThresholds::EXTRA_PENALTY);

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
            'grey' => 0,
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
        foreach ($extraWords as $word) {
            $visual = (string) ($word['visual_status'] ?? 'grey');
            if ($visual === 'amber') {
                $counts['amber']++;
            } elseif ($visual === 'red') {
                $counts['red']++;
            } elseif ($visual === 'uncertain') {
                $counts['uncertain']++;
            } else {
                $counts['grey']++;
            }
        }

        return $counts;
    }
}

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
        $targetWords = array_map(fn ($u) => $u['word'], $units);
        $prepared = $this->prepareHeardWordsForAlignment(
            $targetWords,
            $this->normaliseHeardWords($recognitionWords)
        );
        $heard = $prepared['heard'];
        $leadingExtras = $prepared['leading_extras'];
        $absorbedEchoes = $prepared['absorbed_echoes'] ?? [];
        $displayWords = array_map(fn ($u) => $u['display'], $units);
        $heardWords = array_map(fn ($w) => $w['word'], $heard);
        $isFinal = (($options['mode'] ?? $options['lifecycle'] ?? 'final') !== 'live');

        $targetCount = count($targetWords);
        $heardCount = count($heardWords);
        $startingAnchor = $this->findStartingAnchor($targetWords, $heard);

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
                // Equal-cost duplicate paths should keep the earliest valid
                // recitation green and treat the later copy as the restart.
                // This epsilon only breaks DP ties; it cannot change a real
                // match/substitution decision.
                $matchCost = $this->matchCost($targetWords[$t - 1], $heardWords[$h - 1], $similarity, $confidence)
                    + $this->startingAnchorAdjustment($startingAnchor, $t - 1, $h - 1)
                    + (($t - 1) * 1e-6)
                    + (($h - 1) * 1e-9);

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
        foreach (array_reverse($absorbedEchoes) as $echoHeard) {
            array_unshift($operations, [
                'op' => 'extra',
                'expected_index' => 0,
                'recognised_index' => null,
                'similarity' => 0.0,
                'agglutination_echo' => true,
                'leading_heard' => $echoHeard,
                'type' => self::TYPE_REPETITION,
            ]);
        }
        foreach (array_reverse($leadingExtras) as $leadIndex => $leadHeard) {
            array_unshift($operations, [
                'op' => 'extra',
                'expected_index' => 0,
                'recognised_index' => null,
                'similarity' => 0.0,
                'leading_asr_junk' => true,
                'leading_heard' => $leadHeard,
            ]);
        }

        $operations = $this->classifyOperationContext($operations, $targetWords, $heard, $isFinal, $startingAnchor);
        [$statuses, $extraWords, $events] = $this->materialiseOperations($operations, $units, $heard, $isFinal);
        if (! $isFinal && ! in_array(self::TYPE_RESTART, array_column($extraWords, 'type'), true)) {
            $liveRestart = $this->findLiveRestartEvidence($targetWords, $heard);
            $restartHasAlignmentConflict = $liveRestart !== null
                && count(array_filter(
                    array_slice($statuses, $liveRestart['restart_end_index'] + 1),
                    static fn (array $status): bool => ($status['status'] ?? '') !== 'correct'
                )) > 0;
            if ($liveRestart !== null && $restartHasAlignmentConflict) {
                $restartStart = $liveRestart['recognised_start_index'];
                $restartEnd = $liveRestart['recognised_end_index'];
                $extraWords = array_values(array_filter(
                    $extraWords,
                    static fn (array $extra): bool => (int) ($extra['recognised_index'] ?? -1) < $restartStart
                        || (int) ($extra['recognised_index'] ?? -1) > $restartEnd
                ));
                for ($recognisedIndex = $restartStart; $recognisedIndex <= $restartEnd; $recognisedIndex++) {
                    $extraWords[] = $this->extraWordPayload([
                        'recognised_index' => $recognisedIndex,
                        'expected_index' => $liveRestart['restart_start_index'],
                        'restart_start_index' => $liveRestart['restart_start_index'],
                        'restart_end_index' => $liveRestart['restart_end_index'],
                        'recognised_start_index' => $restartStart,
                        'recognised_end_index' => $restartEnd,
                    ], $heard, $units, self::TYPE_RESTART);
                }
                for ($index = $liveRestart['restart_end_index'] + 1; $index < count($statuses); $index++) {
                    $statuses[$index] = $this->deletionStatus($units[$index], $index, false);
                }
                $events[] = $this->restartEventPayload($liveRestart, $heard);
            }
        }
        $events = array_merge($events, $this->detectHesitations($statuses, $extraWords, $isFinal));

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
                'starting_anchor' => $startingAnchor,
                'pause_policy' => [
                    'hesitation_seconds' => $this->hesitationPauseSeconds(),
                    'self_correction_seconds' => $this->selfCorrectionPauseSeconds(),
                ],
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
            // Closed accent policy: voice_profile, accent_hint, loudness, and timbre
            // are never copied. Orthographic ASR variants stay in QuranTextNormalizer.
            // Dialect letter swaps (ص/س, ق/ك) stay substitutions.
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
            foreach (['token', 'speechmatics_token', 'speechmaticsToken', 'id', 'provider', 'segment_id', 'segmentId'] as $key) {
                if (array_key_exists($key, $entry) && is_scalar($entry[$key])) {
                    $heard[$key] = $entry[$key];
                }
            }
            if (is_numeric($entry['start'] ?? $entry['startTime'] ?? $entry['start_time'] ?? null)) {
                $heard['start'] = (float) ($entry['start'] ?? $entry['startTime'] ?? $entry['start_time']);
            }
            if (is_numeric($entry['end'] ?? $entry['endTime'] ?? $entry['end_time'] ?? null)) {
                $heard['end'] = (float) ($entry['end'] ?? $entry['endTime'] ?? $entry['end_time']);
            }
            // Keep adjacent duplicates so intentional learner repetitions survive.
            // DP marks them as extras with a cheaper repetition cost.
            $out[] = $heard;
        }

        return $out;
    }

    /**
     * Expand agglutinations and drop leading ASR junk before DP.
     *
     * @param  list<string>  $targetWords
     * @param  list<array{word:string,confidence:float}>  $heard
     * @return array{heard:list<array{word:string,confidence:float}>,leading_extras:list<array{word:string,confidence:float}>,absorbed_echoes:list<array{word:string,confidence:float}>}
     */
    private function prepareHeardWordsForAlignment(array $targetWords, array $heard): array
    {
        $expanded = $this->expandAgglutinatedHeardWords($targetWords, $heard);
        $stripped = $this->stripLeadingHeardJunk($targetWords, $expanded['heard']);

        return [
            'heard' => $stripped['heard'],
            'leading_extras' => $stripped['leading_extras'],
            'absorbed_echoes' => $expanded['absorbed_echoes'],
        ];
    }

    /**
     * Speechmatics often glues adjacent ayah words (بسمالله, الحمدلله). Expand
     * those compounds against the expected sequence before DP so the first
     * slot is not painted as a false SUBSTITUTION. Also absorb a following
     * echo of the glued tail so الله cannot lock onto a later لله.
     *
     * @param  list<string>  $targetWords
     * @param  list<array{word:string,confidence:float}>  $heard
     * @return array{heard:list<array{word:string,confidence:float}>,absorbed_echoes:list<array{word:string,confidence:float}>}
     */
    private function expandAgglutinatedHeardWords(array $targetWords, array $heard): array
    {
        if ($targetWords === [] || $heard === []) {
            return ['heard' => $heard, 'absorbed_echoes' => []];
        }

        $expanded = [];
        $absorbedEchoes = [];
        $cursor = 0;
        $count = count($heard);
        for ($index = 0; $index < $count; $index++) {
            $entry = $heard[$index];
            $parts = $this->tryExpandAgglutinatedHeardWord($entry, $targetWords, $cursor);
            $consumedExtra = 0;
            if ($parts === null && $index + 1 < $count) {
                $next = $heard[$index + 1];
                $left = (string) ($entry['word'] ?? '');
                $right = (string) ($next['word'] ?? '');
                $leftInTarget = false;
                $rightInTarget = false;
                foreach ($targetWords as $target) {
                    if ($this->similarity($target, $left) >= RecitationScoringThresholds::CORRECT_SIMILARITY) {
                        $leftInTarget = true;
                    }
                    if ($this->similarity($target, $right) >= RecitationScoringThresholds::CORRECT_SIMILARITY) {
                        $rightInTarget = true;
                    }
                }
                if (
                    mb_strlen($left) >= 2
                    && mb_strlen($right) >= 1
                    && (mb_strlen($left) + mb_strlen($right)) >= 4
                    && ! $leftInTarget
                    && ! $rightInTarget
                ) {
                    $joined = $entry;
                    $joined['word'] = $left.$right;
                    $joined['raw_word'] = ((string) ($entry['raw_word'] ?? $left)).((string) ($next['raw_word'] ?? $right));
                    $parts = $this->tryExpandAgglutinatedHeardWord($joined, $targetWords, $cursor);
                    if ($parts !== null) {
                        $consumedExtra = 1;
                    }
                }
            }
            if ($parts !== null) {
                foreach ($parts as $part) {
                    $expanded[] = $part;
                }
                $cursor = min(count($targetWords), $cursor + count($parts));
                $index += $consumedExtra;
                $echoIndex = $index + 1;
                if ($echoIndex < $count) {
                    $lastPart = $parts[count($parts) - 1];
                    $echo = $heard[$echoIndex];
                    if ($this->similarity((string) ($lastPart['word'] ?? ''), (string) ($echo['word'] ?? '')) >= RecitationScoringThresholds::CORRECT_SIMILARITY) {
                        $echo['agglutination_echo'] = true;
                        $absorbedEchoes[] = $echo;
                        $index = $echoIndex;
                    }
                }

                continue;
            }
            $expanded[] = $entry;
            $heardWord = (string) ($entry['word'] ?? '');
            if (
                $cursor < count($targetWords)
                && $this->similarity($targetWords[$cursor], $heardWord) >= RecitationScoringThresholds::CORRECT_SIMILARITY
            ) {
                $cursor++;
            }
        }

        return ['heard' => $expanded, 'absorbed_echoes' => $absorbedEchoes];
    }

    /**
     * @param  array{word:string,confidence:float}  $entry
     * @param  list<string>  $targetWords
     * @return list<array{word:string,confidence:float}>|null
     */
    private function tryExpandAgglutinatedHeardWord(array $entry, array $targetWords, int $preferredStart = 0): ?array
    {
        $heardNormalized = (string) ($entry['word'] ?? '');
        if ($heardNormalized === '' || mb_strlen($heardNormalized) < 4) {
            return null;
        }
        foreach ($targetWords as $target) {
            if ($this->similarity($target, $heardNormalized) >= RecitationScoringThresholds::CORRECT_SIMILARITY) {
                return null;
            }
        }

        $starts = [];
        $preferred = max(0, min(count($targetWords) - 1, $preferredStart));
        if ($targetWords !== []) {
            $starts[] = $preferred;
        }
        for ($index = 0; $index < count($targetWords); $index++) {
            if ($index !== $preferred) {
                $starts[] = $index;
            }
        }

        $best = null;
        foreach ($starts as $start) {
            $concat = '';
            $parts = [];
            for ($end = $start; $end < count($targetWords) && count($parts) < 4; $end++) {
                $concat .= $targetWords[$end];
                $parts[] = $targetWords[$end];
                if (count($parts) < 2) {
                    continue;
                }
                if (! $this->agglutinationFormsMatch($concat, $heardNormalized)) {
                    continue;
                }
                if (
                    $best === null
                    || count($parts) > count($best['parts'])
                    || (count($parts) === count($best['parts']) && $start < $best['start'])
                ) {
                    $best = ['parts' => $parts, 'start' => $start];
                }
            }
        }
        if ($best === null) {
            return null;
        }

        $out = [];
        foreach ($best['parts'] as $index => $word) {
            $part = $entry;
            $part['word'] = $word;
            $part['agglutinated_from'] = $heardNormalized;
            $part['agglutinated_part_index'] = $index;
            $part['agglutinated_part_count'] = count($best['parts']);
            if ($index > 0) {
                unset($part['start'], $part['end'], $part['token'], $part['speechmatics_token'], $part['speechmaticsToken'], $part['id']);
                $part['raw_word'] = $word;
            }
            $out[] = $part;
        }

        return $out;
    }

    private function agglutinationFormsMatch(string $concatenatedTarget, string $heardNormalized): bool
    {
        if ($concatenatedTarget === '' || $heardNormalized === '') {
            return false;
        }
        if ($concatenatedTarget === $heardNormalized) {
            return true;
        }
        if ($this->alefOptionalEqual($concatenatedTarget, $heardNormalized)) {
            return true;
        }
        if (mb_strlen($concatenatedTarget) >= 5 && mb_strlen($heardNormalized) >= 5) {
            $left = $this->stripAlefForCompare($concatenatedTarget);
            $right = $this->stripAlefForCompare($heardNormalized);
            if ($left !== '' && $right !== '' && $this->levenshteinDistance($left, $right) <= 1) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  list<string>  $targetWords
     * @param  list<array{word:string,confidence:float}>  $heard
     * @return array{heard:list<array{word:string,confidence:float}>,leading_extras:list<array{word:string,confidence:float}>}
     */
    private function stripLeadingHeardJunk(array $targetWords, array $heard): array
    {
        if (count($targetWords) < 2 || count($heard) < 2) {
            return ['heard' => $heard, 'leading_extras' => []];
        }

        $openingTarget = $targetWords[0];
        $openingSim = $this->similarity($openingTarget, (string) ($heard[0]['word'] ?? ''));
        if ($openingSim >= 0.48) {
            return ['heard' => $heard, 'leading_extras' => []];
        }

        $maxDrop = min(3, count($heard) - 1);
        $best = null;
        for ($drop = 1; $drop <= $maxDrop; $drop++) {
            $leading = array_slice($heard, 0, $drop);
            $allJunk = true;
            foreach ($leading as $entry) {
                if (! $this->isLikelyLeadingAsrJunk($entry, $targetWords, $openingTarget)) {
                    $allJunk = false;
                    break;
                }
            }
            if (! $allJunk) {
                continue;
            }
            $rest = array_slice($heard, $drop);
            for ($startTarget = 0; $startTarget <= min(2, count($targetWords) - 1); $startTarget++) {
                $length = 0;
                $reliable = 0;
                while (
                    $length < count($rest)
                    && ($startTarget + $length) < count($targetWords)
                    && $this->similarity($targetWords[$startTarget + $length], (string) ($rest[$length]['word'] ?? '')) >= RecitationScoringThresholds::CORRECT_SIMILARITY
                ) {
                    if ((float) ($rest[$length]['confidence'] ?? 1) >= RecitationScoringThresholds::UNCERTAIN_CONFIDENCE) {
                        $reliable++;
                    }
                    $length++;
                }
                if ($length < 2 || $reliable < 2) {
                    continue;
                }
                if (
                    $best === null
                    || $length > $best['length']
                    || ($length === $best['length'] && $drop < $best['drop'])
                    || ($length === $best['length'] && $drop === $best['drop'] && $startTarget < $best['start_target'])
                ) {
                    $best = [
                        'drop' => $drop,
                        'start_target' => $startTarget,
                        'length' => $length,
                        'leading' => $leading,
                        'rest' => $rest,
                    ];
                }
            }
        }
        if ($best === null) {
            return ['heard' => $heard, 'leading_extras' => []];
        }

        return ['heard' => $best['rest'], 'leading_extras' => $best['leading']];
    }

    /**
     * @param  array{word:string,confidence?:float}  $heardWord
     * @param  list<string>  $targetWords
     */
    private function isLikelyLeadingAsrJunk(array $heardWord, array $targetWords, string $openingTarget): bool
    {
        $word = (string) ($heardWord['word'] ?? '');
        if ($word === '') {
            return true;
        }
        if ($this->similarity($openingTarget, $word) >= 0.48) {
            return false;
        }
        foreach ($targetWords as $target) {
            if ($this->similarity($target, $word) >= RecitationScoringThresholds::CORRECT_SIMILARITY) {
                return false;
            }
        }
        if (mb_strlen($word) <= 3) {
            return true;
        }
        if ((float) ($heardWord['confidence'] ?? 1) < RecitationScoringThresholds::UNCERTAIN_CONFIDENCE) {
            return true;
        }

        return false;
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
            || $this->stripClitics($target) === $this->stripClitics($heard)
            || $this->alefOptionalEqual($target, $heard)
            || $this->alefOptionalEqual($this->stripArticle($target), $this->stripArticle($heard))) {
            return 0.0;
        }
        if ($similarity >= 0.99) {
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

        // Keep a clear mismatch attached to the current expected slot. A
        // higher cost lets DP skip the beginning of a coherent wrong phrase
        // and attach its tokens to later words, losing drift indexes.
        return $confidence < RecitationScoringThresholds::UNCERTAIN_CONFIDENCE ? 1.45 : 0.85;
    }

    /**
     * @param  list<array{word:string,confidence:float}>  $heard
     */
    private function extraCost(array $heard, int $index): float
    {
        // Recognition uncertainty is not enough evidence to insert a learner
        // word into the Qur'an sequence. Keep the token for diagnostics, but
        // prefer consuming it as an uncertain alignment when possible.
        if ((float) ($heard[$index]['confidence'] ?? 1) < RecitationScoringThresholds::UNCERTAIN_CONFIDENCE) {
            return 1.8;
        }
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
     * Find a reliable anchor for the first recognised word in a target range.
     * A later single word is useful only when it is confident and unique;
     * consecutive words provide the context needed to disambiguate repeats.
     *
     * @param  list<string>  $targetWords
     * @param  list<array<string,mixed>>  $heard
     * @return array{expected_index:int,recognised_index:int,length:int}|null
     */
    private function findStartingAnchor(array $targetWords, array $heard): ?array
    {
        if (count($targetWords) < 2 || $heard === []) {
            return null;
        }

        $first = $heard[0];
        $firstWord = (string) ($first['word'] ?? '');
        if ($firstWord === '') {
            return null;
        }

        $matches = function (int $targetIndex, int $heardIndex) use ($targetWords, $heard): bool {
            $target = $targetWords[$targetIndex] ?? '';
            $actual = (string) ($heard[$heardIndex]['word'] ?? '');

            return $target !== ''
                && $actual !== ''
                && $this->similarity($target, $actual) >= RecitationScoringThresholds::CORRECT_SIMILARITY;
        };

        $candidates = [];
        for ($expectedIndex = 1; $expectedIndex < count($targetWords); $expectedIndex++) {
            if (! $matches($expectedIndex, 0)) {
                continue;
            }

            $length = 0;
            $confidenceSum = 0.0;
            $reliableCount = 0;
            while ($matches($expectedIndex + $length, $length)) {
                $confidence = (float) ($heard[$length]['confidence'] ?? 1);
                $confidenceSum += $confidence;
                $reliableCount += $confidence >= RecitationScoringThresholds::UNCERTAIN_CONFIDENCE ? 1 : 0;
                $length++;
            }

            // One token cannot choose between repeated target words. Even a
            // unique fuzzy match is too weak to redefine the starting point.
            if ($length === 1) {
                if ($reliableCount !== 1) {
                    continue;
                }
                $occurrences = 0;
                foreach ($targetWords as $targetIndex => $targetWord) {
                    if ($this->similarity($targetWord, $firstWord) >= RecitationScoringThresholds::CORRECT_SIMILARITY) {
                        $occurrences++;
                    }
                }
                if ($occurrences !== 1 || $this->similarity($targetWords[$expectedIndex], $firstWord) < 0.99) {
                    continue;
                }
            } elseif ($reliableCount === 0) {
                // Consecutive lexical matches can support one uncertain token,
                // but a wholly uncertain phrase is not a starting anchor.
                continue;
            }

            $candidates[] = [
                'expected_index' => $expectedIndex,
                'recognised_index' => 0,
                'length' => $length,
                'confidence_sum' => $confidenceSum,
            ];
        }

        if ($candidates === []) {
            return null;
        }

        usort($candidates, static function (array $left, array $right): int {
            return [$right['length'], $right['confidence_sum'], $left['expected_index']]
                <=> [$left['length'], $left['confidence_sum'], $right['expected_index']];
        });

        $best = $candidates[0];

        return [
            'expected_index' => (int) $best['expected_index'],
            'recognised_index' => 0,
            'length' => (int) $best['length'],
        ];
    }

    /**
     * Keep a non-anchored first token on the expected opening slot. Once a
     * reliable later anchor exists, make that anchor cheaper than a false
     * substitution on the opening word.
     */
    private function startingAnchorAdjustment(?array $anchor, int $expectedIndex, int $recognisedIndex): float
    {
        if ($recognisedIndex !== 0 || $expectedIndex === 0) {
            return 0.0;
        }

        if ($anchor === null) {
            return 2.0;
        }

        return $expectedIndex === (int) $anchor['expected_index'] ? -0.4 : 2.0;
    }

    /**
     * @param  list<array<string,mixed>>  $operations
     * @param  list<string>  $targetWords
     * @param  list<array<string,mixed>>  $heard
     * @return list<array<string,mixed>>
     */
    private function classifyOperationContext(
        array $operations,
        array $targetWords,
        array $heard,
        bool $isFinal,
        ?array $startingAnchor = null
    ): array
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

        foreach ($this->detectRestartGroups($operations, $targetWords, $heard) as $group) {
            foreach ($operations as $i => $operation) {
                $recognisedIndex = (int) ($operation['recognised_index'] ?? -1);
                if (($operation['op'] ?? '') !== 'extra'
                    || $recognisedIndex < $group['recognised_start_index']
                    || $recognisedIndex > $group['recognised_end_index']) {
                    continue;
                }
                $operations[$i]['type'] = self::TYPE_RESTART;
                $operations[$i] = array_merge($operations[$i], $group);
            }
        }

        // A self-correction is one contiguous wrong path which returns to the
        // expected target. Require a timed re-alignment pause so ordinary
        // insertions remain unresolved, and let restart/repetition evidence
        // take precedence over correction.
        foreach ($this->detectSelfCorrectionGroups($operations, $targetWords, $heard) as $group) {
            foreach ($operations as $i => $operation) {
                $recognisedIndex = (int) ($operation['recognised_index'] ?? -1);
                if (($operation['op'] ?? '') !== 'extra'
                    || $recognisedIndex < $group['recognised_start_index']
                    || $recognisedIndex > $group['recognised_end_index']) {
                    continue;
                }
                $operations[$i]['type'] = self::TYPE_SELF_CORRECTION;
                $operations[$i] = array_merge($operations[$i], $group);
            }
        }

        // If a learner starts in the middle and then restarts from the
        // beginning, DP keeps the later complete pass as the authoritative
        // alignment. Reclassify the discarded initial partial pass as amber
        // restart evidence instead of a red insertion.
        $midStartRestart = $this->detectMidStartRestart($targetWords, $heard, $startingAnchor, $isFinal);
        if ($midStartRestart !== null) {
            foreach ($operations as $i => $operation) {
                $recognisedIndex = (int) ($operation['recognised_index'] ?? -1);
                if (($operation['op'] ?? '') !== 'extra'
                    || $recognisedIndex < $midStartRestart['recognised_start_index']
                    || $recognisedIndex > $midStartRestart['recognised_end_index']) {
                    continue;
                }
                $operations[$i]['type'] = self::TYPE_RESTART;
                $operations[$i] = array_merge($operations[$i], $midStartRestart);
            }
        }

        $anchorRuns = [];
        for ($start = 0; $start < $count;) {
            $length = $this->reliableAnchorRunLength($operations, $start, $targetWords, $heard);
            if ($length >= 2) {
                $anchorRuns[] = [
                    'start' => $start,
                    'end' => $start + $length - 1,
                ];
                $start += $length;
            } else {
                $start++;
            }
        }

        // If the path has no return anchor, rebase a confident coherent tail
        // from the last stable anchor. This prevents DP from shifting the
        // wrong phrase onto later expected slots (and preserves its indexes).
        if (count($anchorRuns) === 1) {
            $anchor = $anchorRuns[0];
            $divergentMatches = 0;
            for ($j = $anchor['end'] + 1; $j < $count; $j++) {
                $recognisedIndex = (int) ($operations[$j]['recognised_index'] ?? -1);
                if (($operations[$j]['op'] ?? '') === 'match'
                    && ($operations[$j]['type'] ?? '') === self::TYPE_SUBSTITUTION
                    && (float) ($heard[$recognisedIndex]['confidence'] ?? 1) >= RecitationScoringThresholds::UNCERTAIN_CONFIDENCE) {
                    $divergentMatches++;
                }
            }
            if ($divergentMatches >= 2) {
                $nextExpected = (int) ($operations[$anchor['end']]['expected_index'] ?? -1) + 1;
                $nextRecognised = (int) ($operations[$anchor['end']]['recognised_index'] ?? -1) + 1;
                $rebased = array_slice($operations, 0, $anchor['end'] + 1);
                while ($nextExpected < count($targetWords) && $nextRecognised < count($heard)) {
                    $similarity = $this->similarity($targetWords[$nextExpected], $heard[$nextRecognised]['word']);
                    $confidence = (float) ($heard[$nextRecognised]['confidence'] ?? 1);
                    $rebased[] = [
                        'op' => 'match',
                        'expected_index' => $nextExpected,
                        'recognised_index' => $nextRecognised,
                        'similarity' => $similarity,
                        'type' => $confidence < RecitationScoringThresholds::UNCERTAIN_CONFIDENCE
                            ? self::TYPE_UNASSESSED
                            : ($similarity >= RecitationScoringThresholds::CORRECT_SIMILARITY
                                ? self::TYPE_MATCH
                                : self::TYPE_SUBSTITUTION),
                    ];
                    $nextExpected++;
                    $nextRecognised++;
                }
                while ($nextExpected < count($targetWords)) {
                    $rebased[] = [
                        'op' => 'omission',
                        'expected_index' => $nextExpected,
                        'recognised_index' => null,
                        'similarity' => 0.0,
                        'type' => $isFinal ? self::TYPE_DELETION : self::TYPE_UNASSESSED,
                    ];
                    $nextExpected++;
                }
                while ($nextRecognised < count($heard)) {
                    $rebased[] = [
                        'op' => 'extra',
                        'expected_index' => count($targetWords),
                        'recognised_index' => $nextRecognised,
                        'similarity' => 0.0,
                        'type' => self::TYPE_OUT_OF_RANGE,
                    ];
                    $nextRecognised++;
                }
                $operations = $rebased;
                $count = count($operations);
            }
        }

        // A wrong-ayah opening has no earlier anchor. Two confident
        // substitutions before the first two-word return are divergence.
        // One shared word is not enough to resynchronise.
        if ($anchorRuns !== [] && (int) $anchorRuns[0]['start'] >= 2) {
            $recovery = $anchorRuns[0];
            $openingDivergence = 0;
            for ($j = 0; $j < $recovery['start']; $j++) {
                if (($operations[$j]['op'] ?? '') !== 'match') {
                    continue;
                }
                $recognisedIndex = (int) ($operations[$j]['recognised_index'] ?? -1);
                if (($operations[$j]['type'] ?? '') === self::TYPE_SUBSTITUTION
                    && (float) ($heard[$recognisedIndex]['confidence'] ?? 1) >= RecitationScoringThresholds::UNCERTAIN_CONFIDENCE) {
                    $openingDivergence++;
                }
            }
            if ($openingDivergence >= 2) {
                for ($j = 0; $j < $recovery['start']; $j++) {
                    if (($operations[$j]['op'] ?? '') === 'match'
                        && ($operations[$j]['type'] ?? '') === self::TYPE_SUBSTITUTION) {
                        $operations[$j]['type'] = self::TYPE_DIVERGENCE;
                    }
                }
                $operations[$recovery['start']]['type'] = self::TYPE_REALIGNMENT;
            }
        }

        // One matching word inside a similar phrase is not enough evidence to
        // resynchronise. Require a two-word expected/recognised anchor on the
        // far side of a coherent, confident wrong span.
        for ($runIndex = 1, $runCount = count($anchorRuns); $runIndex < $runCount; $runIndex++) {
            $previous = $anchorRuns[$runIndex - 1];
            $recovery = $anchorRuns[$runIndex];
            $start = $previous['end'] + 1;
            $end = $recovery['start'] - 1;
            $divergentMatches = 0;
            for ($j = $start; $j <= $end; $j++) {
                if (($operations[$j]['op'] ?? '') !== 'match') {
                    continue;
                }
                $recognisedIndex = (int) ($operations[$j]['recognised_index'] ?? -1);
                if (($operations[$j]['type'] ?? '') === self::TYPE_SUBSTITUTION
                    && (float) ($heard[$recognisedIndex]['confidence'] ?? 1) >= RecitationScoringThresholds::UNCERTAIN_CONFIDENCE) {
                    $divergentMatches++;
                }
            }
            if ($divergentMatches < 2) {
                continue;
            }

            for ($j = $start; $j <= $end; $j++) {
                if (($operations[$j]['op'] ?? '') !== 'extra') {
                    $operations[$j]['type'] = self::TYPE_DIVERGENCE;
                }
            }
            $operations[$recovery['start']]['type'] = self::TYPE_REALIGNMENT;
        }

        // No return anchor: keep only confident wrong matches as an
        // unresolved divergence. Omissions and low-confidence recognition
        // remain ordinary missing/uncertain results.
        if ($anchorRuns !== []) {
            $lastAnchor = $anchorRuns[count($anchorRuns) - 1];
            $start = $lastAnchor['end'] + 1;
            $divergentMatches = 0;
            for ($j = $start; $j < $count; $j++) {
                if (($operations[$j]['op'] ?? '') !== 'match') {
                    continue;
                }
                $recognisedIndex = (int) ($operations[$j]['recognised_index'] ?? -1);
                if (($operations[$j]['type'] ?? '') === self::TYPE_SUBSTITUTION
                    && (float) ($heard[$recognisedIndex]['confidence'] ?? 1) >= RecitationScoringThresholds::UNCERTAIN_CONFIDENCE) {
                    $divergentMatches++;
                }
            }
            if ($divergentMatches >= 2) {
                for ($j = $start; $j < $count; $j++) {
                    if (($operations[$j]['op'] ?? '') === 'match'
                        && ($operations[$j]['type'] ?? '') === self::TYPE_SUBSTITUTION) {
                        $operations[$j]['type'] = self::TYPE_DIVERGENCE;
                    }
                }
            }
        }

        return $operations;
    }

    /**
     * Detect a partial mid-ayah attempt which is abandoned when the learner
     * subsequently says the opening words. This is deliberately phrase-gated
     * and never treats one word as restart evidence.
     *
     * @param  array{expected_index:int,recognised_index:int,length:int}|null  $startingAnchor
     * @return array<string,int>|null
     */
    private function detectMidStartRestart(array $targetWords, array $heard, ?array $startingAnchor, bool $isFinal): ?array
    {
        if ($startingAnchor === null || (int) ($startingAnchor['expected_index'] ?? 0) < 1) {
            return null;
        }
        $length = (int) ($startingAnchor['length'] ?? 0);
        if ($length < 2 || count($heard) <= $length + 1) {
            return null;
        }

        $matches = function (int $targetIndex, int $heardIndex) use ($targetWords, $heard): bool {
            $target = $targetWords[$targetIndex] ?? '';
            $actual = (string) ($heard[$heardIndex]['word'] ?? '');
            $confidence = (float) ($heard[$heardIndex]['confidence'] ?? 1);

            return $target !== ''
                && $actual !== ''
                && $confidence >= RecitationScoringThresholds::UNCERTAIN_CONFIDENCE
                && $this->similarity($target, $actual) >= RecitationScoringThresholds::CORRECT_SIMILARITY;
        };

        for ($index = $length; $index + 1 < count($heard); $index++) {
            if (! $matches(0, $index) || ! $matches(1, $index + 1)) {
                continue;
            }
            $hasContinuation = $index + 2 >= count($heard)
                || ! isset($targetWords[2])
                || $matches(2, $index + 2);
            if (! $hasContinuation) {
                continue;
            }
            if (! $isFinal && $index + 2 >= count($heard)) {
                continue;
            }

            return [
                'restart_start_index' => 0,
                'restart_end_index' => (int) ($startingAnchor['expected_index'] ?? 1) + $length - 1,
                'recognised_start_index' => 0,
                'recognised_end_index' => $length - 1,
                'restartStartIndex' => 0,
                'restartEndIndex' => (int) ($startingAnchor['expected_index'] ?? 1) + $length - 1,
                'recognisedStartIndex' => 0,
                'recognisedEndIndex' => $length - 1,
            ];
        }

        return null;
    }

    /**
     * Count a consecutive, high-confidence expected/recognised anchor run.
     *
     * @param  list<array<string,mixed>>  $operations
     * @param  list<string>  $targetWords
     * @param  list<array<string,mixed>>  $heard
     */
    private function reliableAnchorRunLength(array $operations, int $start, array $targetWords, array $heard): int
    {
        $length = 0;
        $previousExpected = null;
        $previousRecognised = null;
        for ($index = $start, $count = count($operations); $index < $count; $index++) {
            $operation = $operations[$index] ?? [];
            if (! $this->isResolvedMatchOperation($operation, $targetWords, $heard)) {
                break;
            }
            $expectedIndex = (int) ($operation['expected_index'] ?? -1);
            $recognisedIndex = (int) ($operation['recognised_index'] ?? -1);
            if ($previousExpected !== null
                && ($expectedIndex !== $previousExpected + 1 || $recognisedIndex !== $previousRecognised + 1)) {
                break;
            }
            if ((float) ($heard[$recognisedIndex]['confidence'] ?? 1) < RecitationScoringThresholds::UNCERTAIN_CONFIDENCE) {
                break;
            }
            $length++;
            $previousExpected = $expectedIndex;
            $previousRecognised = $recognisedIndex;
        }

        return $length;
    }

    /**
     * @param  list<array<string,mixed>>  $operations
     * @param  list<string>  $targetWords
     * @param  list<array<string,mixed>>  $heard
     */
    private function classifyExtraOperation(array $operations, int $index, array $targetWords, array $heard): string
    {
        if (! empty($operations[$index]['agglutination_echo'])) {
            return self::TYPE_REPETITION;
        }
        if (! empty($operations[$index]['leading_asr_junk'])) {
            return self::TYPE_INSERTION;
        }
        $recognisedIndex = (int) ($operations[$index]['recognised_index'] ?? -1);
        $expectedIndex = (int) ($operations[$index]['expected_index'] ?? -1);
        $word = (string) ($heard[$recognisedIndex]['word'] ?? '');

        $confidence = (float) ($heard[$recognisedIndex]['confidence'] ?? 1);
        $previousRecognised = $recognisedIndex > 0 ? (string) ($heard[$recognisedIndex - 1]['word'] ?? '') : '';
        $isStructuralExtra = $word !== '' && (
            $word === $previousRecognised
            || in_array($word, array_slice($targetWords, 0, max(0, $expectedIndex)), true)
            || in_array($word, $targetWords, true)
        );
        if ($confidence < RecitationScoringThresholds::UNCERTAIN_CONFIDENCE && ! $isStructuralExtra) {
            return self::TYPE_UNASSESSED;
        }

        if ($expectedIndex >= count($targetWords)) {
            return self::TYPE_OUT_OF_RANGE;
        }

        if ($word !== '' && $previousRecognised !== '' && $word === $previousRecognised) {
            return self::TYPE_REPETITION;
        }

        return self::TYPE_INSERTION;
    }

    /**
     * @param  list<array<string,mixed>>  $operations
     * @param  list<string>  $targetWords
     * @param  list<array<string,mixed>>  $heard
     * @return list<array<string,mixed>>
     */
    private function detectSelfCorrectionGroups(array $operations, array $targetWords, array $heard): array
    {
        $groups = [];
        $count = count($operations);
        for ($index = 0; $index < $count; $index++) {
            $operation = $operations[$index] ?? [];
            if (($operation['op'] ?? '') !== 'extra' || ($operation['type'] ?? '') !== self::TYPE_INSERTION) {
                continue;
            }
            $expectedIndex = (int) ($operation['expected_index'] ?? -1);
            $recognisedStart = (int) ($operation['recognised_index'] ?? -1);
            $word = (string) ($heard[$recognisedStart]['word'] ?? '');
            if ($expectedIndex < 0 || $recognisedStart < 0 || $word === '') {
                continue;
            }
            // Earlier target words indicate repetition/backtracking. A longer
            // repeated span has already been labelled RESTART above.
            if (in_array($word, array_slice($targetWords, 0, $expectedIndex), true)) {
                continue;
            }

            $end = $index;
            while ($end + 1 < $count
                && ($operations[$end + 1]['op'] ?? '') === 'extra'
                && ($operations[$end + 1]['type'] ?? '') === self::TYPE_INSERTION
                && (int) ($operations[$end + 1]['expected_index'] ?? -1) === $expectedIndex
                && (int) ($operations[$end + 1]['recognised_index'] ?? -1) === (int) ($operations[$end]['recognised_index'] ?? -2) + 1
            ) {
                $end++;
            }

            $correction = $operations[$end + 1] ?? null;
            $isResolvedCorrection = is_array($correction)
                && ($correction['op'] ?? '') === 'match'
                && (int) ($correction['expected_index'] ?? -1) === $expectedIndex
                && $this->isResolvedMatchOperation($correction, $targetWords, $heard);
            if (! $isResolvedCorrection) {
                continue;
            }
            $pause = $this->pauseAfter($heard, (int) ($operations[$end]['recognised_index'] ?? -1));
            if ($pause < $this->selfCorrectionPauseSeconds()) {
                continue;
            }

            $groupId = 'self-correction:'.$expectedIndex.':'.$recognisedStart.':'.(int) ($operations[$end]['recognised_index'] ?? $recognisedStart);
            $correctedEnd = $end + 1;
            while ($correctedEnd + 1 < $count
                && $this->isResolvedMatchOperation($operations[$correctedEnd + 1], $targetWords, $heard)
                && (int) ($operations[$correctedEnd + 1]['expected_index'] ?? -1) === (int) ($operations[$correctedEnd]['expected_index'] ?? -2) + 1
                && (int) ($operations[$correctedEnd + 1]['recognised_index'] ?? -1) === (int) ($operations[$correctedEnd]['recognised_index'] ?? -2) + 1
            ) {
                $correctedEnd++;
            }
            $groups[] = [
                'correction_group_id' => $groupId,
                'self_correction_group_id' => $groupId,
                'corrected_target_index' => $expectedIndex,
                'corrected_target_end_index' => (int) ($operations[$correctedEnd]['expected_index'] ?? $expectedIndex),
                'recognised_start_index' => $recognisedStart,
                'recognised_end_index' => (int) ($operations[$end]['recognised_index'] ?? $recognisedStart),
                'correction_pause_seconds' => $pause,
            ];
            $index = $end;
        }

        return $groups;
    }

    /**
     * Detect restart spans only when the DP path provides a reliable context:
     * prior progress, two consecutive earlier target words consumed as extras,
     * and a forward continuation (or a clear pause at the end of the span).
     * A lone earlier word therefore remains a repetition/insertion.
     *
     * @param  list<array<string,mixed>>  $operations
     * @param  list<string>  $targetWords
     * @param  list<array<string,mixed>>  $heard
     * @return list<array<string,int>>
     */
    private function detectRestartGroups(array $operations, array $targetWords, array $heard): array
    {
        $extrasByHeardIndex = [];
        foreach ($operations as $operation) {
            if (($operation['op'] ?? '') === 'extra') {
                $extrasByHeardIndex[(int) ($operation['recognised_index'] ?? -1)] = $operation;
            }
        }

        $resolved = function (array $operation) use ($targetWords, $heard): bool {
            return $this->isResolvedMatchOperation($operation, $targetWords, $heard);
        };
        $anchorMatches = function (int $targetIndex, int $heardIndex) use ($targetWords, $heard): bool {
            $target = $targetWords[$targetIndex] ?? '';
            $heardWord = $heard[$heardIndex] ?? [];
            $actual = (string) ($heardWord['word'] ?? '');
            $confidence = (float) ($heardWord['confidence'] ?? 1);

            return $target !== ''
                && $actual !== ''
                && $confidence >= RecitationScoringThresholds::UNCERTAIN_CONFIDENCE
                && $this->similarity($target, $actual) >= RecitationScoringThresholds::CORRECT_SIMILARITY;
        };

        $groups = [];
        $claimed = [];
        foreach ($operations as $operation) {
            if (($operation['op'] ?? '') !== 'extra') {
                continue;
            }
            $heardStart = (int) ($operation['recognised_index'] ?? -1);
            $expectedIndex = (int) ($operation['expected_index'] ?? -1);
            if ($heardStart < 0 || $expectedIndex < 1 || isset($claimed[$heardStart])) {
                continue;
            }

            $best = null;
            for ($restartStart = $expectedIndex - 1; $restartStart >= 0; $restartStart--) {
                if (! $anchorMatches($restartStart, $heardStart)) {
                    continue;
                }
                $priorProgress = false;
                foreach ($operations as $previous) {
                    if ($resolved($previous)
                        && (int) ($previous['expected_index'] ?? -1) >= $restartStart
                        && (int) ($previous['expected_index'] ?? -1) < $expectedIndex
                        && (int) ($previous['recognised_index'] ?? -1) < $heardStart) {
                        $priorProgress = true;
                        break;
                    }
                }
                if (! $priorProgress) {
                    continue;
                }

                $length = 0;
                while (isset($extrasByHeardIndex[$heardStart + $length])
                    && $anchorMatches($restartStart + $length, $heardStart + $length)) {
                    $length++;
                }
                if ($length < 2) {
                    continue;
                }

                $continuationTarget = $restartStart + $length;
                $continuationHeard = $heardStart + $length;
                $continuation = false;
                foreach ($operations as $candidate) {
                    if ((int) ($candidate['recognised_index'] ?? -1) === $continuationHeard
                        && (int) ($candidate['expected_index'] ?? -1) === $continuationTarget
                        && $resolved($candidate)) {
                        $continuation = true;
                        break;
                    }
                }
                $pause = $this->pauseAfter($heard, $heardStart - 1);
                $hasClearPause = $pause >= $this->hesitationPauseSeconds();
                if (! $continuation && ! $hasClearPause) {
                    continue;
                }

                if ($best === null || $length > ($best['restart_end_index'] - $best['restart_start_index'] + 1)) {
                    $best = [
                        'restart_start_index' => $restartStart,
                        'restart_end_index' => $restartStart + $length - 1,
                        'recognised_start_index' => $heardStart,
                        'recognised_end_index' => $heardStart + $length - 1,
                        'restartStartIndex' => $restartStart,
                        'restartEndIndex' => $restartStart + $length - 1,
                        'recognisedStartIndex' => $heardStart,
                        'recognisedEndIndex' => $heardStart + $length - 1,
                    ];
                }
            }
            if ($best === null) {
                continue;
            }
            $groups[] = $best;
            for ($index = $best['recognised_start_index']; $index <= $best['recognised_end_index']; $index++) {
                $claimed[$index] = true;
            }
        }

        return $groups;
    }

    /**
     * Live partials may end immediately after the repeated anchor, before DP
     * has a forward continuation to resolve. Two repeated target words after
     * an already heard occurrence are enough to hold the future slots pending.
     *
     * @param  list<string>  $targetWords
     * @param  list<array<string,mixed>>  $heard
     * @return array<string,int>|null
     */
    /**
     * @param  list<array<string,mixed>>  $heard
     * @param  list<string>  $targetWords
     */
    private function heardSpanShowsProgressPast(
        array $heard,
        int $fromHeard,
        int $toHeard,
        array $targetWords,
        int $pastTargetIndex,
    ): bool {
        $start = max(0, $fromHeard);
        $end = min(count($heard), max($start, $toHeard));
        $floor = max(0, $pastTargetIndex);
        for ($heardIndex = $start; $heardIndex < $end; $heardIndex++) {
            $word = trim((string) ($heard[$heardIndex]['word'] ?? ''));
            $confidence = (float) ($heard[$heardIndex]['confidence'] ?? 1);
            if ($word === '' || $confidence < RecitationScoringThresholds::UNCERTAIN_CONFIDENCE) {
                continue;
            }
            for ($targetIndex = $floor + 1, $targetCount = count($targetWords); $targetIndex < $targetCount; $targetIndex++) {
                if ($this->similarity($targetWords[$targetIndex], $word) >= RecitationScoringThresholds::CORRECT_SIMILARITY) {
                    return true;
                }
            }
        }

        return false;
    }

    private function findLiveRestartEvidence(array $targetWords, array $heard): ?array
    {
        $matches = function (int $targetIndex, int $heardIndex) use ($targetWords, $heard): bool {
            $target = $targetWords[$targetIndex] ?? '';
            $heardWord = $heard[$heardIndex] ?? [];
            $actual = (string) ($heardWord['word'] ?? '');
            $confidence = (float) ($heardWord['confidence'] ?? 1);

            return $target !== ''
                && $actual !== ''
                && $confidence >= RecitationScoringThresholds::UNCERTAIN_CONFIDENCE
                && $this->similarity($target, $actual) >= RecitationScoringThresholds::CORRECT_SIMILARITY;
        };

        for ($restartStart = 0; $restartStart + 1 < count($targetWords); $restartStart++) {
            for ($firstStart = 0; $firstStart + 1 < count($heard); $firstStart++) {
                if (! $matches($restartStart, $firstStart) || ! $matches($restartStart + 1, $firstStart + 1)) {
                    continue;
                }
                for ($secondStart = $firstStart + 2; $secondStart + 1 < count($heard); $secondStart++) {
                    if (! $matches($restartStart, $secondStart) || ! $matches($restartStart + 1, $secondStart + 1)) {
                        continue;
                    }
                    // Repeated phrases later in the passage (e.g. Al-Fatihah 1:3) are not restarts.
                    if ($this->heardSpanShowsProgressPast(
                        $heard,
                        $firstStart + 2,
                        $secondStart,
                        $targetWords,
                        $restartStart + 1,
                    )) {
                        continue;
                    }

                    return [
                        'restart_start_index' => $restartStart,
                        'restart_end_index' => $restartStart + 1,
                        'recognised_start_index' => $secondStart,
                        'recognised_end_index' => $secondStart + 1,
                        'restartStartIndex' => $restartStart,
                        'restartEndIndex' => $restartStart + 1,
                        'recognisedStartIndex' => $secondStart,
                        'recognisedEndIndex' => $secondStart + 1,
                    ];
                }
            }
        }

        return null;
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
        $restartGroups = [];
        $selfCorrectionGroups = [];
        foreach ($operations as $operation) {
            $type = (string) ($operation['type'] ?? self::TYPE_UNASSESSED);
            if (($operation['op'] ?? '') === 'match') {
                $expectedIndex = (int) ($operation['expected_index'] ?? -1);
                $recognisedIndex = (int) ($operation['recognised_index'] ?? -1);
                if (! isset($units[$expectedIndex], $heard[$recognisedIndex])) {
                    continue;
                }
                $targetWords = array_map(static fn (array $unit): string => (string) ($unit['word'] ?? ''), $units);
                $status = $this->classifyMatch(
                    (string) $units[$expectedIndex]['display'],
                    (string) $units[$expectedIndex]['word'],
                    $heard[$recognisedIndex],
                    (float) ($operation['similarity'] ?? 0.0),
                    $expectedIndex,
                    $units[$expectedIndex],
                    $targetWords
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
                if ($type === self::TYPE_INSERTION && $statuses !== []) {
                    $expectedIndex = (int) ($operation['expected_index'] ?? 0);
                    $anchorIndex = max(0, min(
                        count($statuses) - 1,
                        $expectedIndex > 0 ? $expectedIndex - 1 : 0
                    ));
                    $extra['marker_target_index'] = $anchorIndex;
                    $extra['marker_position'] = $expectedIndex > 0 ? 'after' : 'before';
                    $statuses[$anchorIndex]['attached_error_markers'] ??= [];
                    $statuses[$anchorIndex]['attached_error_markers'][] = [
                        'type' => self::TYPE_INSERTION,
                        'word' => $extra['recognised_word'] ?? $extra['word'] ?? '',
                        'recognised_index' => $extra['recognised_index'] ?? null,
                        'expected_index' => $expectedIndex,
                    ];
                }
                $extraWords[] = $extra;
                if ($type === self::TYPE_RESTART
                    && isset($operation['restart_start_index'], $operation['restart_end_index'], $operation['recognised_start_index'], $operation['recognised_end_index'])) {
                    $key = implode(':', [
                        (int) $operation['restart_start_index'],
                        (int) $operation['restart_end_index'],
                        (int) $operation['recognised_start_index'],
                        (int) $operation['recognised_end_index'],
                    ]);
                    $restartGroups[$key] = $operation;
                } elseif ($type === self::TYPE_SELF_CORRECTION) {
                    $groupKey = (string) ($operation['self_correction_group_id'] ?? $operation['correction_group_id'] ?? ($operation['recognised_index'] ?? count($selfCorrectionGroups)));
                    $selfCorrectionGroups[$groupKey] = $operation;
                } else {
                    $events[] = $extra;
                }
            }
        }

        foreach ($restartGroups as $group) {
            $events[] = $this->restartEventPayload($group, $heard);
        }
        foreach ($selfCorrectionGroups as $group) {
            $events[] = $this->selfCorrectionEventPayload($group, $heard, $units);
        }

        return [array_values($statuses), $extraWords, $events];
    }

    /**
     * @param  array<string,mixed>  $group
     * @param  list<array<string,mixed>>  $heard
     * @return array<string,mixed>
     */
    private function restartEventPayload(array $group, array $heard): array
    {
        $startIndex = (int) ($group['recognised_start_index'] ?? -1);
        $endIndex = (int) ($group['recognised_end_index'] ?? -1);
        $startTime = isset($heard[$startIndex]['start']) ? (float) $heard[$startIndex]['start'] : null;
        $endTime = isset($heard[$endIndex]['end']) ? (float) $heard[$endIndex]['end'] : null;

        return [
            'type' => self::TYPE_RESTART,
            'status' => 'extra',
            'visual_status' => 'amber',
            'highlight' => 'amber',
            'start_index' => (int) ($group['restart_start_index'] ?? 0),
            'end_index' => (int) ($group['restart_end_index'] ?? 0),
            'startIndex' => (int) ($group['restart_start_index'] ?? 0),
            'endIndex' => (int) ($group['restart_end_index'] ?? 0),
            'restart_start_index' => (int) ($group['restart_start_index'] ?? 0),
            'restart_end_index' => (int) ($group['restart_end_index'] ?? 0),
            'restartStartIndex' => (int) ($group['restart_start_index'] ?? 0),
            'restartEndIndex' => (int) ($group['restart_end_index'] ?? 0),
            'recognised_start_index' => $startIndex,
            'recognised_end_index' => $endIndex,
            'recognisedStartIndex' => $startIndex,
            'recognisedEndIndex' => $endIndex,
            'start_time' => $startTime,
            'end_time' => $endTime,
            'startTime' => $startTime,
            'endTime' => $endTime,
            'duration_seconds' => $startTime !== null && $endTime !== null ? max(0.0, $endTime - $startTime) : null,
            'duration' => $startTime !== null && $endTime !== null ? max(0.0, $endTime - $startTime) : null,
            'classification_confidence' => 0.9,
        ];
    }

    /**
     * @param  array<string,mixed>  $group
     * @param  list<array<string,mixed>>  $heard
     * @param  list<array<string,mixed>>  $units
     * @return array<string,mixed>
     */
    private function selfCorrectionEventPayload(array $group, array $heard, array $units): array
    {
        $startIndex = (int) ($group['recognised_start_index'] ?? -1);
        $endIndex = (int) ($group['recognised_end_index'] ?? -1);
        $targetIndex = (int) ($group['corrected_target_index'] ?? 0);
        $wrongTokens = [];
        for ($index = $startIndex; $index <= $endIndex; $index++) {
            $wrong = (string) ($heard[$index]['raw_word'] ?? $heard[$index]['word'] ?? '');
            if ($wrong !== '') {
                $wrongTokens[] = $wrong;
            }
        }
        $startTime = isset($heard[$startIndex]['start']) ? (float) $heard[$startIndex]['start'] : null;
        $endTime = isset($heard[$endIndex]['end']) ? (float) $heard[$endIndex]['end'] : null;
        $correctedWords = $this->correctedTargetWords($units, $targetIndex, (int) ($group['corrected_target_end_index'] ?? $targetIndex));
        $corrected = implode(' ', $correctedWords);

        return [
            'type' => self::TYPE_SELF_CORRECTION,
            'status' => 'extra',
            'visual_status' => 'amber',
            'highlight' => 'amber',
            'wrong_tokens' => $wrongTokens,
            'wrong_words' => $wrongTokens,
            'corrected_target_word' => $corrected,
            'corrected_target_words' => $correctedWords,
            'corrected_target_index' => $targetIndex,
            'corrected_target_end_index' => (int) ($group['corrected_target_end_index'] ?? $targetIndex),
            'correction_group_id' => $group['correction_group_id'] ?? $group['self_correction_group_id'] ?? null,
            'self_correction_group_id' => $group['self_correction_group_id'] ?? $group['correction_group_id'] ?? null,
            'recognised_start_index' => $startIndex,
            'recognised_end_index' => $endIndex,
            'start_time' => $startTime,
            'end_time' => $endTime,
            'duration_seconds' => $startTime !== null && $endTime !== null ? max(0.0, $endTime - $startTime) : null,
            'correction_pause_seconds' => $group['correction_pause_seconds'] ?? null,
            'classification_confidence' => 0.88,
        ];
    }

    /**
     * @param  list<array<string,mixed>>  $units
     * @return list<string>
     */
    private function correctedTargetWords(array $units, int $start, int $end): array
    {
        $words = [];
        for ($index = $start; $index <= $end; $index++) {
            $word = (string) ($units[$index]['display'] ?? '');
            if ($word !== '') {
                $words[] = $word;
            }
        }

        return $words;
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
            // A confirmed omission is a learner error on the expected word.
            // Keep status=missing for API/analytics compatibility, but expose
            // the visual error as red. Live omissions remain neutral.
            'visual_status' => $isFinal ? 'red' : 'uncertain',
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
        $recognisedIndex = array_key_exists('recognised_index', $operation) && $operation['recognised_index'] !== null
            ? (int) $operation['recognised_index']
            : -1;
        $expectedIndex = (int) ($operation['expected_index'] ?? 0);
        $word = is_array($operation['leading_heard'] ?? null)
            ? $operation['leading_heard']
            : ($heard[$recognisedIndex] ?? []);
        $expectedUnit = $units[max(0, min(count($units) - 1, $expectedIndex))] ?? null;
        $visual = $type === self::TYPE_UNASSESSED
            ? 'uncertain'
            : (in_array($type, [self::TYPE_REPETITION, self::TYPE_SELF_CORRECTION, self::TYPE_RESTART], true)
            ? 'amber'
            : ($type === self::TYPE_INSERTION ? 'red' : 'grey'));

        $payload = [
            'word' => (string) ($word['word'] ?? ''),
            'raw_word' => (string) ($word['raw_word'] ?? $word['word'] ?? ''),
            'display_word' => '',
            'expected_word' => $expectedUnit['display'] ?? '',
            'expected_index' => $expectedIndex,
            'recognised_word' => (string) ($word['raw_word'] ?? $word['word'] ?? ''),
            'recognised_index' => $recognisedIndex >= 0 ? $recognisedIndex : null,
            'token' => $word['token'] ?? $word['speechmatics_token'] ?? $word['speechmaticsToken'] ?? $word['id'] ?? null,
            'speechmatics_token' => $word['speechmatics_token'] ?? $word['speechmaticsToken'] ?? $word['token'] ?? $word['id'] ?? null,
            'provider' => $word['provider'] ?? null,
            'speechmatics_confidence' => (float) ($word['confidence'] ?? 1),
            'classification_confidence' => in_array($type, [self::TYPE_REPETITION, self::TYPE_RESTART], true)
                ? 0.9
                : ($type === self::TYPE_SELF_CORRECTION ? 0.88 : 0.72),
            'confidence' => (float) ($word['confidence'] ?? 1),
            'status' => 'extra',
            'type' => $type,
            'legacy_type' => $type === self::TYPE_REPETITION ? 'repetition' : 'extra',
            'visual_status' => $visual,
            'highlight' => in_array($type, [self::TYPE_UNASSESSED, self::TYPE_OUT_OF_RANGE], true)
                ? 'neutral'
                : ($type === self::TYPE_INSERTION ? 'red' : 'amber'),
        ];
        if (! empty($operation['leading_asr_junk'])) {
            $payload['leading_asr_junk'] = true;
        }
        if ($type === self::TYPE_SELF_CORRECTION) {
            $correctedWords = $this->correctedTargetWords(
                $units,
                (int) ($operation['corrected_target_index'] ?? $expectedIndex),
                (int) ($operation['corrected_target_end_index'] ?? $expectedIndex)
            );
            $payload['correction_group_id'] = $operation['correction_group_id'] ?? $operation['self_correction_group_id'] ?? null;
            $payload['self_correction_group_id'] = $operation['self_correction_group_id'] ?? $operation['correction_group_id'] ?? null;
            $payload['corrected_target_index'] = $operation['corrected_target_index'] ?? $expectedIndex;
            $payload['corrected_target_word'] = (string) ($units[(int) ($payload['corrected_target_index'] ?? $expectedIndex)]['display'] ?? '');
            $payload['corrected_target_end_index'] = $operation['corrected_target_end_index'] ?? $expectedIndex;
            $payload['corrected_target_words'] = $correctedWords;
            $payload['wrong_token'] = $payload['recognised_word'];
        }
        if ($type === self::TYPE_RESTART) {
            $payload['start_index'] = (int) ($operation['restart_start_index'] ?? $expectedIndex);
            $payload['end_index'] = (int) ($operation['restart_end_index'] ?? $expectedIndex);
            $payload['startIndex'] = $payload['start_index'];
            $payload['endIndex'] = $payload['end_index'];
            foreach ([
                'restart_start_index',
                'restart_end_index',
                'recognised_start_index',
                'recognised_end_index',
                'restartStartIndex',
                'restartEndIndex',
                'recognisedStartIndex',
                'recognisedEndIndex',
            ] as $key) {
                if (array_key_exists($key, $operation)) {
                    $payload[$key] = $operation[$key];
                }
            }
        }
        if (isset($word['start'])) {
            $payload['start_time'] = (float) $word['start'];
            $payload['startTime'] = (float) $word['start'];
            $payload['start'] = (float) $word['start'];
        }
        if (isset($word['end'])) {
            $payload['end_time'] = (float) $word['end'];
            $payload['endTime'] = (float) $word['end'];
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
        return max(0.5, $this->configFloat(
            'mutqin.ai_recite.pause_policy.hesitation_seconds',
            RecitationScoringThresholds::HESITATION_SECONDS
        ));
    }

    private function selfCorrectionPauseSeconds(): float
    {
        return max(0.0, $this->configFloat(
            'mutqin.ai_recite.pause_policy.self_correction_seconds',
            RecitationScoringThresholds::SELF_CORRECTION_SECONDS
        ));
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
    private function detectHesitations(array $statuses, array $extraWords = [], bool $isFinal = true): array
    {
        $events = [];
        $byRecognisedIndex = [];
        foreach ($statuses as $status) {
            if (is_numeric($status['recognised_index'] ?? null)) {
                $byRecognisedIndex[(int) $status['recognised_index']] = $status;
            }
        }
        foreach ($extraWords as $extra) {
            if (is_numeric($extra['recognised_index'] ?? null)) {
                $byRecognisedIndex[(int) $extra['recognised_index']] = $extra;
            }
        }
        ksort($byRecognisedIndex);
        $recognisedIndexes = array_keys($byRecognisedIndex);
        for ($index = 1, $count = count($recognisedIndexes); $index < $count; $index++) {
            $previousIndex = (int) $recognisedIndexes[$index - 1];
            $currentIndex = (int) $recognisedIndexes[$index];
            // Gaps are evidence only between adjacent recognised words. A
            // missing timestamp/token must never manufacture a pause event.
            if ($currentIndex !== $previousIndex + 1) {
                continue;
            }
            $previous = $byRecognisedIndex[$previousIndex];
            $current = $byRecognisedIndex[$currentIndex];
            $currentIsCorrect = ($current['status'] ?? '') === 'correct';
            $currentIsPauseAnchor = $currentIsCorrect
                || in_array(($current['type'] ?? ''), [self::TYPE_REALIGNMENT, self::TYPE_SELF_CORRECTION, self::TYPE_RESTART], true);
            $sameTargetCorrection = $currentIsCorrect
                && ($previous['type'] ?? '') === self::TYPE_SELF_CORRECTION
                && (int) ($previous['expected_index'] ?? -1) === (int) ($current['expected_index'] ?? -2);
            if (($current['type'] ?? '') === self::TYPE_REALIGNMENT && ($previous['status'] ?? '') !== 'correct') {
                for ($candidate = $index - 1; $candidate >= 0; $candidate--) {
                    $candidateIndex = (int) $recognisedIndexes[$candidate];
                    if (($byRecognisedIndex[$candidateIndex]['status'] ?? '') === 'correct') {
                        $previousIndex = $candidateIndex;
                        $previous = $byRecognisedIndex[$candidateIndex];
                        break;
                    }
                }
            }
            if (! $currentIsPauseAnchor || (($previous['status'] ?? '') !== 'correct' && ! $sameTargetCorrection)) {
                continue;
            }
            $previousEnd = $previous['end_time'] ?? $previous['end'] ?? null;
            $currentStart = $current['start_time'] ?? $current['start'] ?? null;
            if (! is_numeric($previousEnd) || ! is_numeric($currentStart)) {
                continue;
            }
            $gap = max(0.0, (float) $currentStart - (float) $previousEnd);
            if ($gap < $this->hesitationPauseSeconds()) {
                continue;
            }
            $previousExpectedIndex = $previous['expected_index'] ?? $previous['target_index'] ?? null;
            $currentExpectedIndex = $current['expected_index'] ?? $current['target_index'] ?? null;
            $events[] = [
                'type' => self::TYPE_HESITATION,
                'status' => 'extra',
                'visual_status' => 'amber',
                'highlight' => 'amber',
                'fatal' => false,
                'affects_scoring' => false,
                'expected_word' => $current['expected_word'] ?? $current['text'] ?? '',
                'expected_index' => $currentExpectedIndex,
                'previous_expected_index' => $previousExpectedIndex,
                'recognised_index' => $currentIndex,
                'previous_recognised_index' => $previousIndex,
                'after_word_index' => $previousIndex,
                'previous_word_index' => $previousIndex,
                'next_word_index' => $currentIndex,
                'start_time' => (float) $previousEnd,
                'end_time' => (float) $currentStart,
                'duration_seconds' => $gap,
                'duration' => $gap,
                'startTime' => (float) $previousEnd,
                'endTime' => (float) $currentStart,
                'durationSeconds' => $gap,
                'lifecycle' => $isFinal ? 'final' : 'live',
                'classification_confidence' => 0.82,
            ];
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
            'unresolved_mistakes' => 0,
            'self_corrected_mistakes' => 0,
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

        $selfCorrectionGroups = [];
        foreach ($extraWords as $extra) {
            $type = (string) ($extra['type'] ?? '');
            match ($type) {
                self::TYPE_REPETITION => $counts['repetitions']++,
                self::TYPE_SELF_CORRECTION => $selfCorrectionGroups[(string) ($extra['self_correction_group_id'] ?? $extra['correction_group_id'] ?? ($extra['recognised_index'] ?? count($selfCorrectionGroups)))] = true,
                self::TYPE_RESTART => null,
                self::TYPE_OUT_OF_RANGE => $counts['out_of_range_words']++,
                self::TYPE_UNASSESSED => $counts['unassessed_events']++,
                default => $counts['extra_words']++,
            };
        }
        $counts['self_corrections'] = count($selfCorrectionGroups);
        $counts['self_corrected_mistakes'] = count($selfCorrectionGroups);
        $counts['unresolved_mistakes'] = count(array_filter(
            $statuses,
            static fn (array $status): bool => in_array(($status['type'] ?? ''), [self::TYPE_SUBSTITUTION, self::TYPE_DELETION, self::TYPE_DIVERGENCE], true)
        )) + count(array_filter(
            $extraWords,
            static fn (array $extra): bool => ($extra['type'] ?? '') === self::TYPE_INSERTION
        ));

        foreach ($events as $event) {
            if (($event['type'] ?? '') === self::TYPE_HESITATION) {
                $counts['hesitations']++;
            } elseif (($event['type'] ?? '') === self::TYPE_RESTART) {
                $counts['restarts']++;
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
        array $unit,
        array $targetWords = []
    ): array {
        $actual = (string) ($heardWord['word'] ?? '');
        $confidence = (float) ($heardWord['confidence'] ?? 1);
        $laterIndex = $actual !== '' && $expected !== '' && $actual !== $expected
            ? $this->findWordLaterIndex($targetWords, $actual, $targetIndex)
            : -1;
        $outOfOrder = $laterIndex >= 0;
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
            'token' => $heardWord['token'] ?? $heardWord['speechmatics_token'] ?? $heardWord['speechmaticsToken'] ?? $heardWord['id'] ?? null,
            'speechmatics_token' => $heardWord['speechmatics_token'] ?? $heardWord['speechmaticsToken'] ?? $heardWord['token'] ?? $heardWord['id'] ?? null,
            'provider' => $heardWord['provider'] ?? null,
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
            'out_of_order' => $outOfOrder,
            'outOfOrder' => $outOfOrder,
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

        if ($expected !== '' && $actual !== '' && $similarity >= RecitationScoringThresholds::ALIGNMENT_PARTIAL_SIMILARITY) {
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
            } elseif ($status === 'minor_mistake' || $status === 'partial') {
                $confidence = max(0.25, min(1.0, (float) ($word['confidence'] ?? 1)));
                $correct += RecitationScoringThresholds::PARTIAL_ACCURACY_WEIGHT * $confidence;
            } elseif ($status === 'uncertain') {
                $correct += RecitationScoringThresholds::UNCERTAIN_ACCURACY_WEIGHT;
            }
        }

        $wrongOrderPenalty = 0.0;
        foreach ($statuses as $word) {
            if (! empty($word['out_of_order']) || ! empty($word['outOfOrder'])) {
                $wrongOrderPenalty += RecitationScoringThresholds::WRONG_ORDER_PENALTY;
            }
        }

        // Recoverable learner patterns must not reduce accuracy (JS mistakes.extra).
        $penalisedExtras = count(array_filter(
            $extraWords,
            static fn (array $word): bool => ! in_array((string) ($word['type'] ?? ''), [
                self::TYPE_UNASSESSED,
                self::TYPE_REPETITION,
                self::TYPE_SELF_CORRECTION,
                self::TYPE_RESTART,
            ], true)
        ));
        $extraPenalty = $penalisedExtras * RecitationScoringThresholds::EXTRA_PENALTY;

        return (int) max(0, min(100, round((($correct - $wrongOrderPenalty - $extraPenalty) / $total) * 100)));
    }

    /**
     * @param  list<string>  $targetWords
     */
    private function findWordLaterIndex(array $targetWords, string $word, int $fromIndex): int
    {
        if ($word === '') {
            return -1;
        }
        $count = count($targetWords);
        for ($index = max(0, $fromIndex); $index < $count; $index++) {
            if (($targetWords[$index] ?? '') === $word) {
                return $index;
            }
        }

        return -1;
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
            if (($word['type'] ?? '') === self::TYPE_DELETION) {
                $counts['red']++;
                continue;
            }
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

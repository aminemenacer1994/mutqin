<?php

namespace App\Services\Memorisation;

use App\Models\MemorisationAssessment;
use App\Models\MemorisationAssessmentWord;
use App\Models\MemorisationAttemptComparison;
use App\Models\MemorisationPracticePlan;
use App\Models\MemorisationWeakSpot;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * Persist structured, queryable learning history derived from assessments.
 * Keeps Quran identifiers stable and avoids inventing Arabic text copies.
 */
class MemorisationHistoryService
{
    public const ALGORITHM_VERSION = 'mutqin-recitation-v1';

    /**
     * @param  array<int, array<string, mixed>>  $wordResults
     */
    public function syncWordResults(MemorisationAssessment $assessment, array $wordResults): void
    {
        $now = now();
        $rows = [];

        foreach ($wordResults as $index => $word) {
            if (! is_array($word)) {
                continue;
            }

            $ayahNumber = (int) ($word['ayah_number'] ?? $word['ayahNumber'] ?? 0);
            $wordIndex = $word['word_index']
                ?? $word['wordIndex']
                ?? $word['ayah_word_index']
                ?? $word['ayahWordIndex']
                ?? $word['index']
                ?? null;
            if ($ayahNumber < 1 || ! is_numeric($wordIndex) || (int) $wordIndex < 0) {
                continue;
            }

            $wordIndex = (int) $wordIndex;
            $surahNumber = (int) ($word['surah_number'] ?? $word['surahId'] ?? $assessment->surah_number);
            $resultType = $this->normaliseResultType(
                (string) ($word['status'] ?? $word['result'] ?? $word['result_type'] ?? 'uncertain'),
                ! empty($word['out_of_order']) || ! empty($word['outOfOrder'])
            );
            $confidence = isset($word['confidence']) && is_numeric($word['confidence'])
                ? round((float) $word['confidence'], 4)
                : null;
            $detected = $word['detected'] ?? $word['actual'] ?? $word['recognised'] ?? $word['recognized'] ?? null;
            $detectedToken = is_string($detected) ? mb_substr($detected, 0, 120) : null;
            // Prefer token reference over copying expected Arabic when available.
            if ($detectedToken === null && isset($word['token_ref'])) {
                $detectedToken = mb_substr((string) $word['token_ref'], 0, 120);
            }

            $rows[] = [
                'user_id' => $assessment->user_id,
                'assessment_id' => $assessment->id,
                'surah_number' => $surahNumber,
                'ayah_number' => $ayahNumber,
                'word_index' => $wordIndex,
                'verse_key' => $word['verse_key'] ?? $word['verseKey'] ?? ($surahNumber.':'.$ayahNumber),
                'expected_position' => isset($word['expected_position'])
                    ? (int) $word['expected_position']
                    : $wordIndex,
                'detected_token' => $detectedToken,
                'result_type' => $resultType,
                'confidence' => $confidence,
                'retry_count' => max(0, (int) ($word['retry_count'] ?? $word['retries'] ?? 0)),
                'first_result_type' => $this->normaliseResultType(
                    (string) ($word['first_result'] ?? $word['first_result_type'] ?? $resultType)
                ),
                'final_result_type' => $resultType,
                'out_of_order' => ! empty($word['out_of_order']) || ! empty($word['outOfOrder']) || $resultType === MemorisationAssessmentWord::TYPE_OUT_OF_ORDER,
                'first_detected_at' => $this->optionalTimestamp($word['first_detected_at'] ?? null) ?? $now,
                'final_detected_at' => $this->optionalTimestamp($word['final_detected_at'] ?? null) ?? $now,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        if ($rows === []) {
            return;
        }

        MemorisationAssessmentWord::query()->upsert(
            $rows,
            ['assessment_id', 'surah_number', 'ayah_number', 'word_index'],
            [
                'verse_key',
                'expected_position',
                'detected_token',
                'result_type',
                'confidence',
                'retry_count',
                'final_result_type',
                'out_of_order',
                'final_detected_at',
                'updated_at',
            ]
        );
    }

    /**
     * @param  array<string, mixed>  $analysis
     */
    public function upsertWeakSpots(User $user, MemorisationAssessment $assessment, array $analysis): void
    {
        $now = now();
        $weakWords = is_array($analysis['weak_words'] ?? null) ? $analysis['weak_words'] : [];
        $weakAyahs = is_array($analysis['weak_ayahs'] ?? null) ? $analysis['weak_ayahs'] : [];

        foreach ($weakWords as $word) {
            if (! is_array($word)) {
                continue;
            }
            $ayahNumber = (int) ($word['ayah_number'] ?? $word['ayahNumber'] ?? 0);
            $wordIndex = $word['word_index']
                ?? $word['wordIndex']
                ?? $word['ayah_word_index']
                ?? $word['ayahWordIndex']
                ?? $word['index']
                ?? null;
            if ($ayahNumber < 1 || ! is_numeric($wordIndex) || (int) $wordIndex < 0) {
                continue;
            }
            $surahNumber = (int) ($word['surah_number'] ?? $word['surahId'] ?? $assessment->surah_number);
            $wordIndex = (int) $wordIndex;
            $spotKey = MemorisationWeakSpot::buildSpotKey(
                MemorisationWeakSpot::TYPE_WORD,
                $surahNumber,
                $ayahNumber,
                $wordIndex
            );
            $this->touchWeakSpot($user, $assessment, [
                'spot_type' => MemorisationWeakSpot::TYPE_WORD,
                'surah_number' => $surahNumber,
                'ayah_number' => $ayahNumber,
                'word_index' => $wordIndex,
                'verse_key' => $word['verse_key'] ?? ($surahNumber.':'.$ayahNumber),
                'spot_key' => $spotKey,
                'severity' => $this->normaliseSeverity($word['severity'] ?? $word['severity_label'] ?? 'moderate'),
            ], $now, stillWeak: true);
        }

        foreach ($weakAyahs as $ayah) {
            $ayahNumber = is_array($ayah)
                ? (int) ($ayah['ayah_number'] ?? $ayah['ayahNumber'] ?? $ayah['ayah'] ?? 0)
                : (int) $ayah;
            if ($ayahNumber < 1) {
                continue;
            }
            $surahNumber = is_array($ayah)
                ? (int) ($ayah['surah_number'] ?? $ayah['surahId'] ?? $assessment->surah_number)
                : (int) $assessment->surah_number;
            $spotKey = MemorisationWeakSpot::buildSpotKey(
                MemorisationWeakSpot::TYPE_AYAH,
                $surahNumber,
                $ayahNumber,
                null
            );
            $this->touchWeakSpot($user, $assessment, [
                'spot_type' => MemorisationWeakSpot::TYPE_AYAH,
                'surah_number' => $surahNumber,
                'ayah_number' => $ayahNumber,
                'word_index' => null,
                'verse_key' => $surahNumber.':'.$ayahNumber,
                'spot_key' => $spotKey,
                'severity' => is_array($ayah)
                    ? $this->normaliseSeverity($ayah['severity'] ?? 'moderate')
                    : 'moderate',
            ], $now, stillWeak: true);
        }
    }

    /**
     * Mark previously weak words that are now correct as improving/resolved.
     *
     * @param  array<int, array<string, mixed>>  $wordResults
     */
    public function markRecalledWords(User $user, MemorisationAssessment $assessment, array $wordResults): void
    {
        $now = now();
        foreach ($wordResults as $word) {
            if (! is_array($word)) {
                continue;
            }
            $resultType = $this->normaliseResultType((string) ($word['status'] ?? ''));
            if ($resultType !== MemorisationAssessmentWord::TYPE_CORRECT) {
                continue;
            }
            $ayahNumber = (int) ($word['ayah_number'] ?? $word['ayahNumber'] ?? 0);
            $wordIndex = $word['word_index']
                ?? $word['wordIndex']
                ?? $word['ayah_word_index']
                ?? $word['ayahWordIndex']
                ?? $word['index']
                ?? null;
            if ($ayahNumber < 1 || ! is_numeric($wordIndex) || (int) $wordIndex < 0) {
                continue;
            }
            $surahNumber = (int) ($word['surah_number'] ?? $word['surahId'] ?? $assessment->surah_number);
            $spotKey = MemorisationWeakSpot::buildSpotKey(
                MemorisationWeakSpot::TYPE_WORD,
                $surahNumber,
                $ayahNumber,
                (int) $wordIndex
            );
            $spot = MemorisationWeakSpot::query()
                ->where('user_id', $user->id)
                ->where('spot_key', $spotKey)
                ->first();
            if (! $spot) {
                continue;
            }
            $spot->fill([
                'last_recalled_at' => $now,
                'last_assessment_id' => $assessment->id,
                'status' => MemorisationWeakSpot::STATUS_IMPROVING,
                'trend' => 'improving',
            ])->save();
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function persistComparison(
        User $user,
        MemorisationAssessment $previous,
        MemorisationAssessment $followUp,
        ?MemorisationPracticePlan $plan = null
    ): array {
        $payload = $this->buildComparisonPayload($previous, $followUp);

        $comparison = MemorisationAttemptComparison::query()->updateOrCreate(
            [
                'previous_assessment_id' => $previous->id,
                'follow_up_assessment_id' => $followUp->id,
            ],
            [
                'user_id' => $user->id,
                'practice_plan_id' => $plan?->id,
                'accuracy_delta' => $payload['accuracy_delta'],
                'improved_count' => count($payload['improved_items']),
                'unchanged_count' => count($payload['unchanged_items']),
                'new_weak_count' => count($payload['new_weak_items']),
                'improved_items' => $payload['improved_items'],
                'unchanged_items' => $payload['unchanged_items'],
                'new_weak_items' => $payload['new_weak_items'],
                'summary_key' => $payload['summary_key'],
                'summary' => $payload['summary'],
                'metrics' => $payload['metrics'],
            ]
        );

        if ($plan) {
            $plan->update([
                'retest_metrics' => $payload,
                'follow_up_assessment_id' => $followUp->id,
            ]);
        }

        return array_merge($payload, ['id' => $comparison->id]);
    }

    /**
     * @return array<string, mixed>
     */
    public function buildComparisonPayload(
        MemorisationAssessment $previous,
        MemorisationAssessment $followUp
    ): array {
        $beforeAcc = (int) ($previous->overall_accuracy ?? 0);
        $afterAcc = (int) ($followUp->overall_accuracy ?? 0);
        $beforeMap = $this->weakWordMap($previous);
        $afterMap = $this->weakWordMap($followUp);

        $improved = [];
        $unchanged = [];
        $newWeak = [];

        foreach ($beforeMap as $key => $item) {
            if (! isset($afterMap[$key])) {
                $improved[] = $item;
            } else {
                $unchanged[] = $item;
            }
        }
        foreach ($afterMap as $key => $item) {
            if (! isset($beforeMap[$key])) {
                $newWeak[] = $item;
            }
        }

        $summaryKey = 'mixed';
        $summary = 'Some focus words improved; keep reviewing the rest.';
        if ($improved !== [] && $unchanged === [] && $newWeak === []) {
            $summaryKey = 'improved';
            $summary = 'Your focus areas improved compared with the earlier attempt.';
        } elseif ($improved === [] && $unchanged !== []) {
            $summaryKey = 'continued';
            $summary = 'The same weak areas still need attention.';
        } elseif ($improved !== [] && $unchanged !== []) {
            $summaryKey = 'partial';
            $summary = count($improved).' focus area(s) improved; '.count($unchanged).' still need practice.';
        }

        return [
            'before_accuracy' => $beforeAcc,
            'after_accuracy' => $afterAcc,
            'accuracy_delta' => $afterAcc - $beforeAcc,
            'improved_items' => array_values($improved),
            'unchanged_items' => array_values($unchanged),
            'new_weak_items' => array_values($newWeak),
            'summary_key' => $summaryKey,
            'summary' => $summary,
            'metrics' => [
                'before_weak_word_count' => count($beforeMap),
                'after_weak_word_count' => count($afterMap),
                'improved' => $afterAcc > $beforeAcc || count($afterMap) < count($beforeMap),
            ],
            'message' => $summary,
        ];
    }

    public function normaliseResultType(string $raw, bool $outOfOrder = false): string
    {
        if ($outOfOrder) {
            return MemorisationAssessmentWord::TYPE_OUT_OF_ORDER;
        }
        $value = strtolower(trim($raw));
        if (in_array($value, ['correct', 'green', 'word-correct', 'ok'], true)) {
            return MemorisationAssessmentWord::TYPE_CORRECT;
        }
        if (in_array($value, ['partial', 'close', 'close_match', 'amber', 'yellow', 'minor_mistake', 'minor'], true)) {
            return MemorisationAssessmentWord::TYPE_CLOSE_MATCH;
        }
        if (in_array($value, ['incorrect', 'wrong', 'red', 'missed'], true)) {
            return MemorisationAssessmentWord::TYPE_INCORRECT;
        }
        if (in_array($value, ['omitted', 'omission', 'missing', 'black', 'pending'], true)) {
            return MemorisationAssessmentWord::TYPE_OMITTED;
        }
        if (in_array($value, ['additional', 'extra', 'insertion'], true)) {
            return MemorisationAssessmentWord::TYPE_ADDITIONAL;
        }
        if (in_array($value, ['out_of_order', 'outoforder', 'order'], true)) {
            return MemorisationAssessmentWord::TYPE_OUT_OF_ORDER;
        }

        return MemorisationAssessmentWord::TYPE_UNCERTAIN;
    }

    public function resolveMatchResult(?int $accuracy, ?string $explicit = null): string
    {
        if (is_string($explicit) && $explicit !== '') {
            return strtolower($explicit);
        }
        if ($accuracy === null) {
            return 'unknown';
        }
        if ($accuracy >= 85) {
            return 'strong';
        }
        if ($accuracy >= 60) {
            return 'mixed';
        }
        if ($accuracy > 0) {
            return 'weak';
        }

        return 'zero_match';
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function touchWeakSpot(
        User $user,
        MemorisationAssessment $assessment,
        array $attributes,
        Carbon $now,
        bool $stillWeak
    ): void {
        $existing = MemorisationWeakSpot::query()
            ->where('user_id', $user->id)
            ->where('spot_key', $attributes['spot_key'])
            ->first();

        if (! $existing) {
            MemorisationWeakSpot::query()->create([
                ...$attributes,
                'user_id' => $user->id,
                'status' => MemorisationWeakSpot::STATUS_ACTIVE,
                'trend' => 'unknown',
                'affected_attempt_count' => 1,
                'first_identified_at' => $now,
                'last_identified_at' => $now,
                'source_assessment_id' => $assessment->id,
                'last_assessment_id' => $assessment->id,
            ]);

            return;
        }

        $sameAttempt = (int) $existing->last_assessment_id === (int) $assessment->id;
        $increment = ($stillWeak && ! $sameAttempt) ? 1 : 0;
        $nextCount = (int) $existing->affected_attempt_count + $increment;

        $existing->fill([
            'severity' => $attributes['severity'] ?? $existing->severity,
            'affected_attempt_count' => $nextCount,
            'last_identified_at' => $stillWeak ? $now : $existing->last_identified_at,
            'last_assessment_id' => $assessment->id,
            'status' => $stillWeak ? MemorisationWeakSpot::STATUS_ACTIVE : MemorisationWeakSpot::STATUS_IMPROVING,
            'trend' => $stillWeak
                ? ($nextCount >= 3 ? 'regressing' : 'stable')
                : 'improving',
            'verse_key' => $attributes['verse_key'] ?? $existing->verse_key,
        ])->save();
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function weakWordMap(MemorisationAssessment $assessment): array
    {
        $map = [];
        $weakWords = is_array($assessment->weakness_analysis['weak_words'] ?? null)
            ? $assessment->weakness_analysis['weak_words']
            : [];
        foreach ($weakWords as $word) {
            if (! is_array($word)) {
                continue;
            }
            $ayah = (int) ($word['ayah_number'] ?? $word['ayahNumber'] ?? 0);
            $index = $word['word_index'] ?? $word['wordIndex'] ?? $word['index'] ?? null;
            if ($ayah < 1 || ! is_numeric($index)) {
                continue;
            }
            $surah = (int) ($word['surah_number'] ?? $word['surahId'] ?? $assessment->surah_number);
            $key = $surah.':'.$ayah.':'.(int) $index;
            $map[$key] = [
                'surah_number' => $surah,
                'ayah_number' => $ayah,
                'word_index' => (int) $index,
                'verse_key' => $word['verse_key'] ?? ($surah.':'.$ayah),
            ];
        }

        return $map;
    }

    private function normaliseSeverity(mixed $raw): string
    {
        $value = strtolower((string) $raw);
        if (in_array($value, ['high', 'severe', 'red', 'critical'], true)) {
            return 'high';
        }
        if (in_array($value, ['low', 'mild', 'amber', 'minor'], true)) {
            return 'low';
        }

        return 'moderate';
    }

    private function optionalTimestamp(mixed $value): ?Carbon
    {
        if ($value instanceof Carbon) {
            return $value;
        }
        if (is_string($value) && $value !== '') {
            try {
                return Carbon::parse($value);
            } catch (\Throwable) {
                return null;
            }
        }

        return null;
    }
}

<?php

namespace App\Services;

/**
 * Performance-aware recommendation adaptation for Mutqin memorisation.
 *
 * Evaluates completed-session evidence and returns the smallest effective
 * intervention: one primary technique, optional complementary technique,
 * and bounded speed / repetitions / step-size adjustments.
 *
 * Supported technique identifiers (must match frontend TECHNIQUE_IDS):
 * talqin, focus, blur, chaining, anchor.
 */
class RepeatAdaptationService
{
    public const MIN_PLAYBACK_SPEED = 0.5;

    public const MAX_PLAYBACK_SPEED = 1.5;

    public const MIN_REPETITIONS = 1;

    public const MAX_REPETITIONS = 8;

    public const MAX_RETRY_ESCALATION = 3;

    public const TECHNIQUES = ['talqin', 'focus', 'blur', 'chaining', 'anchor'];

    /**
     * @param  array<string, mixed>  $baseSettings
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    public function resolve(array $baseSettings, array $context = []): array
    {
        $mode = strtolower((string) ($context['mode'] ?? 'revision'));
        $confidence = strtolower((string) ($context['confidence'] ?? ''));
        $aiResult = strtolower((string) ($context['ai_result'] ?? ''));
        $attempt = max(1, (int) ($context['attempt_number'] ?? 1));
        $rangeCount = max(1, (int) ($context['range_ayah_count'] ?? 3));
        $rangeWorkload = (float) ($context['range_workload_score'] ?? 0);
        $replayRatio = (float) ($context['replay_ratio'] ?? 0);
        $maxReplays = max(0, (int) ($context['max_ayah_replays'] ?? 0));
        $replayHeavy = max(0, (int) ($context['replay_heavy_ayahs'] ?? 0));
        $sequenceErrors = max(0, (int) ($context['sequence_errors'] ?? 0));
        $missedWords = max(0, (int) ($context['missed_words'] ?? 0));
        $hintsUsed = max(0, (int) ($context['hints_used'] ?? 0));
        $pronunciationIssues = (bool) ($context['pronunciation_issues'] ?? false);
        $weakAyahs = is_array($context['weak_ayahs'] ?? null) ? $context['weak_ayahs'] : [];

        // Explicit progression mode keeps moving forward even with mixed AI;
        // revision / needs_practice / weak AI take the supportive path.
        $needsSupport = $mode === 'revision'
            || $confidence === 'needs_practice'
            || ($mode !== 'progression' && in_array($aiResult, ['weak', 'mixed', 'needs_practice'], true))
            || ($aiResult === 'weak' && $mode !== 'progression')
            || ($attempt >= 2 && $mode !== 'progression' && $confidence !== 'confident');

        $speed = $this->clampSpeed((float) ($baseSettings['playback_speed'] ?? 1.0));
        $repetitions = $this->clampRepetitions((int) ($baseSettings['repetitions'] ?? 3));
        $ayatPerStep = isset($baseSettings['ayat_per_step'])
            ? max(1, (int) $baseSettings['ayat_per_step'])
            : null;
        $reciter = isset($baseSettings['reciter']) ? (string) $baseSettings['reciter'] : null;
        $baseTechnique = $this->normaliseTechnique($baseSettings['technique'] ?? null) ?: 'talqin';

        $evidence = $this->collectEvidence([
            'confidence' => $confidence,
            'ai_result' => $aiResult,
            'attempt' => $attempt,
            'replay_ratio' => $replayRatio,
            'max_ayah_replays' => $maxReplays,
            'replay_heavy_ayahs' => $replayHeavy,
            'sequence_errors' => $sequenceErrors,
            'missed_words' => $missedWords,
            'pronunciation_issues' => $pronunciationIssues,
            'weak_ayahs' => $weakAyahs,
            'hints_used' => $hintsUsed,
            'range_ayah_count' => $rangeCount,
            'range_workload_score' => $rangeWorkload,
        ]);

        if ($needsSupport) {
            return $this->resolveRevision(
                $baseSettings,
                $baseTechnique,
                $speed,
                $repetitions,
                $ayatPerStep,
                $reciter,
                $attempt,
                $rangeCount,
                $rangeWorkload,
                $evidence,
                $confidence,
                $aiResult,
            );
        }

        return $this->resolveProgression(
            $baseSettings,
            $baseTechnique,
            $speed,
            $repetitions,
            $ayatPerStep,
            $reciter,
            $rangeCount,
            $rangeWorkload,
            $evidence,
            $aiResult,
            $hintsUsed,
        );
    }

    /**
     * @param  array<string, mixed>  $baseSettings
     * @param  array<string, mixed>  $evidence
     * @return array<string, mixed>
     */
    private function resolveRevision(
        array $baseSettings,
        string $baseTechnique,
        float $speed,
        int $repetitions,
        ?int $ayatPerStep,
        ?string $reciter,
        int $attempt,
        int $rangeCount,
        float $rangeWorkload,
        array $evidence,
        string $confidence,
        string $aiResult,
    ): array {
        $adaptations = [];
        $reasonCode = 'reinforce_recent_range';
        $primary = $baseTechnique;
        $complementary = null;
        $chainingMethod = null;
        $chainingReps = 2;
        $anchorCount = 2;
        $intendedOutcome = 'Strengthen recall before progressing.';
        $userReason = 'A short, focused repeat will help this range settle.';

        if ($evidence['pronunciation'] || $evidence['listening_difficulty']) {
            $primary = 'talqin';
            $adaptations[] = 'use_talqin';
            $slower = $this->clampSpeed(round($speed - 0.25, 2));
            if ($slower < $speed) {
                $speed = $slower;
                $adaptations[] = 'reduce_playback_speed';
            }
            $nextReps = min(self::MAX_REPETITIONS, $repetitions + ($attempt >= 3 ? 1 : 2));
            if ($nextReps > $repetitions) {
                $repetitions = $nextReps;
                $adaptations[] = 'increase_repetitions';
            }
            $reasonCode = 'needs_more_practice';
            $intendedOutcome = 'Clearer listening and more accurate pronunciation.';
            $userReason = $evidence['listening_difficulty']
                ? 'You replayed parts of this range several times, so we recommend listen-and-repeat practice at a slightly slower pace.'
                : 'Your AI Recite result highlighted pronunciation difficulty, so this repeat prioritises listening to the reciter phrase by phrase.';
        } elseif ($evidence['attention_spread'] || $evidence['weak_ayah_cluster']) {
            $primary = 'focus';
            $adaptations[] = 'use_focus';
            $ayatPerStep = 1;
            $adaptations[] = 'reduce_ayat_per_step';
            $reasonCode = 'difficult_ayah_detected';
            $intendedOutcome = 'Reduced cognitive load with one ayah at a time.';
            $userReason = 'Attention was harder across several ayat, so this repeat works one ayah at a time.';
            if ($rangeCount >= 3) {
                $complementary = 'anchor';
                $adaptations[] = 'use_anchor';
                $anchorCount = 2;
            }
        } elseif ($evidence['sequence_difficulty']) {
            $primary = 'chaining';
            $chainingMethod = $rangeCount >= 4 ? 'cumulative' : 'linking';
            $adaptations[] = 'use_chaining';
            $reasonCode = 'reinforce_recent_range';
            $intendedOutcome = 'Stronger ordering between neighbouring ayat.';
            $userReason = 'The order between ayat was uncertain, so this repeat focuses on joining them in sequence.';
            $complementary = 'focus';
            $adaptations[] = 'use_focus';
            $ayatPerStep = 1;
            $adaptations[] = 'reduce_ayat_per_step';
        } elseif ($evidence['recognition_strong_recall_weak'] || $aiResult === 'mixed') {
            $primary = 'blur';
            $adaptations[] = 'use_blur';
            $reasonCode = 'difficult_ayah_detected';
            $intendedOutcome = 'Stronger independent recall without relying on the full text.';
            $userReason = 'Recognition was stronger than recall, so this repeat gradually hides the text.';
            if ($rangeCount >= 3) {
                $complementary = 'anchor';
                $adaptations[] = 'use_anchor';
            }
        } elseif ($evidence['vocabulary_hooks']) {
            $primary = 'anchor';
            $adaptations[] = 'use_anchor';
            $anchorCount = 3;
            $reasonCode = 'reinforce_recent_range';
            $intendedOutcome = 'Clearer memory hooks for key words in each ayah.';
            $userReason = 'A few key words were missed, so this repeat highlights memory anchors.';
            $complementary = 'focus';
            $adaptations[] = 'use_focus';
            $ayatPerStep = 1;
        } else {
            if ($baseTechnique === 'blur') {
                $primary = 'blur';
                $adaptations[] = 'use_blur';
            } else {
                $primary = 'talqin';
                $adaptations[] = 'use_talqin';
            }
            $slower = $this->clampSpeed(round($speed - 0.25, 2));
            if ($slower < $speed) {
                $speed = $slower;
                $adaptations[] = 'reduce_playback_speed';
            }
            $nextReps = min(self::MAX_REPETITIONS, $repetitions + ($attempt >= 3 ? 1 : 2));
            if ($nextReps > $repetitions) {
                $repetitions = $nextReps;
                $adaptations[] = 'increase_repetitions';
            }
            $reasonCode = 'needs_more_practice';
            $intendedOutcome = 'Clearer listening and steadier recall before progressing.';
            $userReason = 'You asked for more practice, so this repeat slows the pace and adds a little more repetition.';
        }

        if ($confidence === 'needs_practice' && $aiResult === 'strong') {
            $repetitions = min($repetitions, max(self::MIN_REPETITIONS, (int) ($baseSettings['repetitions'] ?? 3) + 1));
            $speed = max($speed, $this->clampSpeed((float) ($baseSettings['playback_speed'] ?? 1.0) - 0.15));
            $userReason = 'You asked for more practice. Your AI Recite was strong, so this repeat stays light.';
            $intendedOutcome = 'Light reinforcement without unnecessary difficulty.';
            $evidence['codes'][] = 'balance_user_confidence_over_strong_ai';
        }

        if ($attempt > self::MAX_RETRY_ESCALATION) {
            $repetitions = min($repetitions, (int) ($baseSettings['repetitions'] ?? 3) + 1);
            if ($rangeCount > 2 && ($ayatPerStep === null || $ayatPerStep > 1)) {
                $ayatPerStep = 1;
                if (! in_array('reduce_ayat_per_step', $adaptations, true)) {
                    $adaptations[] = 'reduce_ayat_per_step';
                }
            }
            $reasonCode = 'revision_required';
            if ($primary !== 'focus') {
                $primary = 'focus';
                $adaptations[] = 'use_focus';
                $complementary = $complementary === 'focus' ? null : $complementary;
            }
        }

        if (($rangeCount >= 3 || $rangeWorkload >= 55)
            && ($ayatPerStep === null || $ayatPerStep > 1)
            && in_array($primary, ['talqin', 'focus', 'blur'], true)
        ) {
            $ayatPerStep = 1;
            if (! in_array('reduce_ayat_per_step', $adaptations, true)) {
                $adaptations[] = 'reduce_ayat_per_step';
            }
        }

        return $this->buildResult(
            $primary,
            $complementary,
            $reciter,
            $speed,
            $repetitions,
            $ayatPerStep,
            $adaptations,
            $reasonCode,
            $userReason,
            $intendedOutcome,
            $evidence['codes'],
            $chainingMethod,
            $chainingReps,
            $anchorCount,
        );
    }

    /**
     * @param  array<string, mixed>  $baseSettings
     * @param  array<string, mixed>  $evidence
     * @return array<string, mixed>
     */
    private function resolveProgression(
        array $baseSettings,
        string $baseTechnique,
        float $speed,
        int $repetitions,
        ?int $ayatPerStep,
        ?string $reciter,
        int $rangeCount,
        float $rangeWorkload,
        array $evidence,
        string $aiResult,
        int $hintsUsed,
    ): array {
        $adaptations = [];
        $reasonCode = 'continue_while_fresh';
        $primary = $baseTechnique;
        $complementary = null;
        $chainingMethod = null;
        $chainingReps = 2;
        $anchorCount = 2;
        $intendedOutcome = 'Balanced progression with independent recall.';
        $userReason = 'You completed this range smoothly, so the next set keeps a steady pace with recall-focused practice.';

        $efficient = ($evidence['replay_ratio'] ?? 0) < 1.35
            && ($evidence['max_ayah_replays'] ?? 0) <= 2
            && in_array($aiResult, ['', 'strong'], true);

        if ($aiResult === 'strong' && $efficient) {
            if ($rangeCount >= 3 && $rangeWorkload <= 45) {
                $primary = 'chaining';
                $chainingMethod = 'linking';
                $adaptations[] = 'use_chaining';
                $complementary = 'anchor';
                $adaptations[] = 'use_anchor';
                $intendedOutcome = 'Smooth flow across neighbouring ayat.';
                $userReason = 'You completed this range smoothly with minimal replay, so the next set joins ayat together for fluency.';
            } else {
                $primary = 'blur';
                $adaptations[] = 'use_blur';
                $intendedOutcome = 'Stronger independent recall as you move forward.';
                $userReason = 'Your recall was strong, so the next set gradually hides the text.';
            }
            $repetitions = max(self::MIN_REPETITIONS, min($repetitions, 2));
            $adaptations[] = 'reduce_repetitions';
            $reasonCode = 'strong_previous_performance';
        } elseif ($aiResult === 'mixed') {
            $primary = 'focus';
            $adaptations[] = 'use_focus';
            $ayatPerStep = 1;
            $adaptations[] = 'reduce_ayat_per_step';
            $complementary = 'anchor';
            $adaptations[] = 'use_anchor';
            $intendedOutcome = 'Progress with a brief targeted review.';
            $userReason = 'Your recall was mostly correct, with a few gaps, so the next set stays smaller and review-focused.';
            $reasonCode = 'ai_recite_mixed';
        } elseif ($hintsUsed >= 2 || ($evidence['replay_ratio'] ?? 0) >= 1.6) {
            $primary = 'focus';
            $adaptations[] = 'use_focus';
            $ayatPerStep = 1;
            $adaptations[] = 'reduce_ayat_per_step';
            $complementary = 'anchor';
            $adaptations[] = 'use_anchor';
            $intendedOutcome = 'Steady progression with light support.';
            $userReason = 'You are ready to continue, with a brief review-first approach because a few hints were still needed.';
            $reasonCode = 'continue_current_surah';
        } elseif ($aiResult === '' && $efficient) {
            $primary = 'blur';
            $adaptations[] = 'use_blur';
            $repetitions = max(self::MIN_REPETITIONS, min($repetitions, 2));
            $adaptations[] = 'reduce_repetitions';
            $intendedOutcome = 'Light verification of recall before adding new ayat.';
            $userReason = 'You performed well. Without an AI Recite check yet, the next set uses light recall practice rather than extra repetition.';
            $reasonCode = 'continue_while_fresh';
        } elseif ($rangeWorkload >= 55 || $rangeCount === 1) {
            $primary = 'focus';
            $adaptations[] = 'use_focus';
            $ayatPerStep = 1;
            $intendedOutcome = 'Manageable load for a longer or denser ayah.';
            $userReason = 'The next ayah is longer, so the next set keeps one ayah with focused practice.';
            $reasonCode = 'continue_current_surah';
        } else {
            if (! in_array($primary, self::TECHNIQUES, true)) {
                $primary = 'talqin';
            }
            if ($primary === 'talqin') {
                $adaptations[] = 'use_talqin';
            } elseif ($primary === 'focus') {
                $adaptations[] = 'use_focus';
            } elseif ($primary === 'blur') {
                $adaptations[] = 'use_blur';
            }
            $intendedOutcome = 'Steady progression at your normal pace.';
            $userReason = 'Continue while this range is still fresh, keeping your normal speed and technique.';
        }

        if ($rangeWorkload >= 55 && ($ayatPerStep === null || $ayatPerStep > 1)) {
            $ayatPerStep = 1;
            if (! in_array('reduce_ayat_per_step', $adaptations, true)) {
                $adaptations[] = 'reduce_ayat_per_step';
            }
        }

        return $this->buildResult(
            $primary,
            $complementary,
            $reciter,
            $speed,
            $repetitions,
            $ayatPerStep,
            $adaptations,
            $reasonCode,
            $userReason,
            $intendedOutcome,
            $evidence['codes'],
            $chainingMethod,
            $chainingReps,
            $anchorCount,
        );
    }

    /**
     * @param  array<string, mixed>  $signals
     * @return array<string, mixed>
     */
    private function collectEvidence(array $signals): array
    {
        $replayRatio = (float) ($signals['replay_ratio'] ?? 0);
        $maxReplays = (int) ($signals['max_ayah_replays'] ?? 0);
        $replayHeavy = (int) ($signals['replay_heavy_ayahs'] ?? 0);
        $sequenceErrors = (int) ($signals['sequence_errors'] ?? 0);
        $missedWords = (int) ($signals['missed_words'] ?? 0);
        $rangeCount = max(1, (int) ($signals['range_ayah_count'] ?? 1));
        $aiResult = (string) ($signals['ai_result'] ?? '');
        $weakAyahs = is_array($signals['weak_ayahs'] ?? null) ? $signals['weak_ayahs'] : [];
        $codes = [];

        $listeningDifficulty = $replayRatio >= 1.75 || $maxReplays >= 4 || $replayHeavy >= 2;
        $attentionSpread = $rangeCount >= 3 && ($replayHeavy >= 2 || $replayRatio >= 1.5);
        $sequenceDifficulty = $sequenceErrors >= 1;
        $recognitionStrongRecallWeak = $aiResult === 'mixed' && $missedWords >= 2;
        $pronunciation = (bool) ($signals['pronunciation_issues'] ?? false) || ($aiResult === 'weak' && $missedWords >= 3);
        $vocabularyHooks = $missedWords >= 1 && $missedWords <= 3 && ! $listeningDifficulty;
        $weakAyahCluster = count($weakAyahs) >= 1 && count($weakAyahs) < $rangeCount;

        if ($listeningDifficulty) {
            $codes[] = 'frequent_replay';
        }
        if ($attentionSpread) {
            $codes[] = 'attention_spread';
        }
        if ($sequenceDifficulty) {
            $codes[] = 'sequence_errors';
        }
        if ($recognitionStrongRecallWeak) {
            $codes[] = 'recall_gaps';
        }
        if ($pronunciation) {
            $codes[] = 'pronunciation_difficulty';
        }
        if ($vocabularyHooks) {
            $codes[] = 'key_word_gaps';
        }
        if ($weakAyahCluster) {
            $codes[] = 'weak_ayah_cluster';
        }
        if ($aiResult !== '') {
            $codes[] = 'ai_'.$aiResult;
        }
        if (($signals['confidence'] ?? '') !== '') {
            $codes[] = 'confidence_'.$signals['confidence'];
        }

        return [
            'listening_difficulty' => $listeningDifficulty,
            'attention_spread' => $attentionSpread,
            'sequence_difficulty' => $sequenceDifficulty,
            'recognition_strong_recall_weak' => $recognitionStrongRecallWeak,
            'pronunciation' => $pronunciation,
            'vocabulary_hooks' => $vocabularyHooks,
            'weak_ayah_cluster' => $weakAyahCluster,
            'replay_ratio' => $replayRatio,
            'max_ayah_replays' => $maxReplays,
            'codes' => $codes,
        ];
    }

    /**
     * @param  list<string>  $adaptations
     * @param  list<string>  $evidenceCodes
     * @return array<string, mixed>
     */
    private function buildResult(
        string $technique,
        ?string $complementary,
        ?string $reciter,
        float $speed,
        int $repetitions,
        ?int $ayatPerStep,
        array $adaptations,
        string $reasonCode,
        string $userReason,
        string $intendedOutcome,
        array $evidenceCodes,
        ?string $chainingMethod = null,
        int $chainingReps = 2,
        int $anchorCount = 2,
    ): array {
        $technique = $this->normaliseTechnique($technique) ?: 'talqin';
        $complementary = $this->normaliseTechnique($complementary);

        if ($technique === 'blur' && $complementary === 'chaining') {
            $complementary = 'anchor';
        }
        if ($technique === 'chaining' && $complementary === 'blur') {
            $complementary = 'focus';
        }
        if ($technique === 'focus' && $complementary === 'blur') {
            $complementary = 'anchor';
        }
        if ($technique === 'blur' && $complementary === 'focus') {
            $complementary = 'anchor';
        }
        if ($complementary === $technique) {
            $complementary = null;
        }

        $flags = $this->techniqueFlags($technique, $complementary, $chainingMethod, $chainingReps, $anchorCount);

        return array_merge([
            'technique' => $technique,
            'complementary_technique' => $complementary,
            'reciter' => $reciter,
            'playback_speed' => $speed,
            'repetitions' => $repetitions,
            'ayat_per_step' => $ayatPerStep,
            'adaptations' => array_values(array_unique($adaptations)),
            'reason_code' => $reasonCode,
            'user_reason' => $userReason,
            'intended_outcome' => $intendedOutcome,
            'evidence_codes' => array_values(array_unique($evidenceCodes)),
        ], $flags);
    }

    /**
     * @return array<string, mixed>
     */
    public function techniqueFlags(
        string $technique,
        ?string $complementary = null,
        ?string $chainingMethod = null,
        int $chainingReps = 2,
        int $anchorCount = 2,
    ): array {
        $primary = $this->normaliseTechnique($technique) ?: 'talqin';
        $secondary = $this->normaliseTechnique($complementary);

        $focus = $primary === 'focus' || $secondary === 'focus';
        $blur = $primary === 'blur' || $secondary === 'blur';
        $talqin = $primary === 'talqin' || $secondary === 'talqin';
        $chaining = $primary === 'chaining' || $secondary === 'chaining';
        $anchor = $primary === 'anchor' || $secondary === 'anchor';

        if ($blur && $focus) {
            if ($primary === 'blur') {
                $focus = false;
            } else {
                $blur = false;
            }
        }
        if ($blur && $chaining) {
            if ($primary === 'blur') {
                $chaining = false;
            } else {
                $blur = false;
            }
        }

        if ($primary === 'talqin') {
            $talqin = true;
            $focus = $secondary === 'focus';
            $blur = false;
        } elseif ($primary === 'focus') {
            $focus = true;
            $talqin = $secondary === 'talqin';
            $blur = false;
        } elseif ($primary === 'blur') {
            $blur = true;
            $talqin = false;
            $focus = false;
        }

        return [
            'focus_enabled' => $focus,
            'blur_enabled' => $blur,
            'talqin_enabled' => $talqin,
            'chaining_enabled' => $chaining,
            'chaining_method' => $chaining
                ? (in_array($chainingMethod, ['linking', 'cumulative'], true) ? $chainingMethod : 'linking')
                : null,
            'chaining_repetitions' => $chaining ? max(1, min(5, $chainingReps)) : null,
            'anchor_mode_enabled' => $anchor,
            'anchor_count' => $anchor ? max(1, min(3, $anchorCount)) : null,
        ];
    }

    public function normaliseTechnique(?string $technique): ?string
    {
        $value = strtolower(trim((string) $technique));
        $aliases = [
            'focus_mode' => 'focus',
            'focus-mode' => 'focus',
            'blur_mode' => 'blur',
            'blur-mode' => 'blur',
            'talqin_mode' => 'talqin',
            'talqin-mode' => 'talqin',
            'anchor_mode' => 'anchor',
            'anchor-mode' => 'anchor',
            'chain' => 'chaining',
            'chaining_mode' => 'chaining',
        ];
        $value = $aliases[$value] ?? $value;

        if (in_array($value, self::TECHNIQUES, true)) {
            return $value;
        }

        return null;
    }

    public function clampSpeed(float $speed): float
    {
        if ($speed <= 0) {
            $speed = 1.0;
        }

        return max(self::MIN_PLAYBACK_SPEED, min(self::MAX_PLAYBACK_SPEED, round($speed, 2)));
    }

    public function clampRepetitions(int $repetitions): int
    {
        if ($repetitions < self::MIN_REPETITIONS) {
            $repetitions = 3;
        }

        return max(self::MIN_REPETITIONS, min(self::MAX_REPETITIONS, $repetitions));
    }

    /**
     * @param  array<string, mixed>  $recommended
     * @param  array<string, mixed>|null  $overrides
     * @return array<string, mixed>
     */
    public function mergeOverrides(array $recommended, ?array $overrides): array
    {
        if (! is_array($overrides) || $overrides === []) {
            return $recommended;
        }

        $merged = $recommended;

        if (array_key_exists('technique', $overrides)) {
            $technique = $this->normaliseTechnique((string) $overrides['technique']);
            if ($technique) {
                $merged['technique'] = $technique;
                $complementary = $this->normaliseTechnique(
                    isset($overrides['complementary_technique'])
                        ? (string) $overrides['complementary_technique']
                        : ($merged['complementary_technique'] ?? null)
                );
                $merged = array_merge($merged, $this->techniqueFlags(
                    $technique,
                    $complementary,
                    isset($overrides['chaining_method']) ? (string) $overrides['chaining_method'] : ($merged['chaining_method'] ?? null),
                    (int) ($overrides['chaining_repetitions'] ?? $merged['chaining_repetitions'] ?? 2),
                    (int) ($overrides['anchor_count'] ?? $merged['anchor_count'] ?? 2),
                ));
                $merged['complementary_technique'] = $complementary;
            }
        }

        if (array_key_exists('complementary_technique', $overrides) && ! array_key_exists('technique', $overrides)) {
            $technique = $this->normaliseTechnique((string) ($merged['technique'] ?? 'talqin')) ?: 'talqin';
            $complementary = $this->normaliseTechnique((string) $overrides['complementary_technique']);
            $merged = array_merge($merged, $this->techniqueFlags(
                $technique,
                $complementary,
                isset($overrides['chaining_method']) ? (string) $overrides['chaining_method'] : ($merged['chaining_method'] ?? null),
                (int) ($overrides['chaining_repetitions'] ?? $merged['chaining_repetitions'] ?? 2),
                (int) ($overrides['anchor_count'] ?? $merged['anchor_count'] ?? 2),
            ));
            $merged['complementary_technique'] = $complementary;
        }

        if (array_key_exists('reciter', $overrides) && is_string($overrides['reciter']) && $overrides['reciter'] !== '') {
            $merged['reciter'] = $overrides['reciter'];
        }

        if (array_key_exists('playback_speed', $overrides) && is_numeric($overrides['playback_speed'])) {
            $merged['playback_speed'] = $this->clampSpeed((float) $overrides['playback_speed']);
        }

        if (array_key_exists('repetitions', $overrides) && is_numeric($overrides['repetitions'])) {
            $merged['repetitions'] = $this->clampRepetitions((int) $overrides['repetitions']);
        }

        if (array_key_exists('ayat_per_step', $overrides) && is_numeric($overrides['ayat_per_step'])) {
            $merged['ayat_per_step'] = max(1, min(10, (int) $overrides['ayat_per_step']));
        }

        foreach ([
            'focus_enabled',
            'blur_enabled',
            'talqin_enabled',
            'chaining_enabled',
            'anchor_mode_enabled',
        ] as $flag) {
            if (array_key_exists($flag, $overrides)) {
                $merged[$flag] = (bool) $overrides[$flag];
            }
        }

        if (array_key_exists('chaining_method', $overrides)
            && in_array($overrides['chaining_method'], ['linking', 'cumulative'], true)
        ) {
            $merged['chaining_method'] = $overrides['chaining_method'];
        }

        if (array_key_exists('chaining_repetitions', $overrides) && is_numeric($overrides['chaining_repetitions'])) {
            $merged['chaining_repetitions'] = max(1, min(5, (int) $overrides['chaining_repetitions']));
        }

        if (array_key_exists('anchor_count', $overrides) && is_numeric($overrides['anchor_count'])) {
            $merged['anchor_count'] = max(1, min(3, (int) $overrides['anchor_count']));
        }

        return $merged;
    }

    /**
     * @param  array<string, int|float>|null  $versePlayCounts
     * @return array{replay_ratio: float, max_ayah_replays: int, replay_heavy_ayahs: int}
     */
    public function summariseReplaySignals(?array $versePlayCounts, int $ayahCount = 1): array
    {
        $ayahCount = max(1, $ayahCount);
        if (! is_array($versePlayCounts) || $versePlayCounts === []) {
            return [
                'replay_ratio' => 1.0,
                'max_ayah_replays' => 0,
                'replay_heavy_ayahs' => 0,
            ];
        }

        $values = array_map(static fn ($value) => max(0, (int) $value), array_values($versePlayCounts));
        $total = array_sum($values);
        $max = $values !== [] ? max($values) : 0;
        $heavy = count(array_filter($values, static fn (int $value) => $value >= 3));

        return [
            'replay_ratio' => round($total / $ayahCount, 2),
            'max_ayah_replays' => $max,
            'replay_heavy_ayahs' => $heavy,
        ];
    }
}

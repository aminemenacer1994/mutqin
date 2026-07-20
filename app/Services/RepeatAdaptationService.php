<?php

namespace App\Services;

/**
 * Central, bounded rules for adapting settings when a learner repeats a range.
 * Never blindly enables every support option at once.
 */
class RepeatAdaptationService
{
    public const MIN_PLAYBACK_SPEED = 0.5;

    public const MAX_PLAYBACK_SPEED = 1.5;

    public const MIN_REPETITIONS = 1;

    public const MAX_REPETITIONS = 8;

    public const MAX_RETRY_ESCALATION = 3;

    /**
     * @param  array{
     *   technique?: string|null,
     *   reciter?: string|null,
     *   playback_speed?: float|int|null,
     *   repetitions?: int|null,
     *   ayat_per_step?: int|null,
     *   focus_enabled?: bool|null,
     *   blur_enabled?: bool|null,
     *   talqin_enabled?: bool|null,
     * }  $baseSettings
     * @param  array{
     *   confidence?: string|null,
     *   attempt_number?: int|null,
     *   ai_result?: string|null,
     *   range_ayah_count?: int|null,
     * }  $context
     * @return array{
     *   technique: string,
     *   reciter: string|null,
     *   playback_speed: float,
     *   repetitions: int,
     *   ayat_per_step: int|null,
     *   focus_enabled: bool,
     *   blur_enabled: bool,
     *   talqin_enabled: bool,
     *   adaptations: list<string>,
     *   reason_code: string,
     * }
     */
    public function resolve(array $baseSettings, array $context = []): array
    {
        $technique = $this->normaliseTechnique($baseSettings['technique'] ?? null) ?: 'talqin';
        $reciter = isset($baseSettings['reciter']) ? (string) $baseSettings['reciter'] : null;
        $speed = $this->clampSpeed((float) ($baseSettings['playback_speed'] ?? 1.0));
        $repetitions = $this->clampRepetitions((int) ($baseSettings['repetitions'] ?? 3));
        $ayatPerStep = isset($baseSettings['ayat_per_step'])
            ? max(1, (int) $baseSettings['ayat_per_step'])
            : null;
        $attempt = max(1, (int) ($context['attempt_number'] ?? 1));
        $confidence = (string) ($context['confidence'] ?? '');
        $aiResult = (string) ($context['ai_result'] ?? '');
        $rangeCount = max(1, (int) ($context['range_ayah_count'] ?? 3));

        $adaptations = [];
        $reasonCode = 'reinforce_recent_range';

        $needsSupport = $confidence === 'needs_practice'
            || in_array($aiResult, ['weak', 'mixed', 'needs_practice'], true)
            || $attempt >= 2;

        $rangeWorkload = (float) ($context['range_workload_score'] ?? 0);

        if ($needsSupport) {
            $nextReps = min(self::MAX_REPETITIONS, $repetitions + ($attempt >= 3 ? 1 : 2));
            if ($attempt > self::MAX_RETRY_ESCALATION) {
                // Stop endlessly increasing repetitions; focus the range instead.
                $nextReps = min($nextReps, $repetitions + 1);
                if ($rangeCount > 2 && ($ayatPerStep === null || $ayatPerStep > 1)) {
                    $ayatPerStep = 1;
                    $adaptations[] = 'reduce_ayat_per_step';
                }
                $reasonCode = 'revision_required';
            } else {
                if ($nextReps > $repetitions) {
                    $repetitions = $nextReps;
                    $adaptations[] = 'increase_repetitions';
                }
            }

            $slower = $this->clampSpeed(round($speed - 0.25, 2));
            if ($slower < $speed) {
                $speed = $slower;
                $adaptations[] = 'reduce_playback_speed';
            }

            if ($aiResult === 'mixed') {
                $technique = 'focus';
                $adaptations[] = 'use_focus';
                $reasonCode = 'difficult_ayah_detected';
            } elseif ($technique !== 'blur') {
                $technique = 'talqin';
                $adaptations[] = 'use_talqin';
            }

            // Long or dense ranges: shrink step size without inventing invalid verse boundaries.
            if (($rangeCount >= 3 || $rangeWorkload >= 55) && ($ayatPerStep === null || $ayatPerStep > 1)) {
                $ayatPerStep = 1;
                if (! in_array('reduce_ayat_per_step', $adaptations, true)) {
                    $adaptations[] = 'reduce_ayat_per_step';
                }
            }
        }

        $flags = $this->techniqueFlags($technique);

        return [
            'technique' => $technique,
            'reciter' => $reciter,
            'playback_speed' => $speed,
            'repetitions' => $repetitions,
            'ayat_per_step' => $ayatPerStep,
            'focus_enabled' => $flags['focus_enabled'],
            'blur_enabled' => $flags['blur_enabled'],
            'talqin_enabled' => $flags['talqin_enabled'],
            'adaptations' => array_values(array_unique($adaptations)),
            'reason_code' => $reasonCode,
        ];
    }

    /**
     * @return array{focus_enabled: bool, blur_enabled: bool, talqin_enabled: bool}
     */
    public function techniqueFlags(string $technique): array
    {
        return match ($this->normaliseTechnique($technique)) {
            'blur' => [
                'focus_enabled' => false,
                'blur_enabled' => true,
                'talqin_enabled' => false,
            ],
            'focus' => [
                'focus_enabled' => true,
                'blur_enabled' => false,
                'talqin_enabled' => false,
            ],
            default => [
                'focus_enabled' => false,
                'blur_enabled' => false,
                'talqin_enabled' => true,
            ],
        };
    }

    public function normaliseTechnique(?string $technique): ?string
    {
        $value = strtolower(trim((string) $technique));
        if (in_array($value, ['talqin', 'focus', 'blur'], true)) {
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
     * Merge recommended defaults with user overrides. Overrides win only for valid keys.
     *
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
                $merged = array_merge($merged, $this->techniqueFlags($technique));
            }
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

        foreach (['focus_enabled', 'blur_enabled', 'talqin_enabled'] as $flag) {
            if (array_key_exists($flag, $overrides)) {
                $merged[$flag] = (bool) $overrides[$flag];
            }
        }

        return $merged;
    }
}

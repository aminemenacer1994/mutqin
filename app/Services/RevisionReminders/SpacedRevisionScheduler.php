<?php

namespace App\Services\RevisionReminders;

use Illuminate\Support\Carbon;

/**
 * Server-side mirror of resources/js/scripts/composables/useRetentionZones.js.
 */
final class SpacedRevisionScheduler
{
    /** @var list<string> */
    private const ZONES = ['Fresh', 'Stable', 'Strong'];

    /**
     * @return array{zone: string, zone_step: int, interval_days: int, next_review_at: Carbon}
     */
    public function schedule(?string $zone, ?int $zoneStep, ?Carbon $from = null): array
    {
        $resolvedZone = $this->normaliseZone($zone);
        $step = max(0, min(2, (int) ($zoneStep ?? 0)));
        $days = $this->intervalDays($resolvedZone, $step);
        $fromAt = ($from ?? now())->copy();

        return [
            'zone' => $resolvedZone,
            'zone_step' => $step,
            'interval_days' => $days,
            'next_review_at' => $fromAt->copy()->addDays($days)->startOfDay(),
        ];
    }

    /**
     * Adjust zone/step from a reliable retention score, then schedule the next review.
     *
     * @param  'Easy'|'Shaky'|'Forgot'|string  $score
     * @return array{zone: string, zone_step: int, interval_days: int, next_review_at: Carbon, score: string}|null
     */
    public function advanceFromScore(?string $zone, ?int $zoneStep, string $score, ?Carbon $from = null): ?array
    {
        $normalised = $this->normaliseScore($score);
        if ($normalised === null) {
            return null;
        }

        $resolvedZone = $this->normaliseZone($zone);
        $currentIndex = max(0, array_search($resolvedZone, self::ZONES, true) ?: 0);
        $currentStep = max(0, min(2, (int) ($zoneStep ?? 0)));

        if ($normalised === 'Easy') {
            if ($currentStep >= 2) {
                $resolvedZone = self::ZONES[min(count(self::ZONES) - 1, $currentIndex + 1)];
                $currentStep = 0;
            } else {
                $currentStep = $currentStep + 1;
            }
        } elseif ($normalised === 'Forgot') {
            $resolvedZone = self::ZONES[max(0, $currentIndex - 1)];
            $currentStep = 0;
        }

        $scheduled = $this->schedule($resolvedZone, $currentStep, $from);

        return $scheduled + ['score' => $normalised];
    }

    /**
     * Map AI mastery / outcome bands to retention scores when self-rating is absent.
     */
    public function scoreFromPerformanceSignal(mixed $signal): ?string
    {
        if (is_string($signal)) {
            $fromScore = $this->normaliseScore($signal);
            if ($fromScore !== null) {
                return $fromScore;
            }
            $band = strtolower(trim($signal));
            return match ($band) {
                'strong', 'mastered', 'excellent', 'easy' => 'Easy',
                'ok', 'fair', 'medium', 'shaky', 'stable' => 'Shaky',
                'weak', 'poor', 'forgot', 'fail', 'failed' => 'Forgot',
                default => null,
            };
        }

        if (is_numeric($signal)) {
            $n = (float) $signal;
            if ($n >= 85) {
                return 'Easy';
            }
            if ($n >= 60) {
                return 'Shaky';
            }
            if ($n >= 0) {
                return 'Forgot';
            }
        }

        return null;
    }

    public function intervalDays(string $zone, int $zoneStep): int
    {
        $steps = $this->zoneSteps($this->normaliseZone($zone));
        $index = max(0, min(count($steps) - 1, $zoneStep));

        return max(0, (int) $steps[$index]);
    }

    /**
     * @return list<int>
     */
    public function zoneSteps(string $zone): array
    {
        $configured = config('mutqin.revision_reminders.zones', []);
        $steps = is_array($configured[$zone] ?? null) ? $configured[$zone] : null;
        if (! is_array($steps) || $steps === []) {
            $defaults = [
                'Fresh' => [0, 1, 2],
                'Stable' => [3, 7, 14],
                'Strong' => [30, 60, 90],
            ];
            $steps = $defaults[$zone] ?? $defaults['Fresh'];
        }

        return array_values(array_map('intval', $steps));
    }

    private function normaliseZone(?string $zone): string
    {
        $raw = is_string($zone) ? trim($zone) : '';
        if (in_array($raw, self::ZONES, true)) {
            return $raw;
        }

        return 'Fresh';
    }

    private function normaliseScore(string $score): ?string
    {
        $raw = strtolower(trim($score));

        return match ($raw) {
            'easy' => 'Easy',
            'shaky' => 'Shaky',
            'forgot' => 'Forgot',
            default => null,
        };
    }
}

<?php

namespace App\Services\Memorisation;

use App\Models\MemorisationAssessment;
use App\Models\MemorisationProgress;
use App\Models\SessionRecommendation;
use App\Models\User;
use App\Support\QuranMetadata;
use Carbon\Carbon;

/**
 * Long-term ayah mastery from reliable AI recitation evidence.
 *
 * Uses slow EMA so one good or bad session cannot swing mastery drastically.
 * Structured journey position is handled elsewhere — this only updates progress rows.
 */
class RecitationMasteryService
{
    private const EMA_ALPHA = 0.15;

    private const MAX_SESSION_DELTA = 0.10;

    private const MEMORISED_THRESHOLD = 55;

    private const MASTERED_THRESHOLD = 80;

    private const REVIEW_THRESHOLD = 40;

    /**
     * @param  array<string, mixed>  $analysis
     * @param  array<string, mixed>  $aligned
     */
    public function applyFromAssessment(
        User $user,
        MemorisationAssessment $assessment,
        array $analysis,
        array $aligned,
        string $outcome,
    ): void {
        $surah = (int) $assessment->surah_number;
        $from = (int) $assessment->start_ayah;
        $to = (int) $assessment->end_ayah;
        if ($surah <= 0 || $from <= 0 || $to < $from) {
            return;
        }

        if ($assessment->exists && $assessment->status === MemorisationAssessment::STATUS_FAILED) {
            return;
        }
        if ($assessment->exists && $assessment->overall_accuracy === null && ! isset($aligned['accuracy'])) {
            return;
        }

        $accuracy = (int) ($aligned['accuracy'] ?? $assessment->overall_accuracy ?? 0);
        $outcome = strtolower($outcome);
        if (! in_array($outcome, ['strong', 'mixed', 'weak'], true)) {
            return;
        }

        $baseScore = $this->sessionScore($outcome, $accuracy);
        $weakAyahs = array_fill_keys(
            array_map('intval', is_array($analysis['weak_ayahs'] ?? null) ? $analysis['weak_ayahs'] : []),
            true
        );
        $ayahResults = $this->ayahResultMap(is_array($analysis['ayah_results'] ?? null) ? $analysis['ayah_results'] : []);
        $now = now();

        $ayahNumbers = [];
        for ($ayah = $from; $ayah <= $to; $ayah++) {
            if (! QuranMetadata::isValidAyah($surah, $ayah)) {
                break;
            }
            $ayahNumbers[] = $ayah;
        }
        if ($ayahNumbers === []) {
            return;
        }

        $existing = MemorisationProgress::query()
            ->where('user_id', $user->id)
            ->where('surah_number', $surah)
            ->whereIn('ayah_number', $ayahNumbers)
            ->get()
            ->keyBy('ayah_number');

        foreach ($ayahNumbers as $ayah) {
            $ayahScore = $this->scoreForAyah($baseScore, $ayah, $ayahResults, isset($weakAyahs[$ayah]));
            $row = $existing->get($ayah);
            if (! $row) {
                $row = new MemorisationProgress([
                    'user_id' => $user->id,
                    'surah_number' => $surah,
                    'ayah_number' => $ayah,
                    'status' => 'learning',
                    'mastery_level' => 0,
                    'repetitions' => 0,
                ]);
            }
            $this->applyScoreToRow($row, $ayahScore, isset($weakAyahs[$ayah]), $outcome, $assessment->id, $now);
            $row->save();
        }
    }

    /**
     * Fallback when only recommendation AI payload exists (no persisted assessment).
     *
     * @param  array<string, mixed>  $assessment
     */
    public function applyFromAiPayload(
        User $user,
        SessionRecommendation $recommendation,
        array $assessment,
    ): void {
        if ((int) data_get($assessment, 'plan_detail.assessment_id', data_get($assessment, 'assessment_id', 0)) > 0) {
            return;
        }

        $surah = (int) ($recommendation->surah_number ?? 0);
        $range = is_array($assessment['ayah_range'] ?? null) ? $assessment['ayah_range'] : [];
        $from = (int) ($range['from'] ?? $recommendation->ayah_start ?? 0);
        $to = (int) ($range['to'] ?? $recommendation->ayah_end ?? $from);
        if ($surah <= 0 || $from <= 0 || $to < $from) {
            return;
        }

        $outcome = strtolower((string) ($assessment['result'] ?? ''));
        if (! in_array($outcome, ['strong', 'mixed', 'weak'], true)) {
            return;
        }
        $accuracy = isset($assessment['average_accuracy']) && is_numeric($assessment['average_accuracy'])
            ? (int) round((float) $assessment['average_accuracy'])
            : (isset($assessment['accuracy_percent']) && is_numeric($assessment['accuracy_percent'])
                ? (int) round((float) $assessment['accuracy_percent'])
                : 0);

        $pseudo = new MemorisationAssessment([
            'surah_number' => $surah,
            'start_ayah' => $from,
            'end_ayah' => $to,
            'overall_accuracy' => $accuracy,
            'id' => null,
        ]);

        $this->applyFromAssessment($user, $pseudo, [
            'weak_ayahs' => is_array($assessment['weak_ayahs'] ?? null) ? $assessment['weak_ayahs'] : [],
            'ayah_results' => [],
        ], ['accuracy' => $accuracy], $outcome);
    }

    private function sessionScore(string $outcome, int $accuracy): float
    {
        $acc = max(0, min(100, $accuracy)) / 100;

        return match ($outcome) {
            'strong' => max(0.82, min(0.98, 0.75 + ($acc * 0.23))),
            'weak' => max(0.12, min(0.42, 0.08 + ($acc * 0.34))),
            default => max(0.45, min(0.78, 0.35 + ($acc * 0.43))),
        };
    }

    /**
     * @param  array<int, array<string, mixed>>  $ayahResults
     */
    private function scoreForAyah(float $baseScore, int $ayah, array $ayahResults, bool $markedWeak): float
    {
        $row = $ayahResults[$ayah] ?? null;
        if (! is_array($row)) {
            return $markedWeak ? min($baseScore, 0.52) : $baseScore;
        }

        $ayahAcc = max(0, min(100, (int) ($row['accuracy'] ?? 0))) / 100;
        $blended = (0.55 * $baseScore) + (0.45 * $ayahAcc);

        return $markedWeak ? min($blended, 0.55) : $blended;
    }

    /**
     * @param  list<array<string, mixed>>  $ayahResults
     * @return array<int, array<string, mixed>>
     */
    private function ayahResultMap(array $ayahResults): array
    {
        $map = [];
        foreach ($ayahResults as $row) {
            if (! is_array($row)) {
                continue;
            }
            $ayah = (int) ($row['ayah_number'] ?? 0);
            if ($ayah > 0) {
                $map[$ayah] = $row;
            }
        }

        return $map;
    }

    private function applyScoreToRow(
        MemorisationProgress $row,
        float $sessionScore,
        bool $wasWeakAyah,
        string $outcome,
        ?int $assessmentId,
        Carbon $now,
    ): void {
        $meta = is_array($row->metadata) ? $row->metadata : [];
        $rm = is_array($meta['recitation_mastery'] ?? null) ? $meta['recitation_mastery'] : [];

        if ($assessmentId && (int) ($rm['last_assessment_id'] ?? 0) === $assessmentId) {
            return;
        }

        $prevEma = isset($rm['ema']) && is_numeric($rm['ema'])
            ? (float) $rm['ema']
            : max(0, min(1, ((int) $row->mastery_level) / 100));

        $target = max(0, min(1, $sessionScore));
        $delta = self::EMA_ALPHA * ($target - $prevEma);
        $delta = max(-self::MAX_SESSION_DELTA, min(self::MAX_SESSION_DELTA, $delta));
        $newEma = max(0, min(1, $prevEma + $delta));

        $success = $outcome === 'strong' || ($outcome === 'mixed' && $sessionScore >= 0.62);
        $successStreak = $success ? ((int) ($rm['success_streak'] ?? 0) + 1) : 0;
        $failureStreak = $success ? 0 : ((int) ($rm['failure_streak'] ?? 0) + 1);

        $masteryLevel = (int) round($newEma * 100);
        $row->mastery_level = $masteryLevel;
        $row->repetitions = max(0, (int) $row->repetitions) + 1;

        if ($wasWeakAyah) {
            $meta['weak_count'] = max(1, (int) ($meta['weak_count'] ?? 0) + 1);
            $meta['engine_status'] = 'weak';
        } elseif ($success) {
            $meta['weak_count'] = max(0, (int) ($meta['weak_count'] ?? 0) - 1);
            if ((int) ($meta['weak_count'] ?? 0) === 0) {
                unset($meta['engine_status']);
            }
        }

        $meta['recitation_mastery'] = [
            'ema' => round($newEma, 4),
            'session_count' => ((int) ($rm['session_count'] ?? 0)) + 1,
            'success_streak' => $successStreak,
            'failure_streak' => $failureStreak,
            'last_session_score' => round($sessionScore, 4),
            'last_outcome' => $outcome,
            'last_assessment_id' => $assessmentId,
            'last_updated_at' => $now->toIso8601String(),
        ];
        $meta['ai_recite'] = array_merge(is_array($meta['ai_recite'] ?? null) ? $meta['ai_recite'] : [], [
            'last_accuracy' => (int) round($sessionScore * 100),
            'weak' => $wasWeakAyah,
            'updated_at' => $now->toIso8601String(),
        ]);

        if ($masteryLevel >= self::MASTERED_THRESHOLD && $successStreak >= 2) {
            $row->status = 'mastered';
            $meta['last_review_at'] = $now->toIso8601String();
        } elseif ($masteryLevel >= self::MEMORISED_THRESHOLD && $successStreak >= 1) {
            if ((string) $row->status !== 'mastered') {
                $row->status = 'memorised';
            }
            if ($success) {
                $meta['last_review_at'] = $now->toIso8601String();
            }
        } elseif ($masteryLevel < self::REVIEW_THRESHOLD && $failureStreak >= 2) {
            $row->status = 'reviewing';
        } elseif ($wasWeakAyah && $failureStreak >= 1 && ! in_array((string) $row->status, ['mastered'], true)) {
            $row->status = 'reviewing';
        }

        $row->metadata = $meta;
        if ($row->status === 'mastered' && ! $row->completed_at) {
            $row->completed_at = $now;
        }
    }
}

<?php

namespace App\Services;

use App\Enums\RecommendationReasonCode;
use App\Enums\RecommendationStatus;
use App\Enums\RecommendationType;
use App\Enums\UserSessionStatus;
use App\Models\HifzPlan;
use App\Models\MemorisationAssessment;
use App\Models\MemorisationProgress;
use App\Models\MemorisationWeakSpot;
use App\Models\SessionRecommendation;
use App\Models\User;
use App\Models\UserSession;
use App\Support\QuranMetadata;
use Illuminate\Support\Collection;

/**
 * Learner-profile snapshot, candidate ranking, and evidence-backed "why this"
 * explanations for next-session, dashboard, and practice-plan recommendations.
 */
class PersonalizedRecommendationEngine
{
    public const DECISION_PICKED = 'picked';

    public const DECISION_SUGGESTED = 'suggested';

    public const DECISION_PLANNED = 'planned';

    public const DECISION_RECOMMENDED = 'recommended';

    public const TIER_SPARSE = 'sparse';

    public const TIER_FORMING = 'forming';

    public const TIER_RICH = 'rich';

    /**
     * @param  array<string, mixed>  $sessionContext
     * @return array<string, mixed>
     */
    public function snapshot(User $user, array $sessionContext = []): array
    {
        $plan = HifzPlan::query()->where('user_id', $user->id)->first();
        $config = is_array($plan?->config) ? $plan->config : [];
        $style = strtolower((string) ($config['learningStyle'] ?? 'balanced'));
        if (! in_array($style, ['light', 'balanced', 'intensive'], true)) {
            $style = 'balanced';
        }
        $focus = (string) ($config['focusMode'] ?? 'mixed');
        if (! in_array($focus, ['mixed', 'revisionPriority', 'weakAyahFocus', 'newPriority'], true)) {
            $focus = 'mixed';
        }
        $dailyNew = (int) data_get($config, 'goalSettings.dailyNewAyahs', 0);

        $history = SessionRecommendation::query()
            ->where('user_id', $user->id)
            ->latest('id')
            ->limit(24)
            ->get([
                'id',
                'recommendation_type',
                'reason_code',
                'recommended_technique',
                'accepted',
                'chose_other',
                'status',
                'surah_number',
                'ayah_start',
                'ayah_end',
                'created_at',
            ]);

        $techniqueScores = $this->scoreTechniques($history);

        $weakSpots = MemorisationWeakSpot::query()
            ->where('user_id', $user->id)
            ->whereIn('status', [
                MemorisationWeakSpot::STATUS_ACTIVE,
                MemorisationWeakSpot::STATUS_IMPROVING,
            ])
            ->orderByDesc('affected_attempt_count')
            ->orderByDesc('last_identified_at')
            ->limit(16)
            ->get();

        $assessments = MemorisationAssessment::query()
            ->where('user_id', $user->id)
            ->where('status', MemorisationAssessment::STATUS_COMPLETED)
            ->latest('id')
            ->limit(8)
            ->get([
                'id',
                'surah_number',
                'start_ayah',
                'end_ayah',
                'overall_accuracy',
                'match_result',
                'created_at',
            ]);
        $recentAssessment = $assessments->first();
        $aiTrend = $this->aiTrend($assessments);

        $progressQuery = MemorisationProgress::query()->where('user_id', $user->id);
        $avgMastery = (float) ($progressQuery->clone()->avg('mastery_level') ?? 0);
        $reviewingCount = (int) $progressQuery->clone()->where('status', 'reviewing')->count();
        $learningCount = (int) $progressQuery->clone()->where('status', 'learning')->count();
        $memorisedCount = (int) $progressQuery->clone()->where('status', 'memorised')->count();
        $progressAyahs = (int) $progressQuery->clone()->count();
        $completedSessions = (int) UserSession::query()
            ->where('user_id', $user->id)
            ->where('status', UserSessionStatus::Completed)
            ->count();

        $rangeProgress = $sessionContext['range_progress'] ?? collect();
        $rangeAvg = $rangeProgress instanceof Collection
            ? (float) ($rangeProgress->avg('mastery_level') ?? 0)
            : 0.0;
        $difficultAyahs = [];
        if ($rangeProgress instanceof Collection) {
            $difficultAyahs = $rangeProgress
                ->filter(function ($row) {
                    $weakCount = (int) data_get($row->metadata, 'weak_count', 0);
                    $engine = (string) data_get($row->metadata, 'engine_status', '');

                    return $engine === 'weak' || $weakCount >= 2;
                })
                ->pluck('ayah_number')
                ->map(fn ($n) => (int) $n)
                ->values()
                ->all();
        }

        $preferredSize = match ($style) {
            'light' => 2,
            'intensive' => 3,
            default => max(1, min(3, (int) ($sessionContext['preferred_session_size'] ?? 3))),
        };

        $openWeak = $weakSpots->map(function (MemorisationWeakSpot $spot) {
            $meta = is_array($spot->metadata) ? $spot->metadata : [];

            return [
                'surah_number' => (int) $spot->surah_number,
                'ayah_number' => (int) $spot->ayah_number,
                'spot_type' => (string) $spot->spot_type,
                'severity' => (string) $spot->severity,
                'attempts' => (int) $spot->affected_attempt_count,
                'word' => (string) ($meta['text'] ?? $meta['word'] ?? $meta['arabic'] ?? ''),
                'last_identified_at' => optional($spot->last_identified_at)->toIso8601String(),
            ];
        })->values()->all();

        $signals = [
            'completed_sessions' => $completedSessions,
            'ai_assessments' => $assessments->count(),
            'technique_decisions' => $history->filter(
                static fn ($row) => (bool) $row->accepted || (bool) $row->chose_other
            )->count(),
            'open_weak_spots' => count($openWeak),
            'progress_ayahs' => $progressAyahs,
            'accepted_recommendations' => $history->where('accepted', true)->count(),
            'dismissed_recommendations' => $history->where('chose_other', true)->count(),
        ];
        $maturity = self::maturityFromSignals($signals);
        [$preferredTechnique, $avoidTechniques] = $this->selectTechniqueMemory(
            $techniqueScores,
            $maturity
        );

        $chronicWeak = array_values(array_filter(
            $openWeak,
            static fn (array $spot) => (int) ($spot['attempts'] ?? 0) >= 3
        ));

        return [
            'learning_style' => $style,
            'focus_mode' => $focus,
            'daily_new_ayahs' => $dailyNew,
            'preferred_session_size' => $preferredSize,
            'preferred_technique' => $preferredTechnique,
            'avoid_techniques' => $avoidTechniques,
            'technique_scores' => $techniqueScores,
            'open_weak_spots' => $openWeak,
            'open_weak_spot_count' => count($openWeak),
            'chronic_weak_spots' => $chronicWeak,
            'range_avg_mastery' => round($rangeAvg, 1),
            'overall_avg_mastery' => round($avgMastery, 1),
            'reviewing_ayahs' => $reviewingCount,
            'learning_ayahs' => $learningCount,
            'memorised_ayahs' => $memorisedCount,
            'difficult_ayahs_this_range' => $difficultAyahs,
            'recent_ai' => $recentAssessment ? [
                'accuracy' => is_numeric($recentAssessment->overall_accuracy)
                    ? (int) round((float) $recentAssessment->overall_accuracy)
                    : null,
                'result' => (string) ($recentAssessment->match_result ?? ''),
                'surah_number' => (int) $recentAssessment->surah_number,
                'from' => (int) $recentAssessment->start_ayah,
                'to' => (int) $recentAssessment->end_ayah,
            ] : null,
            'ai_trend' => $aiTrend,
            'maturity' => $maturity,
            'accepted_recommendation_count' => $signals['accepted_recommendations'],
            'dismissed_recommendation_count' => $signals['dismissed_recommendations'],
            'completed_session_count' => $completedSessions,
        ];
    }

    /**
     * Ranked overdue murājaʿah candidate outside the just-completed range.
     *
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>|null
     */
    public function bestOverdueCandidate(User $user, array $context): ?array
    {
        if (! ($context['session_completed'] ?? false)) {
            return null;
        }

        $learner = is_array($context['learner'] ?? null) ? $context['learner'] : [];
        $focus = (string) ($learner['focus_mode'] ?? 'mixed');
        $spots = is_array($learner['open_weak_spots'] ?? null) ? $learner['open_weak_spots'] : [];
        if ($spots === []) {
            return null;
        }

        $currentSurah = (int) ($context['surah']['id'] ?? 0);
        $rangeStart = (int) ($context['range_start'] ?? 0);
        $rangeEnd = (int) ($context['range_end'] ?? 0);
        $outside = array_values(array_filter($spots, function (array $spot) use ($currentSurah, $rangeStart, $rangeEnd) {
            $surah = (int) ($spot['surah_number'] ?? 0);
            $ayah = (int) ($spot['ayah_number'] ?? 0);
            if ($surah <= 0 || $ayah <= 0) {
                return false;
            }
            $inCurrent = $surah === $currentSurah && $ayah >= $rangeStart && $ayah <= $rangeEnd;

            return ! $inCurrent;
        }));

        if ($outside === []) {
            return null;
        }

        $highSeverity = array_values(array_filter($outside, function (array $spot) {
            $severity = strtolower((string) ($spot['severity'] ?? ''));
            $attempts = (int) ($spot['attempts'] ?? 0);

            return $attempts >= 2 || in_array($severity, ['high', 'red', 'black', 'severe'], true);
        }));

        $historyWeight = (float) data_get($learner, 'maturity.weights.history', 0);
        $weakWeight = (float) data_get($learner, 'maturity.weights.weak_spots', 0);
        $eligible = in_array($focus, ['revisionPriority', 'weakAyahFocus'], true)
            || ($weakWeight >= 0.5
                && $historyWeight >= 0.35
                && ($context['range_was_strong'] ?? false)
                && $highSeverity !== []);

        if (! $eligible) {
            return null;
        }

        $pool = $highSeverity !== [] ? $highSeverity : $outside;
        usort($pool, function (array $a, array $b) {
            $attemptDelta = ((int) ($b['attempts'] ?? 0)) <=> ((int) ($a['attempts'] ?? 0));
            if ($attemptDelta !== 0) {
                return $attemptDelta;
            }

            return ((int) ($a['ayah_number'] ?? 0)) <=> ((int) ($b['ayah_number'] ?? 0));
        });

        $primary = $pool[0];
        $surahId = (int) $primary['surah_number'];
        $sameSurah = array_values(array_filter(
            $pool,
            static fn (array $spot) => (int) ($spot['surah_number'] ?? 0) === $surahId
        ));
        $ayahs = array_values(array_unique(array_map(
            static fn (array $spot) => (int) $spot['ayah_number'],
            array_slice($sameSurah, 0, 3)
        )));
        sort($ayahs);
        $from = (int) $ayahs[0];
        $to = (int) min(end($ayahs), $from + 2);
        $surah = QuranMetadata::surah($surahId);
        if (! $surah) {
            return null;
        }

        $words = array_values(array_filter(array_map(
            static fn (array $spot) => trim((string) ($spot['word'] ?? '')),
            array_slice($sameSurah, 0, 4)
        )));

        $score = 78 + min(12, count($sameSurah) * 3);
        $score += (int) round(min(10, (int) ($primary['attempts'] ?? 0)) * $weakWeight);
        if ($focus === 'weakAyahFocus') {
            $score += 8;
        }
        if ($focus === 'revisionPriority') {
            $score += 6;
        }
        $score += (int) round($historyWeight * 8);

        return [
            'type' => RecommendationType::Revision,
            'reason_code' => RecommendationReasonCode::ReviewOverdue,
            'surah' => $surah,
            'from' => $from,
            'to' => $to,
            'ayahs' => $ayahs,
            'words' => $words,
            'score' => $score,
            'range_kind' => 'revision',
            'decision' => self::DECISION_SUGGESTED,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    public function explain(array $payload, array $context): array
    {
        $learner = is_array($context['learner'] ?? null) ? $context['learner'] : [];
        $type = RecommendationType::tryFrom((string) ($payload['type'] ?? ''));
        $decision = $this->decisionKind($type, $payload);
        $range = is_array($payload['ayah_range'] ?? null) ? $payload['ayah_range'] : null;
        $settings = is_array($payload['settings'] ?? null) ? $payload['settings'] : [];
        $picked = $this->pickedBecause($payload, $context, $learner, $type, $range);
        $settingsBecause = $this->settingsBecause($payload, $context, $learner, $settings);
        $notChosen = $this->notChosen($payload, $context, $type);
        $summary = $this->composeSummary($payload, $picked, $settingsBecause, $range);

        $why = [
            'summary' => $summary,
            'decision' => $decision,
            'picked_because' => $picked,
            'settings_because' => $settingsBecause,
            'not_chosen' => $notChosen,
            'learner' => [
                'learning_style' => $learner['learning_style'] ?? 'balanced',
                'focus_mode' => $learner['focus_mode'] ?? 'mixed',
                'preferred_technique' => $learner['preferred_technique'] ?? null,
                'range_avg_mastery' => $learner['range_avg_mastery'] ?? null,
                'open_weak_spot_count' => $learner['open_weak_spot_count'] ?? 0,
                'maturity' => is_array($learner['maturity'] ?? null) ? $learner['maturity'] : self::maturityFromSignals([]),
                'ai_trend' => is_array($learner['ai_trend'] ?? null) ? $learner['ai_trend'] : null,
            ],
        ];

        $points = array_values(array_filter(array_map(
            static fn (array $item) => trim((string) ($item['text'] ?? '')),
            array_merge($picked, $settingsBecause)
        )));
        $isRepeat = $type?->isRepeat()
            || (string) ($payload['session_mode'] ?? '') === 'revision';
        if ($isRepeat) {
            $points = array_values(array_filter($points, static function (string $point): bool {
                return ! preg_match('/this set is secure|continue to the next recommended set|without an explicit weak-ayah trap/i', $point);
            }));
        }

        $payload['why'] = $why;
        $payload['why_summary'] = $summary;
        $payload['why_points'] = $points;
        $payload['decision'] = $decision;
        $payload['personalisation'] = $why['learner'];

        if ($summary !== '') {
            $payload['reason'] = $summary;
            if (empty($payload['user_reason'])) {
                $payload['user_reason'] = $summary;
            }
        }

        return $payload;
    }

    /**
     * Compounding intelligence ladder: more completed sessions, AI Recites,
     * technique decisions, and weak spots raise the tier and unlock history.
     *
     * @param  array<string, int|float>  $signals
     * @return array{
     *   tier: string,
     *   confidence: float,
     *   signals: array<string, int>,
     *   weights: array<string, float>
     * }
     */
    public static function maturityFromSignals(array $signals): array
    {
        $sessions = max(0, (int) ($signals['completed_sessions'] ?? 0));
        $ai = max(0, (int) ($signals['ai_assessments'] ?? 0));
        $decisions = max(0, (int) ($signals['technique_decisions'] ?? 0));
        $spots = max(0, (int) ($signals['open_weak_spots'] ?? 0));
        $progress = max(0, (int) ($signals['progress_ayahs'] ?? 0));
        $accepted = max(0, (int) ($signals['accepted_recommendations'] ?? 0));
        $dismissed = max(0, (int) ($signals['dismissed_recommendations'] ?? 0));

        $confidence = min(1.0, round(
            min($sessions, 12) / 12 * 0.35
            + min($ai, 8) / 8 * 0.25
            + min($decisions, 10) / 10 * 0.20
            + min($spots, 8) / 8 * 0.10
            + min($progress, 40) / 40 * 0.10,
            2
        ));

        $tier = self::TIER_SPARSE;
        if ($confidence >= 0.45 || ($sessions >= 9 && ($ai >= 3 || $spots >= 3 || $decisions >= 6))) {
            $tier = self::TIER_RICH;
        } elseif ($confidence >= 0.18 || $sessions >= 3 || $ai >= 2 || $spots >= 2 || $decisions >= 3) {
            $tier = self::TIER_FORMING;
        }

        $weights = match ($tier) {
            self::TIER_RICH => [
                'session_evidence' => 1.0,
                'history' => 0.75,
                'weak_spots' => 0.85,
                'technique_memory' => 0.70,
                'mastery_trend' => 0.60,
            ],
            self::TIER_FORMING => [
                'session_evidence' => 1.0,
                'history' => 0.40,
                'weak_spots' => 0.55,
                'technique_memory' => 0.35,
                'mastery_trend' => 0.25,
            ],
            default => [
                'session_evidence' => 1.0,
                'history' => 0.0,
                'weak_spots' => $spots > 0 ? 0.15 : 0.0,
                'technique_memory' => 0.0,
                'mastery_trend' => 0.0,
            ],
        };

        return [
            'tier' => $tier,
            'confidence' => $confidence,
            'signals' => [
                'completed_sessions' => $sessions,
                'ai_assessments' => $ai,
                'technique_decisions' => $decisions,
                'open_weak_spots' => $spots,
                'progress_ayahs' => $progress,
                'accepted_recommendations' => $accepted,
                'dismissed_recommendations' => $dismissed,
            ],
            'weights' => $weights,
        ];
    }

    /**
     * Recency-weighted technique memory. Newer accepts/dismissals count more.
     *
     * @param  Collection<int, SessionRecommendation>  $history
     * @return array<string, float>
     */
    private function scoreTechniques(Collection $history): array
    {
        $scores = [];
        foreach ($history->values() as $index => $row) {
            $technique = strtolower(trim((string) ($row->recommended_technique ?? '')));
            if ($technique === '') {
                continue;
            }
            $weight = 0.88 ** (int) $index;
            $status = $row->status instanceof RecommendationStatus
                ? $row->status
                : RecommendationStatus::tryFrom((string) $row->status);
            if ($row->accepted || $status === RecommendationStatus::Started) {
                $scores[$technique] = ($scores[$technique] ?? 0) + (1.0 * $weight);
            }
            if ($row->chose_other || $status === RecommendationStatus::Dismissed) {
                $scores[$technique] = ($scores[$technique] ?? 0) - (1.25 * $weight);
            }
        }
        arsort($scores);

        return array_map(static fn ($score) => round((float) $score, 2), $scores);
    }

    /**
     * @param  array<string, float>  $scores
     * @param  array<string, mixed>  $maturity
     * @return array{0: ?string, 1: list<string>}
     */
    private function selectTechniqueMemory(array $scores, array $maturity): array
    {
        $memory = (float) data_get($maturity, 'weights.technique_memory', 0);
        if ($memory < 0.3 || $scores === []) {
            return [null, []];
        }
        $preferFloor = $memory >= 0.7 ? 1.0 : 1.75;
        $avoidCeiling = $memory >= 0.7 ? -1.0 : -2.0;
        $preferred = null;
        foreach ($scores as $technique => $score) {
            if ((float) $score >= $preferFloor) {
                $preferred = (string) $technique;
                break;
            }
        }
        $avoid = array_keys(array_filter(
            $scores,
            static fn ($score) => (float) $score <= $avoidCeiling
        ));

        return [$preferred, array_values($avoid)];
    }

    /**
     * @param  Collection<int, MemorisationAssessment>  $assessments
     * @return array{count: int, latest: ?int, mean: ?int, direction: ?string}
     */
    private function aiTrend(Collection $assessments): array
    {
        $values = $assessments
            ->map(static fn ($row) => is_numeric($row->overall_accuracy) ? (int) round((float) $row->overall_accuracy) : null)
            ->filter(static fn ($n) => $n !== null)
            ->values();
        $count = $values->count();
        if ($count === 0) {
            return ['count' => 0, 'latest' => null, 'mean' => null, 'direction' => null];
        }
        $latest = (int) $values->first();
        $mean = (int) round((float) $values->avg());
        $direction = null;
        if ($count >= 3) {
            $recent = (float) $values->take(3)->avg();
            $older = (float) $values->slice(3)->avg();
            if ($values->slice(3)->isNotEmpty()) {
                if ($recent - $older >= 6) {
                    $direction = 'improving';
                } elseif ($older - $recent >= 6) {
                    $direction = 'declining';
                } else {
                    $direction = 'stable';
                }
            }
        }

        return [
            'count' => $count,
            'latest' => $latest,
            'mean' => $mean,
            'direction' => $direction,
        ];
    }

    private function decisionKind(?RecommendationType $type, array $payload): string
    {
        if (! empty($payload['decision'])) {
            return (string) $payload['decision'];
        }

        return match ($type) {
            RecommendationType::Resume => self::DECISION_PICKED,
            RecommendationType::Revision, RecommendationType::RepeatCurrentRange => self::DECISION_RECOMMENDED,
            RecommendationType::NextSurah, RecommendationType::CompleteSurah => self::DECISION_PLANNED,
            RecommendationType::Continue, RecommendationType::ContinueNextRange => self::DECISION_PLANNED,
            RecommendationType::ManualSelection, RecommendationType::PlanComplete => self::DECISION_SUGGESTED,
            default => self::DECISION_RECOMMENDED,
        };
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $context
     * @param  array<string, mixed>  $learner
     * @param  array{from?: int, to?: int, count?: int}|null  $range
     * @return list<array{code: string, text: string}>
     */
    private function pickedBecause(
        array $payload,
        array $context,
        array $learner,
        ?RecommendationType $type,
        ?array $range,
    ): array {
        $items = [];
        $code = (string) ($payload['reason_code'] ?? '');
        $surahName = (string) ($payload['surah']['name'] ?? $payload['completed_surah']['name'] ?? 'this surah');
        $span = $this->rangeLabel($range);
        $difficult = array_values(array_filter(array_map(
            'intval',
            is_array($learner['difficult_ayahs_this_range'] ?? null) ? $learner['difficult_ayahs_this_range'] : []
        )));
        $mastery = $learner['range_avg_mastery'] ?? null;
        $style = (string) ($learner['learning_style'] ?? 'balanced');
        $focus = (string) ($learner['focus_mode'] ?? 'mixed');
        $fromSession = (int) ($context['range_start'] ?? 0);
        $toSession = (int) ($context['range_end'] ?? 0);
        $completedSpan = ($fromSession && $toSession)
            ? $this->rangeLabel(['from' => $fromSession, 'to' => $toSession])
            : '';

        if ($type === RecommendationType::Resume) {
            $items[] = [
                'code' => 'resume_mid_range',
                'text' => $span
                    ? "You paused before finishing {$span} of {$surahName}, so this session picks up the leftover ayahs instead of starting something new."
                    : 'You paused mid-range, so this session resumes the unfinished ayahs.',
            ];
        } elseif ($type?->isRepeat()) {
            if ($difficult !== []) {
                $ayahList = $this->ayahList($difficult);
                $items[] = [
                    'code' => 'explicit_weak_ayahs',
                    'text' => "{$ayahList} still show explicit weakness (engine mark or repeated slips), so revision is required before new material.",
                ];
            } elseif ($code === RecommendationReasonCode::ReviewOverdue->value) {
                $open = is_array($learner['open_weak_spots'] ?? null) ? $learner['open_weak_spots'] : [];
                $wordBits = array_values(array_filter(array_map(
                    static fn (array $spot) => trim((string) ($spot['word'] ?? '')),
                    array_slice($open, 0, 3)
                )));
                $wordClause = $wordBits !== []
                    ? ' including '.implode(', ', array_map(static fn ($w) => "«{$w}»", $wordBits))
                    : '';
                $items[] = [
                    'code' => 'overdue_murajaah',
                    'text' => $span
                        ? "Open weak spots{$wordClause} on {$span} of {$surahName} are still unresolved, so murājaʿah is ranked above adding new ayahs."
                        : "Open weak spots{$wordClause} are still unresolved, so murājaʿah is ranked above adding new ayahs.",
                ];
            } else {
                $items[] = [
                    'code' => 'reinforce_before_progress',
                    'text' => $span
                        ? "{$span} still needs another supported pass before the next set."
                        : 'This range still needs another supported pass before the next set.',
                ];
            }
        } elseif ($type === RecommendationType::NextSurah) {
            $nextName = (string) ($payload['next_surah']['name'] ?? $payload['surah']['name'] ?? 'the next surah');
            $items[] = [
                'code' => 'surah_finished',
                'text' => $completedSpan
                    ? "You finished {$completedSpan} of {$surahName}. The plan begins {$nextName} from the opening ayahs at a gentle pace."
                    : "You completed {$surahName}. The plan begins {$nextName} from the opening ayahs.",
            ];
        } elseif ($type === RecommendationType::CompleteSurah) {
            $items[] = [
                'code' => 'finish_remaining',
                'text' => $span
                    ? "Only {$span} remain in {$surahName}. Completing them now closes the surah while the previous ayahs are still fresh."
                    : "A short stretch remains in {$surahName}. Completing it now closes the section you began.",
            ];
        } elseif ($type?->isContinue()) {
            $masteryBit = is_numeric($mastery) && $mastery > 0
                ? ' Average mastery on the set you just finished is '.(int) round((float) $mastery).'/100.'
                : '';
            $items[] = [
                'code' => 'advance_while_fresh',
                'text' => ($completedSpan
                    ? "You completed {$completedSpan} of {$surahName} without an explicit weak-ayah trap."
                    : "You completed this range of {$surahName} without an explicit weak-ayah trap.")
                    .$masteryBit
                    .' The next valid window is scheduled while recall is still warm.',
            ];
        } elseif ($type === RecommendationType::PlanComplete || $type === RecommendationType::ManualSelection) {
            $items[] = [
                'code' => 'no_automatic_next',
                'text' => 'There is no automatic next set from your current cursor, so Mutqin asks you to choose.',
            ];
        }

        if ($style === 'light' && $type?->isContinue() && $range) {
            $count = (int) ($range['count'] ?? 0);
            if ($count > 0 && $count <= 2) {
                $items[] = [
                    'code' => 'learning_style_light',
                    'text' => 'Your Hifz plan is set to a light daily load, so the next window stays short.',
                ];
            }
        }
        if ($style === 'intensive' && $type?->isContinue()) {
            $items[] = [
                'code' => 'learning_style_intensive',
                'text' => 'Your Hifz plan is intensive, so the next window uses the full 3-ayah practice cap.',
            ];
        }
        if ($focus === 'newPriority' && $type?->isContinue()) {
            $items[] = [
                'code' => 'focus_new_priority',
                'text' => 'Your plan prefers new memorisation, so Mutqin advances rather than inserting extra murājaʿah.',
            ];
        }
        if ($focus === 'revisionPriority' && $type?->isRepeat()) {
            $items[] = [
                'code' => 'focus_revision_priority',
                'text' => 'Your plan prefers revision, so weak or overdue ayahs outrank new material.',
            ];
        }

        $recentAi = is_array($learner['recent_ai'] ?? null) ? $learner['recent_ai'] : null;
        $aiTrend = is_array($learner['ai_trend'] ?? null) ? $learner['ai_trend'] : [];
        $trendDirection = (string) ($aiTrend['direction'] ?? '');
        $trendCount = (int) ($aiTrend['count'] ?? 0);
        $trendMean = $aiTrend['mean'] ?? null;
        if ($recentAi && isset($recentAi['accuracy']) && $recentAi['accuracy'] !== null) {
            $trendBit = '';
            if ($trendCount >= 3 && $trendMean !== null && $trendDirection !== '') {
                $trendBit = ' Across '.$trendCount.' AI Recites the average is '.(int) $trendMean
                    .'%, and the recent run is '.$trendDirection.'.';
            }
            $items[] = [
                'code' => 'recent_ai_recite',
                'text' => 'Your latest AI Recite scored '.(int) $recentAi['accuracy'].'% on that range, which shaped whether to repeat or continue.'.$trendBit,
            ];
        }

        $tier = (string) data_get($learner, 'maturity.tier', self::TIER_SPARSE);
        $signals = is_array(data_get($learner, 'maturity.signals')) ? $learner['maturity']['signals'] : [];
        $sessionCount = (int) ($signals['completed_sessions'] ?? $learner['completed_session_count'] ?? 0);
        $aiCount = (int) ($signals['ai_assessments'] ?? 0);
        $spotCount = (int) ($learner['open_weak_spot_count'] ?? 0);
        if ($tier === self::TIER_FORMING) {
            $items[] = [
                'code' => 'learner_memory_forming',
                'text' => 'Mutqin is starting to use your recent sessions, not only this sitting.',
            ];
        } elseif ($tier === self::TIER_RICH) {
            $bits = [];
            if ($sessionCount > 0) {
                $bits[] = $sessionCount.' completed sessions';
            }
            if ($aiCount > 0) {
                $bits[] = $aiCount.' AI Recites';
            }
            if ($spotCount > 0) {
                $bits[] = $spotCount.' open weak spots';
            }
            $joined = $bits !== [] ? implode(', ', $bits) : 'your stored history';
            $items[] = [
                'code' => 'learner_memory_rich',
                'text' => "This plan uses {$joined} together, so the next step gets more specific as that history grows.",
            ];
        }

        if ($items === []) {
            $fallback = trim((string) ($payload['user_reason'] ?? $payload['reason'] ?? ''));
            if ($fallback !== '') {
                $items[] = ['code' => $code ?: 'session_evidence', 'text' => $fallback];
            }
        }

        return $items;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $context
     * @param  array<string, mixed>  $learner
     * @param  array<string, mixed>  $settings
     * @return list<array{code: string, text: string}>
     */
    private function settingsBecause(array $payload, array $context, array $learner, array $settings): array
    {
        $items = [];
        $technique = strtolower((string) ($settings['technique'] ?? ''));
        $reps = isset($settings['repetitions']) ? (int) $settings['repetitions'] : null;
        $speed = isset($settings['playback_speed']) ? (float) $settings['playback_speed'] : null;
        $step = isset($settings['ayat_per_step']) ? (int) $settings['ayat_per_step'] : null;
        $preferred = strtolower((string) ($learner['preferred_technique'] ?? ''));
        $explanations = is_array($payload['adaptation_explanations'] ?? null)
            ? $payload['adaptation_explanations']
            : [];

        if ($technique !== '') {
            $label = $this->techniqueLabel($technique);
            $whyTech = match ($technique) {
                'talqin' => "{$label} was chosen so you hear each phrase clearly and repeat it before independent recall.",
                'focus' => "{$label} was chosen so you work one ayah at a time and do not split attention across the set.",
                'blur' => "{$label} was chosen to hide more of the Mushaf so recall is not propped up by the full line.",
                'chaining' => "{$label} was chosen to lock the order between neighbouring ayahs.",
                'anchor' => "{$label} was chosen to pin the words that slipped as memory hooks.",
                default => "{$label} is the practice method for this plan.",
            };
            if ($preferred !== '' && $preferred === $technique && (float) data_get($learner, 'maturity.weights.technique_memory', 0) >= 0.3) {
                $whyTech .= ' It also matches the method you have accepted most often.';
            }
            $items[] = ['code' => 'technique_'.$technique, 'text' => $whyTech];
        }

        $complementary = strtolower((string) ($settings['complementary_technique'] ?? ''));
        if ($complementary !== '' && $complementary !== $technique) {
            $items[] = [
                'code' => 'complementary_'.$complementary,
                'text' => $this->techniqueLabel($complementary).' is added as light support, not a second full method.',
            ];
        }

        if ($reps !== null) {
            $items[] = [
                'code' => 'repetitions',
                'text' => $reps >= 4
                    ? "Repetitions are set to {$reps} because this range still needs extra encoding."
                    : "Repetitions stay at {$reps} so the session stays light enough to finish cleanly.",
            ];
        }
        if ($speed !== null) {
            $formatted = rtrim(rtrim(number_format($speed, 2, '.', ''), '0'), '.');
            $items[] = [
                'code' => 'playback_speed',
                'text' => $speed < 0.95
                    ? "Playback is {$formatted}× so each phrase is easier to catch."
                    : "Playback is {$formatted}× to match a confident, fluent pass.",
            ];
        }
        if ($step === 1) {
            $items[] = [
                'code' => 'one_ayah_steps',
                'text' => 'Steps are one ayah at a time so workload and attention stay inside a safe band.',
            ];
        }

        foreach ($explanations as $row) {
            $message = is_array($row) ? (string) ($row['message'] ?? '') : (string) $row;
            $message = trim($message);
            if ($message === '') {
                continue;
            }
            $already = false;
            foreach ($items as $item) {
                if (str_contains(strtolower($item['text']), strtolower(substr($message, 0, 18)))) {
                    $already = true;
                    break;
                }
            }
            if (! $already) {
                $items[] = [
                    'code' => is_array($row) ? (string) ($row['code'] ?? 'adaptation') : 'adaptation',
                    'text' => $message,
                ];
            }
        }

        $performance = is_array($context['performance'] ?? null) ? $context['performance'] : [];
        $hints = (int) ($performance['hints_used'] ?? 0);
        if ($hints >= 2) {
            $items[] = [
                'code' => 'hints_used',
                'text' => "You used {$hints} memory prompts in the last session, so this plan reduces hint reliance.",
            ];
        }
        $replayRatio = (float) ($performance['replay_ratio'] ?? 0);
        if ($replayRatio >= 1.6) {
            $items[] = [
                'code' => 'replay_heavy',
                'text' => 'You replayed ayahs more than usual, so listening support stays in the plan.',
            ];
        }

        return array_slice($items, 0, 6);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $context
     * @return list<array{code: string, text: string}>
     */
    private function notChosen(array $payload, array $context, ?RecommendationType $type): array
    {
        $items = [];
        $learner = is_array($context['learner'] ?? null) ? $context['learner'] : [];
        $weakCount = (int) ($learner['open_weak_spot_count'] ?? 0);

        if ($type?->isContinue() || $type === RecommendationType::NextSurah || $type === RecommendationType::CompleteSurah) {
            $items[] = [
                'code' => 'skipped_repeat',
                'text' => 'Repeating the same ayahs was not selected because there was no explicit weak-ayah lock, and looping a completed set would stall progress.',
            ];
            if ($weakCount > 0 && ($learner['focus_mode'] ?? 'mixed') === 'newPriority') {
                $items[] = [
                    'code' => 'deferred_murajaah',
                    'text' => 'Open weak spots exist, but your plan currently prefers new memorisation, so murājaʿah is listed on the dashboard instead of replacing this session.',
                ];
            }
        }

        if ($type?->isRepeat()) {
            $items[] = [
                'code' => 'skipped_advance',
                'text' => 'Moving to new ayahs was not selected because the evidence still points at this range (or an overdue weak cluster).',
            ];
        }

        if ($type === RecommendationType::Resume) {
            $items[] = [
                'code' => 'skipped_new_range',
                'text' => 'A new range was not opened because unfinished ayahs from the paused session are still waiting.',
            ];
        }

        return $items;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  list<array{code: string, text: string}>  $picked
     * @param  list<array{code: string, text: string}>  $settingsBecause
     * @param  array{from?: int, to?: int, count?: int}|null  $range
     */
    private function composeSummary(array $payload, array $picked, array $settingsBecause, ?array $range): string
    {
        $lead = trim((string) (($picked[0]['text'] ?? '') ?: ($payload['user_reason'] ?? $payload['reason'] ?? '')));
        $tech = trim((string) (($settingsBecause[0]['text'] ?? '')));
        $parts = [];
        if ($lead !== '') {
            $parts[] = rtrim($lead, '. ');
        }
        if ($tech !== '' && $lead !== '' && ! str_contains($lead, explode(' ', $tech)[0] ?? '___')) {
            $parts[] = rtrim($tech, '. ');
        }
        $summary = implode('. ', $parts);
        $type = (string) ($payload['type'] ?? '');
        $isRepeat = in_array($type, ['revision', 'repeat_current_range'], true)
            || (string) ($payload['session_mode'] ?? '') === 'revision';
        if ($isRepeat) {
            $summary = (string) preg_replace('/this set is secure[^.]*\.?/i', '', $summary);
            $sentences = preg_split('/(?<=[.!?])\s+/', trim($summary)) ?: [];
            $sentences = array_values(array_filter($sentences, static function (string $sentence): bool {
                return ! preg_match('/this set is secure|continue to the next recommended set|without an explicit weak-ayah trap/i', $sentence);
            }));
            $summary = implode(' ', $sentences);
        }
        if ($summary === '') {
            return trim((string) ($payload['reason'] ?? ''));
        }

        return rtrim($summary, '. ').'.';
    }

    /**
     * @param  array{from?: int, to?: int, count?: int}|null  $range
     */
    private function rangeLabel(?array $range): string
    {
        if (! is_array($range)) {
            return '';
        }
        $from = (int) ($range['from'] ?? 0);
        $to = (int) ($range['to'] ?? $from);
        if ($from <= 0) {
            return '';
        }
        if ($to <= $from) {
            return 'Ayah '.$from;
        }

        return 'Ayahs '.$from.'–'.$to;
    }

    /**
     * @param  list<int>  $ayahs
     */
    private function ayahList(array $ayahs): string
    {
        $ayahs = array_values(array_unique(array_filter($ayahs)));
        if ($ayahs === []) {
            return 'These ayahs';
        }
        if (count($ayahs) === 1) {
            return 'Ayah '.$ayahs[0];
        }
        $last = array_pop($ayahs);

        return 'Ayahs '.implode(', ', $ayahs).' and '.$last;
    }

    private function techniqueLabel(string $id): string
    {
        return match ($id) {
            'talqin' => 'Talqin (listen and repeat)',
            'focus' => 'Focus',
            'blur' => 'Blur',
            'chaining' => 'Chaining',
            'anchor' => 'Anchor',
            default => ucfirst($id),
        };
    }
}

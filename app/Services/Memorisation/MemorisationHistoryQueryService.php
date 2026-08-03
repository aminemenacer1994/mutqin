<?php

namespace App\Services\Memorisation;

use App\Models\MemorisationAssessment;
use App\Models\MemorisationAttemptComparison;
use App\Models\MemorisationPracticePlan;
use App\Models\MemorisationWeakSpot;
use App\Models\User;
use App\Models\UserSession;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class MemorisationHistoryQueryService
{
    /**
     * @return array<string, mixed>
     */
    public function attemptDetail(User $user, MemorisationAssessment $assessment): array
    {
        $this->assertOwned($user, (int) $assessment->user_id);
        $assessment->load(['wordResults', 'practicePlan', 'asFollowUpComparisons', 'followUpComparisons']);

        return [
            'assessment' => app(RecitationAssessmentService::class)->transformAssessment($assessment),
            'word_results' => $assessment->wordResults->map(fn ($word) => [
                'id' => $word->id,
                'surah_number' => $word->surah_number,
                'ayah_number' => $word->ayah_number,
                'word_index' => $word->word_index,
                'verse_key' => $word->verse_key,
                'expected_position' => $word->expected_position,
                'detected_token' => $word->detected_token,
                'result_type' => $word->result_type,
                'confidence' => $word->confidence,
                'retry_count' => $word->retry_count,
                'first_result_type' => $word->first_result_type,
                'final_result_type' => $word->final_result_type,
                'out_of_order' => $word->out_of_order,
                'first_detected_at' => optional($word->first_detected_at)?->toIso8601String(),
                'final_detected_at' => optional($word->final_detected_at)?->toIso8601String(),
            ])->values()->all(),
            'practice_plan' => $assessment->practicePlan
                ? app(RecitationAssessmentService::class)->transformPlan($assessment->practicePlan)
                : null,
            'comparisons' => $assessment->asFollowUpComparisons
                ->concat($assessment->followUpComparisons)
                ->unique('id')
                ->values()
                ->map(fn ($comparison) => $this->transformComparison($comparison))
                ->all(),
        ];
    }

    public function attemptHistory(User $user, int $perPage = 20): LengthAwarePaginator
    {
        return MemorisationAssessment::query()
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(max(1, min(100, $perPage)))
            ->through(function (MemorisationAssessment $assessment) {
                return [
                    'id' => $assessment->id,
                    'surah_number' => $assessment->surah_number,
                    'surah_name' => $assessment->surah_name,
                    'start_ayah' => $assessment->start_ayah,
                    'end_ayah' => $assessment->end_ayah,
                    'status' => $assessment->status,
                    'match_result' => $assessment->match_result,
                    'accuracy' => $assessment->overall_accuracy,
                    'practice_mode' => $assessment->practice_mode,
                    'model_version' => $assessment->model_version,
                    'algorithm_version' => $assessment->algorithm_version,
                    'user_session_id' => $assessment->user_session_id,
                    'started_at' => optional($assessment->started_at)?->toIso8601String(),
                    'completed_at' => optional($assessment->completed_at)?->toIso8601String(),
                    'created_at' => optional($assessment->created_at)?->toIso8601String(),
                ];
            });
    }

    public function sessionAttemptHistory(User $user, int $perPage = 20): LengthAwarePaginator
    {
        return UserSession::query()
            ->where('user_id', $user->id)
            ->withCount([
                'assessments as assessment_count' => fn ($q) => $q->where('user_id', $user->id),
            ])
            ->orderByDesc('started_at')
            ->orderByDesc('id')
            ->paginate(max(1, min(100, $perPage)));
    }

    public function weakSpotHistory(User $user, int $perPage = 30, ?string $status = null): LengthAwarePaginator
    {
        $query = MemorisationWeakSpot::query()
            ->where('user_id', $user->id)
            ->orderByDesc('last_identified_at')
            ->orderByDesc('id');

        if (is_string($status) && $status !== '') {
            $query->where('status', $status);
        }

        return $query->paginate(max(1, min(100, $perPage)))
            ->through(fn (MemorisationWeakSpot $spot) => [
                'id' => $spot->id,
                'spot_type' => $spot->spot_type,
                'surah_number' => $spot->surah_number,
                'ayah_number' => $spot->ayah_number,
                'word_index' => $spot->word_index,
                'verse_key' => $spot->verse_key,
                'severity' => $spot->severity,
                'status' => $spot->status,
                'trend' => $spot->trend,
                'affected_attempt_count' => $spot->affected_attempt_count,
                'first_identified_at' => optional($spot->first_identified_at)?->toIso8601String(),
                'last_identified_at' => optional($spot->last_identified_at)?->toIso8601String(),
                'last_recalled_at' => optional($spot->last_recalled_at)?->toIso8601String(),
                'source_assessment_id' => $spot->source_assessment_id,
                'last_assessment_id' => $spot->last_assessment_id,
            ]);
    }

    public function recommendationHistory(User $user, int $perPage = 20): LengthAwarePaginator
    {
        return MemorisationPracticePlan::query()
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(max(1, min(100, $perPage)))
            ->through(fn (MemorisationPracticePlan $plan) => app(RecitationAssessmentService::class)->transformPlan($plan));
    }

    /**
     * @return array<string, mixed>
     */
    public function comparisonDetail(User $user, MemorisationAttemptComparison $comparison): array
    {
        $this->assertOwned($user, (int) $comparison->user_id);

        return $this->transformComparison($comparison->load(['previousAssessment', 'followUpAssessment', 'practicePlan']));
    }

    /**
     * @return array<string, mixed>|null
     */
    public function comparisonForPair(User $user, int $previousId, int $followUpId): ?array
    {
        $comparison = MemorisationAttemptComparison::query()
            ->where('user_id', $user->id)
            ->where('previous_assessment_id', $previousId)
            ->where('follow_up_assessment_id', $followUpId)
            ->first();

        return $comparison ? $this->transformComparison($comparison) : null;
    }

    /**
     * @return array<string, mixed>
     */
    public function dashboardSummary(User $user): array
    {
        $assessmentBase = MemorisationAssessment::query()->where('user_id', $user->id);
        $completed = (clone $assessmentBase)->where('status', MemorisationAssessment::STATUS_COMPLETED)->count();
        $failed = (clone $assessmentBase)->where('status', MemorisationAssessment::STATUS_FAILED)->count();
        $avgAccuracy = (clone $assessmentBase)
            ->where('status', MemorisationAssessment::STATUS_COMPLETED)
            ->whereNotNull('overall_accuracy')
            ->avg('overall_accuracy');

        $activeWeak = MemorisationWeakSpot::query()
            ->where('user_id', $user->id)
            ->where('status', MemorisationWeakSpot::STATUS_ACTIVE)
            ->count();
        $improvingWeak = MemorisationWeakSpot::query()
            ->where('user_id', $user->id)
            ->where('status', MemorisationWeakSpot::STATUS_IMPROVING)
            ->count();

        $plans = MemorisationPracticePlan::query()->where('user_id', $user->id);
        $acceptedPlans = (clone $plans)->whereNotNull('accepted_at')->count();
        $completedPlans = (clone $plans)->where('status', MemorisationPracticePlan::STATUS_COMPLETED)->count();
        $dismissedPlans = (clone $plans)->whereNotNull('dismissed_at')->count();

        $recentComparisons = MemorisationAttemptComparison::query()
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn ($c) => $this->transformComparison($c))
            ->values()
            ->all();

        $topWeakAyahs = MemorisationWeakSpot::query()
            ->where('user_id', $user->id)
            ->where('status', MemorisationWeakSpot::STATUS_ACTIVE)
            ->orderByDesc('affected_attempt_count')
            ->orderByDesc('last_identified_at')
            ->limit(8)
            ->get(['id', 'spot_type', 'surah_number', 'ayah_number', 'word_index', 'severity', 'affected_attempt_count', 'trend']);

        return [
            'attempts' => [
                'completed' => $completed,
                'failed' => $failed,
                'average_accuracy' => $avgAccuracy !== null ? round((float) $avgAccuracy, 1) : null,
            ],
            'weak_spots' => [
                'active' => $activeWeak,
                'improving' => $improvingWeak,
                'top' => $topWeakAyahs,
            ],
            'recommendations' => [
                'accepted' => $acceptedPlans,
                'completed' => $completedPlans,
                'dismissed' => $dismissedPlans,
                'follow_through_rate' => $acceptedPlans > 0
                    ? round(($completedPlans / $acceptedPlans) * 100, 1)
                    : null,
            ],
            'recent_comparisons' => $recentComparisons,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformComparison(MemorisationAttemptComparison $comparison): array
    {
        return [
            'id' => $comparison->id,
            'previous_assessment_id' => $comparison->previous_assessment_id,
            'follow_up_assessment_id' => $comparison->follow_up_assessment_id,
            'practice_plan_id' => $comparison->practice_plan_id,
            'accuracy_delta' => $comparison->accuracy_delta,
            'improved_count' => $comparison->improved_count,
            'unchanged_count' => $comparison->unchanged_count,
            'new_weak_count' => $comparison->new_weak_count,
            'improved_items' => $comparison->improved_items ?? [],
            'unchanged_items' => $comparison->unchanged_items ?? [],
            'new_weak_items' => $comparison->new_weak_items ?? [],
            'summary_key' => $comparison->summary_key,
            'summary' => $comparison->summary,
            'metrics' => $comparison->metrics,
            'created_at' => optional($comparison->created_at)?->toIso8601String(),
        ];
    }

    private function assertOwned(User $user, int $ownerId): void
    {
        if ((int) $user->id !== $ownerId && ! $user->isAdmin()) {
            abort(404);
        }
    }
}

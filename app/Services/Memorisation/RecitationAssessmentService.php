<?php

namespace App\Services\Memorisation;

use App\Models\AiReciteAttempt;
use App\Models\MemorisationAssessment;
use App\Models\MemorisationPracticePlan;
use App\Models\SessionRecommendation;
use App\Models\User;
use App\Services\NextSessionRecommendationService;
use Illuminate\Support\Facades\DB;

class RecitationAssessmentService
{
    public function __construct(
        private readonly QuranAlignmentService $alignment,
        private readonly WeaknessAnalysisService $weakness,
        private readonly PracticePlanRecommendationService $plans,
        private readonly NextSessionRecommendationService $recommendations,
    ) {}

    /**
     * @param  array<string,mixed>  $payload
     * @return array{assessment:array<string,mixed>,analysis:array<string,mixed>,practice_plan:array<string,mixed>,improvement?:array<string,mixed>|null}
     */
    public function create(User $user, array $payload): array
    {
        return DB::transaction(function () use ($user, $payload) {
            $ayahs = is_array($payload['ayahs'] ?? null) ? $payload['ayahs'] : [];
            $recognitionWords = is_array($payload['recognition_words'] ?? null)
                ? $payload['recognition_words']
                : [];
            if ($recognitionWords === [] && is_string($payload['transcript'] ?? null)) {
                $tokens = preg_split('/\s+/u', trim((string) $payload['transcript'])) ?: [];
                $recognitionWords = array_values(array_filter($tokens));
            }

            $targetText = (string) ($payload['target_text'] ?? '');
            if ($targetText === '' && $ayahs !== []) {
                $targetText = implode(' ', array_map(
                    fn ($a) => (string) ($a['text'] ?? $a['arabic'] ?? ''),
                    $ayahs
                ));
            }

            $aligned = $this->alignment->align($ayahs, $recognitionWords, $targetText);
            $analysis = $this->weakness->analyse(
                $aligned['word_results'],
                $aligned['extra_words'],
                $aligned['color_counts'],
                $aligned['accuracy']
            );

            $range = [
                'surah_number' => (int) $payload['surah_number'],
                'surah_name' => $payload['surah_name'] ?? null,
                'start_ayah' => (int) $payload['start_ayah'],
                'end_ayah' => (int) $payload['end_ayah'],
            ];
            $planData = $this->plans->recommend($analysis, $range, $aligned['accuracy']);

            $previousId = isset($payload['previous_assessment_id'])
                ? (int) $payload['previous_assessment_id']
                : null;

            $assessment = MemorisationAssessment::query()->create([
                'user_id' => $user->id,
                'user_session_id' => $payload['user_session_id'] ?? null,
                'session_recommendation_id' => $payload['session_recommendation_id'] ?? null,
                'previous_assessment_id' => $previousId ?: null,
                'surah_number' => $range['surah_number'],
                'start_ayah' => $range['start_ayah'],
                'end_ayah' => $range['end_ayah'],
                'assessment_type' => (string) ($payload['assessment_type'] ?? 'memorisation_detection'),
                'surah_name' => $range['surah_name'],
                'recognition_data' => [
                    'transcript' => $aligned['transcript'],
                    'recognition_words' => $recognitionWords,
                    'extra_words' => $aligned['extra_words'],
                    'provider' => $payload['provider'] ?? null,
                ],
                'word_results' => $aligned['word_results'],
                'ayah_results' => $analysis['ayah_results'],
                'error_classifications' => $analysis['error_types'],
                'weakness_analysis' => $analysis,
                'overall_accuracy' => $aligned['accuracy'],
                'confidence' => $aligned['confidence'],
                'duration_ms' => isset($payload['duration_ms']) ? (int) $payload['duration_ms'] : null,
                'friendly_summary' => $planData['friendly_summary'],
            ]);

            $practicePlan = MemorisationPracticePlan::query()->create([
                'user_id' => $user->id,
                'assessment_id' => $assessment->id,
                'session_recommendation_id' => $payload['session_recommendation_id'] ?? null,
                'title' => $planData['title'],
                'explanation' => $planData['explanation'],
                'band' => $planData['band'],
                'difficulty' => $planData['difficulty'],
                'status' => MemorisationPracticePlan::STATUS_DRAFT,
                'surah_number' => $planData['surah_number'],
                'start_ayah' => $planData['start_ayah'],
                'end_ayah' => $planData['end_ayah'],
                'priority_ayahs' => $planData['priority_ayahs'],
                'weak_words' => $planData['weak_words'],
                'weak_phrases' => $planData['weak_phrases'],
                'techniques' => $planData['techniques'],
                'repetitions' => $planData['repetitions'],
                'config' => $planData['config'],
            ]);

            $this->mirrorLegacyAttempt($user, $assessment, $practicePlan, $aligned, $analysis);
            $this->syncRecommendation($user, $payload, $assessment, $practicePlan, $aligned, $analysis, $planData);

            $improvement = null;
            if ($previousId) {
                $previous = MemorisationAssessment::query()
                    ->where('user_id', $user->id)
                    ->whereKey($previousId)
                    ->first();
                if ($previous) {
                    $improvement = $this->compareAssessments($previous, $assessment);
                    if ($previous->practicePlan) {
                        $previous->practicePlan->update([
                            'retest_metrics' => $improvement,
                        ]);
                    }
                }
            }

            return [
                'assessment' => $this->transformAssessment($assessment),
                'analysis' => [
                    'weak_ayahs' => $analysis['weak_ayahs'],
                    'strong_ayahs' => $analysis['strong_ayahs'],
                    'weak_words' => $analysis['weak_words'],
                    'weak_phrases' => $analysis['weak_phrases'],
                    'error_clusters' => $analysis['error_clusters'],
                    'error_pattern' => $analysis['error_pattern'],
                    'error_types' => $analysis['error_types'],
                    'priority' => $analysis['priority'],
                    'confidence' => $analysis['confidence'],
                ],
                'practice_plan' => $this->transformPlan($practicePlan, $planData),
                'improvement' => $improvement,
            ];
        });
    }

    /**
     * @return array<string,mixed>
     */
    public function transformAssessment(MemorisationAssessment $assessment): array
    {
        return [
            'id' => $assessment->id,
            'surah_number' => $assessment->surah_number,
            'surah_name' => $assessment->surah_name,
            'start_ayah' => $assessment->start_ayah,
            'end_ayah' => $assessment->end_ayah,
            'assessment_type' => $assessment->assessment_type,
            'accuracy' => $assessment->overall_accuracy,
            'confidence' => $assessment->confidence,
            'duration_ms' => $assessment->duration_ms,
            'friendly_summary' => $assessment->friendly_summary,
            'word_results' => $assessment->word_results ?? [],
            'ayahs' => $assessment->ayah_results ?? [],
            'error_classifications' => $assessment->error_classifications ?? [],
            'previous_assessment_id' => $assessment->previous_assessment_id,
            'created_at' => optional($assessment->created_at)?->toIso8601String(),
        ];
    }

    /**
     * @param  array<string,mixed>|null  $planData
     * @return array<string,mixed>
     */
    public function transformPlan(MemorisationPracticePlan $plan, ?array $planData = null): array
    {
        $config = $plan->config ?? [];

        return [
            'id' => $plan->id,
            'assessment_id' => $plan->assessment_id,
            'title' => $plan->title,
            'why' => $plan->explanation,
            'band' => $plan->band,
            'difficulty' => $plan->difficulty,
            'status' => $plan->status,
            'range' => $planData['range'] ?? [
                'surah_number' => $plan->surah_number,
                'from' => $plan->start_ayah,
                'to' => $plan->end_ayah,
                'count' => max(1, $plan->end_ayah - $plan->start_ayah + 1),
                'focus_ayahs' => $plan->priority_ayahs ?? [],
                'label' => ($config['surah_name'] ?? null)
                    ? (($config['surah_name']).' · Ayahs '.$plan->start_ayah.'–'.$plan->end_ayah)
                    : ('Ayahs '.$plan->start_ayah.'–'.$plan->end_ayah),
            ],
            'priority_ayahs' => $plan->priority_ayahs ?? [],
            'weak_words' => $plan->weak_words ?? [],
            'weak_phrases' => $plan->weak_phrases ?? [],
            'techniques' => $plan->techniques ?? [],
            'repetitions' => $plan->repetitions ?? [],
            'config' => $config,
            'user_adjustments' => $plan->user_adjustments,
            'retest_metrics' => $plan->retest_metrics,
            'completion_data' => $plan->completion_data,
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function compareAssessments(MemorisationAssessment $before, MemorisationAssessment $after): array
    {
        $beforeAcc = (int) ($before->overall_accuracy ?? 0);
        $afterAcc = (int) ($after->overall_accuracy ?? 0);
        $beforeWeak = is_array($before->weakness_analysis['weak_words'] ?? null)
            ? $before->weakness_analysis['weak_words']
            : [];
        $afterWeak = is_array($after->weakness_analysis['weak_words'] ?? null)
            ? $after->weakness_analysis['weak_words']
            : [];

        return [
            'before_accuracy' => $beforeAcc,
            'after_accuracy' => $afterAcc,
            'accuracy_delta' => $afterAcc - $beforeAcc,
            'before_weak_word_count' => count($beforeWeak),
            'after_weak_word_count' => count($afterWeak),
            'improved' => $afterAcc > $beforeAcc || count($afterWeak) < count($beforeWeak),
            'message' => $afterAcc > $beforeAcc
                ? 'Your weak areas are becoming stronger. May Allah increase you.'
                : ($afterAcc === $beforeAcc
                    ? 'Accuracy is similar — another calm pass on the weak words will help.'
                    : 'Some areas still need gentle practice. Let’s strengthen them again.'),
        ];
    }

    /**
     * @param  array<string,mixed>  $aligned
     * @param  array<string,mixed>  $analysis
     */
    private function mirrorLegacyAttempt(
        User $user,
        MemorisationAssessment $assessment,
        MemorisationPracticePlan $plan,
        array $aligned,
        array $analysis
    ): void {
        if (! $assessment->session_recommendation_id) {
            return;
        }

        $attemptNumber = (int) AiReciteAttempt::query()
            ->where('session_recommendation_id', $assessment->session_recommendation_id)
            ->max('attempt_number') + 1;

        AiReciteAttempt::query()->updateOrCreate(
            [
                'session_recommendation_id' => $assessment->session_recommendation_id,
                'attempt_number' => max(1, $attemptNumber),
            ],
            [
                'user_id' => $user->id,
                'user_session_id' => $assessment->user_session_id,
                'accuracy_percent' => $aligned['accuracy'],
                'band' => $plan->band,
                'ayah_range' => [
                    'from' => $assessment->start_ayah,
                    'to' => $assessment->end_ayah,
                    'count' => max(1, $assessment->end_ayah - $assessment->start_ayah + 1),
                    'focus_ayahs' => $analysis['weak_ayahs'] ?? [],
                ],
                'color_counts' => [
                    'green' => $aligned['color_counts']['green'] ?? 0,
                    'amber' => $aligned['color_counts']['amber'] ?? 0,
                    'red' => $aligned['color_counts']['red'] ?? 0,
                    'black' => $aligned['color_counts']['black'] ?? 0,
                    'gray' => ($aligned['color_counts']['grey'] ?? 0) + ($aligned['color_counts']['uncertain'] ?? 0),
                ],
                'weak_words' => $analysis['weak_words'] ?? [],
                'word_statuses' => $aligned['word_results'],
                'plan_snapshot' => [
                    'title' => $plan->title,
                    'techniques' => $plan->techniques,
                    'config' => $plan->config,
                ],
            ]
        );
    }

    /**
     * @param  array<string,mixed>  $payload
     * @param  array<string,mixed>  $aligned
     * @param  array<string,mixed>  $analysis
     * @param  array<string,mixed>  $planData
     */
    private function syncRecommendation(
        User $user,
        array $payload,
        MemorisationAssessment $assessment,
        MemorisationPracticePlan $plan,
        array $aligned,
        array $analysis,
        array $planData
    ): void {
        $recommendationId = (int) ($payload['session_recommendation_id'] ?? 0);
        if ($recommendationId <= 0) {
            return;
        }

        $recommendation = SessionRecommendation::query()
            ->where('user_id', $user->id)
            ->whereKey($recommendationId)
            ->first();
        if (! $recommendation) {
            return;
        }

        $outcome = $aligned['accuracy'] >= 80 ? 'strong' : ($aligned['accuracy'] >= 55 ? 'mixed' : 'weak');
        $this->recommendations->applyAiAssessment($user, $recommendation, [
            'result' => $outcome,
            'summary' => $assessment->friendly_summary,
            'weak_ayahs' => $analysis['weak_ayahs'] ?? [],
            'sequence_errors' => 0,
            'missed_words' => (int) (($analysis['error_types']['missing'] ?? 0)),
            'pronunciation_issues' => ((int) ($analysis['error_types']['wrong'] ?? 0)) > 0,
            'color_counts' => [
                'green' => $aligned['color_counts']['green'] ?? 0,
                'amber' => $aligned['color_counts']['amber'] ?? 0,
                'red' => $aligned['color_counts']['red'] ?? 0,
                'black' => $aligned['color_counts']['black'] ?? 0,
                'gray' => ($aligned['color_counts']['grey'] ?? 0) + ($aligned['color_counts']['uncertain'] ?? 0),
            ],
            'plan_detail' => [
                'source' => 'memorisation_detection',
                'title' => $plan->title,
                'personalWhy' => $plan->explanation,
                'range' => $planData['range'] ?? null,
                'weakWords' => $plan->weak_words,
                'techniques' => $plan->techniques,
                'practice_plan_id' => $plan->id,
                'assessment_id' => $assessment->id,
            ],
            'ayah_range' => [
                'from' => $plan->start_ayah,
                'to' => $plan->end_ayah,
                'count' => max(1, $plan->end_ayah - $plan->start_ayah + 1),
                'focus_ayahs' => $plan->priority_ayahs ?? [],
            ],
            'focus_ayahs' => $plan->priority_ayahs ?? [],
            'settings' => $plan->config ?? [],
            'average_accuracy' => $aligned['accuracy'],
            'accuracy_percent' => $aligned['accuracy'],
            'weak_words' => $analysis['weak_words'] ?? [],
        ]);
    }
}

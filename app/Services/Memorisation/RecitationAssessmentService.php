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
        private readonly MemorisationHistoryService $history,
    ) {}

    /**
     * @param  array<string,mixed>  $payload
     * @return array{assessment:array<string,mixed>,analysis:array<string,mixed>,practice_plan:array<string,mixed>,improvement?:array<string,mixed>|null,idempotent?:bool}
     */
    public function create(User $user, array $payload): array
    {
        $idempotencyKey = $this->normaliseIdempotencyKey($payload['idempotency_key'] ?? null);
        if ($idempotencyKey !== null) {
            $existing = MemorisationAssessment::query()
                ->where('user_id', $user->id)
                ->where('idempotency_key', $idempotencyKey)
                ->with('practicePlan')
                ->first();
            if ($existing) {
                return $this->buildExistingResponse($existing);
            }
        }

        $startedAt = microtime(true);

        return DB::transaction(function () use ($user, $payload, $idempotencyKey, $startedAt) {
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
            $processingMs = (int) round((microtime(true) - $startedAt) * 1000);
            $now = now();
            $matchResult = $this->history->resolveMatchResult(
                $aligned['accuracy'],
                isset($payload['match_result']) ? (string) $payload['match_result'] : null
            );
            $practiceScope = $this->resolvePracticeScope($payload, $planData);

            $assessment = MemorisationAssessment::query()->create([
                'user_id' => $user->id,
                'user_session_id' => $payload['user_session_id'] ?? null,
                'session_recommendation_id' => $payload['session_recommendation_id'] ?? null,
                'previous_assessment_id' => $previousId ?: null,
                'idempotency_key' => $idempotencyKey,
                'surah_number' => $range['surah_number'],
                'start_ayah' => $range['start_ayah'],
                'end_ayah' => $range['end_ayah'],
                'assessment_type' => (string) ($payload['assessment_type'] ?? 'memorisation_detection'),
                'status' => MemorisationAssessment::STATUS_COMPLETED,
                'completion_state' => (string) ($payload['completion_state'] ?? 'completed'),
                'practice_mode' => $payload['practice_mode'] ?? null,
                'mistake_handling_mode' => $payload['mistake_handling_mode'] ?? null,
                'words_visible_percent' => isset($payload['words_visible_percent'])
                    ? max(0, min(100, (int) $payload['words_visible_percent']))
                    : null,
                'surah_name' => $range['surah_name'],
                'recognition_data' => [
                    // Structured recognition only — never store raw audio blobs here.
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
                'match_result' => $matchResult,
                'confidence' => $aligned['confidence'],
                'duration_ms' => isset($payload['duration_ms']) ? (int) $payload['duration_ms'] : null,
                'processing_duration_ms' => isset($payload['processing_duration_ms'])
                    ? (int) $payload['processing_duration_ms']
                    : $processingMs,
                'friendly_summary' => $planData['friendly_summary'],
                'model_version' => $payload['model_version'] ?? config('mutqin.learning_history.default_model_version'),
                'algorithm_version' => $payload['algorithm_version']
                    ?? config('mutqin.learning_history.algorithm_version', MemorisationHistoryService::ALGORITHM_VERSION),
                'started_at' => isset($payload['started_at']) ? $payload['started_at'] : $now,
                'completed_at' => $now,
                'device_metadata' => $this->sanitizeDeviceMetadata($payload['device_metadata'] ?? null),
            ]);

            $config = is_array($planData['config'] ?? null) ? $planData['config'] : [];
            $practicePlan = MemorisationPracticePlan::query()->create([
                'user_id' => $user->id,
                'assessment_id' => $assessment->id,
                'session_recommendation_id' => $payload['session_recommendation_id'] ?? null,
                'title' => $planData['title'],
                'explanation' => $planData['explanation'],
                'band' => $planData['band'],
                'difficulty' => $planData['difficulty'],
                'status' => MemorisationPracticePlan::STATUS_DRAFT,
                'practice_scope' => $practiceScope,
                'recommended_technique' => $config['technique'] ?? ($planData['techniques'][0]['id'] ?? null),
                'recommended_repetitions' => (int) ($planData['repetitions']['target'] ?? $config['repetitions'] ?? 3),
                'recommended_playback_speed' => isset($config['playback_speed'])
                    ? (float) $config['playback_speed']
                    : null,
                'recommended_review_at' => now()->addDays(
                    (int) config('mutqin.learning_history.default_review_days', 1)
                ),
                'surah_number' => $planData['surah_number'],
                'start_ayah' => $planData['start_ayah'],
                'end_ayah' => $planData['end_ayah'],
                'priority_ayahs' => $planData['priority_ayahs'],
                'weak_words' => $planData['weak_words'],
                'weak_phrases' => $planData['weak_phrases'],
                'techniques' => $planData['techniques'],
                'repetitions' => $planData['repetitions'],
                'config' => array_merge($config, [
                    'practice_scope' => $practiceScope,
                    'algorithm_version' => $assessment->algorithm_version,
                    'model_version' => $assessment->model_version,
                ]),
            ]);

            $this->history->syncWordResults($assessment, $aligned['word_results']);
            $this->history->upsertWeakSpots($user, $assessment, $analysis);
            $this->history->markRecalledWords($user, $assessment, $aligned['word_results']);

            $this->mirrorLegacyAttempt($user, $assessment, $practicePlan, $aligned, $analysis);
            $this->syncRecommendation($user, $payload, $assessment, $practicePlan, $aligned, $analysis, $planData);

            $improvement = null;
            if ($previousId) {
                $previous = MemorisationAssessment::query()
                    ->where('user_id', $user->id)
                    ->whereKey($previousId)
                    ->first();
                if ($previous) {
                    $improvement = $this->history->persistComparison(
                        $user,
                        $previous,
                        $assessment,
                        $previous->practicePlan
                    );
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
     * Persist a failed-processing attempt without inventing assessment results.
     *
     * @param  array<string,mixed>  $payload
     */
    public function recordFailed(
        User $user,
        array $payload,
        ?string $idempotencyKey = null,
        string $failureReason = 'processing_failed'
    ): MemorisationAssessment {
        $key = $this->normaliseIdempotencyKey($idempotencyKey ?? ($payload['idempotency_key'] ?? null));
        if ($key !== null) {
            $existing = MemorisationAssessment::query()
                ->where('user_id', $user->id)
                ->where('idempotency_key', $key)
                ->first();
            if ($existing) {
                return $existing;
            }
        }

        return MemorisationAssessment::query()->create([
            'user_id' => $user->id,
            'user_session_id' => $payload['user_session_id'] ?? null,
            'session_recommendation_id' => $payload['session_recommendation_id'] ?? null,
            'previous_assessment_id' => $payload['previous_assessment_id'] ?? null,
            'idempotency_key' => $key,
            'surah_number' => (int) ($payload['surah_number'] ?? 1),
            'start_ayah' => (int) ($payload['start_ayah'] ?? 1),
            'end_ayah' => (int) ($payload['end_ayah'] ?? ($payload['start_ayah'] ?? 1)),
            'assessment_type' => (string) ($payload['assessment_type'] ?? 'memorisation_detection'),
            'status' => MemorisationAssessment::STATUS_FAILED,
            'completion_state' => 'failed',
            'practice_mode' => $payload['practice_mode'] ?? null,
            'mistake_handling_mode' => $payload['mistake_handling_mode'] ?? null,
            'words_visible_percent' => isset($payload['words_visible_percent'])
                ? max(0, min(100, (int) $payload['words_visible_percent']))
                : null,
            'surah_name' => $payload['surah_name'] ?? null,
            'recognition_data' => [
                'provider' => $payload['provider'] ?? null,
            ],
            'word_results' => [],
            'ayah_results' => [],
            'error_classifications' => [],
            'weakness_analysis' => [],
            'overall_accuracy' => null,
            'match_result' => 'failed',
            'confidence' => null,
            'duration_ms' => isset($payload['duration_ms']) ? (int) $payload['duration_ms'] : null,
            'processing_duration_ms' => isset($payload['processing_duration_ms'])
                ? (int) $payload['processing_duration_ms']
                : null,
            'failure_reason' => mb_substr($failureReason, 0, 120),
            'model_version' => $payload['model_version'] ?? config('mutqin.learning_history.default_model_version'),
            'algorithm_version' => $payload['algorithm_version']
                ?? config('mutqin.learning_history.algorithm_version', MemorisationHistoryService::ALGORITHM_VERSION),
            'started_at' => $payload['started_at'] ?? now(),
            'completed_at' => now(),
            'device_metadata' => $this->sanitizeDeviceMetadata($payload['device_metadata'] ?? null),
        ]);
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
            'status' => $assessment->status,
            'completion_state' => $assessment->completion_state,
            'practice_mode' => $assessment->practice_mode,
            'mistake_handling_mode' => $assessment->mistake_handling_mode,
            'words_visible_percent' => $assessment->words_visible_percent,
            'accuracy' => $assessment->overall_accuracy,
            'match_result' => $assessment->match_result,
            'confidence' => $assessment->confidence,
            'duration_ms' => $assessment->duration_ms,
            'processing_duration_ms' => $assessment->processing_duration_ms,
            'failure_reason' => $assessment->failure_reason,
            'friendly_summary' => $assessment->friendly_summary,
            'model_version' => $assessment->model_version,
            'algorithm_version' => $assessment->algorithm_version,
            'word_results' => $assessment->word_results ?? [],
            'ayahs' => $assessment->ayah_results ?? [],
            'error_classifications' => $assessment->error_classifications ?? [],
            'previous_assessment_id' => $assessment->previous_assessment_id,
            'idempotency_key' => $assessment->idempotency_key,
            'started_at' => optional($assessment->started_at)?->toIso8601String(),
            'completed_at' => optional($assessment->completed_at)?->toIso8601String(),
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
            'practice_scope' => $plan->practice_scope,
            'recommended_technique' => $plan->recommended_technique,
            'recommended_repetitions' => $plan->recommended_repetitions,
            'recommended_playback_speed' => $plan->recommended_playback_speed,
            'recommended_review_at' => optional($plan->recommended_review_at)?->toIso8601String(),
            'accepted_at' => optional($plan->accepted_at)?->toIso8601String(),
            'dismissed_at' => optional($plan->dismissed_at)?->toIso8601String(),
            'completion_outcome' => $plan->completion_outcome,
            'follow_up_assessment_id' => $plan->follow_up_assessment_id,
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
     * @return array{assessment:array<string,mixed>,analysis:array<string,mixed>,practice_plan:array<string,mixed>|null,improvement:null,idempotent:bool}
     */
    private function buildExistingResponse(MemorisationAssessment $assessment): array
    {
        $analysis = is_array($assessment->weakness_analysis) ? $assessment->weakness_analysis : [];
        $plan = $assessment->practicePlan;

        return [
            'assessment' => $this->transformAssessment($assessment),
            'analysis' => [
                'weak_ayahs' => $analysis['weak_ayahs'] ?? [],
                'strong_ayahs' => $analysis['strong_ayahs'] ?? [],
                'weak_words' => $analysis['weak_words'] ?? [],
                'weak_phrases' => $analysis['weak_phrases'] ?? [],
                'error_clusters' => $analysis['error_clusters'] ?? [],
                'error_pattern' => $analysis['error_pattern'] ?? null,
                'error_types' => $analysis['error_types'] ?? ($assessment->error_classifications ?? []),
                'priority' => $analysis['priority'] ?? null,
                'confidence' => $analysis['confidence'] ?? $assessment->confidence,
            ],
            'practice_plan' => $plan ? $this->transformPlan($plan) : null,
            'improvement' => null,
            'idempotent' => true,
        ];
    }

    /**
     * @param  array<string,mixed>  $payload
     * @param  array<string,mixed>  $planData
     */
    private function resolvePracticeScope(array $payload, array $planData): string
    {
        $scope = (string) ($payload['practice_scope'] ?? '');
        if (in_array($scope, [
            MemorisationPracticePlan::SCOPE_WEAK_AREAS,
            MemorisationPracticePlan::SCOPE_FULL_RANGE,
        ], true)) {
            return $scope;
        }

        $focus = is_array($planData['priority_ayahs'] ?? null) ? $planData['priority_ayahs'] : [];
        $fullStart = (int) ($payload['start_ayah'] ?? $planData['start_ayah'] ?? 0);
        $fullEnd = (int) ($payload['end_ayah'] ?? $planData['end_ayah'] ?? 0);
        $planStart = (int) ($planData['start_ayah'] ?? $fullStart);
        $planEnd = (int) ($planData['end_ayah'] ?? $fullEnd);

        if ($focus !== [] && ($planStart !== $fullStart || $planEnd !== $fullEnd)) {
            return MemorisationPracticePlan::SCOPE_WEAK_AREAS;
        }

        return MemorisationPracticePlan::SCOPE_FULL_RANGE;
    }

    private function normaliseIdempotencyKey(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }
        $key = trim($value);

        return $key === '' ? null : mb_substr($key, 0, 64);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function sanitizeDeviceMetadata(mixed $raw): ?array
    {
        if (! is_array($raw)) {
            return null;
        }

        $allowed = ['browser', 'platform', 'os', 'device_type', 'viewport', 'timezone', 'locale', 'user_agent_hash'];
        $clean = [];
        foreach ($allowed as $key) {
            if (! array_key_exists($key, $raw)) {
                continue;
            }
            $value = $raw[$key];
            if (is_string($value)) {
                $clean[$key] = mb_substr($value, 0, 120);
            } elseif (is_numeric($value) || is_bool($value)) {
                $clean[$key] = $value;
            } elseif (is_array($value) && $key === 'viewport') {
                $clean[$key] = [
                    'width' => isset($value['width']) ? (int) $value['width'] : null,
                    'height' => isset($value['height']) ? (int) $value['height'] : null,
                ];
            }
        }

        return $clean === [] ? null : $clean;
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

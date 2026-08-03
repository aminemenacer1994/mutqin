<?php

namespace App\Services\Memorisation;

use App\Models\MemorisationPracticePlan;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class PracticePlanExecutionService
{
    public function __construct(
        private readonly RecitationAssessmentService $assessments,
    ) {}

    /**
     * @param  array<string,mixed>  $adjustments
     * @return array<string,mixed>
     */
    public function adjust(User $user, MemorisationPracticePlan $plan, array $adjustments): array
    {
        $this->assertOwned($user, $plan);

        $start = isset($adjustments['start_ayah']) ? (int) $adjustments['start_ayah'] : $plan->start_ayah;
        $end = isset($adjustments['end_ayah']) ? (int) $adjustments['end_ayah'] : $plan->end_ayah;
        if ($start < 1 || $end < $start) {
            throw ValidationException::withMessages([
                'start_ayah' => ['Practice range is invalid.'],
            ]);
        }

        $config = is_array($plan->config) ? $plan->config : [];
        if (array_key_exists('audio_enabled', $adjustments)) {
            $config['audio_enabled'] = (bool) $adjustments['audio_enabled'];
        }
        if (array_key_exists('visual_assistance', $adjustments)) {
            $config['visual_assistance'] = (string) $adjustments['visual_assistance'];
        }
        if (array_key_exists('playback_speed', $adjustments)) {
            $config['playback_speed'] = max(0.5, min(1.5, (float) $adjustments['playback_speed']));
        }
        if (isset($adjustments['difficulty'])) {
            $plan->difficulty = (string) $adjustments['difficulty'];
        }

        $repetitions = is_array($plan->repetitions) ? $plan->repetitions : ['target' => 3];
        if (isset($adjustments['repetitions'])) {
            $reps = max(1, min(8, (int) $adjustments['repetitions']));
            $repetitions['target'] = $reps;
            $repetitions['label'] = $reps === 1 ? '1 repetition' : "{$reps} repetitions";
            $config['repetitions'] = $reps;
        }

        if (isset($adjustments['techniques']) && is_array($adjustments['techniques'])) {
            $allowed = ['anchor', 'talqin', 'chunking', 'blur', 'chaining', 'focus'];
            $ids = array_values(array_filter(
                array_map('strval', $adjustments['techniques']),
                fn ($id) => in_array($id, $allowed, true)
            ));
            if ($ids !== []) {
                $primary = $ids[0];
                $config['technique'] = $primary;
                $config['techniques'] = $ids;
                $config['talqin_enabled'] = $primary === 'talqin';
                $config['blur_enabled'] = $primary === 'blur';
                $config['focus_enabled'] = in_array($primary, ['focus', 'chunking'], true);
                $config['chaining_enabled'] = $primary === 'chaining';
                $config['anchor_mode_enabled'] = in_array('anchor', $ids, true) || $primary === 'anchor';
                $plan->techniques = array_map(function ($id) use ($plan) {
                    $existing = collect($plan->techniques ?? [])->firstWhere('id', $id);
                    if (is_array($existing)) {
                        return $existing;
                    }

                    return ['id' => $id, 'title' => ucfirst($id)];
                }, $ids);
            }
        }

        $priority = $plan->priority_ayahs ?? [];
        if (isset($adjustments['priority_ayahs']) && is_array($adjustments['priority_ayahs'])) {
            $priority = array_values(array_filter(array_map('intval', $adjustments['priority_ayahs']), fn ($n) => $n >= $start && $n <= $end));
        }

        $plan->fill([
            'start_ayah' => $start,
            'end_ayah' => $end,
            'priority_ayahs' => $priority,
            'repetitions' => $repetitions,
            'config' => $config,
            'user_adjustments' => $adjustments,
            'status' => MemorisationPracticePlan::STATUS_DRAFT,
        ]);
        $plan->save();

        return $this->assessments->transformPlan($plan->fresh());
    }

    /**
     * @return array{practice_plan:array<string,mixed>,session:array<string,mixed>}
     */
    public function start(User $user, MemorisationPracticePlan $plan): array
    {
        $this->assertOwned($user, $plan);
        $config = is_array($plan->config) ? $plan->config : [];

        $plan->update([
            'status' => MemorisationPracticePlan::STATUS_ACTIVE,
            'started_at' => now(),
            'accepted_at' => $plan->accepted_at ?? now(),
            'dismissed_at' => null,
        ]);

        $technique = (string) ($config['technique'] ?? $plan->recommended_technique ?? 'talqin');
        $session = [
            'chapterId' => (int) $plan->surah_number,
            'rangeStart' => (int) $plan->start_ayah,
            'rangeEnd' => (int) $plan->end_ayah,
            'sessionMode' => 'revision',
            'techniqueId' => $technique === 'chunking' ? 'focus' : $technique,
            'settings' => [
                'technique' => $technique === 'chunking' ? 'focus' : $technique,
                'playback_speed' => (float) ($config['playback_speed'] ?? $plan->recommended_playback_speed ?? 1),
                'repetitions' => (int) (($plan->repetitions['target'] ?? $plan->recommended_repetitions ?? $config['repetitions'] ?? 3)),
                'talqin_enabled' => (bool) ($config['talqin_enabled'] ?? false),
                'blur_enabled' => (bool) ($config['blur_enabled'] ?? false),
                'focus_enabled' => (bool) ($config['focus_enabled'] ?? false) || $technique === 'chunking',
                'chaining_enabled' => (bool) ($config['chaining_enabled'] ?? false),
                'chaining_method' => $config['chaining_method'] ?? null,
                'chaining_repetitions' => $config['chaining_repetitions'] ?? null,
                'anchor_mode_enabled' => (bool) ($config['anchor_mode_enabled'] ?? false),
                'anchor_count' => (int) ($config['anchor_count'] ?? 2),
                'practice_weak_words' => $plan->weak_words ?? [],
                'audio_enabled' => (bool) ($config['audio_enabled'] ?? true),
                'visual_assistance' => $config['visual_assistance'] ?? 'medium',
                'chunks' => $config['chunks'] ?? [],
                'practice_plan_id' => $plan->id,
                'assessment_id' => $plan->assessment_id,
                'practice_scope' => $plan->practice_scope,
                'source' => 'memorisation_detection',
            ],
            'hud' => [
                'title' => $plan->title,
                'technique' => $technique,
                'repetitions_target' => (int) ($plan->repetitions['target'] ?? $plan->recommended_repetitions ?? 3),
                'weak_words' => $plan->weak_words ?? [],
                'chunks' => $config['chunks'] ?? [],
                'priority_ayahs' => $plan->priority_ayahs ?? [],
            ],
        ];

        return [
            'practice_plan' => $this->assessments->transformPlan($plan->fresh()),
            'session' => $session,
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public function accept(User $user, MemorisationPracticePlan $plan): array
    {
        $this->assertOwned($user, $plan);
        $plan->update([
            'accepted_at' => $plan->accepted_at ?? now(),
            'dismissed_at' => null,
            'status' => $plan->status === MemorisationPracticePlan::STATUS_DISMISSED
                ? MemorisationPracticePlan::STATUS_DRAFT
                : $plan->status,
        ]);

        return $this->assessments->transformPlan($plan->fresh());
    }

    /**
     * @return array<string,mixed>
     */
    public function dismiss(User $user, MemorisationPracticePlan $plan): array
    {
        $this->assertOwned($user, $plan);
        $plan->update([
            'dismissed_at' => now(),
            'status' => MemorisationPracticePlan::STATUS_DISMISSED,
        ]);

        return $this->assessments->transformPlan($plan->fresh());
    }

    /**
     * @param  array<string,mixed>  $completion
     * @return array<string,mixed>
     */
    public function complete(User $user, MemorisationPracticePlan $plan, array $completion = []): array
    {
        $this->assertOwned($user, $plan);
        $outcome = (string) ($completion['outcome'] ?? $completion['completion_outcome'] ?? 'completed');
        $plan->update([
            'status' => MemorisationPracticePlan::STATUS_COMPLETED,
            'completed_at' => now(),
            'completion_outcome' => mb_substr($outcome, 0, 32),
            'completion_data' => $completion,
        ]);

        return $this->assessments->transformPlan($plan->fresh());
    }

    private function assertOwned(User $user, MemorisationPracticePlan $plan): void
    {
        if ((int) $plan->user_id !== (int) $user->id && ! $user->isAdmin()) {
            abort(404);
        }
    }
}

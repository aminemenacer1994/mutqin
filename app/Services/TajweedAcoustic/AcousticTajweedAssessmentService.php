<?php

namespace App\Services\TajweedAcoustic;

use App\Jobs\ProcessAcousticTajweedAssessmentJob;
use App\Models\AcousticTajweedAssessment;
use App\Models\AiReciteAttempt;
use App\Models\MemorisationAssessment;
use App\Services\TajweedAcoustic\Pipeline\AcousticAssessmentPipeline;

final class AcousticTajweedAssessmentService
{
    public function __construct(
        private readonly AcousticAssessmentPipeline $pipeline,
    ) {}

    public function queueIfEnabled(MemorisationAssessment $assessment): void
    {
        if (! config('mutqin.acoustic_tajweed.enabled', false)) {
            return;
        }

        if ($assessment->status !== MemorisationAssessment::STATUS_COMPLETED) {
            return;
        }

        $existing = AcousticTajweedAssessment::query()
            ->where('memorisation_assessment_id', $assessment->id)
            ->exists();
        if ($existing) {
            return;
        }

        $queue = (string) config('mutqin.acoustic_tajweed.queue', 'default');
        ProcessAcousticTajweedAssessmentJob::dispatch($assessment->id)->onQueue($queue);
    }

    public function process(int $assessmentId): ?AcousticTajweedAssessment
    {
        $assessment = MemorisationAssessment::query()->find($assessmentId);
        if (! $assessment) {
            return null;
        }

        $record = AcousticTajweedAssessment::query()->firstOrCreate(
            ['memorisation_assessment_id' => $assessment->id],
            [
                'user_id' => $assessment->user_id,
                'status' => AcousticTajweedAssessment::STATUS_PENDING,
                'qiraat' => 'hafs',
                'provider' => (string) config('mutqin.acoustic_tajweed.provider', 'null'),
                'pipeline_version' => AcousticAssessmentPipeline::PIPELINE_VERSION,
                'started_at' => now(),
            ]
        );

        if ($record->status !== AcousticTajweedAssessment::STATUS_PENDING) {
            return $record;
        }

        $attempt = AiReciteAttempt::query()
            ->where('memorisation_assessment_id', $assessment->id)
            ->latest('id')
            ->first();

        if ($attempt) {
            $record->ai_recite_attempt_id = $attempt->id;
            $record->save();
        }

        try {
            $result = $this->pipeline->run($assessment);
            $record->fill([
                'status' => (string) ($result['status'] ?? AcousticTajweedAssessment::STATUS_FAILED),
                'audio_quality_status' => $result['audio_quality_status'] ?? null,
                'provider' => $result['provider'] ?? $record->provider,
                'provider_version' => $result['provider_version'] ?? null,
                'findings' => $result['findings'] ?? [],
                'metadata' => $result['metadata'] ?? [],
                'completed_at' => now(),
            ])->save();
        } catch (\Throwable $e) {
            $record->fill([
                'status' => AcousticTajweedAssessment::STATUS_FAILED,
                'metadata' => [
                    'pipeline_version' => AcousticAssessmentPipeline::PIPELINE_VERSION,
                    'error' => mb_substr($e->getMessage(), 0, 200),
                ],
                'completed_at' => now(),
            ])->save();
        }

        return $record->fresh();
    }
}
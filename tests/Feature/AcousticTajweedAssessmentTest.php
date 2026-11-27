<?php

namespace Tests\Feature;

use App\Models\MemorisationAssessment;
use App\Models\User;
use App\Services\TajweedAcoustic\AcousticTajweedAssessmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AcousticTajweedAssessmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_pipeline_records_madd_findings_from_practice_check_metadata(): void
    {
        config([
            'mutqin.acoustic_tajweed.enabled' => true,
            'mutqin.acoustic_tajweed.expose_teacher_playback' => true,
            'mutqin.acoustic_tajweed.provider' => 'null',
        ]);

        $user = User::factory()->create();

        $assessment = MemorisationAssessment::query()->create([
            'user_id' => $user->id,
            'idempotency_key' => 'acoustic-madd',
            'surah_number' => 114,
            'start_ayah' => 1,
            'end_ayah' => 2,
            'assessment_type' => 'memorisation_detection',
            'status' => MemorisationAssessment::STATUS_COMPLETED,
            'recognition_data' => [
                'attempt_class' => 'valid_check',
                'calibration' => ['audio_quality_status' => 'reliable'],
                'alignment' => [
                    'word_results' => [
                        ['ayah' => 1, 'word_index' => 1, 'start' => 0.5, 'end' => 1.2],
                    ],
                ],
                'tajweed_practice_check' => [
                    'version' => 2,
                    'assessed' => true,
                    'segments' => [
                        [
                            'verseKey' => '114:1',
                            'wordIndex' => 1,
                            'ruleKey' => 'madd',
                            'word' => 'أَعُوذُ',
                            'outcome' => 'practice',
                            'hold' => 'short',
                        ],
                    ],
                ],
            ],
        ]);

        $record = app(AcousticTajweedAssessmentService::class)->process($assessment->id);

        $this->assertNotNull($record);
        $this->assertSame('completed', $record->status);
        $this->assertCount(1, $record->findings ?? []);
        $this->assertSame('madd_too_short', $record->findings[0]['mistake_kind'] ?? null);
        $this->assertSame(0.5, $record->findings[0]['start_sec'] ?? null);
    }

    public function test_pipeline_marks_unassessable_when_audio_unreliable(): void
    {
        config(['mutqin.acoustic_tajweed.enabled' => true]);

        $user = User::factory()->create();
        $assessment = MemorisationAssessment::query()->create([
            'user_id' => $user->id,
            'idempotency_key' => 'acoustic-bad-audio',
            'surah_number' => 1,
            'start_ayah' => 1,
            'end_ayah' => 1,
            'assessment_type' => 'memorisation_detection',
            'status' => MemorisationAssessment::STATUS_COMPLETED,
            'recognition_data' => [
                'attempt_class' => 'valid_check',
                'calibration' => ['audio_quality_status' => 'unreliable'],
            ],
        ]);

        $record = app(AcousticTajweedAssessmentService::class)->process($assessment->id);

        $this->assertNotNull($record);
        $this->assertSame('unassessable', $record->status);
        $this->assertSame([], $record->findings ?? []);
    }
}
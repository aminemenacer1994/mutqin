<?php

namespace Tests\Feature;

use App\Enums\UserSessionStatus;
use App\Models\AiReciteAttempt;
use App\Models\MemorisationAssessment;
use App\Models\User;
use App\Models\UserSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiReciteAttemptAnalysisTest extends TestCase
{
    use RefreshDatabase;

    public function test_attempt_detail_uses_linked_assessment_not_session_latest(): void
    {
        $user = User::factory()->pro()->create();

        $session = UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'ended_at' => now(),
            'last_activity_at' => now(),
            'started_at' => now()->subMinutes(10),
            'metadata' => ['completed' => true],
        ]);

        $older = MemorisationAssessment::query()->create([
            'user_id' => $user->id,
            'user_session_id' => $session->id,
            'surah_number' => 1,
            'start_ayah' => 1,
            'end_ayah' => 1,
            'assessment_type' => MemorisationAssessment::TYPE_DASHBOARD_AI_RECITE,
            'status' => MemorisationAssessment::STATUS_COMPLETED,
            'completion_state' => 'completed',
            'overall_accuracy' => 70,
            'match_result' => 'mixed',
            'completed_at' => now()->subMinutes(5),
        ]);

        $newer = MemorisationAssessment::query()->create([
            'user_id' => $user->id,
            'user_session_id' => $session->id,
            'surah_number' => 1,
            'start_ayah' => 1,
            'end_ayah' => 1,
            'assessment_type' => MemorisationAssessment::TYPE_DASHBOARD_AI_RECITE,
            'status' => MemorisationAssessment::STATUS_COMPLETED,
            'completion_state' => 'completed',
            'overall_accuracy' => 95,
            'match_result' => 'strong',
            'completed_at' => now(),
        ]);

        $attempt = AiReciteAttempt::query()->create([
            'user_id' => $user->id,
            'user_session_id' => $session->id,
            'memorisation_assessment_id' => $older->id,
            'source' => AiReciteAttempt::SOURCE_DASHBOARD,
            'attempt_number' => 1,
            'accuracy_percent' => 70,
            'band' => 'mixed',
            'ayah_range' => ['surah' => 1, 'from' => 1, 'to' => 1],
        ]);

        $this->actingAs($user)
            ->getJson('/api/ai-recite-attempts/'.$attempt->id)
            ->assertOk()
            ->assertJsonPath('assessment.id', $older->id)
            ->assertJsonPath('assessment.accuracy', 70);

        $this->assertNotSame($newer->id, $older->id);
    }
}

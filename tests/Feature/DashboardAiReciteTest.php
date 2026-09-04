<?php

namespace Tests\Feature;

use App\Models\AiReciteAttempt;
use App\Models\MemorisationPracticePlan;
use App\Models\SessionRecommendation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardAiReciteTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_ai_recite_saves_attempt_without_creating_a_plan(): void
    {
        $user = User::factory()->pro()->create();

        $first = $this->actingAs($user)->postJson('/api/memorisation/assessments', $this->payload([
            'idempotency_key' => 'dash-ai-1-1-aaa',
        ]));

        $first->assertCreated()
            ->assertJsonPath('practice_plan', null)
            ->assertJsonPath('assessment.assessment_type', 'dashboard_ai_recite')
            ->assertJsonPath('ai_attempt.source', 'dashboard_ai_recite')
            ->assertJsonPath('ai_attempt.peek_used', false);

        $this->assertDatabaseHas('ai_recite_attempts', [
            'user_id' => $user->id,
            'source' => 'dashboard_ai_recite',
            'memorisation_assessment_id' => $first->json('assessment.id'),
        ]);
        $this->assertDatabaseCount('memorisation_practice_plans', 0);
        $this->assertDatabaseCount('session_recommendations', 0);

        $repeat = $this->actingAs($user)->postJson('/api/memorisation/assessments', $this->payload([
            'idempotency_key' => 'dash-ai-1-1-aaa',
        ]));

        $repeat->assertOk()
            ->assertJsonPath('idempotent', true)
            ->assertJsonPath('ai_attempt.id', $first->json('ai_attempt.id'));

        $this->assertDatabaseCount('ai_recite_attempts', 1);
    }

    public function test_dashboard_ai_recite_stats_and_peek_are_user_scoped(): void
    {
        $user = User::factory()->pro()->create();
        $other = User::factory()->pro()->create();

        $create = $this->actingAs($user)->postJson('/api/memorisation/assessments', $this->payload([
            'peek_used' => false,
            'idempotency_key' => 'dash-ai-stats-1',
        ]));
        $create->assertCreated();
        $attemptId = (int) $create->json('ai_attempt.id');

        AiReciteAttempt::create([
            'user_id' => $other->id,
            'source' => AiReciteAttempt::SOURCE_DASHBOARD,
            'attempt_number' => 1,
            'accuracy_percent' => 40,
            'band' => 'weak',
            'ayah_range' => ['surah' => 2, 'from' => 1, 'to' => 1],
        ]);

        $this->actingAs($user)
            ->getJson('/api/ai-recite-attempts/stats')
            ->assertOk()
            ->assertJsonPath('stats.total_attempts', 1)
            ->assertJsonPath('stats.last_location.surah_number', 1)
            ->assertJsonPath('stats.recent_attempts.0.id', $attemptId);

        $this->actingAs($other)
            ->patchJson('/api/ai-recite-attempts/'.$attemptId.'/peek')
            ->assertNotFound();

        $this->actingAs($user)
            ->patchJson('/api/ai-recite-attempts/'.$attemptId.'/peek')
            ->assertOk()
            ->assertJsonPath('attempt.peek_used', true);

        $this->assertTrue((bool) AiReciteAttempt::query()->find($attemptId)?->peek_used);
    }

    public function test_broken_dashboard_ai_recite_is_not_saved_as_success(): void
    {
        $user = User::factory()->pro()->create();

        $this->actingAs($user)->postJson('/api/memorisation/assessments', $this->payload([
            'duration_ms' => 200,
            'recognition_words' => [],
            'transcript' => '',
            'idempotency_key' => 'dash-ai-empty',
        ]))->assertCreated()
            ->assertJsonPath('invalid_attempt', true)
            ->assertJsonPath('practice_plan', null);

        $this->assertDatabaseCount('ai_recite_attempts', 0);
        $this->assertSame(0, MemorisationPracticePlan::query()->count());
        $this->assertSame(0, SessionRecommendation::query()->count());
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'surah_number' => 1,
            'surah_name' => 'Al-Fatihah',
            'start_ayah' => 1,
            'end_ayah' => 1,
            'assessment_type' => 'dashboard_ai_recite',
            'source' => 'dashboard_ai_recite',
            'duration_ms' => 4500,
            'provider' => 'test',
            'ayahs' => [[
                'ayah_number' => 1,
                'surah_number' => 1,
                'words' => ['بسم', 'الله', 'الرحمن', 'الرحيم'],
            ]],
            'recognition_words' => [
                ['word' => 'بسم', 'confidence' => 0.95],
                ['word' => 'الله', 'confidence' => 0.94],
                ['word' => 'الرحمن', 'confidence' => 0.93],
                ['word' => 'الرحيم', 'confidence' => 0.92],
            ],
        ], $overrides);
    }
}

<?php

namespace Tests\Feature;

use App\Models\MemorisationAssessment;
use App\Models\MemorisationPracticePlan;
use App\Models\MemorisationWeakSpot;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PracticePlanIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_mutate_or_list_practice_plans(): void
    {
        $this->getJson('/api/memorisation/practice-plans')->assertUnauthorized();
        $this->postJson('/api/memorisation/practice-plans/1/start')->assertUnauthorized();
        $this->patchJson('/api/memorisation/practice-plans/1', ['repetitions' => 2])->assertUnauthorized();
        $this->postJson('/api/memorisation/assessments', [])->assertUnauthorized();
        $this->postJson('/api/memorisation/assessments/failed', [])->assertUnauthorized();
    }

    public function test_free_user_cannot_submit_an_assessment(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/memorisation/assessments', $this->validAssessment())
            ->assertForbidden();

        $this->actingAs($user)
            ->postJson('/api/memorisation/assessments/failed', [
                'surah_number' => 1,
                'start_ayah' => 1,
                'end_ayah' => 1,
                'failure_reason' => 'provider_network_error',
            ])
            ->assertForbidden();
    }

    public function test_assessment_rejects_an_inverted_range_and_missing_ayahs(): void
    {
        $user = User::factory()->pro()->create();

        $this->actingAs($user)
            ->postJson('/api/memorisation/assessments', $this->validAssessment([
                'start_ayah' => 4,
                'end_ayah' => 2,
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('end_ayah');

        $this->actingAs($user)
            ->postJson('/api/memorisation/assessments', $this->validAssessment([
                'ayahs' => [],
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('ayahs');

        $this->actingAs($user)
            ->postJson('/api/memorisation/assessments', $this->validAssessment([
                'surah_number' => 200,
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('surah_number');

        $this->assertSame(0, MemorisationAssessment::query()->count());
        $this->assertSame(0, MemorisationPracticePlan::query()->count());
    }

    public function test_another_learner_cannot_read_or_change_a_practice_plan(): void
    {
        $owner = User::factory()->pro()->create();
        $intruder = User::factory()->pro()->create();
        $plan = $this->planFor($owner);

        $this->actingAs($intruder)
            ->postJson("/api/memorisation/practice-plans/{$plan->id}/start")
            ->assertForbidden();
        $this->actingAs($intruder)
            ->patchJson("/api/memorisation/practice-plans/{$plan->id}", [
                'repetitions' => 6,
                'start_ayah' => 2,
                'end_ayah' => 2,
            ])
            ->assertForbidden();
        $this->actingAs($intruder)
            ->postJson("/api/memorisation/practice-plans/{$plan->id}/complete", [
                'repetitions_completed' => 1,
            ])
            ->assertForbidden();
        $this->actingAs($intruder)
            ->postJson("/api/memorisation/practice-plans/{$plan->id}/dismiss")
            ->assertForbidden();

        $this->assertSame(MemorisationPracticePlan::STATUS_DRAFT, $plan->fresh()->status);
        $this->assertNull($plan->fresh()->started_at);

        $listed = $this->actingAs($intruder)->getJson('/api/memorisation/practice-plans');
        $listed->assertOk();
        $this->assertSame(0, $listed->json('total'));

        $ownerList = $this->actingAs($owner)->getJson('/api/memorisation/practice-plans');
        $ownerList->assertOk()->assertJsonPath('total', 1);
    }

    public function test_owner_cannot_save_an_inverted_practice_range(): void
    {
        $owner = User::factory()->create();
        $plan = $this->planFor($owner);

        $this->actingAs($owner)
            ->patchJson("/api/memorisation/practice-plans/{$plan->id}", [
                'start_ayah' => 5,
                'end_ayah' => 2,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('start_ayah');

        $this->assertSame(1, $plan->fresh()->start_ayah);
        $this->assertSame(3, $plan->fresh()->end_ayah);
    }

    public function test_history_dashboard_and_weak_spots_stay_scoped_to_the_user(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $assessment = MemorisationAssessment::query()->create([
            'user_id' => $owner->id,
            'surah_number' => 112,
            'start_ayah' => 1,
            'end_ayah' => 4,
            'status' => MemorisationAssessment::STATUS_COMPLETED,
            'overall_accuracy' => 91,
            'match_result' => 'strong',
        ]);
        MemorisationWeakSpot::query()->create([
            'user_id' => $owner->id,
            'spot_type' => MemorisationWeakSpot::TYPE_WORD,
            'surah_number' => 112,
            'ayah_number' => 1,
            'word_index' => 2,
            'verse_key' => '112:1',
            'spot_key' => MemorisationWeakSpot::buildSpotKey(MemorisationWeakSpot::TYPE_WORD, 112, 1, 2),
            'severity' => 'high',
            'status' => MemorisationWeakSpot::STATUS_ACTIVE,
            'trend' => 'stable',
            'affected_attempt_count' => 3,
            'first_identified_at' => now(),
            'last_identified_at' => now(),
            'source_assessment_id' => $assessment->id,
            'last_assessment_id' => $assessment->id,
        ]);

        $this->actingAs($other)
            ->getJson('/api/memorisation/history/dashboard')
            ->assertOk()
            ->assertJsonPath('attempts.completed', 0)
            ->assertJsonPath('weak_spots.active', 0);

        $this->actingAs($other)
            ->getJson("/api/memorisation/assessments/{$assessment->id}")
            ->assertForbidden();

        $this->actingAs($owner)
            ->getJson('/api/memorisation/history/dashboard')
            ->assertOk()
            ->assertJsonPath('attempts.completed', 1)
            ->assertJsonPath('weak_spots.active', 1);

        $spots = $this->actingAs($owner)->getJson('/api/memorisation/weak-spots');
        $spots->assertOk()->assertJsonPath('total', 1);
        $this->assertSame(0, $this->actingAs($other)->getJson('/api/memorisation/weak-spots')->json('total'));
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function validAssessment(array $overrides = []): array
    {
        return array_replace([
            'surah_number' => 1,
            'surah_name' => 'Al-Fatihah',
            'start_ayah' => 1,
            'end_ayah' => 1,
            'ayahs' => [[
                'ayah_number' => 1,
                'surah_number' => 1,
                'words' => ['بسم', 'الله', 'الرحمن', 'الرحيم'],
            ]],
            'recognition_words' => [
                ['word' => 'بسم', 'confidence' => 0.95],
                ['word' => 'الله', 'confidence' => 0.94],
                ['word' => 'الرحمن', 'confidence' => 0.93],
                ['word' => 'الرحيم', 'confidence' => 0.93],
            ],
        ], $overrides);
    }

    private function planFor(User $user): MemorisationPracticePlan
    {
        $assessment = MemorisationAssessment::query()->create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'start_ayah' => 1,
            'end_ayah' => 3,
            'status' => MemorisationAssessment::STATUS_COMPLETED,
            'overall_accuracy' => 80,
            'match_result' => 'mixed',
        ]);

        return MemorisationPracticePlan::query()->create([
            'user_id' => $user->id,
            'assessment_id' => $assessment->id,
            'title' => 'Review Al-Fatihah',
            'status' => MemorisationPracticePlan::STATUS_DRAFT,
            'surah_number' => 1,
            'start_ayah' => 1,
            'end_ayah' => 3,
            'repetitions' => ['target' => 3, 'label' => '3 repetitions'],
            'config' => ['technique' => 'focus'],
        ]);
    }
}

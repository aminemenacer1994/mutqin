<?php

namespace Tests\Feature;

use App\Models\MemorisationPracticePlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MemorisationDetectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_create_assessment(): void
    {
        $this->postJson('/api/memorisation/assessments', [])
            ->assertUnauthorized();
    }

    public function test_assessment_creates_plan_and_can_be_started(): void
    {
        $user = User::factory()->create();

        $create = $this->actingAs($user)->postJson('/api/memorisation/assessments', [
            'surah_number' => 1,
            'surah_name' => 'Al-Fatihah',
            'start_ayah' => 1,
            'end_ayah' => 1,
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
                ['word' => 'كتب', 'confidence' => 0.9],
                ['word' => 'الرحيم', 'confidence' => 0.93],
            ],
        ]);

        $create->assertCreated()
            ->assertJsonPath('assessment.surah_number', 1)
            ->assertJsonStructure([
                'assessment' => ['id', 'accuracy', 'word_results', 'ayahs'],
                'analysis' => ['weak_ayahs', 'weak_words', 'error_clusters'],
                'practice_plan' => ['id', 'title', 'why', 'range', 'techniques', 'repetitions'],
            ]);

        $planId = (int) $create->json('practice_plan.id');
        $this->assertDatabaseHas('memorisation_assessments', [
            'user_id' => $user->id,
            'surah_number' => 1,
        ]);
        $this->assertDatabaseHas('memorisation_practice_plans', [
            'id' => $planId,
            'user_id' => $user->id,
            'status' => 'draft',
        ]);

        $adjusted = $this->actingAs($user)->patchJson("/api/memorisation/practice-plans/{$planId}", [
            'repetitions' => 4,
            'audio_enabled' => true,
            'visual_assistance' => 'high',
            'techniques' => ['talqin', 'anchor'],
        ]);
        $adjusted->assertOk()
            ->assertJsonPath('practice_plan.repetitions.target', 4);

        $started = $this->actingAs($user)->postJson("/api/memorisation/practice-plans/{$planId}/start");
        $started->assertOk()
            ->assertJsonPath('practice_plan.status', 'active')
            ->assertJsonStructure([
                'session' => ['chapterId', 'rangeStart', 'rangeEnd', 'techniqueId', 'settings', 'hud'],
            ]);

        $completed = $this->actingAs($user)->postJson("/api/memorisation/practice-plans/{$planId}/complete", [
            'repetitions_completed' => 4,
        ]);
        $completed->assertOk()
            ->assertJsonPath('practice_plan.status', 'completed');

        $retest = $this->actingAs($user)->postJson("/api/memorisation/practice-plans/{$planId}/retest", [
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
                ['word' => 'الرحمن', 'confidence' => 0.94],
                ['word' => 'الرحيم', 'confidence' => 0.93],
            ],
        ]);
        $retest->assertCreated()
            ->assertJsonStructure(['assessment', 'analysis', 'practice_plan', 'improvement']);

        $this->assertInstanceOf(MemorisationPracticePlan::class, MemorisationPracticePlan::query()->find($planId));
    }
}

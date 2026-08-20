<?php

namespace Tests\Feature;

use App\Models\HifzPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HifzPlanTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_hifz_plan_api(): void
    {
        $this->getJson('/api/hifz-plan')->assertUnauthorized();
        $this->putJson('/api/hifz-plan', ['plan' => []])->assertUnauthorized();
    }

    public function test_free_user_can_save_hifz_plan(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson('/api/hifz-plan', ['plan' => $this->samplePlan()])
            ->assertOk()
            ->assertJsonPath('saved', true);
    }

    public function test_premium_user_can_save_fetch_and_delete_hifz_plan(): void
    {
        $user = User::factory()->premium()->create();
        $plan = $this->samplePlan();

        $this->actingAs($user)
            ->putJson('/api/hifz-plan', ['plan' => $plan])
            ->assertOk()
            ->assertJsonPath('saved', true)
            ->assertJsonPath('plan.selectedSurah', 'Al-Mulk');

        $this->assertDatabaseHas('hifz_plans', [
            'user_id' => $user->id,
            'status' => 'active',
        ]);

        $this->actingAs($user)
            ->getJson('/api/hifz-plan')
            ->assertOk()
            ->assertJsonPath('plan.selectedSurah', 'Al-Mulk');

        $this->actingAs($user)
            ->deleteJson('/api/hifz-plan')
            ->assertOk()
            ->assertJsonPath('deleted', true);

        $this->assertSame(0, HifzPlan::query()->where('user_id', $user->id)->count());
    }

    /**
     * @return array<string, mixed>
     */
    private function samplePlan(): array
    {
        return [
            'id' => 'hifz-plan-test-1',
            'status' => 'active',
            'lifecycle' => ['status' => 'active'],
            'selectedSurah' => 'Al-Mulk',
            'selectedRange' => ['from' => 1, 'to' => 5],
            'goalSettings' => [
                'goal' => 'balanced',
                'dailyNewAyahs' => ['min' => 3, 'max' => 5, 'exact' => 4],
            ],
            'learningStyle' => 'balanced',
            'focusMode' => 'mixed',
            'playback' => [
                'repetitionsPerAyah' => 5,
                'reciterId' => 'ar.alafasy',
                'speed' => 1,
            ],
        ];
    }
}

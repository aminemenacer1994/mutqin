<?php

namespace Tests\Feature;

use App\Models\MemorisationAssessment;
use App\Models\User;
use App\Services\UserAiReciteUsageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserAiReciteLifetimeLimitTest extends TestCase
{
    use RefreshDatabase;

    private function createAssessment(User $user): void
    {
        MemorisationAssessment::query()->create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'start_ayah' => 1,
            'end_ayah' => 1,
            'status' => MemorisationAssessment::STATUS_COMPLETED,
            'overall_accuracy' => 88,
        ]);
    }

    public function test_lifetime_limit_blocks_transcription_token(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'subscription_status' => 'active',
            'subscription_tier' => 'pro',
            'ai_recite_lifetime_limit' => 1,
        ]);

        $this->createAssessment($user);

        $this->actingAs($user)
            ->postJson(route('memorisation.transcription-token'))
            ->assertStatus(429)
            ->assertJsonPath('reason', UserAiReciteUsageService::REASON);
    }

    public function test_super_admin_sees_usage_in_user_detail(): void
    {
        config()->set('mutqin.admin_emails', ['admin@example.com']);
        $admin = User::factory()->admin()->create(['email' => 'admin@example.com']);
        $learner = User::factory()->create([
            'email' => 'learner@example.com',
            'email_verified_at' => now(),
            'ai_recite_lifetime_limit' => 50,
        ]);
        $this->createAssessment($learner);
        $this->createAssessment($learner);

        $this->actingAs($admin)
            ->getJson(route('api.admin.users.show', ['user' => $learner->id]))
            ->assertOk()
            ->assertJsonPath('ai_recite_usage.voice_checks_used', 2)
            ->assertJsonPath('ai_recite_usage.voice_checks_limit', 50)
            ->assertJsonPath('user.ai_recite_lifetime_limit', 50);
    }
}

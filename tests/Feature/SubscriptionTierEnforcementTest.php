<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionTierEnforcementTest extends TestCase
{
    use RefreshDatabase;

    public function test_free_user_cannot_create_memorisation_assessment(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/memorisation/assessments', [
                'surah_number' => 1,
                'surah_name' => 'Al-Fatihah',
                'start_ayah' => 1,
                'end_ayah' => 1,
                'duration_ms' => 1000,
                'provider' => 'test',
                'ayahs' => [[
                    'ayah_number' => 1,
                    'surah_number' => 1,
                    'words' => ['بسم', 'الله'],
                ]],
                'recognition_words' => [
                    ['word' => 'بسم', 'confidence' => 0.95],
                    ['word' => 'الله', 'confidence' => 0.94],
                ],
            ])
            ->assertForbidden();
    }

    public function test_pro_user_can_create_memorisation_assessment(): void
    {
        $user = User::factory()->pro()->create();

        $this->actingAs($user)
            ->postJson('/api/memorisation/assessments', [
                'surah_number' => 1,
                'surah_name' => 'Al-Fatihah',
                'start_ayah' => 1,
                'end_ayah' => 1,
                'duration_ms' => 1000,
                'provider' => 'test',
                'ayahs' => [[
                    'ayah_number' => 1,
                    'surah_number' => 1,
                    'words' => ['بسم', 'الله'],
                ]],
                'recognition_words' => [
                    ['word' => 'بسم', 'confidence' => 0.95],
                    ['word' => 'الله', 'confidence' => 0.94],
                ],
            ])
            ->assertCreated();
    }

    public function test_free_user_cannot_request_transcription_token(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson(route('memorisation.transcription-token'))
            ->assertForbidden();
    }

    public function test_pro_user_can_request_transcription_token_when_speechmatics_unconfigured(): void
    {
        $user = User::factory()->pro()->create();

        config([
            'services.speechmatics.api_key' => '',
            'services.speechmatics.region' => 'eu',
        ]);

        $this->actingAs($user)
            ->postJson(route('memorisation.transcription-token'))
            ->assertOk()
            ->assertJsonPath('available', false);
    }

    public function test_free_user_cannot_submit_adaptive_assessment(): void
    {
        $freeUser = User::factory()->create();

        $this->actingAs($freeUser)
            ->postJson('/api/recommendations/adaptive-assessment', [
                'session_id' => 'sess-adaptive-1',
                'skills' => ['phrase_recall'],
                'confidence' => 'needs_practice',
            ])
            ->assertForbidden();
    }

    public function test_premium_user_can_submit_adaptive_assessment(): void
    {
        $premiumUser = User::factory()->premium()->create();

        $response = $this->actingAs($premiumUser)
            ->postJson('/api/recommendations/adaptive-assessment', [
                'session_id' => 'sess-adaptive-1',
                'skills' => ['phrase_recall'],
                'confidence' => 'needs_practice',
            ]);

        $this->assertNotSame(403, $response->status());
    }

    public function test_free_user_cannot_submit_ai_assessment(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/recommendations/ai-assessment', [
                'session_id' => 'sess-ai-1',
                'accuracy' => 0.8,
                'confidence' => 'confident',
            ])
            ->assertForbidden();
    }

    public function test_admin_user_bypasses_pro_gate(): void
    {
        config(['mutqin.admin_emails' => ['admin@example.com']]);

        $admin = User::factory()->admin()->create([
            'email' => 'admin@example.com',
        ]);

        $this->actingAs($admin)
            ->postJson('/api/memorisation/assessments', [
                'surah_number' => 1,
                'surah_name' => 'Al-Fatihah',
                'start_ayah' => 1,
                'end_ayah' => 1,
                'duration_ms' => 1000,
                'provider' => 'test',
                'ayahs' => [[
                    'ayah_number' => 1,
                    'surah_number' => 1,
                    'words' => ['بسم', 'الله'],
                ]],
                'recognition_words' => [
                    ['word' => 'بسم', 'confidence' => 0.95],
                    ['word' => 'الله', 'confidence' => 0.94],
                ],
            ])
            ->assertCreated();
    }
}

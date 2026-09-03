<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Auth\AiSessionSettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiSessionSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_defaults_returned_for_authenticated_user_with_null_column(): void
    {
        $user = User::factory()->create([
            'ai_session_settings' => null,
        ]);

        $defaults = AiSessionSettingsService::defaults();

        $this->actingAs($user)
            ->getJson(route('api.profile.ai-session-settings.show'))
            ->assertOk()
            ->assertJsonPath('ai_recite.recall_mode_enabled', $defaults['ai_recite']['recall_mode_enabled'])
            ->assertJsonPath('ai_recite.strict_progression', $defaults['ai_recite']['strict_progression'])
            ->assertJsonPath('ai_recite.persist_mistakes', $defaults['ai_recite']['persist_mistakes'])
            ->assertJsonPath('amd.hide_percent', $defaults['amd']['hide_percent'])
            ->assertJsonPath('amd.mistake_sound_enabled', $defaults['amd']['mistake_sound_enabled']);
    }

    public function test_valid_partial_update_merges_and_persists(): void
    {
        $user = User::factory()->create([
            'ai_session_settings' => null,
        ]);

        $this->actingAs($user)
            ->patchJson(route('api.profile.ai-session-settings.update'), [
                'ai_recite' => [
                    'recall_mode_enabled' => true,
                ],
                'amd' => [
                    'hide_percent' => 50,
                    'mistake_sound_enabled' => false,
                ],
            ])
            ->assertOk()
            ->assertJsonPath('ai_recite.recall_mode_enabled', true)
            ->assertJsonPath('ai_recite.strict_progression', false)
            ->assertJsonPath('amd.hide_percent', 50)
            ->assertJsonPath('amd.mistake_sound_enabled', false);

        $stored = $user->fresh()->ai_session_settings;
        $this->assertIsArray($stored);
        $this->assertTrue($stored['ai_recite']['recall_mode_enabled']);
        $this->assertSame(50, $stored['amd']['hide_percent']);
        $this->assertFalse($stored['amd']['mistake_sound_enabled']);
    }

    public function test_invalid_hide_percent_is_rejected(): void
    {
        $user = User::factory()->create([
            'ai_session_settings' => [
                'amd' => ['hide_percent' => 100, 'mistake_sound_enabled' => true],
            ],
        ]);

        $this->actingAs($user)
            ->patchJson(route('api.profile.ai-session-settings.update'), [
                'amd' => ['hide_percent' => 33],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['amd.hide_percent']);

        $this->assertSame(100, $user->fresh()->ai_session_settings['amd']['hide_percent']);
    }

    public function test_unknown_keys_are_ignored_and_do_not_persist(): void
    {
        $user = User::factory()->create([
            'ai_session_settings' => null,
        ]);

        $this->actingAs($user)
            ->patchJson(route('api.profile.ai-session-settings.update'), [
                'unexpected' => 'value',
                'ai_recite' => [
                    'recall_mode_enabled' => true,
                    'extra_flag' => true,
                ],
            ])
            ->assertOk()
            ->assertJsonPath('ai_recite.recall_mode_enabled', true);

        $stored = $user->fresh()->ai_session_settings;
        $this->assertArrayNotHasKey('unexpected', $stored);
        $this->assertArrayNotHasKey('extra_flag', $stored['ai_recite']);
    }

    public function test_user_isolation_each_account_reads_own_settings(): void
    {
        $userA = User::factory()->create([
            'ai_session_settings' => [
                'ai_recite' => [
                    'recall_mode_enabled' => true,
                    'strict_progression' => false,
                    'persist_mistakes' => false,
                ],
                'amd' => [
                    'hide_percent' => 25,
                    'mistake_sound_enabled' => true,
                ],
            ],
        ]);
        $userB = User::factory()->create([
            'ai_session_settings' => [
                'ai_recite' => [
                    'recall_mode_enabled' => false,
                    'strict_progression' => true,
                    'persist_mistakes' => true,
                ],
                'amd' => [
                    'hide_percent' => 75,
                    'mistake_sound_enabled' => false,
                ],
            ],
        ]);

        $this->actingAs($userA)
            ->getJson(route('api.profile.ai-session-settings.show'))
            ->assertOk()
            ->assertJsonPath('amd.hide_percent', 25)
            ->assertJsonPath('ai_recite.recall_mode_enabled', true);

        $this->actingAs($userB)
            ->getJson(route('api.profile.ai-session-settings.show'))
            ->assertOk()
            ->assertJsonPath('amd.hide_percent', 75)
            ->assertJsonPath('ai_recite.strict_progression', true);
    }

    public function test_restore_after_login_matches_last_patch(): void
    {
        $user = User::factory()->create([
            'ai_session_settings' => null,
        ]);

        $this->actingAs($user)
            ->patchJson(route('api.profile.ai-session-settings.update'), [
                'ai_recite' => [
                    'strict_progression' => true,
                    'persist_mistakes' => true,
                ],
                'amd' => [
                    'hide_percent' => 10,
                    'mistake_sound_enabled' => false,
                ],
            ])
            ->assertOk();

        $this->actingAs($user)
            ->getJson(route('api.profile.ai-session-settings.show'))
            ->assertOk()
            ->assertJsonPath('ai_recite.strict_progression', true)
            ->assertJsonPath('ai_recite.persist_mistakes', true)
            ->assertJsonPath('amd.hide_percent', 10)
            ->assertJsonPath('amd.mistake_sound_enabled', false);
    }

    public function test_guest_cannot_access_ai_session_settings(): void
    {
        $this->getJson(route('api.profile.ai-session-settings.show'))
            ->assertUnauthorized();

        $this->patchJson(route('api.profile.ai-session-settings.update'), [
            'amd' => ['hide_percent' => 50],
        ])->assertUnauthorized();
    }
}

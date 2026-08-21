<?php

namespace Tests\Feature;

use App\Enums\UserSessionStatus;
use App\Models\User;
use App\Models\UserSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_registering_reserved_admin_email_is_rejected(): void
    {
        config(['mutqin.admin_emails' => ['admin@example.com']]);

        $this->post(route('register'), [
            'name' => 'Would Be Admin',
            'email' => 'admin@example.com',
            'password' => 'secret12',
            'password_confirmation' => 'secret12',
        ])->assertSessionHasErrors('email');

        $this->assertDatabaseMissing('users', ['email' => 'admin@example.com']);
    }

    public function test_non_admin_cannot_claim_reserved_admin_email_on_profile(): void
    {
        config(['mutqin.admin_emails' => ['admin@example.com']]);

        $user = User::factory()->create(['email' => 'learner@example.com']);

        $this->actingAs($user)
            ->put(route('profile.update'), [
                'name' => $user->name,
                'email' => 'admin@example.com',
            ])
            ->assertSessionHasErrors('email');

        $this->assertSame('learner@example.com', $user->fresh()->email);
        $this->assertFalse($user->fresh()->isAdmin());
    }

    public function test_assessment_rejects_foreign_session_ids(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();
        $foreignSession = UserSession::create([
            'user_id' => $owner->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'status' => UserSessionStatus::Active,
            'is_onboarding_example' => false,
            'last_activity_at' => now(),
            'started_at' => now(),
            'metadata' => ['active' => true],
        ]);

        $this->actingAs($attacker)
            ->postJson('/api/memorisation/assessments', [
                'surah_number' => 1,
                'surah_name' => 'Al-Fatihah',
                'start_ayah' => 1,
                'end_ayah' => 1,
                'duration_ms' => 1000,
                'provider' => 'test',
                'user_session_id' => $foreignSession->id,
                'ayahs' => [[
                    'ayah_number' => 1,
                    'text' => 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
                    'words' => ['بسم', 'الله'],
                ]],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['user_session_id']);
    }

    public function test_mid_session_save_rejects_terminal_status(): void
    {
        $user = User::factory()->create();
        $session = UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'status' => UserSessionStatus::Active,
            'is_onboarding_example' => false,
            'last_activity_at' => now(),
            'started_at' => now(),
            'metadata' => ['active' => true],
        ]);

        $this->actingAs($user)
            ->postJson('/api/session', [
                'action' => 'save',
                'session_id' => $session->id,
                'status' => 'completed',
                'ayah_number' => 2,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);

        $this->assertSame(UserSessionStatus::Active, $session->fresh()->status);
    }
}

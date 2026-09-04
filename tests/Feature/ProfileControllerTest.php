<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class ProfileControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_update_name_and_email(): void
    {
        $user = User::factory()->create([
            'name' => 'Old Name',
            'email' => 'keep@example.com',
        ]);

        $this->actingAs($user)
            ->put(route('profile.update'), [
                'name' => 'New Name',
                'email' => 'changed@example.com',
            ])
            ->assertRedirect();

        $user->refresh();

        $this->assertSame('New Name', $user->name);
        $this->assertSame('changed@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
        $this->assertNull($user->pending_email);
    }

    public function test_invalid_profile_input_is_rejected_and_kept(): void
    {
        $user = User::factory()->create([
            'name' => 'Kept Name',
            'email' => 'keep@example.com',
        ]);

        $this->actingAs($user)
            ->from(route('profile.show'))
            ->put(route('profile.update'), [
                'name' => '',
                'email' => 'not-an-email',
            ])
            ->assertRedirect(route('profile.show'))
            ->assertSessionHasErrors(['name', 'email'])
            ->assertSessionHasInput('email', 'not-an-email');

        $user->refresh();
        $this->assertSame('Kept Name', $user->name);
        $this->assertSame('keep@example.com', $user->email);
    }

    public function test_duplicate_email_is_rejected(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);
        $user = User::factory()->create(['email' => 'mine@example.com']);

        $this->actingAs($user)
            ->from(route('profile.show'))
            ->put(route('profile.update'), [
                'name' => $user->name,
                'email' => 'taken@example.com',
            ])
            ->assertRedirect(route('profile.show'))
            ->assertSessionHasErrors('email');

        $this->assertSame('mine@example.com', $user->fresh()->email);
    }

    public function test_verified_email_change_stays_pending_until_confirmed(): void
    {
        $this->requireEmailVerification();
        Notification::fake();

        $user = User::factory()->create([
            'name' => 'Learner',
            'email' => 'keep@example.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($user)
            ->put(route('profile.update'), [
                'name' => 'Learner',
                'email' => 'next@example.com',
            ])
            ->assertRedirect()
            ->assertSessionHas('profile_status');

        $user->refresh();
        $this->assertSame('keep@example.com', $user->email);
        $this->assertSame('next@example.com', $user->pending_email);
        $this->assertNotNull($user->email_verified_at);

        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_pending_email_is_promoted_after_signed_verification(): void
    {
        $this->requireEmailVerification();

        $user = User::factory()->create([
            'email' => 'keep@example.com',
            'pending_email' => 'next@example.com',
            'email_verified_at' => now(),
        ]);

        $url = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            [
                'id' => $user->id,
                'hash' => sha1('next@example.com'),
            ]
        );

        $this->actingAs($user)
            ->get($url)
            ->assertRedirect(route('profile.show'));

        $user->refresh();
        $this->assertSame('next@example.com', $user->email);
        $this->assertNull($user->pending_email);
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_old_email_hash_does_not_promote_pending_mailbox(): void
    {
        $this->requireEmailVerification();

        $user = User::factory()->create([
            'email' => 'keep@example.com',
            'pending_email' => 'next@example.com',
            'email_verified_at' => now(),
        ]);

        $url = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            [
                'id' => $user->id,
                'hash' => sha1('keep@example.com'),
            ]
        );

        $this->actingAs($user)
            ->get($url)
            ->assertForbidden();

        $user->refresh();
        $this->assertSame('keep@example.com', $user->email);
        $this->assertSame('next@example.com', $user->pending_email);
    }

    public function test_pending_email_change_can_be_cancelled(): void
    {
        $this->requireEmailVerification();

        $user = User::factory()->create([
            'email' => 'keep@example.com',
            'pending_email' => 'next@example.com',
        ]);

        $this->actingAs($user)
            ->delete(route('profile.pending-email.destroy'))
            ->assertRedirect()
            ->assertSessionHas('profile_status');

        $this->assertNull($user->fresh()->pending_email);
        $this->assertSame('keep@example.com', $user->fresh()->email);
    }

    public function test_name_only_update_does_not_cancel_pending_email(): void
    {
        $this->requireEmailVerification();

        $user = User::factory()->create([
            'name' => 'Old Name',
            'email' => 'keep@example.com',
            'pending_email' => 'next@example.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($user)
            ->put(route('profile.update'), [
                'name' => 'New Name',
                'email' => 'keep@example.com',
            ])
            ->assertRedirect();

        $user->refresh();
        $this->assertSame('New Name', $user->name);
        $this->assertSame('keep@example.com', $user->email);
        $this->assertSame('next@example.com', $user->pending_email);
    }

    public function test_user_can_update_password(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('old-secret'),
            'password_set_at' => now(),
        ]);

        $this->actingAs($user)
            ->put(route('profile.password.update'), [
                'current_password' => 'old-secret',
                'password' => 'new-secret',
                'password_confirmation' => 'new-secret',
            ])
            ->assertRedirect()
            ->assertSessionHas('password_status');

        $this->assertTrue(Hash::check('new-secret', $user->fresh()->password));
    }

    public function test_password_mismatch_is_rejected(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('old-secret'),
            'password_set_at' => now(),
        ]);

        $this->actingAs($user)
            ->from(route('profile.show'))
            ->put(route('profile.password.update'), [
                'current_password' => 'old-secret',
                'password' => 'new-secret',
                'password_confirmation' => 'other-secret',
            ])
            ->assertRedirect(route('profile.show'))
            ->assertSessionHasErrors('password');

        $this->assertTrue(Hash::check('old-secret', $user->fresh()->password));
    }

    public function test_profile_page_exposes_real_sections_and_hides_internal_ids(): void
    {
        $user = User::factory()->create([
            'name' => 'Amina',
            'email' => 'amina@example.com',
            'email_verified_at' => now(),
            'stripe_customer_id' => 'cus_hidden_internal',
            'google_id' => 'google-hidden-id',
            'is_admin' => false,
            'locale' => 'fr',
            'theme' => 'dark-mode',
        ]);

        $this->actingAs($user)
            ->get(route('profile.show'))
            ->assertOk()
            ->assertSee(__('profile.personal_details'), false)
            ->assertDontSee(__('profile.memorisation_prefs'), false)
            ->assertDontSee(__('profile.app_preferences'), false)
            ->assertDontSee(__('profile.ai_audio'), false)
            ->assertDontSee('data-consent-choice', false)
            ->assertDontSee(__('profile.account_security'), false)
            ->assertDontSee(__('profile.current_plan'), false)
            ->assertDontSee(__('profile.upgrade_plan'), false)
            ->assertSee(__('profile.change_password'), false)
            ->assertSee('id="currentPassword"', false)
            ->assertSee(__('profile.delete_account'), false)
            ->assertDontSee('data-locale-choice="en"', false)
            ->assertDontSee('id="app-preferences"', false)
            ->assertDontSee('id="danger-zone"', false)
            ->assertDontSee('cus_hidden_internal', false)
            ->assertDontSee('google-hidden-id', false)
            ->assertDontSee('is_admin', false)
            ->assertDontSee('id="subscription"', false);
    }

    public function test_profile_hides_security_plan_and_ai_recitation_checks(): void
    {
        $user = User::factory()->create([
            'ai_audio_consent_status' => 'accepted',
        ]);

        $this->actingAs($user)
            ->get(route('profile.show'))
            ->assertOk()
            ->assertDontSee(__('profile.account_security'), false)
            ->assertDontSee(__('profile.current_plan'), false)
            ->assertDontSee('id="settings"', false)
            ->assertSee('mutqin:app-mounted', false)
            ->assertDontSee('profile-choice-grid--pair', false)
            ->assertDontSee('data-consent-block', false)
            ->assertDontSee('data-consent-choice', false)
            ->assertDontSee(__('profile.ai_audio'), false)
            ->assertDontSee(__('profile.ai_audio_allow'), false)
            ->assertDontSee(__('profile.ai_audio_decline'), false);
    }

    public function test_unverified_profile_shows_status_and_name_email(): void
    {
        $this->requireEmailVerification();

        $user = User::factory()->unverified()->create([
            'email' => 'new@example.com',
        ]);

        $this->actingAs($user)
            ->get(route('profile.show'))
            ->assertOk()
            ->assertSee(__('profile.email_unverified'), false)
            ->assertSee(__('profile.personal_details'), false)
            ->assertDontSee(__('profile.app_preferences'), false)
            ->assertDontSee(__('profile.ai_audio_not_set'), false)
            ->assertSee(__('profile.resend_verification'), false)
            ->assertSee('profile-badge--unverified', false);
    }

    public function test_learner_can_delete_account_with_confirmation(): void
    {
        $user = User::factory()->create([
            'email' => 'learner@example.com',
        ]);

        $this->actingAs($user)
            ->delete(route('profile.destroy'), [
                'confirmation' => 'DELETE',
            ])
            ->assertRedirect(route('home'));

        $this->assertGuest();
        $this->assertSoftDeleted('users', ['id' => $user->id]);
        $this->assertDatabaseMissing('users', ['email' => 'learner@example.com']);
    }

    public function test_learner_can_delete_account_by_typing_email(): void
    {
        $user = User::factory()->create([
            'email' => 'learner@example.com',
        ]);

        $this->actingAs($user)
            ->delete(route('profile.destroy'), [
                'confirmation' => 'Learner@Example.com',
            ])
            ->assertRedirect(route('home'));

        $this->assertGuest();
        $this->assertSoftDeleted('users', ['id' => $user->id]);
        $this->assertDatabaseMissing('users', ['email' => 'learner@example.com']);
    }

    public function test_deleted_account_email_can_be_registered_again(): void
    {
        $user = User::factory()->create([
            'email' => 'learner@example.com',
        ]);

        $this->actingAs($user)
            ->delete(route('profile.destroy'), [
                'confirmation' => 'DELETE',
            ])
            ->assertRedirect(route('home'));

        $this->post(route('register'), [
            'name' => 'Returning Learner',
            'email' => 'learner@example.com',
            'password' => 'secret12',
            'password_confirmation' => 'secret12',
        ])->assertRedirect();

        $this->assertAuthenticated();
        $this->assertNotSame($user->id, (int) auth()->id());
        $this->assertDatabaseHas('users', [
            'email' => 'learner@example.com',
            'name' => 'Returning Learner',
        ]);
        $this->assertSoftDeleted('users', ['id' => $user->id]);
    }

    public function test_admin_cannot_delete_own_account_from_profile(): void
    {
        config(['mutqin.admin_emails' => ['admin@example.com']]);

        $user = User::factory()->admin()->create([
            'email' => 'admin@example.com',
        ]);

        $this->actingAs($user)
            ->delete(route('profile.destroy'), [
                'confirmation' => 'DELETE',
            ])
            ->assertRedirect()
            ->assertSessionHas('billing_error');

        $this->assertDatabaseHas('users', ['id' => $user->id]);
    }

    public function test_admin_profile_shows_org_copy_and_badge(): void
    {
        config(['mutqin.admin_emails' => ['admin@example.com']]);

        $user = User::factory()->admin()->create([
            'email' => 'admin@example.com',
            'google_id' => 'google-admin-1',
        ]);

        $this->actingAs($user)
            ->get(route('profile.show'))
            ->assertOk()
            ->assertSee(__('profile.title'), false)
            ->assertDontSee(__('profile.org_plan'), false)
            ->assertDontSee(__('profile.open_admin_console'), false)
            ->assertDontSee(__('profile.connected_with_google', ['email' => $user->email]), false)
            ->assertDontSee(__('profile.danger_zone'), false)
            ->assertDontSee(__('profile.upgrade_plan'), false)
            ->assertDontSee('Log out of all devices', false)
            ->assertDontSee('id="subscription"', false)
            ->assertDontSee('google-admin-1', false);
    }
}

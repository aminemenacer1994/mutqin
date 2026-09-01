<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_sends_reset_email_with_generic_status(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $response = $this->from(route('password.request'))->post(route('password.email'), [
            'email' => $user->email,
        ]);

        $response->assertRedirect(route('password.request'));
        $response->assertSessionHas('status', __('passwords.sent'));
        $response->assertSessionMissing('errors');

        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_forgot_password_returns_generic_status_for_unknown_email(): void
    {
        Notification::fake();

        $response = $this->from(route('password.request'))->post(route('password.email'), [
            'email' => 'nobody@example.com',
        ]);

        $response->assertRedirect(route('password.request'));
        $response->assertSessionHas('status', __('passwords.sent'));
        $response->assertSessionMissing('errors');

        Notification::assertNothingSent();
    }

    public function test_oauth_only_account_does_not_receive_reset_email(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'google-only@example.com',
            'google_id' => 'google-oauth-only-1',
            'password' => null,
            'password_set_at' => null,
        ]);

        $this->assertFalse($user->hasSetPassword());

        $response = $this->from(route('password.request'))->post(route('password.email'), [
            'email' => $user->email,
        ]);

        $response->assertRedirect(route('password.request'));
        $response->assertSessionHas('status', __('passwords.sent'));
        Notification::assertNothingSent();
    }

    public function test_reset_form_accepts_valid_token_and_updates_password(): void
    {
        $user = User::factory()->create();
        $token = Password::broker()->createToken($user);
        $oldRemember = $user->remember_token;

        $user->createToken('legacy-device');
        $this->assertDatabaseCount('personal_access_tokens', 1);

        $this->get(route('password.reset', ['token' => $token, 'email' => $user->email]))
            ->assertOk()
            ->assertSee('Choose a new password');

        $response = $this->post(route('password.update'), [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-secure-password',
            'password_confirmation' => 'new-secure-password',
        ]);

        $response->assertRedirect('/memorisation');
        $this->assertAuthenticatedAs($user->fresh());

        $fresh = $user->fresh();
        $this->assertTrue(Hash::check('new-secure-password', $fresh->password));
        $this->assertNotNull($fresh->password_set_at);
        $this->assertNotSame($oldRemember, $fresh->remember_token);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_reset_with_wrong_email_for_token_fails_generically(): void
    {
        $owner = User::factory()->create(['email' => 'owner@example.com']);
        $other = User::factory()->create(['email' => 'other@example.com']);
        $token = Password::broker()->createToken($owner);

        $response = $this->from(route('password.reset', ['token' => $token]))
            ->post(route('password.update'), [
                'token' => $token,
                'email' => $other->email,
                'password' => 'new-secure-password',
                'password_confirmation' => 'new-secure-password',
            ]);

        $response->assertRedirect(route('password.reset', ['token' => $token]));
        $response->assertSessionHasErrors([
            'email' => __('passwords.token'),
        ]);
        $this->assertTrue(Hash::check('password', $owner->fresh()->password));
        $this->assertTrue(Hash::check('password', $other->fresh()->password));
    }

    public function test_reset_with_invalid_token_returns_clear_error(): void
    {
        $user = User::factory()->create();

        $response = $this->from(route('password.request'))->post(route('password.update'), [
            'token' => 'invalid-token',
            'email' => $user->email,
            'password' => 'new-secure-password',
            'password_confirmation' => 'new-secure-password',
        ]);

        $response->assertRedirect(route('password.request'));
        $response->assertSessionHasErrors([
            'email' => __('passwords.token'),
        ]);
    }

    public function test_expired_token_cannot_reset_password(): void
    {
        $user = User::factory()->create();
        $token = Password::broker()->createToken($user);

        $this->travel(61)->minutes();

        $response = $this->from(route('password.reset', ['token' => $token]))
            ->post(route('password.update'), [
                'token' => $token,
                'email' => $user->email,
                'password' => 'new-secure-password',
                'password_confirmation' => 'new-secure-password',
            ]);

        $response->assertSessionHasErrors([
            'email' => __('passwords.token'),
        ]);
        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    public function test_reset_token_cannot_be_reused(): void
    {
        $user = User::factory()->create();
        $token = Password::broker()->createToken($user);

        $this->post(route('password.update'), [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-secure-password',
            'password_confirmation' => 'new-secure-password',
        ])->assertRedirect('/memorisation');

        $this->post(route('logout'));

        $reuse = $this->from(route('password.reset', ['token' => $token]))
            ->post(route('password.update'), [
                'token' => $token,
                'email' => $user->email,
                'password' => 'another-secure-password',
                'password_confirmation' => 'another-secure-password',
            ]);

        $reuse->assertSessionHasErrors([
            'email' => __('passwords.token'),
        ]);
        $this->assertTrue(Hash::check('new-secure-password', $user->fresh()->password));
        $this->assertFalse(Hash::check('another-secure-password', $user->fresh()->password));
    }

    public function test_forgot_password_request_is_throttled(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        for ($i = 0; $i < 6; $i++) {
            $this->post(route('password.email'), [
                'email' => $user->email,
            ])->assertRedirect();
        }

        $this->post(route('password.email'), [
            'email' => $user->email,
        ])->assertStatus(429);
    }

    public function test_broker_throttle_does_not_send_duplicate_mail(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->post(route('password.email'), ['email' => $user->email])
            ->assertSessionHas('status', __('passwords.sent'));

        $this->post(route('password.email'), ['email' => $user->email])
            ->assertSessionHas('status', __('passwords.sent'));

        Notification::assertSentToTimes($user, ResetPassword::class, 1);
    }

    public function test_unverified_account_can_reset_but_stays_unverified(): void
    {
        Notification::fake();

        $user = User::factory()->unverified()->create([
            'email' => 'unverified-reset@example.com',
            'password' => bcrypt('old-password'),
        ]);

        $this->post(route('password.email'), ['email' => $user->email])
            ->assertSessionHas('status', __('passwords.sent'));

        Notification::assertSentTo($user, ResetPassword::class);

        $token = Password::broker()->createToken($user);

        $this->post(route('password.update'), [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-secure-password',
            'password_confirmation' => 'new-secure-password',
        ])->assertRedirect(route('verification.notice'));

        $fresh = $user->fresh();
        $this->assertNull($fresh->email_verified_at);
        $this->assertFalse($fresh->hasVerifiedEmail());
        $this->assertTrue(Hash::check('new-secure-password', $fresh->password));
        $this->assertAuthenticatedAs($fresh);
    }

    public function test_password_reset_tokens_are_not_written_to_application_logs(): void
    {
        Notification::fake();

        $user = User::factory()->create();
        $token = Password::broker()->createToken($user);

        $this->post(route('password.update'), [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-secure-password',
            'password_confirmation' => 'new-secure-password',
        ])->assertRedirect('/memorisation');

        $log = file_exists(storage_path('logs/laravel.log'))
            ? file_get_contents(storage_path('logs/laravel.log'))
            : '';

        $this->assertStringNotContainsString($token, (string) $log);
        $this->assertDatabaseMissing('password_reset_tokens', [
            'email' => $user->email,
        ]);
    }
}

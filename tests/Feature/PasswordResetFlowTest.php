<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\ResetPassword;
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

    public function test_reset_email_uses_mutqin_branded_content(): void
    {
        $user = User::factory()->create([
            'name' => 'Reset Learner',
            'email' => 'reset-branded@example.com',
        ]);

        $mail = (new ResetPassword('test-reset-token'))->toMail($user);
        $expireMinutes = (int) config('auth.passwords.users.expire');

        $this->assertSame(__('mail.reset_subject'), $mail->subject);
        $this->assertSame([
            'html' => 'mail.reset-password',
            'text' => 'mail.text.reset-password',
        ], $mail->view);
        $this->assertSame('Reset Learner', $mail->viewData['userName']);
        $this->assertSame($expireMinutes, $mail->viewData['expireMinutes']);
        $this->assertStringStartsWith('http', $mail->viewData['url']);
        $this->assertStringContainsString('/password/reset/test-reset-token', $mail->viewData['url']);
        parse_str((string) parse_url($mail->viewData['url'], PHP_URL_QUERY), $resetQuery);
        $this->assertSame('reset-branded@example.com', $resetQuery['email'] ?? null);
        $this->assertStringNotContainsString('https://evil.example', $mail->viewData['url']);

        $html = (string) $mail->render();
        $this->assertStringContainsString(__('mail.reset_action'), $html);
        $this->assertStringContainsString((string) $expireMinutes, $html);
        $this->assertStringContainsString(e(__('mail.reset_security')), $html);
        $this->assertStringContainsString(e($mail->viewData['url']), $html);
        $this->assertTrue(str_contains($html, 'cid:') || str_contains($html, 'data:image/png;base64,'));
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

    public function test_google_linked_account_with_password_can_reset(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'google-plus-password@example.com',
            'google_id' => 'google-linked-with-password',
            'password_set_at' => now(),
        ]);

        $this->from(route('password.request'))->post(route('password.email'), [
            'email' => $user->email,
        ])->assertSessionHas('status', __('passwords.sent'));

        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user) {
            return $user->routeNotificationForMail($notification) === $user->email;
        });

        $token = Password::broker()->createToken($user);
        $this->post(route('password.update'), [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-secure-password',
            'password_confirmation' => 'new-secure-password',
        ])->assertRedirect('/memorisation');

        $fresh = $user->fresh();
        $this->assertTrue(Hash::check('new-secure-password', $fresh->password));
        $this->assertSame('google-linked-with-password', $fresh->google_id);
        $this->assertNotNull($fresh->password_set_at);
    }

    public function test_reset_mail_goes_to_stored_email_not_pending_email(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'current-reset@example.com',
            'pending_email' => 'pending-reset@example.com',
        ]);

        $this->post(route('password.email'), ['email' => $user->email])
            ->assertSessionHas('status', __('passwords.sent'));

        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user) {
            return $user->routeNotificationForMail($notification) === 'current-reset@example.com';
        });
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
        $this->assertDatabaseMissing('password_reset_tokens', [
            'email' => $user->email,
        ]);
    }

    public function test_reset_rejects_weak_and_unconfirmed_passwords_without_consuming_token(): void
    {
        $user = User::factory()->create();
        $token = Password::broker()->createToken($user);

        $this->from(route('password.reset', ['token' => $token]))
            ->post(route('password.update'), [
                'token' => $token,
                'email' => $user->email,
                'password' => 'short',
                'password_confirmation' => 'short',
            ])
            ->assertRedirect(route('password.reset', ['token' => $token]))
            ->assertSessionHasErrors('password');

        $this->from(route('password.reset', ['token' => $token]))
            ->post(route('password.update'), [
                'token' => $token,
                'email' => $user->email,
                'password' => 'new-secure-password',
                'password_confirmation' => 'does-not-match',
            ])
            ->assertSessionHasErrors('password');

        $this->assertTrue(Hash::check('password', $user->fresh()->password));

        $this->post(route('password.update'), [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-secure-password',
            'password_confirmation' => 'new-secure-password',
        ])->assertRedirect('/memorisation');

        $this->assertTrue(Hash::check('new-secure-password', $user->fresh()->password));
    }

    public function test_reset_ignores_external_redirect_targets(): void
    {
        $user = User::factory()->create();
        $token = Password::broker()->createToken($user);

        $this->withSession(['url.intended' => 'https://evil.example/phish'])
            ->from(route('password.reset', ['token' => $token, 'redirect' => 'https://evil.example/phish']))
            ->post(route('password.update'), [
                'token' => $token,
                'email' => $user->email,
                'password' => 'new-secure-password',
                'password_confirmation' => 'new-secure-password',
                'redirect' => 'https://evil.example/phish',
            ])
            ->assertRedirect('/memorisation')
            ->assertSessionMissing('url.intended');
    }

    public function test_expired_or_invalid_reset_link_shows_generic_state(): void
    {
        $user = User::factory()->create();
        $token = Password::broker()->createToken($user);

        $this->travel(61)->minutes();

        $this->get(route('password.reset', ['token' => $token, 'email' => $user->email]))
            ->assertOk()
            ->assertSee(__('passwords.token'))
            ->assertSee(__('ui.new_password_title'));

        $this->get(route('password.reset', ['token' => 'not-a-real-token', 'email' => 'nobody@example.com']))
            ->assertOk()
            ->assertSee(__('passwords.token'));
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
        $this->assertNotNull($other->fresh()->email_verified_at);
        $this->assertSame('other@example.com', $other->fresh()->email);
        $this->assertSame('owner@example.com', $owner->fresh()->email);
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
        $this->requireEmailVerification();

        Notification::fake();

        $user = User::factory()->unverified()->create([
            'email' => 'unverified-reset@example.com',
            'password' => bcrypt('old-password'),
        ]);
        $bystander = User::factory()->unverified()->create([
            'email' => 'other-unverified@example.com',
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
        $this->assertNull($bystander->fresh()->email_verified_at);
        $this->assertTrue(Hash::check('password', $bystander->fresh()->password));
        $this->assertSame('other-unverified@example.com', $bystander->fresh()->email);
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

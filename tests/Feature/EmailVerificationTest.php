<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->requireEmailVerification();
    }

    public function test_registration_creates_unverified_user_and_sends_verification_email(): void
    {
        Notification::fake();

        $this->post(route('register'), [
            'name' => 'New Learner',
            'email' => 'new-learner@example.com',
            'password' => 'secret12',
            'password_confirmation' => 'secret12',
        ])->assertRedirect(route('verification.notice'));

        $this->assertAuthenticated();

        $user = User::where('email', 'new-learner@example.com')->firstOrFail();
        $this->assertNull($user->email_verified_at);
        $this->assertFalse($user->hasVerifiedEmail());

        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_unverified_user_is_blocked_from_memorisation_and_dashboard(): void
    {
        $user = User::factory()->unverified()->create();

        $this->actingAs($user)
            ->get(route('memorisation'))
            ->assertRedirect(route('verification.notice'));

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertRedirect(route('verification.notice'));

        $this->actingAs($user)
            ->getJson('/api/state')
            ->assertForbidden();
    }

    public function test_verified_notice_page_renders_for_unverified_user(): void
    {
        $user = User::factory()->unverified()->create([
            'name' => 'Prescott Adams',
            'email' => 'notice@example.com',
        ]);

        $this->actingAs($user)
            ->get(route('verification.notice'))
            ->assertOk()
            ->assertSee(__('ui.verify_title'))
            ->assertSee(__('ui.verify_resend_button'))
            ->assertSee(__('ui.verify_wrong_email'))
            ->assertSee('notice@example.com', false)
            ->assertDontSee('id="userDropdown"', false)
            ->assertDontSee('id="dropdownToggle"', false)
            ->assertDontSee('Prescott Adams', false)
            ->assertDontSee('expires=', false)
            ->assertDontSee('signature=', false);
    }

    public function test_verification_email_uses_mutqin_branded_content(): void
    {
        $user = User::factory()->unverified()->create([
            'name' => 'New Learner',
            'email' => 'branded@example.com',
        ]);

        $mail = (new VerifyEmail)->toMail($user);

        $this->assertSame(__('mail.verify_subject'), $mail->subject);
        $this->assertSame([
            'html' => 'mail.verify-email',
            'text' => 'mail.text.verify-email',
        ], $mail->view);
        $this->assertSame('New Learner', $mail->viewData['userName']);
        $this->assertSame((int) config('auth.verification.expire', 60), $mail->viewData['expireMinutes']);
        $this->assertStringStartsWith('http', $mail->viewData['url']);
        $this->assertStringContainsString((string) $user->id, $mail->viewData['url']);
        $this->assertStringContainsString('signature=', $mail->viewData['url']);
    }

    public function test_resend_sends_another_email_with_clear_feedback(): void
    {
        Notification::fake();

        $user = User::factory()->unverified()->create();

        $this->actingAs($user)
            ->from(route('verification.notice'))
            ->post(route('verification.resend'))
            ->assertRedirect(route('verification.notice'))
            ->assertSessionHas('resent', true);

        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_resend_is_throttled(): void
    {
        Notification::fake();

        $user = User::factory()->unverified()->create();

        $this->actingAs($user);

        for ($i = 0; $i < 6; $i++) {
            $this->post(route('verification.resend'))->assertRedirect();
        }

        $this->post(route('verification.resend'))->assertStatus(429);
    }

    public function test_valid_signed_link_marks_email_verified_once_and_redirects_safely(): void
    {
        $user = User::factory()->unverified()->create();
        $url = $this->verificationUrl($user);

        $this->actingAs($user)
            ->get($url)
            ->assertRedirect('/memorisation');

        $this->assertNotNull($user->fresh()->email_verified_at);

        $verifiedAt = $user->fresh()->email_verified_at;

        $this->actingAs($user)
            ->get($url)
            ->assertRedirect('/memorisation');

        $this->assertTrue($verifiedAt->equalTo($user->fresh()->email_verified_at));
    }

    public function test_invalid_signature_is_rejected(): void
    {
        $user = User::factory()->unverified()->create();

        $this->actingAs($user)
            ->get(route('verification.verify', [
                'id' => $user->id,
                'hash' => sha1($user->email),
            ]))
            ->assertForbidden();

        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_expired_signature_is_rejected(): void
    {
        $user = User::factory()->unverified()->create();

        $url = URL::temporarySignedRoute(
            'verification.verify',
            now()->subMinutes(1),
            [
                'id' => $user->id,
                'hash' => sha1($user->getEmailForVerification()),
            ]
        );

        $this->actingAs($user)
            ->get($url)
            ->assertForbidden();

        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_already_verified_user_skips_notice_and_keeps_access(): void
    {
        $user = User::factory()->create();
        $this->assertNotNull($user->email_verified_at);

        $this->actingAs($user)
            ->get(route('verification.notice'))
            ->assertRedirect('/memorisation');

        $this->actingAs($user)
            ->get(route('memorisation'))
            ->assertOk();

        Notification::fake();

        $this->actingAs($user)
            ->post(route('verification.resend'))
            ->assertRedirect('/memorisation');

        Notification::assertNothingSent();
    }

    public function test_verification_state_survives_logout_and_login(): void
    {
        $user = User::factory()->unverified()->create([
            'email' => 'persist@example.com',
            'password' => bcrypt('secret12'),
        ]);

        $this->actingAs($user)
            ->get($this->verificationUrl($user))
            ->assertRedirect('/memorisation');

        $this->assertNotNull($user->fresh()->email_verified_at);

        $this->post(route('logout'));
        $this->assertGuest();

        $this->post(route('login'), [
            'email' => 'persist@example.com',
            'password' => 'secret12',
        ])->assertRedirect('/memorisation');

        $this->assertAuthenticated();
        $this->assertTrue($user->fresh()->hasVerifiedEmail());

        $this->get(route('memorisation'))->assertOk();
    }

    public function test_demo_login_bypasses_verification_gate(): void
    {
        Notification::fake();
        config(['app.show_demo_accounts' => true]);

        $this->post(route('login.demo'))
            ->assertRedirect('/memorisation');

        $user = User::where('email', 'layla.beginner@mutqin.test')->firstOrFail();
        $this->assertNotNull($user->email_verified_at);
        $this->assertTrue($user->hasVerifiedEmail());
        $this->get(route('memorisation'))->assertOk();
        Notification::assertNothingSent();
    }

    public function test_demo_password_on_reserved_mailbox_verifies_without_email(): void
    {
        Notification::fake();
        config(['app.show_demo_accounts' => true]);

        $this->post(route('register'), [
            'name' => 'Demo Learner',
            'email' => 'demo.bypass@mutqin.test',
            'password' => 'DemoPass1!',
            'password_confirmation' => 'DemoPass1!',
        ])->assertRedirect('/memorisation');

        $user = User::where('email', 'demo.bypass@mutqin.test')->firstOrFail();
        $this->assertNotNull($user->email_verified_at);
        $this->assertTrue($user->hasVerifiedEmail());
        Notification::assertNothingSent();
        $this->get(route('memorisation'))->assertOk();
    }

    public function test_demo_password_on_real_mailbox_still_requires_verification(): void
    {
        Notification::fake();

        $this->post(route('register'), [
            'name' => 'Real Learner',
            'email' => 'real-learner@gmail.com',
            'password' => 'DemoPass1!',
            'password_confirmation' => 'DemoPass1!',
        ])->assertRedirect(route('verification.notice'));

        $user = User::where('email', 'real-learner@gmail.com')->firstOrFail();
        $this->assertNull($user->email_verified_at);
        $this->assertFalse($user->hasVerifiedEmail());
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_login_with_demo_password_verifies_stale_demo_account(): void
    {
        config(['app.show_demo_accounts' => true]);

        $user = User::factory()->unverified()->create([
            'email' => 'omar.active@mutqin.test',
            'password' => bcrypt('DemoPass1!'),
            'password_set_at' => now(),
        ]);

        $this->post(route('login'), [
            'email' => 'omar.active@mutqin.test',
            'password' => 'DemoPass1!',
        ])->assertRedirect('/memorisation');

        $this->assertNotNull($user->fresh()->email_verified_at);
        $this->get(route('memorisation'))->assertOk();
    }

    public function test_demo_password_does_not_bypass_when_demo_accounts_are_hidden(): void
    {
        Notification::fake();
        config(['app.show_demo_accounts' => false]);

        $this->post(route('register'), [
            'name' => 'Hidden Demo',
            'email' => 'hidden.demo@mutqin.test',
            'password' => 'DemoPass1!',
            'password_confirmation' => 'DemoPass1!',
        ])->assertRedirect(route('verification.notice'));

        $user = User::where('email', 'hidden.demo@mutqin.test')->firstOrFail();
        $this->assertNull($user->email_verified_at);
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_tampered_hash_does_not_verify_email(): void
    {
        $user = User::factory()->unverified()->create();

        $url = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            [
                'id' => $user->id,
                'hash' => sha1('other@example.com'),
            ]
        );

        $this->actingAs($user)
            ->get($url)
            ->assertForbidden();

        $this->assertNull($user->fresh()->email_verified_at);
    }

    private function verificationUrl(User $user): string
    {
        return URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            [
                'id' => $user->id,
                'hash' => sha1($user->getEmailForVerification()),
            ]
        );
    }
}

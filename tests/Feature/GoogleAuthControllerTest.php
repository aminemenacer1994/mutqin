<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Auth\GoogleSignInService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\TestCase;

class GoogleAuthControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.google.client_id' => 'test-client.apps.googleusercontent.com',
            'services.google.client_secret' => 'test-secret',
            'services.google.redirect' => route('auth.google.callback'),
        ]);
    }

    public function test_google_redirect_route_redirects_to_the_provider(): void
    {
        $this->mockGoogleRedirect();

        $this->get(route('auth.google.redirect'))
            ->assertRedirect('https://accounts.google.com/o/oauth2/auth');
    }

    public function test_google_redirect_keeps_canonical_uri_when_request_host_is_cloud_hostname(): void
    {
        config([
            'services.google.redirect' => 'https://app.mutqin.ai/auth/google/callback',
        ]);

        $this->mockGoogleRedirect('https://app.mutqin.ai/auth/google/callback');

        $this->get('https://mutqin-abc.laravel.cloud/auth/google/redirect')
            ->assertRedirect('https://accounts.google.com/o/oauth2/auth');
    }

    public function test_google_callback_keeps_canonical_uri_when_request_host_is_cloud_hostname(): void
    {
        config([
            'services.google.redirect' => 'https://app.mutqin.ai/auth/google/callback',
        ]);

        $this->mockGoogleUser([
            'id' => 'google-cloud-1',
            'name' => 'Cloud User',
            'email' => 'cloud@example.com',
            'avatar' => 'https://example.com/cloud.png',
            'email_verified' => true,
        ], expectedRedirectUrl: 'https://app.mutqin.ai/auth/google/callback');

        $this->get('https://mutqin-abc.laravel.cloud/auth/google/callback')
            ->assertRedirect(route('memorisation'));

        $this->assertAuthenticated();
    }

    public function test_google_redirect_fails_clearly_when_client_id_missing(): void
    {
        config([
            'services.google.client_id' => '',
            'services.google.client_secret' => 'test-secret',
        ]);

        $this->get(route('auth.google.redirect'))
            ->assertRedirect(route('login'))
            ->assertSessionHasErrors('google');
    }

    public function test_google_redirect_fails_clearly_when_client_id_malformed(): void
    {
        config([
            'services.google.client_id' => 'not-a-real-client-id',
            'services.google.client_secret' => 'test-secret',
        ]);

        $this->get(route('auth.google.redirect'))
            ->assertRedirect(route('login'))
            ->assertSessionHasErrors('google');
    }

    public function test_short_google_redirect_route_redirects_to_the_provider(): void
    {
        $this->mockGoogleRedirect();

        $this->get('/auth/redirect')
            ->assertRedirect('https://accounts.google.com/o/oauth2/auth');
    }

    public function test_existing_google_user_is_logged_in_without_creating_a_duplicate(): void
    {
        $user = User::factory()->create([
            'email' => 'existing@example.com',
            'google_id' => 'google-123',
            'avatar' => 'https://example.com/old-avatar.png',
        ]);

        $this->mockGoogleUser([
            'id' => 'google-123',
            'name' => 'Existing User',
            'email' => 'existing@example.com',
            'avatar' => 'https://example.com/new-avatar.png',
            'email_verified' => true,
        ]);

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('memorisation'));

        $this->assertAuthenticatedAs($user->fresh());
        $this->assertSame(1, User::count());
        $this->assertSame('https://example.com/new-avatar.png', $user->fresh()->avatar);
    }

    public function test_google_callback_ignores_intended_progress_page(): void
    {
        $user = User::factory()->create([
            'email' => 'existing@example.com',
            'google_id' => 'google-123',
        ]);

        $this->mockGoogleUser([
            'id' => 'google-123',
            'name' => 'Existing User',
            'email' => 'existing@example.com',
            'avatar' => 'https://example.com/avatar.png',
            'email_verified' => true,
        ]);

        $this->withSession(['url.intended' => route('dashboard')])
            ->get(route('auth.google.callback'))
            ->assertRedirect(route('memorisation'));

        $this->assertAuthenticatedAs($user->fresh());
    }

    public function test_existing_google_user_with_stale_unverified_flag_is_verified_and_enters_app(): void
    {
        $user = User::factory()->unverified()->create([
            'email' => 'stale-google@example.com',
            'google_id' => 'google-stale-1',
            'password' => null,
            'password_set_at' => null,
        ]);

        $this->assertNull($user->email_verified_at);

        $this->mockGoogleUser([
            'id' => 'google-stale-1',
            'name' => 'Stale Google',
            'email' => 'stale-google@example.com',
            'avatar' => 'https://example.com/stale.png',
            'email_verified' => true,
        ]);

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('memorisation'));

        $fresh = $user->fresh();
        $this->assertAuthenticatedAs($fresh);
        $this->assertNotNull($fresh->email_verified_at);
        $this->get(route('memorisation'))->assertOk();
    }

    public function test_admin_google_user_is_redirected_to_memorisation(): void
    {
        config()->set('mutqin.admin_emails', ['admin@example.com']);

        $admin = User::factory()->admin()->create([
            'email' => 'admin@example.com',
            'google_id' => 'google-admin-1',
        ]);

        $this->mockGoogleUser([
            'id' => 'google-admin-1',
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'avatar' => 'https://example.com/admin.png',
            'email_verified' => true,
        ]);

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('memorisation'));

        $this->assertAuthenticatedAs($admin->fresh());
    }

    public function test_allowlisted_google_mailbox_is_created_as_permanent_admin(): void
    {
        config()->set('mutqin.admin_emails', ['menacer72@gmail.com']);

        $this->mockGoogleUser([
            'id' => 'google-primary-admin',
            'name' => 'Primary Admin',
            'email' => 'menacer72@gmail.com',
            'avatar' => 'https://example.com/admin.png',
            'email_verified' => true,
        ]);

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('memorisation'));

        $user = User::query()->where('email', 'menacer72@gmail.com')->first();
        $this->assertNotNull($user);
        $this->assertTrue($user->hasPersistedAdminRole());
        $this->assertTrue($user->isAdmin());
        $this->assertAuthenticatedAs($user);
    }

    public function test_allowlisted_google_sign_in_restores_missing_admin_flag(): void
    {
        config()->set('mutqin.admin_emails', ['menacer72@gmail.com']);

        $user = User::factory()->create([
            'email' => 'menacer72@gmail.com',
            'google_id' => 'google-primary-admin',
            'is_admin' => false,
            'email_verified_at' => now(),
        ]);

        $this->mockGoogleUser([
            'id' => 'google-primary-admin',
            'name' => 'Primary Admin',
            'email' => 'menacer72@gmail.com',
            'avatar' => 'https://example.com/admin.png',
            'email_verified' => true,
        ]);

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('memorisation'));

        $fresh = $user->fresh();
        $this->assertTrue($fresh->hasPersistedAdminRole());
        $this->assertTrue($fresh->isAdmin());
    }

    public function test_verified_local_account_is_not_auto_linked_by_email_alone(): void
    {
        $user = User::factory()->create([
            'email' => 'linked@example.com',
            'google_id' => null,
            'avatar' => null,
            'password' => Hash::make('local-password'),
            'password_set_at' => now(),
        ]);

        $this->mockGoogleUser([
            'id' => 'google-456',
            'name' => 'Linked User',
            'email' => 'linked@example.com',
            'avatar' => 'https://example.com/avatar.png',
            'email_verified' => true,
        ]);

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('login'))
            ->assertSessionHasErrors([
                'google' => GoogleSignInService::GENERIC_LINK_REQUIRED,
            ]);

        $this->assertGuest();
        $this->assertNull($user->fresh()->google_id);
        $this->assertTrue(Hash::check('local-password', $user->fresh()->password));
        $this->assertSame(1, User::count());
    }

    public function test_verified_local_account_can_explicitly_link_google_while_authenticated(): void
    {
        $user = User::factory()->create([
            'email' => 'owner@example.com',
            'google_id' => null,
            'password' => Hash::make('local-password'),
            'password_set_at' => now(),
        ]);

        $this->mockGoogleUser([
            'id' => 'google-explicit-1',
            'name' => 'Owner',
            'email' => 'owner@example.com',
            'avatar' => 'https://example.com/avatar.png',
            'email_verified' => true,
        ]);

        $this->actingAs($user)
            ->withSession(['google_link_intent' => true])
            ->get(route('auth.google.callback'))
            ->assertRedirect(route('profile.show'))
            ->assertSessionHas('profile_status');

        $fresh = $user->fresh();
        $this->assertAuthenticatedAs($fresh);
        $this->assertSame('google-explicit-1', $fresh->google_id);
        $this->assertTrue(Hash::check('local-password', $fresh->password));
        $this->assertSame(1, User::count());
    }

    public function test_attacker_preregister_unverified_email_does_not_block_victim_google_login(): void
    {
        $this->requireEmailVerification();

        $this->post(route('register'), [
            'name' => 'Attacker',
            'email' => 'victim@example.com',
            'password' => 'attacker-pass',
            'password_confirmation' => 'attacker-pass',
        ])->assertRedirect(route('verification.notice'));

        $squat = User::where('email', 'victim@example.com')->firstOrFail();
        $this->assertNull($squat->email_verified_at);
        $this->assertNull($squat->google_id);
        $this->assertTrue(Hash::check('attacker-pass', $squat->password));

        $this->post(route('logout'));

        $this->mockGoogleUser([
            'id' => 'google-victim-1',
            'name' => 'Real Victim',
            'email' => 'victim@example.com',
            'avatar' => 'https://example.com/victim.png',
            'email_verified' => true,
        ]);

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('memorisation'));

        $canonical = User::where('email', 'victim@example.com')->firstOrFail();
        $this->assertAuthenticatedAs($canonical);
        $this->assertSame('google-victim-1', $canonical->google_id);
        $this->assertNotNull($canonical->email_verified_at);
        $this->assertNull($canonical->getAttributes()['password'] ?? null);
        $this->assertNull($canonical->password_set_at);
        $this->assertFalse(Hash::check('attacker-pass', (string) $canonical->password));
        $this->assertSame(1, User::count());
        $this->assertSame($squat->id, $canonical->id);
    }

    public function test_unverified_local_collision_is_reclaimed_without_preserving_attacker_password(): void
    {
        $user = User::factory()->unverified()->create([
            'email' => 'unverified@example.com',
            'google_id' => null,
            'password' => Hash::make('attacker-secret'),
            'password_set_at' => now(),
        ]);

        $this->mockGoogleUser([
            'id' => 'google-unverified',
            'name' => 'Verified Google Owner',
            'email' => 'unverified@example.com',
            'avatar' => 'https://example.com/avatar.png',
            'email_verified' => true,
        ]);

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('memorisation'));

        $fresh = $user->fresh();
        $this->assertAuthenticatedAs($fresh);
        $this->assertSame('google-unverified', $fresh->google_id);
        $this->assertNotNull($fresh->email_verified_at);
        $this->assertNull($fresh->getAttributes()['password'] ?? null);
        $this->assertNull($fresh->password_set_at);
        $this->assertSame(1, User::count());
    }

    public function test_forged_or_unverified_google_email_is_rejected(): void
    {
        Log::spy();

        $this->mockGoogleUser([
            'id' => 'google-forged',
            'name' => 'Forged',
            'email' => 'forged@example.com',
            'avatar' => 'https://example.com/forged.png',
            'email_verified' => false,
        ]);

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('login'))
            ->assertSessionHasErrors([
                'google' => GoogleSignInService::GENERIC_FAILURE,
            ]);

        $this->assertGuest();
        $this->assertSame(0, User::count());
        Log::shouldHaveReceived('warning')
            ->withArgs(fn ($message) => is_string($message) && str_contains($message, 'google_oauth_unverified_email_rejected'))
            ->atLeast()
            ->once();
    }

    public function test_missing_google_email_verified_claim_is_rejected(): void
    {
        $this->mockGoogleUser([
            'id' => 'google-missing-claim',
            'name' => 'No Claim',
            'email' => 'noclaim@example.com',
            'avatar' => 'https://example.com/x.png',
        ], includeEmailVerified: false);

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('login'))
            ->assertSessionHasErrors('google');

        $this->assertGuest();
        $this->assertSame(0, User::count());
    }

    public function test_duplicate_google_callback_logs_into_same_canonical_account(): void
    {
        $this->mockGoogleUser([
            'id' => 'google-dup',
            'name' => 'Dup User',
            'email' => 'dup@example.com',
            'avatar' => 'https://example.com/dup.png',
            'email_verified' => true,
        ]);

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('memorisation'));

        $user = User::where('google_id', 'google-dup')->firstOrFail();
        $this->assertSame(1, User::count());
        $this->assertSame('light-mode', $user->theme);

        $this->post(route('logout'));
        $this->assertGuest();

        $this->mockGoogleUser([
            'id' => 'google-dup',
            'name' => 'Dup User',
            'email' => 'dup@example.com',
            'avatar' => 'https://example.com/dup.png',
            'email_verified' => true,
        ]);

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('memorisation'));

        $this->assertAuthenticatedAs($user->fresh());
        $this->assertSame(1, User::count());
    }

    public function test_changed_google_email_updates_when_address_is_free(): void
    {
        $user = User::factory()->create([
            'email' => 'old@example.com',
            'google_id' => 'google-email-change',
        ]);

        $this->mockGoogleUser([
            'id' => 'google-email-change',
            'name' => 'Renamed',
            'email' => 'new@example.com',
            'avatar' => 'https://example.com/new.png',
            'email_verified' => true,
        ]);

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('memorisation'));

        $fresh = $user->fresh();
        $this->assertAuthenticatedAs($fresh);
        $this->assertSame('new@example.com', $fresh->email);
        $this->assertNotNull($fresh->email_verified_at);
        $this->assertSame(1, User::count());
    }

    public function test_changed_google_email_does_not_steal_another_accounts_address(): void
    {
        $googleUser = User::factory()->create([
            'email' => 'google-owner@example.com',
            'google_id' => 'google-conflict',
        ]);

        $other = User::factory()->create([
            'email' => 'taken@example.com',
            'google_id' => null,
            'password' => Hash::make('other-password'),
        ]);

        $this->mockGoogleUser([
            'id' => 'google-conflict',
            'name' => 'Google Owner',
            'email' => 'taken@example.com',
            'avatar' => 'https://example.com/x.png',
            'email_verified' => true,
        ]);

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('memorisation'));

        $this->assertAuthenticatedAs($googleUser->fresh());
        $this->assertSame('google-owner@example.com', $googleUser->fresh()->email);
        $this->assertSame('taken@example.com', $other->fresh()->email);
        $this->assertNull($other->fresh()->google_id);
        $this->assertTrue(Hash::check('other-password', $other->fresh()->password));
        $this->assertSame(2, User::count());
    }

    public function test_new_google_user_is_created_and_logged_in(): void
    {
        $this->mockGoogleUser([
            'id' => 'google-789',
            'name' => 'New User',
            'email' => 'new@example.com',
            'avatar' => 'https://example.com/new-user.png',
            'email_verified' => true,
        ]);

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('memorisation'));

        $user = User::where('email', 'new@example.com')->first();

        $this->assertNotNull($user);
        $this->assertSame('google-789', $user->google_id);
        $this->assertSame('https://example.com/new-user.png', $user->avatar);
        $this->assertNotNull($user->email_verified_at);
        $this->assertNull($user->getAttributes()['password'] ?? null);
        $this->assertNull($user->password_set_at);
        $this->assertFalse($user->hasSetPassword());
        $this->assertAuthenticatedAs($user);
        $this->assertSame(1, User::count());
    }

    public function test_short_google_callback_route_signs_the_user_in(): void
    {
        $this->mockGoogleUser([
            'id' => 'google-999',
            'name' => 'Legacy Callback User',
            'email' => 'legacy@example.com',
            'avatar' => 'https://example.com/legacy-user.png',
            'email_verified' => true,
        ]);

        $this->get('/auth/callback')
            ->assertRedirect(route('memorisation'));

        $user = User::where('email', 'legacy@example.com')->first();

        $this->assertNotNull($user);
        $this->assertSame('google-999', $user->google_id);
        $this->assertAuthenticatedAs($user);
    }

    public function test_password_reset_still_works_for_verified_local_accounts_after_collision_block(): void
    {
        $user = User::factory()->create([
            'email' => 'reset-me@example.com',
            'google_id' => null,
        ]);

        $this->mockGoogleUser([
            'id' => 'google-reset-collision',
            'name' => 'Reset Me',
            'email' => 'reset-me@example.com',
            'avatar' => 'https://example.com/x.png',
            'email_verified' => true,
        ]);

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('login'))
            ->assertSessionHasErrors('google');

        $this->assertNull($user->fresh()->google_id);

        $token = Password::broker()->createToken($user);

        $this->post(route('password.update'), [
            'token' => $token,
            'email' => $user->email,
            'password' => 'brand-new-password',
            'password_confirmation' => 'brand-new-password',
        ])->assertRedirect('/memorisation');

        $this->assertTrue(Hash::check('brand-new-password', $user->fresh()->password));
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function mockGoogleUser(array $attributes, bool $includeEmailVerified = true, ?string $expectedRedirectUrl = null): void
    {
        if ($includeEmailVerified && ! array_key_exists('email_verified', $attributes)) {
            $attributes['email_verified'] = true;
        }

        if (! $includeEmailVerified) {
            unset($attributes['email_verified'], $attributes['verified_email']);
        }

        $map = [
            'id' => $attributes['id'],
            'nickname' => $attributes['nickname'] ?? null,
            'name' => $attributes['name'] ?? null,
            'email' => $attributes['email'] ?? null,
            'avatar' => $attributes['avatar'] ?? null,
        ];

        $provider = Mockery::mock();
        $provider->shouldReceive('redirectUrl')
            ->once()
            ->with($expectedRedirectUrl ?? $this->expectedGoogleRedirectUrl())
            ->andReturnSelf();
        $provider->shouldReceive('stateless')
            ->once()
            ->andReturnSelf();
        $provider->shouldReceive('user')
            ->once()
            ->andReturn(
                (new SocialiteUser)->map($map)->setRaw($attributes)
            );

        Socialite::shouldReceive('driver')
            ->once()
            ->with('google')
            ->andReturn($provider);
    }

    private function mockGoogleRedirect(?string $expectedRedirectUrl = null): void
    {
        $provider = Mockery::mock();
        $provider->shouldReceive('redirectUrl')
            ->once()
            ->with($expectedRedirectUrl ?? $this->expectedGoogleRedirectUrl())
            ->andReturnSelf();
        $provider->shouldReceive('stateless')
            ->once()
            ->andReturnSelf();
        $provider->shouldReceive('redirect')
            ->once()
            ->andReturn(redirect('https://accounts.google.com/o/oauth2/auth'));

        Socialite::shouldReceive('driver')
            ->once()
            ->with('google')
            ->andReturn($provider);
    }

    private function expectedGoogleRedirectUrl(): string
    {
        return route('auth.google.callback');
    }
}

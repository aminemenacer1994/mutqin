<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\TestCase;

class OnboardingTriggerTest extends TestCase
{
    use RefreshDatabase;

    public function test_email_registration_flashes_just_registered_into_memorisation_auth(): void
    {
        $response = $this->post(route('register'), [
            'name' => 'New Student',
            'email' => 'new-student@example.com',
            'password' => 'secret12',
            'password_confirmation' => 'secret12',
        ]);

        $response->assertRedirect('/memorisation');
        $this->assertAuthenticated();

        $page = $this->get(route('memorisation'));
        $page->assertOk();
        $page->assertSee('just_registered":true', false);
        $page->assertDontSee('just_logged_in":true', false);
    }

    public function test_existing_user_login_flashes_just_logged_in_not_registered(): void
    {
        $user = User::factory()->create([
            'email' => 'returning@example.com',
            'password' => bcrypt('secret12'),
        ]);

        $this->post(route('login'), [
            'email' => 'returning@example.com',
            'password' => 'secret12',
        ])->assertRedirect('/memorisation');

        $page = $this->get(route('memorisation'));
        $page->assertOk();
        $page->assertSee('just_logged_in":true', false);
        $page->assertDontSee('just_registered":true', false);
    }

    public function test_new_google_user_flashes_just_registered(): void
    {
        config([
            'services.google.client_id' => 'test-client.apps.googleusercontent.com',
            'services.google.client_secret' => 'test-secret',
            'services.google.redirect' => route('auth.google.callback'),
        ]);

        $this->mockGoogleUser([
            'id' => 'google-onboarding-1',
            'name' => 'Google Newbie',
            'email' => 'google-newbie@example.com',
            'avatar' => 'https://example.com/avatar.png',
        ]);

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('memorisation'));

        $page = $this->get(route('memorisation'));
        $page->assertOk();
        $page->assertSee('just_registered":true', false);
        $page->assertDontSee('just_logged_in":true', false);
    }

    public function test_email_registration_clears_stale_just_logged_in_flash(): void
    {
        $this->withSession(['mutqin_just_logged_in' => true])
            ->post(route('register'), [
                'name' => 'Fresh Student',
                'email' => 'fresh-student@example.com',
                'password' => 'secret12',
                'password_confirmation' => 'secret12',
            ])
            ->assertRedirect('/memorisation');

        $page = $this->get(route('memorisation'));
        $page->assertOk();
        $page->assertSee('just_registered":true', false);
        $page->assertDontSee('just_logged_in":true', false);
    }

    private function mockGoogleUser(array $attributes): void
    {
        $socialiteUser = (new SocialiteUser)->map([
            'id' => $attributes['id'],
            'nickname' => null,
            'name' => $attributes['name'],
            'email' => $attributes['email'],
            'avatar' => $attributes['avatar'],
        ]);

        $provider = Mockery::mock();
        $provider->shouldReceive('redirectUrl')->andReturnSelf();
        $provider->shouldReceive('stateless')->andReturnSelf();
        $provider->shouldReceive('user')->andReturn($socialiteUser);

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
    }
}

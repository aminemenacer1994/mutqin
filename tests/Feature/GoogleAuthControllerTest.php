<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\TestCase;

class GoogleAuthControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_google_redirect_route_redirects_to_the_provider(): void
    {
        $this->mockGoogleRedirect();

        $this->get(route('auth.google.redirect'))
            ->assertRedirect('https://accounts.google.com/o/oauth2/auth');
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
        ]);

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('memorisation'));

        $this->assertAuthenticatedAs($user->fresh());
        $this->assertSame(1, User::count());
        $this->assertSame('https://example.com/new-avatar.png', $user->fresh()->avatar);
    }

    public function test_existing_email_user_is_linked_to_google_on_callback(): void
    {
        $user = User::factory()->create([
            'email' => 'linked@example.com',
            'google_id' => null,
            'avatar' => null,
        ]);

        $this->mockGoogleUser([
            'id' => 'google-456',
            'name' => 'Linked User',
            'email' => 'linked@example.com',
            'avatar' => 'https://example.com/avatar.png',
        ]);

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('memorisation'));

        $this->assertAuthenticatedAs($user->fresh());
        $this->assertSame('google-456', $user->fresh()->google_id);
        $this->assertSame('https://example.com/avatar.png', $user->fresh()->avatar);
        $this->assertSame(1, User::count());
    }

    public function test_new_google_user_is_created_and_logged_in(): void
    {
        $this->mockGoogleUser([
            'id' => 'google-789',
            'name' => 'New User',
            'email' => 'new@example.com',
            'avatar' => 'https://example.com/new-user.png',
        ]);

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('memorisation'));

        $user = User::where('email', 'new@example.com')->first();

        $this->assertNotNull($user);
        $this->assertSame('google-789', $user->google_id);
        $this->assertSame('https://example.com/new-user.png', $user->avatar);
        $this->assertNotEmpty($user->password);
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
        ]);

        $this->get('/auth/callback')
            ->assertRedirect(route('memorisation'));

        $user = User::where('email', 'legacy@example.com')->first();

        $this->assertNotNull($user);
        $this->assertSame('google-999', $user->google_id);
        $this->assertAuthenticatedAs($user);
    }

    private function mockGoogleUser(array $attributes): void
    {
        $provider = Mockery::mock();
        $provider->shouldReceive('redirectUrl')
            ->once()
            ->with(route('auth.google.callback'))
            ->andReturnSelf();
        $provider->shouldReceive('stateless')
            ->once()
            ->andReturnSelf();
        $provider->shouldReceive('user')
            ->once()
            ->andReturn(
                (new SocialiteUser())->map($attributes)->setRaw($attributes)
            );

        Socialite::shouldReceive('driver')
            ->once()
            ->with('google')
            ->andReturn($provider);
    }

    private function mockGoogleRedirect(): void
    {
        $provider = Mockery::mock();
        $provider->shouldReceive('redirectUrl')
            ->once()
            ->with(route('auth.google.callback'))
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
}

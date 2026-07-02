<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MemorisationRoutingTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_root_still_shows_the_landing_page(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('homepage');
    }

    public function test_authenticated_users_are_sent_to_memorisation_from_root(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/')
            ->assertRedirect(route('memorisation'));
    }

    public function test_authenticated_users_visiting_guest_auth_pages_redirect_to_memorisation(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('login'))
            ->assertRedirect(route('memorisation'));
    }

    public function test_logout_returns_to_memorisation_workspace(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('logout'))
            ->assertRedirect(route('memorisation'));

        $this->assertGuest();
    }

    public function test_failed_login_from_memorisation_returns_back_to_memorisation(): void
    {
        $this->from(route('memorisation'))
            ->post(route('login'), [
                'email' => 'missing@example.com',
                'password' => 'wrong-password',
            ])
            ->assertRedirect(route('memorisation'));
    }

    public function test_legacy_home_route_redirects_to_memorisation(): void
    {
        $this->get('/home')->assertRedirect(route('memorisation'));
    }
}

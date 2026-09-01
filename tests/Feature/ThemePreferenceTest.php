<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ThemePreferenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_defaults_to_sepia_theme(): void
    {
        $this->get(route('home'))
            ->assertOk()
            ->assertSee('data-theme="sepia"', false)
            ->assertCookie('mutqin_theme', 'sepia-mode');
    }

    public function test_authenticated_user_theme_overrides_cookie(): void
    {
        $user = User::factory()->create([
            'theme' => 'dark-mode',
        ]);

        $this->actingAs($user)
            ->withCookie('mutqin_theme', 'light-mode')
            ->get(route('home'))
            ->assertOk()
            ->assertSee('data-theme="dark"', false)
            ->assertCookie('mutqin_theme', 'dark-mode');
    }

    public function test_user_can_persist_personal_theme_preference(): void
    {
        $user = User::factory()->create([
            'theme' => null,
        ]);

        $this->actingAs($user)
            ->patchJson(route('api.profile.theme'), [
                'theme' => 'light',
            ])
            ->assertOk()
            ->assertJson(['theme' => 'light-mode']);

        $this->assertSame('light-mode', $user->fresh()->theme);

        $this->actingAs($user)
            ->get(route('home'))
            ->assertOk()
            ->assertSee('data-theme="light"', false);
    }

    public function test_each_user_keeps_their_own_theme(): void
    {
        $sepiaUser = User::factory()->create(['theme' => 'sepia-mode']);
        $darkUser = User::factory()->create(['theme' => 'dark-mode']);

        $this->actingAs($sepiaUser)
            ->get(route('home'))
            ->assertOk()
            ->assertSee('data-theme="sepia"', false);

        $this->actingAs($darkUser)
            ->get(route('home'))
            ->assertOk()
            ->assertSee('data-theme="dark"', false);
    }
}

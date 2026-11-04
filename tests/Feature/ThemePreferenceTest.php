<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ThemePreferenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_without_local_storage_renders_light_default(): void
    {
        $this->withUnencryptedCookie('mutqin_theme', 'dark-mode')
            ->withSession(['mutqin_theme' => 'dark-mode'])
            ->get(route('home'))
            ->assertOk()
            ->assertSee('data-theme="light"', false)
            ->assertSee("storagePrefix = 'mutqin:theme'", false);
    }

    public function test_registration_persists_light_theme_as_default(): void
    {
        $response = $this->post(route('register'), [
            'name' => 'New Learner',
            'email' => 'new-learner@example.com',
            'password' => 'secret12',
            'password_confirmation' => 'secret12',
        ])->assertRedirect(route('memorisation'));

        $user = User::where('email', 'new-learner@example.com')->firstOrFail();
        $this->assertSame('light', $user->theme);
        $this->assertSame('light', session('mutqin_theme'));
        $response->assertCookie('mutqin_theme', 'light', false);

        $this->get(route('home'))
            ->assertOk()
            ->assertSee('data-theme="light"', false);

        $this->get(route('memorisation'))
            ->assertOk()
            ->assertSee('data-theme="light"', false);
    }

    public function test_login_persists_light_when_account_has_no_theme(): void
    {
        $user = User::factory()->create([
            'email' => 'plain@example.com',
            'password' => bcrypt('secret12'),
            'theme' => null,
        ]);

        $this->post(route('login'), [
            'email' => 'plain@example.com',
            'password' => 'secret12',
        ])->assertRedirect(route('memorisation'));

        $this->assertSame('light', $user->fresh()->theme);
    }

    public function test_authenticated_user_theme_overrides_cookie(): void
    {
        $user = User::factory()->create([
            'theme' => 'dark',
        ]);

        $this->actingAs($user)
            ->withCookie('mutqin_theme', 'light')
            ->get(route('home'))
            ->assertOk()
            ->assertSee('data-theme="dark"', false)
            ->assertSee('window.mutqinAccountTheme = "dark"', false)
            ->assertCookie('mutqin_theme', 'dark', false);
    }

    public function test_colour_mode_dropdown_lists_light_and_dark_only(): void
    {
        $html = $this->get(route('home'))
            ->assertOk()
            ->assertSee('id="globalThemeToggle"', false)
            ->assertSee('id="globalThemeMenu"', false)
            ->assertSee('data-theme-id="light"', false)
            ->assertSee('data-theme-id="dark"', false)
            ->assertSee('data-theme-id="sepia"', false)
            ->assertSee(__('ui.theme_switcher'), false)
            ->getContent();

        $this->assertStringNotContainsString('data-theme-id="night"', $html);
        $this->assertSame(1, substr_count($html, 'data-theme-id="light"'));
        $this->assertSame(1, substr_count($html, 'data-theme-id="dark"'));
    }

    public function test_user_can_persist_dark_theme_preference(): void
    {
        $user = User::factory()->create([
            'theme' => null,
        ]);

        $this->actingAs($user)
            ->patchJson(route('api.profile.theme'), [
                'theme' => 'dark',
            ])
            ->assertOk()
            ->assertJson(['theme' => 'dark']);

        $this->assertSame('dark', $user->fresh()->theme);

        $this->actingAs($user)
            ->get(route('home'))
            ->assertOk()
            ->assertSee('data-theme="dark"', false);
    }

    public function test_user_can_persist_light_theme_preference(): void
    {
        $user = User::factory()->create([
            'theme' => null,
        ]);

        $this->actingAs($user)
            ->patchJson(route('api.profile.theme'), [
                'theme' => 'light',
            ])
            ->assertOk()
            ->assertJson(['theme' => 'light']);

        $this->assertSame('light', $user->fresh()->theme);

        $this->actingAs($user)
            ->get(route('home'))
            ->assertOk()
            ->assertSee('data-theme="light"', false);
    }

    public function test_legacy_sepia_input_normalizes_to_light(): void
    {
        $user = User::factory()->create(['theme' => 'light']);

        $this->actingAs($user)
            ->patchJson(route('api.profile.theme'), [
                'theme' => 'sepia-mode',
            ])
            ->assertOk()
            ->assertJson(['theme' => 'sepia']);

        $this->assertSame('sepia', $user->fresh()->theme);
    }

    public function test_updating_one_user_theme_does_not_change_another(): void
    {
        $lightUser = User::factory()->create(['theme' => 'light']);
        $darkUser = User::factory()->create(['theme' => 'dark']);

        $this->actingAs($lightUser)
            ->patchJson(route('api.profile.theme'), [
                'theme' => 'dark',
            ])
            ->assertOk()
            ->assertJson(['theme' => 'dark']);

        $this->assertSame('dark', $lightUser->fresh()->theme);
        $this->assertSame('dark', $darkUser->fresh()->theme);

        $this->actingAs($darkUser)
            ->get(route('home'))
            ->assertOk()
            ->assertSee('data-theme="dark"', false);
    }

    public function test_each_user_keeps_their_own_theme(): void
    {
        $lightUser = User::factory()->create(['theme' => 'light']);
        $darkUser = User::factory()->create(['theme' => 'dark']);

        $this->actingAs($lightUser)
            ->get(route('home'))
            ->assertOk()
            ->assertSee('data-theme="light"', false);

        $this->actingAs($darkUser)
            ->get(route('home'))
            ->assertOk()
            ->assertSee('data-theme="dark"', false);
    }

    public function test_authenticated_user_without_saved_theme_does_not_inherit_shared_cookie(): void
    {
        $user = User::factory()->create([
            'theme' => null,
        ]);

        $this->actingAs($user)
            ->withCookie('mutqin_theme', 'dark')
            ->withSession(['mutqin_theme' => 'dark'])
            ->get(route('home'))
            ->assertOk()
            ->assertSee('data-theme="light"', false)
            ->assertSee('window.mutqinAccountTheme = null', false);
    }

    public function test_profile_theme_show_returns_saved_theme(): void
    {
        $user = User::factory()->create(['theme' => 'dark']);

        $this->actingAs($user)
            ->getJson(route('api.profile.theme.show'))
            ->assertOk()
            ->assertJson(['theme' => 'dark']);
    }

    public function test_memorisation_auth_payload_includes_theme(): void
    {
        $user = User::factory()->create(['theme' => 'dark']);

        $this->actingAs($user)
            ->get(route('memorisation'))
            ->assertOk()
            ->assertSee('"theme":"dark"', false);
    }

    public function test_api_requests_do_not_refresh_theme_cookie(): void
    {
        $user = User::factory()->create(['theme' => 'light']);

        $this->actingAs($user)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertCookieMissing('mutqin_theme');
    }

    public function test_colour_mode_survives_logout_login_and_memorisation_reload(): void
    {
        $user = User::factory()->create([
            'email' => 'light-learner@example.com',
            'password' => bcrypt('secret12'),
            'theme' => 'light',
        ]);

        $this->actingAs($user)
            ->get(route('memorisation'))
            ->assertOk()
            ->assertSee('data-theme="light"', false)
            ->assertSee('window.mutqinInitialTheme = "light"', false);

        $this->actingAs($user)
            ->post(route('logout'))
            ->assertRedirect(route('login'));

        $this->assertSame('light', $user->fresh()->theme);

        $this->post(route('login'), [
            'email' => 'light-learner@example.com',
            'password' => 'secret12',
        ])->assertRedirect(route('memorisation'));

        $this->assertSame('light', $user->fresh()->theme);

        $this->actingAs($user->fresh())
            ->get(route('memorisation'))
            ->assertOk()
            ->assertSee('data-theme="light"', false)
            ->assertSee('window.mutqinInitialTheme = "light"', false);
    }

    public function test_logout_resets_shared_theme_cookie_to_light_default(): void
    {
        $user = User::factory()->create([
            'theme' => 'dark',
        ]);

        $this->actingAs($user)
            ->withCookie('mutqin_theme', 'dark')
            ->post(route('logout'))
            ->assertRedirect(route('login'))
            ->assertCookie('mutqin_theme', 'light', false);
    }
}

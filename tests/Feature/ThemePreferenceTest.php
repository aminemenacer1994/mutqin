<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ThemePreferenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_defaults_to_light_theme(): void
    {
        $this->get(route('home'))
            ->assertOk()
            ->assertSee('data-theme="light"', false)
            ->assertCookie('mutqin_theme', 'light-mode');
    }

    public function test_registration_persists_light_theme_as_default(): void
    {
        $this->post(route('register'), [
            'name' => 'New Learner',
            'email' => 'new-learner@example.com',
            'password' => 'secret12',
            'password_confirmation' => 'secret12',
        ])->assertRedirect(route('memorisation'));

        $user = User::where('email', 'new-learner@example.com')->firstOrFail();
        $this->assertSame('light-mode', $user->theme);

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

        $this->assertSame('light-mode', $user->fresh()->theme);
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

    public function test_colour_mode_dropdown_lists_existing_themes_only(): void
    {
        $html = $this->get(route('home'))
            ->assertOk()
            ->assertSee('id="globalThemeToggle"', false)
            ->assertSee('id="globalThemeMenu"', false)
            ->assertSee('data-theme-id="light"', false)
            ->assertSee('data-theme-id="sepia"', false)
            ->assertSee('data-theme-id="dark"', false)
            ->assertSee(__('ui.theme_switcher'), false)
            ->getContent();

        $this->assertStringNotContainsString('data-theme-id="night"', $html);
        $this->assertStringNotContainsString('data-theme-id="contrast"', $html);
        $this->assertStringNotContainsString('cycleTheme', $html);
        $this->assertSame(1, substr_count($html, 'data-theme-id="light"'));
        $this->assertSame(1, substr_count($html, 'data-theme-id="sepia"'));
        $this->assertSame(1, substr_count($html, 'data-theme-id="dark"'));
    }

    public function test_user_can_persist_sepia_theme_preference(): void
    {
        $user = User::factory()->create([
            'theme' => null,
        ]);

        $this->actingAs($user)
            ->patchJson(route('api.profile.theme'), [
                'theme' => 'sepia',
            ])
            ->assertOk()
            ->assertJson(['theme' => 'sepia-mode']);

        $this->assertSame('sepia-mode', $user->fresh()->theme);

        $this->actingAs($user)
            ->get(route('home'))
            ->assertOk()
            ->assertSee('data-theme="sepia"', false)
            ->assertSee('data-theme-id="sepia"', false);
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

    public function test_authenticated_user_without_saved_theme_does_not_inherit_shared_cookie(): void
    {
        $user = User::factory()->create([
            'theme' => null,
        ]);

        $this->actingAs($user)
            ->withCookie('mutqin_theme', 'dark-mode')
            ->withSession(['mutqin_theme' => 'dark-mode'])
            ->get(route('home'))
            ->assertOk()
            ->assertSee('data-theme="light"', false)
            ->assertCookie('mutqin_theme', 'light-mode');
    }

    public function test_logout_resets_shared_theme_cookie_to_light(): void
    {
        $user = User::factory()->create([
            'theme' => 'dark-mode',
        ]);

        $this->actingAs($user)
            ->withCookie('mutqin_theme', 'dark-mode')
            ->post(route('logout'))
            ->assertRedirect(route('memorisation'))
            ->assertCookie('mutqin_theme', 'light-mode');
    }
}

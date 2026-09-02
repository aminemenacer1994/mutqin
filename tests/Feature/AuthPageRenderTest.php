<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

class AuthPageRenderTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_memorisation_demo_is_public(): void
    {
        $this->get(route('memorisation.demo'))
            ->assertOk()
            ->assertSee('<memorisation', false);
    }

    public function test_guest_memorisation_workspace_still_requires_login(): void
    {
        $this->get(route('memorisation'))
            ->assertRedirect(route('login'));
    }

    public function test_login_page_renders_the_dedicated_login_form(): void
    {
        $this->get(route('login'))
            ->assertOk()
            ->assertSee(__('ui.login'))
            ->assertSee(__('ui.continue_google'))
            ->assertSee(__('ui.email_address'))
            ->assertSee(__('ui.auth_demo_title'))
            ->assertSee(__('ui.auth_demo_use'))
            ->assertSee(route('login.demo'), false);
    }

    public function test_login_page_shows_single_demo_login_when_enabled(): void
    {
        config(['app.show_demo_accounts' => true]);

        $this->get(route('login'))
            ->assertOk()
            ->assertSee(__('ui.auth_demo_title'))
            ->assertSee(__('ui.auth_demo_use'))
            ->assertSee(route('login.demo'), false)
            ->assertDontSee('omar.active@mutqin.test', false)
            ->assertDontSee('fatima.reviser@mutqin.test', false)
            ->assertDontSee('noah.paused@mutqin.test', false);
    }

    public function test_demo_login_creates_account_and_signs_in_when_enabled(): void
    {
        config(['app.show_demo_accounts' => true]);

        $this->post(route('login.demo'))
            ->assertRedirect('/memorisation');

        $this->assertAuthenticated();
        $this->assertDatabaseHas('users', [
            'email' => 'layla.beginner@mutqin.test',
        ]);

        $user = \App\Models\User::where('email', 'layla.beginner@mutqin.test')->firstOrFail();
        $this->assertNotNull($user->email_verified_at);
        $this->get(route('memorisation'))->assertOk();
    }

    public function test_demo_login_verifies_stale_unverified_demo_account(): void
    {
        config(['app.show_demo_accounts' => true]);

        \App\Models\User::factory()->unverified()->create([
            'email' => 'layla.beginner@mutqin.test',
            'name' => 'Stale Demo',
            'password' => bcrypt('old-pass'),
            'password_set_at' => now(),
        ]);

        $this->post(route('login.demo'))
            ->assertRedirect('/memorisation');

        $user = \App\Models\User::where('email', 'layla.beginner@mutqin.test')->firstOrFail();
        $this->assertNotNull($user->email_verified_at);
        $this->get(route('memorisation'))->assertOk();
    }

    public function test_demo_login_is_unavailable_when_disabled(): void
    {
        config(['app.show_demo_accounts' => false]);

        $this->post(route('login.demo'))
            ->assertNotFound();

        $this->assertGuest();
    }

    public function test_memorisation_exposes_tester_guide_flag_when_demo_accounts_enabled(): void
    {
        config(['app.show_demo_accounts' => true]);

        $user = \App\Models\User::factory()->create();

        $this->actingAs($user)
            ->get(route('memorisation'))
            ->assertOk()
            ->assertSee('show_tester_guide":true', false)
            ->assertSee('dashboard_url', false);
    }

    public function test_register_page_renders_localised_auth_copy(): void
    {
        $this->get(route('register'))
            ->assertOk()
            ->assertSee(__('ui.auth_register_heading'))
            ->assertSee(__('ui.continue_google'))
            ->assertSee(__('ui.create_account'));
    }

    public function test_verify_page_uses_ui_locale_keys(): void
    {
        $this->get(route('verification.notice'))
            ->assertRedirect(route('login'));

        $verifySource = file_get_contents(resource_path('views/auth/verify.blade.php'));
        $this->assertStringContainsString("__('ui.verify_title')", $verifySource);
        $this->assertStringContainsString("__('ui.verify_subtitle')", $verifySource);
        $this->assertStringContainsString("__('ui.verify_resend_button')", $verifySource);
        $this->assertStringContainsString('auth-link', $verifySource);
        $this->assertStringNotContainsString('btn-link', $verifySource);

        $confirmSource = file_get_contents(resource_path('views/auth/passwords/confirm.blade.php'));
        $this->assertStringContainsString("__('ui.confirm_password')", $confirmSource);
        $this->assertStringContainsString("__('ui.password')", $confirmSource);
        $this->assertStringNotContainsString("__('Confirm Password')", $confirmSource);
        $this->assertStringNotContainsString("__('Password')", $confirmSource);
    }

    public function test_login_page_localises_for_arabic(): void
    {
        $this->get(route('login', ['lang' => 'ar']))
            ->assertOk()
            ->assertSee(__('ui.login', [], 'ar'))
            ->assertSee(__('ui.continue_google', [], 'ar'))
            ->assertSee(__('ui.email_address', [], 'ar'));
    }

    public function test_auth_locale_keys_exist_across_supported_languages(): void
    {
        $required = [
            'auth_register_heading',
            'auth_sign_in',
            'auth_demo_title',
            'auth_demo_use',
            'tester_guide_title',
            'tester_guide_dismiss',
            'show_password',
            'hide_password',
            'mutqin_home',
            'verify_title',
            'verify_message',
            'verify_resent',
            'verify_resend_button',
            'confirm_password',
        ];

        foreach (['en', 'ar', 'fr', 'es', 'tr', 'id', 'ur'] as $locale) {
            App::setLocale($locale);
            foreach ($required as $key) {
                $value = __("ui.{$key}");
                $this->assertNotSame("ui.{$key}", $value, "Missing ui.{$key} for {$locale}");
                $this->assertNotSame('', trim((string) $value), "Empty ui.{$key} for {$locale}");
            }
        }
    }
}

<?php

namespace Tests\Feature;

use App\Support\Theme;
use Tests\TestCase;

class ThemeConsistencyTest extends TestCase
{
    public function test_light_theme_homepage_renders_html_data_theme_light(): void
    {
        $this->withSession(['mutqin_theme' => 'light-mode'])
            ->get(route('home'))
            ->assertOk()
            ->assertSee('data-theme="light"', false);
    }

    public function test_light_theme_homepage_inline_styles_do_not_fork_palette(): void
    {
        $response = $this->withCookie(Theme::COOKIE, Theme::DEFAULT_PREFERENCE)
            ->withCookie(Theme::CHOSEN_COOKIE, '1')
            ->withSession(['mutqin_theme' => 'light-mode'])
            ->get(route('home'));

        $response->assertOk();
        $html = $response->getContent();
        $this->assertIsString($html);
        $this->assertStringNotContainsString('--accent: #a0784c', $html);
        $this->assertStringNotContainsString('--text: #1a2e24', $html);
        $this->assertStringNotContainsString('Theme Variables - NO SHADOWS', $html);
    }

    public function test_memorisation_demo_does_not_ship_cream_root_hotfix(): void
    {
        $html = (string) $this->withSession(['mutqin_theme' => 'light-mode'])
            ->get(route('memorisation.demo'))
            ->assertOk()
            ->getContent();

        $this->assertStringNotContainsString('--zone-chrome-cream: #f0e9de', $html);
        $this->assertStringContainsString('class="memorisation-page', $html);
        $this->assertStringContainsString('html[data-theme="light"] body.memorisation-page', $html);
        $this->assertStringContainsString('--zone-chrome-cream: var(--bg)', $html);
    }
}

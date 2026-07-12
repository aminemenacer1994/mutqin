<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthPageRenderTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_memorisation_page_redirects_to_login(): void
    {
        $this->get(route('memorisation'))
            ->assertRedirect(route('login'));
    }

    public function test_login_page_renders_the_dedicated_login_form(): void
    {
        $this->get(route('login'))
            ->assertOk()
            ->assertSee('Login')
            ->assertSee('Continue with Google')
            ->assertSee('Email Address');
    }

    public function test_register_page_renders_the_updated_memorisation_focused_layout(): void
    {
        $this->get(route('register'))
            ->assertOk()
            ->assertSee('Memorisation workspace')
            ->assertSee('Continue with Google');
    }
}

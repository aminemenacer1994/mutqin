<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class SettingsPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_settings_page_is_removed(): void
    {
        $this->assertFalse(Route::has('settings.show'));

        $this->get('/settings')->assertNotFound();

        $user = User::factory()->create();
        $this->actingAs($user)
            ->get('/settings')
            ->assertNotFound();
    }
}

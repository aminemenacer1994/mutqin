<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_update_name_and_email(): void
    {
        $user = User::factory()->create([
            'name' => 'Old Name',
            'email' => 'keep@example.com',
        ]);

        $this->actingAs($user)
            ->put(route('profile.update'), [
                'name' => 'New Name',
                'email' => 'changed@example.com',
            ])
            ->assertRedirect();

        $user->refresh();

        $this->assertSame('New Name', $user->name);
        $this->assertSame('changed@example.com', $user->email);
    }

    public function test_learner_can_delete_account_with_confirmation(): void
    {
        $user = User::factory()->create([
            'email' => 'learner@example.com',
        ]);

        $this->actingAs($user)
            ->delete(route('profile.destroy'), [
                'confirmation' => 'DELETE',
            ])
            ->assertRedirect(route('home'));

        $this->assertGuest();
        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }

    public function test_learner_can_delete_account_by_typing_email(): void
    {
        $user = User::factory()->create([
            'email' => 'learner@example.com',
        ]);

        $this->actingAs($user)
            ->delete(route('profile.destroy'), [
                'confirmation' => 'Learner@Example.com',
            ])
            ->assertRedirect(route('home'));

        $this->assertGuest();
        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }

    public function test_admin_cannot_delete_own_account_from_profile(): void
    {
        config(['mutqin.admin_emails' => ['admin@example.com']]);

        $user = User::factory()->create([
            'email' => 'admin@example.com',
        ]);

        $this->actingAs($user)
            ->delete(route('profile.destroy'), [
                'confirmation' => 'DELETE',
            ])
            ->assertRedirect()
            ->assertSessionHas('billing_error');

        $this->assertDatabaseHas('users', ['id' => $user->id]);
    }

    public function test_admin_profile_shows_org_copy_and_badge(): void
    {
        config(['mutqin.admin_emails' => ['admin@example.com']]);

        $user = User::factory()->create([
            'email' => 'admin@example.com',
            'google_id' => 'google-admin-1',
        ]);

        $this->actingAs($user)
            ->get(route('profile.show'))
            ->assertOk()
            ->assertSee(__('profile.kicker_admin'), false)
            ->assertSee(__('profile.org_plan'), false)
            ->assertSee(__('profile.open_admin_console'), false)
            ->assertSee(__('profile.connected_with_google', ['email' => $user->email]), false)
            ->assertDontSee(__('profile.danger_zone'), false)
            ->assertDontSee(__('profile.upgrade_plan'), false)
            ->assertDontSee('Log out of all devices', false)
            ->assertDontSee('id="subscription"', false);
    }
}

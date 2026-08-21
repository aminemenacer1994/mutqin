<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\WaitingListEntry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WaitingListFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_waiting_list_page_is_available(): void
    {
        $this->get(route('waiting-list'))
            ->assertOk()
            ->assertSee('<waiting-list-page>', false);
    }

    public function test_public_waiting_list_submission_is_stored_with_normalised_email(): void
    {
        $response = $this->postJson(route('api.waiting-list.store'), [
            'name' => '  Amina  ',
            'email' => '  Amina@Example.COM ',
        ]);

        $response->assertCreated()
            ->assertJsonPath('already_joined', false)
            ->assertJsonPath('data.email', 'amina@example.com');

        $this->assertDatabaseHas('waiting_list_entries', [
            'name' => 'Amina',
            'email' => 'amina@example.com',
        ]);
    }

    public function test_duplicate_email_is_handled_gracefully(): void
    {
        WaitingListEntry::query()->create([
            'name' => 'Amina',
            'email' => 'amina@example.com',
        ]);

        $response = $this->postJson(route('api.waiting-list.store'), [
            'name' => 'Amina Again',
            'email' => 'AMINA@example.com',
        ]);

        $response->assertOk()
            ->assertJsonPath('already_joined', true)
            ->assertJsonPath('message', 'You are already on the waiting list.');

        $this->assertSame(1, WaitingListEntry::query()->count());
        $this->assertDatabaseHas('waiting_list_entries', [
            'name' => 'Amina',
            'email' => 'amina@example.com',
        ]);
    }

    public function test_waiting_list_validation_rejects_invalid_payloads(): void
    {
        $this->postJson(route('api.waiting-list.store'), [
            'name' => '',
            'email' => 'not-an-email',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email']);

        $this->assertDatabaseCount('waiting_list_entries', 0);
    }

    public function test_admin_can_view_waiting_list_entries(): void
    {
        config()->set('mutqin.admin_emails', ['admin@example.com']);

        $admin = User::factory()->admin()->create([
            'email' => 'admin@example.com',
        ]);

        WaitingListEntry::query()->create([
            'name' => 'Amina',
            'email' => 'amina@example.com',
        ]);

        $this->actingAs($admin)
            ->get(route('admin.waiting-list.index'))
            ->assertOk()
            ->assertSee('Amina')
            ->assertSee('amina@example.com');
    }

    public function test_non_admin_cannot_view_waiting_list_entries(): void
    {
        $user = User::factory()->create([
            'email' => 'learner@example.com',
        ]);

        $this->actingAs($user)
            ->get(route('admin.waiting-list.index'))
            ->assertForbidden();
    }
}

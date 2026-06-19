<?php

namespace Tests\Feature;

use App\Models\ContactSubmission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContactMessageFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_contact_submission_is_stored_as_pending(): void
    {
        $response = $this->postJson(route('api.contact.store'), [
            'name' => 'Amina',
            'email' => 'amina@example.com',
            'subject' => 'General question',
            'message' => 'How does revision scheduling work?',
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('contact_submissions', [
            'email' => 'amina@example.com',
            'subject' => 'General question',
            'status' => 'pending',
        ]);
    }

    public function test_admin_can_resolve_and_delete_contact_messages(): void
    {
        config()->set('mutqin.admin_emails', ['admin@example.com']);

        $admin = User::factory()->create([
            'email' => 'admin@example.com',
        ]);

        $message = ContactSubmission::query()->create([
            'name' => 'Amina',
            'email' => 'amina@example.com',
            'subject' => 'General question',
            'message' => 'How does revision scheduling work?',
            'status' => 'pending',
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.contact-messages.resolve', $message))
            ->assertRedirect();

        $this->assertDatabaseHas('contact_submissions', [
            'id' => $message->id,
            'status' => 'resolved',
        ]);

        $this->actingAs($admin)
            ->delete(route('admin.contact-messages.destroy', $message))
            ->assertRedirect();

        $this->assertDatabaseMissing('contact_submissions', [
            'id' => $message->id,
        ]);
    }
}

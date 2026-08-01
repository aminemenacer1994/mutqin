<?php

namespace Tests\Feature;

use App\Models\AyahNote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AyahNoteTest extends TestCase
{
    use RefreshDatabase;

    public function test_ayah_note_endpoints_require_authentication(): void
    {
        $this->getJson('/api/ayah-notes')->assertUnauthorized();
        $this->getJson('/api/ayah-notes/counts?surah_number=2')->assertUnauthorized();
        $this->postJson('/api/ayah-notes', [
            'surah_number' => 2,
            'ayah_number' => 255,
            'body' => 'A private reflection',
        ])->assertUnauthorized();
    }

    public function test_user_can_create_list_update_and_delete_notes_for_an_ayah(): void
    {
        $user = User::factory()->create();

        $create = $this->actingAs($user)
            ->postJson('/api/ayah-notes', [
                'surah_number' => 2,
                'ayah_number' => 255,
                'title' => 'Ayat al-Kursi',
                'body' => 'Allah — there is no deity except Him.',
            ])
            ->assertCreated()
            ->assertJsonPath('note.surah_number', 2)
            ->assertJsonPath('note.ayah_number', 255)
            ->assertJsonPath('note.title', 'Ayat al-Kursi');

        $noteId = (int) $create->json('note.id');
        $this->assertGreaterThan(0, $noteId);

        $this->actingAs($user)
            ->postJson('/api/ayah-notes', [
                'surah_number' => 2,
                'ayah_number' => 255,
                'body' => 'Second reflection on the same ayah.',
            ])
            ->assertCreated();

        $this->actingAs($user)
            ->getJson('/api/ayah-notes?surah_number=2&ayah_number=255')
            ->assertOk()
            ->assertJsonCount(2, 'notes');

        $this->actingAs($user)
            ->getJson('/api/ayah-notes/counts?surah_number=2')
            ->assertOk()
            ->assertJsonPath('counts.2:255', 2);

        $this->actingAs($user)
            ->putJson("/api/ayah-notes/{$noteId}", [
                'title' => 'Updated title',
                'body' => 'Updated reflection body.',
            ])
            ->assertOk()
            ->assertJsonPath('note.title', 'Updated title')
            ->assertJsonPath('note.body', 'Updated reflection body.');

        $this->actingAs($user)
            ->deleteJson("/api/ayah-notes/{$noteId}")
            ->assertOk()
            ->assertJsonPath('deleted', true);

        $this->assertDatabaseMissing('ayah_notes', ['id' => $noteId]);
        $this->assertSame(1, AyahNote::where('user_id', $user->id)->count());
    }

    public function test_notes_are_private_to_the_owning_user(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $note = AyahNote::query()->create([
            'user_id' => $owner->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'title' => 'Private',
            'body' => 'Only the owner should see this.',
        ]);

        $this->actingAs($other)
            ->getJson('/api/ayah-notes?surah_number=1&ayah_number=1')
            ->assertOk()
            ->assertJsonCount(0, 'notes');

        $this->actingAs($other)
            ->getJson('/api/ayah-notes/counts?surah_number=1')
            ->assertOk()
            ->assertJsonPath('counts', []);

        $this->actingAs($other)
            ->putJson("/api/ayah-notes/{$note->id}", [
                'body' => 'Trying to edit someone else\'s note',
            ])
            ->assertNotFound();

        $this->actingAs($other)
            ->deleteJson("/api/ayah-notes/{$note->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('ayah_notes', [
            'id' => $note->id,
            'user_id' => $owner->id,
            'body' => 'Only the owner should see this.',
        ]);
    }

    public function test_store_validates_required_fields(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/ayah-notes', [
                'surah_number' => 200,
                'ayah_number' => 0,
                'body' => '',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['surah_number', 'ayah_number', 'body']);
    }

    public function test_store_and_update_reject_bodies_over_2000_characters(): void
    {
        $user = User::factory()->create();
        $oversized = str_repeat('a', 2001);

        $this->actingAs($user)
            ->postJson('/api/ayah-notes', [
                'surah_number' => 1,
                'ayah_number' => 1,
                'body' => $oversized,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['body']);

        $note = AyahNote::query()->create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'title' => null,
            'body' => str_repeat('b', 2500),
        ]);

        $this->actingAs($user)
            ->putJson("/api/ayah-notes/{$note->id}", [
                'body' => $oversized,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['body']);

        $this->assertDatabaseHas('ayah_notes', [
            'id' => $note->id,
            'body' => str_repeat('b', 2500),
        ]);
    }
}

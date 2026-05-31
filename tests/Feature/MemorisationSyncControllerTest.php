<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MemorisationSyncControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_store_and_fetch_memorisation_state(): void
    {
        $user = User::factory()->create();

        $payload = [
            'version' => 2,
            'syncMeta' => [
                'localUpdatedAt' => '2026-05-31T10:15:00Z',
            ],
            'savedSessions' => [
                ['id' => 'session-1', 'name' => 'Morning Review'],
            ],
            'recordingsLibrary' => [
                ['id' => 'recording-1', 'ayahKey' => '1:1', 'result' => 'Good'],
            ],
        ];

        $this->actingAs($user)
            ->putJson(route('memorisation.sync.update'), [
                'state' => $payload,
                'meta' => [
                    'device_id' => 'device-123',
                    'device_label' => 'Device 123',
                    'local_updated_at' => '2026-05-31T10:15:00Z',
                ],
            ])
            ->assertOk()
            ->assertJsonPath('saved', true)
            ->assertJsonPath('meta.owner_id', $user->id)
            ->assertJsonPath('meta.device_id', 'device-123');

        $this->actingAs($user)
            ->getJson(route('memorisation.sync.show'))
            ->assertOk()
            ->assertJsonPath('state.savedSessions.0.id', 'session-1')
            ->assertJsonPath('state.recordingsLibrary.0.id', 'recording-1')
            ->assertJsonPath('meta.owner_id', $user->id)
            ->assertJsonPath('meta.device_label', 'Device 123');
    }

    public function test_sync_endpoints_require_authentication(): void
    {
        $this->getJson(route('memorisation.sync.show'))->assertUnauthorized();
        $this->putJson(route('memorisation.sync.update'), ['state' => []])->assertUnauthorized();
    }
}

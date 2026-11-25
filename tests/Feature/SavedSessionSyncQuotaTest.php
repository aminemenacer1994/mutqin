<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SavedSessionSyncQuotaTest extends TestCase
{
    use RefreshDatabase;

    public function test_free_user_cannot_sync_more_saved_sessions_than_plan_limit(): void
    {
        config(['billing.limits.free.saved_sessions' => 2]);

        $user = User::factory()->create();

        $makeState = static function (int $count): array {
            $saved = [];
            for ($i = 1; $i <= $count; $i++) {
                $saved[] = ['id' => "session-{$i}"];
            }

            return ['savedSessions' => $saved];
        };

        $this->actingAs($user)
            ->postJson(route('api.state.store'), [
                'state' => $makeState(2),
                'meta' => ['local_updated_at' => now()->toIso8601String()],
            ])
            ->assertOk()
            ->assertJsonPath('saved', true);

        $this->actingAs($user)
            ->postJson(route('api.state.store'), [
                'state' => $makeState(3),
                'meta' => ['local_updated_at' => now()->addSecond()->toIso8601String()],
            ])
            ->assertForbidden()
            ->assertJsonPath('quota.feature', 'saved_sessions')
            ->assertJsonPath('quota.limit', 2);
    }
}
<?php

namespace Tests\Feature;

use App\Jobs\DeriveLearningStateJob;
use App\Models\MemorisationProgress;
use App\Models\MemorisationSyncState;
use App\Models\User;
use App\Models\UserSession;
use App\Services\LearningStateDeriver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class DeriveLearningStateJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_state_store_dispatches_derive_job(): void
    {
        Queue::fake();

        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/state', [
                'state' => $this->sampleState(),
                'meta' => ['device_id' => 'job-test'],
            ])
            ->assertOk()
            ->assertJsonPath('saved', true);

        Queue::assertPushed(DeriveLearningStateJob::class, function (DeriveLearningStateJob $job) use ($user) {
            return $job->userId === $user->id
                && is_string($job->payloadHash)
                && $job->payloadHash !== '';
        });
    }

    public function test_derive_job_skips_when_payload_hash_is_stale(): void
    {
        $user = User::factory()->create();

        MemorisationSyncState::query()->create([
            'user_id' => $user->id,
            'state' => json_encode($this->sampleState(), JSON_UNESCAPED_UNICODE),
            'payload_hash' => 'newer-hash',
            'state_updated_at' => now(),
        ]);

        (new DeriveLearningStateJob($user->id, 'older-hash'))
            ->handle(app(LearningStateDeriver::class));

        $this->assertSame(0, UserSession::query()->where('user_id', $user->id)->count());
        $this->assertSame(0, MemorisationProgress::query()->where('user_id', $user->id)->count());
    }

    /**
     * @return array<string, mixed>
     */
    private function sampleState(): array
    {
        return [
            'sessionState' => [
                'mode' => 'beginner',
                'current_index' => 1,
                'updated_at' => now()->toIso8601String(),
                'queue' => [
                    ['ayahId' => '2:255', 'repeatCount' => 12],
                    ['ayahId' => '2:256', 'repeatCount' => 1],
                ],
            ],
            'ayahs' => [
                '2:255' => ['status' => 'mastered', 'mastery' => 100, 'reps' => 12],
                '2:256' => ['status' => 'learning', 'mastery' => 40, 'reps' => 1],
            ],
            'analytics' => [
                'sessions_completed' => 4,
                'total_minutes' => 28,
                'streak_day' => 3,
            ],
        ];
    }
}

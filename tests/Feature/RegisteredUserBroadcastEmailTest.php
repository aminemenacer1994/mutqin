<?php

namespace Tests\Feature;

use App\Jobs\DispatchRegisteredUserBroadcastBatchJob;
use App\Models\MemorisationAssessment;
use App\Models\RegisteredUserEmailDelivery;
use App\Models\User;
use App\Services\UserAiReciteUsageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class RegisteredUserBroadcastEmailTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('mutqin.admin_emails', ['admin@example.com']);
        config()->set('mutqin.registered_users.broadcast_email.campaign_key', 'registered_broadcast_2026');
    }

    public function test_broadcast_preview_requires_super_admin(): void
    {
        $this->getJson(route('api.admin.users.broadcast-email.preview'))
            ->assertUnauthorized();

        $learner = User::factory()->create(['email' => 'learner@example.com']);
        $this->actingAs($learner)
            ->getJson(route('api.admin.users.broadcast-email.preview'))
            ->assertForbidden();
    }

    public function test_preview_counts_verified_registered_users(): void
    {
        $admin = User::factory()->admin()->create(['email' => 'admin@example.com']);
        User::factory()->create(['email' => 'verified@example.com', 'email_verified_at' => now()]);
        User::factory()->create(['email' => 'pending@example.com', 'email_verified_at' => null]);

        $this->actingAs($admin)
            ->getJson(route('api.admin.users.broadcast-email.preview'))
            ->assertOk()
            ->assertJsonPath('eligible', 2)
            ->assertJsonPath('skipped.unverified', 1);
    }

    public function test_selection_send_queues_only_selected_users(): void
    {
        Queue::fake();

        $admin = User::factory()->admin()->create(['email' => 'admin@example.com']);
        $one = User::factory()->create(['email' => 'one@example.com', 'email_verified_at' => now()]);
        User::factory()->create(['email' => 'two@example.com', 'email_verified_at' => now()]);

        $this->actingAs($admin)
            ->postJson(route('api.admin.users.broadcast-email.send'), [
                'confirm_send' => true,
                'confirm_count' => 1,
                'user_ids' => [$one->id],
            ])
            ->assertOk()
            ->assertJsonPath('queued', 1)
            ->assertJsonPath('mode', 'selection');

        Queue::assertPushed(DispatchRegisteredUserBroadcastBatchJob::class);
        $this->assertSame(1, RegisteredUserEmailDelivery::query()->where('status', 'pending')->count());
    }
}

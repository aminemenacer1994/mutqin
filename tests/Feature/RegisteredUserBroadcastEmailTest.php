<?php

namespace Tests\Feature;

use App\Jobs\DispatchRegisteredUserBroadcastBatchJob;
use App\Jobs\SendRegisteredUserBroadcastEmailJob;
use App\Mail\RegisteredUserBroadcastMail;
use App\Models\RegisteredUserEmailDelivery;
use App\Models\User;
use App\Support\RegisteredUserUnsubscribe;
use App\Support\WaitingListEmailHash;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
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

    public function test_test_send_delivers_immediately_without_a_queue_worker(): void
    {
        Mail::fake();
        Queue::fake();

        $admin = User::factory()->admin()->create(['email' => 'admin@example.com']);

        $this->actingAs($admin)
            ->postJson(route('api.admin.users.broadcast-email.send'), [
                'confirm_send' => true,
                'test_email' => 'sandbox@example.com',
            ])
            ->assertOk()
            ->assertJsonPath('mode', 'test')
            ->assertJsonPath('delivered', true);

        Queue::assertNothingPushed();
        Mail::assertSent(RegisteredUserBroadcastMail::class, function (RegisteredUserBroadcastMail $mail): bool {
            return $mail->hasTo('sandbox@example.com');
        });
        $this->assertSame(0, RegisteredUserEmailDelivery::query()->count());
    }

    public function test_pump_sends_one_pending_registered_user(): void
    {
        Mail::fake();

        $admin = User::factory()->admin()->create(['email' => 'admin@example.com']);
        $user = User::factory()->create([
            'email' => 'learner@example.com',
            'email_verified_at' => now(),
        ]);
        RegisteredUserEmailDelivery::query()->create([
            'campaign_key' => 'registered_broadcast_2026',
            'email_hash' => WaitingListEmailHash::digest('learner@example.com'),
            'user_id' => $user->id,
            'status' => RegisteredUserEmailDelivery::STATUS_PENDING,
        ]);

        $this->actingAs($admin)
            ->postJson(route('api.admin.users.broadcast-email.pump'))
            ->assertOk()
            ->assertJsonPath('processed', 1)
            ->assertJsonPath('deliveries.sent', 1);

        Mail::assertSent(RegisteredUserBroadcastMail::class, 1);

        $job = new SendRegisteredUserBroadcastEmailJob(
            'registered_broadcast_2026',
            $user->id,
            'learner@example.com',
            'Learner',
            false,
        );
        $job->handle();

        Mail::assertSent(RegisteredUserBroadcastMail::class, 1);
    }

    public function test_preview_skips_users_who_unsubscribed(): void
    {
        $admin = User::factory()->admin()->create(['email' => 'admin@example.com']);
        User::factory()->create([
            'email' => 'optout@example.com',
            'email_verified_at' => now(),
            'marketing_unsubscribed_at' => now(),
        ]);

        $this->actingAs($admin)
            ->getJson(route('api.admin.users.broadcast-email.preview'))
            ->assertOk()
            ->assertJsonPath('eligible', 1)
            ->assertJsonPath('skipped.unsubscribed', 1);
    }

    public function test_signed_unsubscribe_marks_user_and_mail_includes_the_link(): void
    {
        $user = User::factory()->create([
            'name' => 'Amina',
            'email' => 'amina@example.com',
        ]);
        $url = RegisteredUserUnsubscribe::signedUrl($user);

        $this->get($url)->assertOk();
        $this->assertNotNull($user->fresh()->marketing_unsubscribed_at);

        $mail = new RegisteredUserBroadcastMail(
            recipientName: 'Amina',
            platformUrl: 'https://mutqin.ai',
            unsubscribeUrl: $url,
        );
        $html = $mail->render();

        $this->assertSame(__('mail.launch_subject'), $mail->envelope()->subject);
        $this->assertStringContainsString(e(__('mail.launch_heading')), $html);
        $this->assertStringContainsString(e(__('mail.launch_action')), $html);
        $this->assertStringContainsString('https://mutqin.ai', $html);
        $this->assertStringContainsString('Amina', $html);
        $this->assertStringContainsString(e($url), $html);
        $this->assertStringNotContainsString('News from Mutqin', $html);
    }
}

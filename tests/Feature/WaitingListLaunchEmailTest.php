<?php

namespace Tests\Feature;

use App\Jobs\DispatchWaitingListLaunchBatchJob;
use App\Jobs\SendWaitingListLaunchEmailJob;
use App\Mail\WaitingListLaunchMail;
use App\Models\User;
use App\Models\WaitingListEmailDelivery;
use App\Models\WaitingListEntry;
use App\Support\WaitingListEmailHash;
use App\Support\WaitingListUnsubscribe;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class WaitingListLaunchEmailTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('mutqin.admin_emails', ['admin@example.com']);
        config()->set('mutqin.waiting_list.launch_email.campaign_key', 'waitlist_launch_2026');
    }

    public function test_launch_email_preview_requires_admin(): void
    {
        $this->getJson(route('api.admin.waiting-list.launch-email.preview'))
            ->assertUnauthorized();

        $learner = User::factory()->create(['email' => 'learner@example.com']);
        $this->actingAs($learner)
            ->getJson(route('api.admin.waiting-list.launch-email.preview'))
            ->assertForbidden();
    }

    public function test_preview_counts_eligible_and_skips_unsubscribed_and_duplicates(): void
    {
        $admin = User::factory()->admin()->create(['email' => 'admin@example.com']);

        WaitingListEntry::query()->create(['name' => 'A', 'email' => 'one@example.com']);
        WaitingListEntry::query()->create(['name' => 'B', 'email' => 'two@example.com']);
        WaitingListEntry::query()->create([
            'name' => 'C',
            'email' => 'optout@example.com',
            'unsubscribed_at' => now(),
        ]);

        $response = $this->actingAs($admin)
            ->getJson(route('api.admin.waiting-list.launch-email.preview'))
            ->assertOk();

        $response->assertJsonPath('campaign_key', 'waitlist_launch_2026');
        $response->assertJsonPath('eligible', 2);
        $response->assertJsonPath('skipped.unsubscribed', 1);
    }

    public function test_production_send_queues_batches_and_respects_confirm_count(): void
    {
        Mail::fake();
        Queue::fake();

        $admin = User::factory()->admin()->create(['email' => 'admin@example.com']);
        WaitingListEntry::query()->create(['name' => 'Amina', 'email' => 'amina@example.com']);
        WaitingListEntry::query()->create(['name' => 'Yusuf', 'email' => 'yusuf@example.com']);

        $this->actingAs($admin)
            ->postJson(route('api.admin.waiting-list.launch-email.send'), [
                'confirm_send' => true,
                'confirm_count' => 1,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['confirm_count']);

        $this->actingAs($admin)
            ->postJson(route('api.admin.waiting-list.launch-email.send'), [
                'confirm_send' => true,
                'confirm_count' => 2,
            ])
            ->assertOk()
            ->assertJsonPath('queued', 2)
            ->assertJsonPath('mode', 'production');

        Queue::assertPushed(DispatchWaitingListLaunchBatchJob::class);

        $this->assertSame(2, WaitingListEmailDelivery::query()->where('status', 'pending')->count());
        Mail::assertNothingSent();
    }

    public function test_test_send_dispatches_single_job_without_delivery_rows(): void
    {
        Mail::fake();
        Queue::fake();

        $admin = User::factory()->admin()->create(['email' => 'admin@example.com']);
        WaitingListEntry::query()->create(['name' => 'Amina', 'email' => 'amina@example.com']);

        $this->actingAs($admin)
            ->postJson(route('api.admin.waiting-list.launch-email.send'), [
                'confirm_send' => true,
                'test_email' => 'sandbox@example.com',
            ])
            ->assertOk()
            ->assertJsonPath('mode', 'test')
            ->assertJsonPath('queued', 1);

        Queue::assertPushed(DispatchWaitingListLaunchBatchJob::class, function (DispatchWaitingListLaunchBatchJob $job): bool {
            return $job->isTest && $job->testEmail === 'sandbox@example.com';
        });

        $this->assertSame(0, WaitingListEmailDelivery::query()->count());
    }

    public function test_send_job_marks_delivery_sent_and_logs_hash_not_email(): void
    {
        Mail::fake();

        $entry = WaitingListEntry::query()->create(['name' => 'Amina', 'email' => 'amina@example.com']);
        $delivery = WaitingListEmailDelivery::query()->create([
            'campaign_key' => 'waitlist_launch_2026',
            'email_hash' => WaitingListEmailHash::digest('amina@example.com'),
            'waiting_list_entry_id' => $entry->id,
            'status' => WaitingListEmailDelivery::STATUS_PENDING,
        ]);

        $job = new SendWaitingListLaunchEmailJob(
            'waitlist_launch_2026',
            $entry->id,
            'amina@example.com',
            'Amina',
            false,
        );
        $job->handle();

        Mail::assertSent(WaitingListLaunchMail::class, function (WaitingListLaunchMail $mail): bool {
            return $mail->hasTo('amina@example.com');
        });

        $delivery->refresh();
        $this->assertSame(WaitingListEmailDelivery::STATUS_SENT, $delivery->status);
        $this->assertNotNull($delivery->sent_at);
    }

    public function test_duplicate_production_send_skips_already_sent_recipient(): void
    {
        Mail::fake();
        Queue::fake();

        $admin = User::factory()->admin()->create(['email' => 'admin@example.com']);
        WaitingListEntry::query()->create(['name' => 'Amina', 'email' => 'amina@example.com']);

        WaitingListEmailDelivery::query()->create([
            'campaign_key' => 'waitlist_launch_2026',
            'email_hash' => WaitingListEmailHash::digest('amina@example.com'),
            'waiting_list_entry_id' => 1,
            'status' => WaitingListEmailDelivery::STATUS_SENT,
            'sent_at' => now(),
        ]);

        $preview = $this->actingAs($admin)
            ->getJson(route('api.admin.waiting-list.launch-email.preview'))
            ->assertOk();

        $preview->assertJsonPath('eligible', 0);
        $preview->assertJsonPath('skipped.already_sent', 1);
    }

    public function test_signed_unsubscribe_marks_entry(): void
    {
        $entry = WaitingListEntry::query()->create(['name' => 'Amina', 'email' => 'amina@example.com']);
        $url = WaitingListUnsubscribe::signedUrl($entry);

        $this->get($url)->assertOk();

        $entry->refresh();
        $this->assertNotNull($entry->unsubscribed_at);
    }

    public function test_launch_mail_template_contains_platform_link_and_unsubscribe(): void
    {
        $mail = new WaitingListLaunchMail(
            recipientName: 'Amina',
            platformUrl: 'https://mutqin.ai',
            unsubscribeUrl: 'https://app.mutqin.ai/waiting-list/unsubscribe/1?signature=test',
        );

        $html = $mail->render();

        $this->assertStringContainsString('https://mutqin.ai', $html);
        $this->assertStringContainsString('waiting-list/unsubscribe', $html);
        $this->assertStringContainsString(__('mail.waitlist_launch_subject'), $html);
    }
}

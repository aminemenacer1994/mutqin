<?php

namespace App\Services;

use App\Jobs\DispatchWaitingListLaunchBatchJob;
use App\Mail\WaitingListLaunchMail;
use App\Models\WaitingListEmailDelivery;
use App\Models\WaitingListEntry;
use App\Rules\WaitingListEmail;
use App\Support\BulkMailQueue;
use App\Support\TransactionalMail;
use App\Support\WaitingListEmailHash;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Throwable;

class WaitingListLaunchCampaignService
{
    public function campaignKey(): string
    {
        return (string) config('mutqin.waiting_list.launch_email.campaign_key', 'waitlist_launch_2026');
    }

    /**
     * @return array{
     *     campaign_key: string,
     *     eligible: int,
     *     skipped: array{unsubscribed: int, bounced: int, invalid: int, duplicate: int, already_sent: int, queued: int},
     *     deliveries: array{pending: int, sent: int, failed: int, skipped: int},
     *     storage_ready: bool
     * }
     */
    public function preview(): array
    {
        if (! $this->storageReady()) {
            return [
                'campaign_key' => $this->campaignKey(),
                'eligible' => 0,
                'skipped' => $this->emptySkipped(),
                'deliveries' => $this->emptyDeliveryCounts(),
                'storage_ready' => false,
            ];
        }

        $skipped = $this->emptySkipped();
        $eligibleRows = $this->collectEligibleRows($skipped);

        return [
            'campaign_key' => $this->campaignKey(),
            'eligible' => $eligibleRows->count(),
            'skipped' => $skipped,
            'deliveries' => $this->deliveryCounts(),
            'storage_ready' => true,
        ];
    }

    /**
     * @return array{
     *     campaign_key: string,
     *     queued: int,
     *     mode: string,
     *     deliveries: array{pending: int, sent: int, failed: int, skipped: int}
     * }
     */
    public function dispatchSend(int $adminUserId, int $confirmCount, ?string $testEmail = null): array
    {
        BulkMailQueue::assertDeliverable();

        if (! $this->storageReady()) {
            throw ValidationException::withMessages([
                'campaign' => [__('admin.waiting_list.launch_storage_unavailable')],
            ]);
        }

        $preview = $this->preview();
        $eligible = (int) $preview['eligible'];

        if ($testEmail === null || $testEmail === '') {
            if ($confirmCount !== $eligible) {
                throw ValidationException::withMessages([
                    'confirm_count' => [__('admin.waiting_list.launch_confirm_mismatch')],
                ]);
            }

            if ($eligible === 0) {
                throw ValidationException::withMessages([
                    'campaign' => [__('admin.waiting_list.launch_no_recipients')],
                ]);
            }

            $skipped = $this->emptySkipped();
            $rows = $this->collectEligibleRows($skipped);
            $this->reserveDeliveries($rows);

            $batchSize = max(1, (int) config('mutqin.waiting_list.launch_email.batch_size', 25));
            $delaySeconds = max(1, (int) config('mutqin.waiting_list.launch_email.batch_delay_seconds', 60));
            $queue = (string) config('mutqin.waiting_list.launch_email.queue', 'default');

            $chunks = $rows->chunk($batchSize)->values();
            foreach ($chunks as $batchIndex => $chunk) {
                BulkMailQueue::route(
                    DispatchWaitingListLaunchBatchJob::dispatch(
                        $this->campaignKey(),
                        $chunk->pluck('id')->all(),
                    )
                        ->onQueue($queue)
                        ->delay(now()->addSeconds($batchIndex * $delaySeconds))
                );
            }

            BulkMailQueue::kickAfterResponse();

            return [
                'campaign_key' => $this->campaignKey(),
                'queued' => $rows->count(),
                'mode' => 'production',
                'deliveries' => $this->deliveryCounts(),
            ];
        }

        $normalizedTest = WaitingListEmailHash::normalize($testEmail);
        $validator = Validator::make(
            ['email' => $normalizedTest],
            ['email' => ['required', 'email', new WaitingListEmail]]
        );
        if ($validator->fails()) {
            throw ValidationException::withMessages([
                'test_email' => $validator->errors()->get('email'),
            ]);
        }

        return $this->sendTestNow($normalizedTest);
    }

    /**
     * @return array{campaign_key: string, queued: int, mode: string, delivered: bool, deliveries: array{pending: int, sent: int, failed: int, skipped: int}}
     */
    private function sendTestNow(string $email): array
    {
        $platformUrl = TransactionalMail::homeUrl();

        try {
            Mail::to($email)->send(new WaitingListLaunchMail(
                recipientName: 'Waiting list preview',
                platformUrl: $platformUrl,
                unsubscribeUrl: $platformUrl.'/waiting-list/unsubscribe/preview',
            ));
        } catch (Throwable $exception) {
            throw ValidationException::withMessages([
                'test_email' => [__('admin.waiting_list.launch_test_failed', [
                    'reason' => BulkMailQueue::safeError($exception),
                ])],
            ]);
        }

        return [
            'campaign_key' => $this->campaignKey(),
            'queued' => 1,
            'mode' => 'test',
            'delivered' => true,
            'deliveries' => $this->deliveryCounts(),
        ];
    }

    /**
     * @return array{pending: int, sent: int, failed: int, skipped: int}
     */
    public function deliveryCounts(): array
    {
        if (! $this->storageReady()) {
            return $this->emptyDeliveryCounts();
        }

        $key = $this->campaignKey();
        $rows = WaitingListEmailDelivery::query()
            ->where('campaign_key', $key)
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return [
            'pending' => (int) ($rows[WaitingListEmailDelivery::STATUS_PENDING] ?? 0)
                + (int) ($rows[WaitingListEmailDelivery::STATUS_SENDING] ?? 0),
            'sent' => (int) ($rows[WaitingListEmailDelivery::STATUS_SENT] ?? 0),
            'failed' => (int) ($rows[WaitingListEmailDelivery::STATUS_FAILED] ?? 0),
            'skipped' => (int) ($rows[WaitingListEmailDelivery::STATUS_SKIPPED] ?? 0),
        ];
    }

    public function storageReady(): bool
    {
        $connection = (new WaitingListEntry)->getConnectionName();

        return Schema::connection($connection)->hasTable('waiting_list_entries')
            && Schema::connection($connection)->hasTable('waiting_list_email_deliveries');
    }

    /**
     * @param  array{unsubscribed: int, bounced: int, invalid: int, duplicate: int, already_sent: int, queued: int}  $skipped
     * @return Collection<int, WaitingListEntry>
     */
    private function collectEligibleRows(array &$skipped): Collection
    {
        $campaignKey = $this->campaignKey();
        [$sentHashSet, $activeHashSet] = $this->blockingHashes($campaignKey);
        $seenEmails = [];
        $eligible = collect();

        WaitingListEntry::query()
            ->orderBy('id')
            ->chunkById(500, function ($entries) use (&$skipped, &$seenEmails, &$eligible, $sentHashSet, $activeHashSet): void {
                foreach ($entries as $entry) {
                    $this->classifyEntry($entry, $skipped, $seenEmails, $sentHashSet, $activeHashSet, $eligible);
                }
            });

        return $eligible->values();
    }

    /**
     * @param  array{unsubscribed: int, bounced: int, invalid: int, duplicate: int, already_sent: int, queued: int}  $skipped
     * @param  array<string, true>  $seenEmails
     * @param  array<string, true>  $sentHashSet
     * @param  array<string, true>  $activeHashSet
     * @param  Collection<int, WaitingListEntry>  $eligible
     */
    private function classifyEntry(
        WaitingListEntry $entry,
        array &$skipped,
        array &$seenEmails,
        array $sentHashSet,
        array $activeHashSet,
        Collection $eligible,
    ): void {
        if ($entry->unsubscribed_at !== null) {
            $skipped['unsubscribed']++;

            return;
        }

        if ($entry->bounced_at !== null) {
            $skipped['bounced']++;

            return;
        }

        if ($entry->marked_invalid_at !== null) {
            $skipped['invalid']++;

            return;
        }

        $email = WaitingListEmailHash::normalize((string) $entry->email);
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $skipped['invalid']++;

            return;
        }

        $validator = Validator::make(['email' => $email], ['email' => [new WaitingListEmail]]);
        if ($validator->fails()) {
            $skipped['invalid']++;

            return;
        }

        if (isset($seenEmails[$email])) {
            $skipped['duplicate']++;

            return;
        }
        $seenEmails[$email] = true;

        $hash = WaitingListEmailHash::digest($email);
        if (isset($sentHashSet[$hash])) {
            $skipped['already_sent']++;

            return;
        }

        if (isset($activeHashSet[$hash])) {
            $skipped['queued']++;

            return;
        }

        $eligible->push($entry);
    }

    /**
     * @param  Collection<int, WaitingListEntry>  $rows
     */
    private function reserveDeliveries(Collection $rows): void
    {
        $campaignKey = $this->campaignKey();
        $now = now()->toDateTimeString();

        foreach ($rows->chunk(200) as $chunk) {
            $payload = [];
            $hashes = [];

            foreach ($chunk as $entry) {
                $email = WaitingListEmailHash::normalize((string) $entry->email);
                $hash = WaitingListEmailHash::digest($email);
                $hashes[] = $hash;
                $payload[] = [
                    'campaign_key' => $campaignKey,
                    'email_hash' => $hash,
                    'waiting_list_entry_id' => $entry->id,
                    'status' => WaitingListEmailDelivery::STATUS_PENDING,
                    'skip_reason' => null,
                    'attempts' => 0,
                    'last_error' => null,
                    'sent_at' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            if ($payload === []) {
                continue;
            }

            WaitingListEmailDelivery::query()->insertOrIgnore($payload);
            WaitingListEmailDelivery::query()
                ->where('campaign_key', $campaignKey)
                ->whereIn('email_hash', $hashes)
                ->where('status', '!=', WaitingListEmailDelivery::STATUS_SENT)
                ->where(function ($query): void {
                    $query->where('status', '!=', WaitingListEmailDelivery::STATUS_SENDING)
                        ->orWhere('updated_at', '<=', now()->subMinutes(2));
                })
                ->update([
                    'status' => WaitingListEmailDelivery::STATUS_PENDING,
                    'skip_reason' => null,
                    'last_error' => null,
                    'sent_at' => null,
                    'updated_at' => $now,
                ]);
        }
    }

    /**
     * @return array{0: array<string, true>, 1: array<string, true>}
     */
    private function blockingHashes(string $campaignKey): array
    {
        $rows = WaitingListEmailDelivery::query()
            ->where('campaign_key', $campaignKey)
            ->where(function ($query): void {
                $query->where('status', WaitingListEmailDelivery::STATUS_SENT)
                    ->orWhere(function ($query): void {
                        $query->whereIn('status', [
                            WaitingListEmailDelivery::STATUS_PENDING,
                            WaitingListEmailDelivery::STATUS_SENDING,
                        ])->where('updated_at', '>=', now()->subHours(2));
                    });
            })
            ->get(['email_hash', 'status']);

        $sent = [];
        $active = [];
        foreach ($rows as $row) {
            if ($row->status === WaitingListEmailDelivery::STATUS_SENT) {
                $sent[(string) $row->email_hash] = true;
            } else {
                $active[(string) $row->email_hash] = true;
            }
        }

        return [$sent, $active];
    }

    /**
     * @return array{unsubscribed: int, bounced: int, invalid: int, duplicate: int, already_sent: int, queued: int}
     */
    private function emptySkipped(): array
    {
        return [
            'unsubscribed' => 0,
            'bounced' => 0,
            'invalid' => 0,
            'duplicate' => 0,
            'already_sent' => 0,
            'queued' => 0,
        ];
    }

    /**
     * @return array{pending: int, sent: int, failed: int, skipped: int}
     */
    private function emptyDeliveryCounts(): array
    {
        return [
            'pending' => 0,
            'sent' => 0,
            'failed' => 0,
            'skipped' => 0,
        ];
    }
}

<?php

namespace App\Services;

use App\Jobs\DispatchWaitingListLaunchBatchJob;
use App\Models\WaitingListEmailDelivery;
use App\Models\WaitingListEntry;
use App\Rules\WaitingListEmail;
use App\Support\WaitingListEmailHash;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

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
     *     skipped: array{unsubscribed: int, bounced: int, invalid: int, duplicate: int, already_sent: int},
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
                DispatchWaitingListLaunchBatchJob::dispatch(
                    $this->campaignKey(),
                    $chunk->pluck('id')->all(),
                )
                    ->onQueue($queue)
                    ->delay(now()->addSeconds($batchIndex * $delaySeconds));
            }

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

        DispatchWaitingListLaunchBatchJob::dispatch(
            $this->campaignKey(),
            [],
            $normalizedTest,
            true,
        )->onQueue((string) config('mutqin.waiting_list.launch_email.queue', 'default'));

        return [
            'campaign_key' => $this->campaignKey(),
            'queued' => 1,
            'mode' => 'test',
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
            'pending' => (int) ($rows[WaitingListEmailDelivery::STATUS_PENDING] ?? 0),
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
     * @param  array{unsubscribed: int, bounced: int, invalid: int, duplicate: int, already_sent: int}  $skipped
     * @return Collection<int, WaitingListEntry>
     */
    private function collectEligibleRows(array &$skipped): Collection
    {
        $campaignKey = $this->campaignKey();
        $sentHashes = WaitingListEmailDelivery::query()
            ->where('campaign_key', $campaignKey)
            ->whereIn('status', [
                WaitingListEmailDelivery::STATUS_PENDING,
                WaitingListEmailDelivery::STATUS_SENT,
            ])
            ->pluck('email_hash')
            ->all();

        $sentHashSet = array_fill_keys($sentHashes, true);
        $seenEmails = [];
        $eligible = collect();

        WaitingListEntry::query()
            ->orderBy('id')
            ->chunkById(500, function ($entries) use (&$skipped, &$seenEmails, &$eligible, $sentHashSet): void {
                foreach ($entries as $entry) {
                    $this->classifyEntry($entry, $skipped, $seenEmails, $sentHashSet, $eligible);
                }
            });

        return $eligible->values();
    }

    /**
     * @param  array{unsubscribed: int, bounced: int, invalid: int, duplicate: int, already_sent: int}  $skipped
     * @param  array<string, true>  $seenEmails
     * @param  array<string, true>  $sentHashSet
     * @param  Collection<int, WaitingListEntry>  $eligible
     */
    private function classifyEntry(
        WaitingListEntry $entry,
        array &$skipped,
        array &$seenEmails,
        array $sentHashSet,
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

        $eligible->push($entry);
    }

    /**
     * @param  Collection<int, WaitingListEntry>  $rows
     */
    private function reserveDeliveries(Collection $rows): void
    {
        $campaignKey = $this->campaignKey();
        $connection = (new WaitingListEmailDelivery)->getConnectionName();

        DB::connection($connection)->transaction(function () use ($rows, $campaignKey): void {
            foreach ($rows as $entry) {
                $email = WaitingListEmailHash::normalize((string) $entry->email);
                $hash = WaitingListEmailHash::digest($email);

                $existing = WaitingListEmailDelivery::query()
                    ->where('campaign_key', $campaignKey)
                    ->where('email_hash', $hash)
                    ->first();

                if ($existing?->status === WaitingListEmailDelivery::STATUS_SENT) {
                    continue;
                }

                if ($existing) {
                    $existing->update([
                        'waiting_list_entry_id' => $entry->id,
                        'status' => WaitingListEmailDelivery::STATUS_PENDING,
                        'skip_reason' => null,
                        'last_error' => null,
                    ]);

                    continue;
                }

                WaitingListEmailDelivery::query()->create([
                    'campaign_key' => $campaignKey,
                    'email_hash' => $hash,
                    'waiting_list_entry_id' => $entry->id,
                    'status' => WaitingListEmailDelivery::STATUS_PENDING,
                ]);
            }
        });
    }

    /**
     * @return array{unsubscribed: int, bounced: int, invalid: int, duplicate: int, already_sent: int}
     */
    private function emptySkipped(): array
    {
        return [
            'unsubscribed' => 0,
            'bounced' => 0,
            'invalid' => 0,
            'duplicate' => 0,
            'already_sent' => 0,
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

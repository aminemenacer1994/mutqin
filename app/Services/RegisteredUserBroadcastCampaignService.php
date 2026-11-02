<?php

namespace App\Services;

use App\Jobs\DispatchRegisteredUserBroadcastBatchJob;
use App\Mail\RegisteredUserBroadcastMail;
use App\Models\RegisteredUserEmailDelivery;
use App\Models\User;
use App\Support\BulkMailQueue;
use App\Support\RegisteredUserUnsubscribe;
use App\Support\TransactionalMail;
use App\Support\WaitingListEmailHash;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Throwable;

class RegisteredUserBroadcastCampaignService
{
    public function campaignKey(): string
    {
        return (string) config('mutqin.registered_users.broadcast_email.campaign_key', 'registered_broadcast_2026');
    }

    /**
     * @param  list<int>|null  $userIds  When set, only these users (must still pass eligibility).
     * @return array{
     *     campaign_key: string,
     *     eligible: int,
     *     skipped: array{unverified: int, invalid: int, duplicate: int, already_sent: int, queued: int, unsubscribed: int},
     *     deliveries: array{pending: int, sent: int, failed: int, skipped: int},
     *     storage_ready: bool,
     *     scope: string
     * }
     */
    public function preview(?array $userIds = null): array
    {
        $scope = $userIds !== null && $userIds !== [] ? 'selection' : 'all';

        if (! $this->storageReady()) {
            return [
                'campaign_key' => $this->campaignKey(),
                'eligible' => 0,
                'skipped' => $this->emptySkipped(),
                'deliveries' => $this->emptyDeliveryCounts(),
                'storage_ready' => false,
                'scope' => $scope,
            ];
        }

        $skipped = $this->emptySkipped();
        $eligibleRows = $this->collectEligibleRows($skipped, $userIds);

        return [
            'campaign_key' => $this->campaignKey(),
            'eligible' => $eligibleRows->count(),
            'skipped' => $skipped,
            'deliveries' => $this->deliveryCounts(),
            'storage_ready' => true,
            'scope' => $scope,
        ];
    }

    /**
     * @param  list<int>|null  $userIds
     * @return array{
     *     campaign_key: string,
     *     queued: int,
     *     mode: string,
     *     deliveries: array{pending: int, sent: int, failed: int, skipped: int}
     * }
     */
    public function dispatchSend(int $adminUserId, int $confirmCount, ?string $testEmail = null, ?array $userIds = null): array
    {
        BulkMailQueue::assertDeliverable();

        if (! $this->storageReady()) {
            throw ValidationException::withMessages([
                'campaign' => [__('admin.registered_users.broadcast_storage_unavailable')],
            ]);
        }

        if ($testEmail === null || $testEmail === '') {
            $preview = $this->preview($userIds);
            $eligible = (int) $preview['eligible'];

            if ($confirmCount !== $eligible) {
                throw ValidationException::withMessages([
                    'confirm_count' => [__('admin.registered_users.broadcast_confirm_mismatch')],
                ]);
            }

            if ($eligible === 0) {
                throw ValidationException::withMessages([
                    'campaign' => [__('admin.registered_users.broadcast_no_recipients')],
                ]);
            }

            $skipped = $this->emptySkipped();
            $rows = $this->collectEligibleRows($skipped, $userIds);
            $this->reserveDeliveries($rows);

            $batchSize = max(1, (int) config('mutqin.registered_users.broadcast_email.batch_size', 25));
            $delaySeconds = max(1, (int) config('mutqin.registered_users.broadcast_email.batch_delay_seconds', 60));
            $queue = (string) config('mutqin.registered_users.broadcast_email.queue', 'default');

            $chunks = $rows->chunk($batchSize)->values();
            foreach ($chunks as $batchIndex => $chunk) {
                BulkMailQueue::route(
                    DispatchRegisteredUserBroadcastBatchJob::dispatch(
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
                'mode' => $userIds !== null && $userIds !== [] ? 'selection' : 'production',
                'deliveries' => $this->deliveryCounts(),
            ];
        }

        $normalizedTest = WaitingListEmailHash::normalize($testEmail);
        $validator = Validator::make(
            ['email' => $normalizedTest],
            ['email' => ['required', 'email']]
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
        try {
            Mail::to($email)->send(new RegisteredUserBroadcastMail(
                recipientName: 'Preview recipient',
                platformUrl: TransactionalMail::homeUrl(),
                unsubscribeUrl: RegisteredUserUnsubscribe::previewUrl(),
            ));
        } catch (Throwable $exception) {
            throw ValidationException::withMessages([
                'test_email' => [__('admin.registered_users.broadcast_test_failed', [
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
        $rows = RegisteredUserEmailDelivery::query()
            ->where('campaign_key', $key)
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return [
            'pending' => (int) ($rows[RegisteredUserEmailDelivery::STATUS_PENDING] ?? 0)
                + (int) ($rows[RegisteredUserEmailDelivery::STATUS_SENDING] ?? 0),
            'sent' => (int) ($rows[RegisteredUserEmailDelivery::STATUS_SENT] ?? 0),
            'failed' => (int) ($rows[RegisteredUserEmailDelivery::STATUS_FAILED] ?? 0),
            'skipped' => (int) ($rows[RegisteredUserEmailDelivery::STATUS_SKIPPED] ?? 0),
        ];
    }

    public function storageReady(): bool
    {
        return Schema::hasTable('registered_user_email_deliveries');
    }

    /**
     * @param  array{unverified: int, invalid: int, duplicate: int, already_sent: int, queued: int, unsubscribed: int}  $skipped
     * @param  list<int>|null  $userIds
     * @return Collection<int, User>
     */
    private function collectEligibleRows(array &$skipped, ?array $userIds): Collection
    {
        $campaignKey = $this->campaignKey();
        [$sentHashSet, $activeHashSet] = $this->blockingHashes($campaignKey);
        $seenEmails = [];
        $eligible = collect();

        $query = User::query()->orderBy('id');

        if ($userIds !== null && $userIds !== []) {
            $ids = collect($userIds)->map(fn ($id) => (int) $id)->filter(fn ($id) => $id > 0)->unique()->values()->all();
            $query->whereIn('id', $ids);
        }

        $query->chunkById(500, function ($users) use (&$skipped, &$seenEmails, &$eligible, $sentHashSet, $activeHashSet): void {
            foreach ($users as $user) {
                $this->classifyUser($user, $skipped, $seenEmails, $sentHashSet, $activeHashSet, $eligible);
            }
        });

        return $eligible->values();
    }

    /**
     * @param  array{unverified: int, invalid: int, duplicate: int, already_sent: int, queued: int, unsubscribed: int}  $skipped
     * @param  array<string, true>  $seenEmails
     * @param  array<string, true>  $sentHashSet
     * @param  array<string, true>  $activeHashSet
     * @param  Collection<int, User>  $eligible
     */
    private function classifyUser(
        User $user,
        array &$skipped,
        array &$seenEmails,
        array $sentHashSet,
        array $activeHashSet,
        Collection $eligible,
    ): void {
        if ($user->email_verified_at === null) {
            $skipped['unverified']++;

            return;
        }

        if ($user->marketing_unsubscribed_at !== null) {
            $skipped['unsubscribed']++;

            return;
        }

        $email = WaitingListEmailHash::normalize((string) $user->email);
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
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

        $eligible->push($user);
    }

    /**
     * @param  Collection<int, User>  $rows
     */
    private function reserveDeliveries(Collection $rows): void
    {
        $campaignKey = $this->campaignKey();
        $now = now()->toDateTimeString();

        foreach ($rows->chunk(200) as $chunk) {
            $payload = [];
            $hashes = [];

            foreach ($chunk as $user) {
                $email = WaitingListEmailHash::normalize((string) $user->email);
                $hash = WaitingListEmailHash::digest($email);
                $hashes[] = $hash;
                $payload[] = [
                    'campaign_key' => $campaignKey,
                    'email_hash' => $hash,
                    'user_id' => $user->id,
                    'status' => RegisteredUserEmailDelivery::STATUS_PENDING,
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

            RegisteredUserEmailDelivery::query()->insertOrIgnore($payload);
            RegisteredUserEmailDelivery::query()
                ->where('campaign_key', $campaignKey)
                ->whereIn('email_hash', $hashes)
                ->where('status', '!=', RegisteredUserEmailDelivery::STATUS_SENT)
                ->where(function ($query): void {
                    $query->where('status', '!=', RegisteredUserEmailDelivery::STATUS_SENDING)
                        ->orWhere('updated_at', '<=', now()->subMinutes(2));
                })
                ->update([
                    'status' => RegisteredUserEmailDelivery::STATUS_PENDING,
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
        $rows = RegisteredUserEmailDelivery::query()
            ->where('campaign_key', $campaignKey)
            ->where(function ($query): void {
                $query->where('status', RegisteredUserEmailDelivery::STATUS_SENT)
                    ->orWhere(function ($query): void {
                        $query->whereIn('status', [
                            RegisteredUserEmailDelivery::STATUS_PENDING,
                            RegisteredUserEmailDelivery::STATUS_SENDING,
                        ])->where('updated_at', '>=', now()->subHours(2));
                    });
            })
            ->get(['email_hash', 'status']);

        $sent = [];
        $active = [];
        foreach ($rows as $row) {
            if ($row->status === RegisteredUserEmailDelivery::STATUS_SENT) {
                $sent[(string) $row->email_hash] = true;
            } else {
                $active[(string) $row->email_hash] = true;
            }
        }

        return [$sent, $active];
    }

    /**
     * @return array{unverified: int, invalid: int, duplicate: int, already_sent: int, queued: int, unsubscribed: int}
     */
    private function emptySkipped(): array
    {
        return [
            'unverified' => 0,
            'invalid' => 0,
            'duplicate' => 0,
            'already_sent' => 0,
            'queued' => 0,
            'unsubscribed' => 0,
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

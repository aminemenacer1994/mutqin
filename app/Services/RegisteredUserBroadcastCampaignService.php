<?php

namespace App\Services;

use App\Jobs\DispatchRegisteredUserBroadcastBatchJob;
use App\Models\RegisteredUserEmailDelivery;
use App\Models\User;
use App\Support\WaitingListEmailHash;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

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
     *     skipped: array{unverified: int, invalid: int, duplicate: int, already_sent: int},
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
                DispatchRegisteredUserBroadcastBatchJob::dispatch(
                    $this->campaignKey(),
                    $chunk->pluck('id')->all(),
                )
                    ->onQueue($queue)
                    ->delay(now()->addSeconds($batchIndex * $delaySeconds));
            }

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

        DispatchRegisteredUserBroadcastBatchJob::dispatch(
            $this->campaignKey(),
            [],
            $normalizedTest,
            true,
        )->onQueue((string) config('mutqin.registered_users.broadcast_email.queue', 'default'));

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
        $rows = RegisteredUserEmailDelivery::query()
            ->where('campaign_key', $key)
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return [
            'pending' => (int) ($rows[RegisteredUserEmailDelivery::STATUS_PENDING] ?? 0),
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
     * @param  array{unverified: int, invalid: int, duplicate: int, already_sent: int}  $skipped
     * @param  list<int>|null  $userIds
     * @return Collection<int, User>
     */
    private function collectEligibleRows(array &$skipped, ?array $userIds): Collection
    {
        $campaignKey = $this->campaignKey();
        $sentHashes = RegisteredUserEmailDelivery::query()
            ->where('campaign_key', $campaignKey)
            ->whereIn('status', [
                RegisteredUserEmailDelivery::STATUS_PENDING,
                RegisteredUserEmailDelivery::STATUS_SENT,
            ])
            ->pluck('email_hash')
            ->all();

        $sentHashSet = array_fill_keys($sentHashes, true);
        $seenEmails = [];
        $eligible = collect();

        $query = User::query()->orderBy('id');

        if ($userIds !== null && $userIds !== []) {
            $ids = collect($userIds)->map(fn ($id) => (int) $id)->filter(fn ($id) => $id > 0)->unique()->values()->all();
            $query->whereIn('id', $ids);
        }

        $query->chunkById(500, function ($users) use (&$skipped, &$seenEmails, &$eligible, $sentHashSet): void {
            foreach ($users as $user) {
                $this->classifyUser($user, $skipped, $seenEmails, $sentHashSet, $eligible);
            }
        });

        return $eligible->values();
    }

    /**
     * @param  array{unverified: int, invalid: int, duplicate: int, already_sent: int}  $skipped
     * @param  array<string, true>  $seenEmails
     * @param  array<string, true>  $sentHashSet
     * @param  Collection<int, User>  $eligible
     */
    private function classifyUser(
        User $user,
        array &$skipped,
        array &$seenEmails,
        array $sentHashSet,
        Collection $eligible,
    ): void {
        if ($user->email_verified_at === null) {
            $skipped['unverified']++;

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

        $eligible->push($user);
    }

    /**
     * @param  Collection<int, User>  $rows
     */
    private function reserveDeliveries(Collection $rows): void
    {
        $campaignKey = $this->campaignKey();

        DB::transaction(function () use ($rows, $campaignKey): void {
            foreach ($rows as $user) {
                $email = WaitingListEmailHash::normalize((string) $user->email);
                $hash = WaitingListEmailHash::digest($email);

                $existing = RegisteredUserEmailDelivery::query()
                    ->where('campaign_key', $campaignKey)
                    ->where('email_hash', $hash)
                    ->first();

                if ($existing?->status === RegisteredUserEmailDelivery::STATUS_SENT) {
                    continue;
                }

                if ($existing) {
                    $existing->update([
                        'user_id' => $user->id,
                        'status' => RegisteredUserEmailDelivery::STATUS_PENDING,
                        'skip_reason' => null,
                        'last_error' => null,
                    ]);

                    continue;
                }

                RegisteredUserEmailDelivery::query()->create([
                    'campaign_key' => $campaignKey,
                    'email_hash' => $hash,
                    'user_id' => $user->id,
                    'status' => RegisteredUserEmailDelivery::STATUS_PENDING,
                ]);
            }
        });
    }

    /**
     * @return array{unverified: int, invalid: int, duplicate: int, already_sent: int}
     */
    private function emptySkipped(): array
    {
        return [
            'unverified' => 0,
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

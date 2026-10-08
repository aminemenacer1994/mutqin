<?php

namespace App\Jobs;

use App\Models\MemorisationSyncState;
use App\Models\User;
use App\Services\DashboardService;
use App\Services\LearningStateDeriver;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Projects the saved sync-state blob into normalised learning tables off the
 * request thread. The HTTP response only needs the blob save + hash meta.
 *
 * Loads state from MemorisationSyncState so the jobs table does not carry the
 * full engine blob (already persisted on the sync write).
 */
class DeriveLearningStateJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /**
     * @param  array<string, mixed>|null  $continue
     */
    public function __construct(
        public int $userId,
        public ?string $payloadHash = null,
        public ?array $continue = null,
    ) {}

    public function handle(LearningStateDeriver $deriver): void
    {
        $user = User::query()->find($this->userId);
        if (! $user) {
            return;
        }

        $record = MemorisationSyncState::query()
            ->where('user_id', $user->id)
            ->first(['state', 'payload_hash']);

        if (! $record) {
            return;
        }

        // A newer autosave already landed; that job (or a later one) will project.
        if (
            $this->payloadHash
            && is_string($record->payload_hash)
            && $record->payload_hash !== ''
            && $record->payload_hash !== $this->payloadHash
        ) {
            return;
        }

        $state = json_decode((string) $record->state, true);
        if (! is_array($state)) {
            return;
        }

        try {
            $deriver->derive($user, $state, $this->continue);
        } catch (\Throwable $e) {
            report($e);
        }

        DashboardService::forgetForUser($user);
    }
}

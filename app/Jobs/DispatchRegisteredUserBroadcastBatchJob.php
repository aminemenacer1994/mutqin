<?php

namespace App\Jobs;

use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class DispatchRegisteredUserBroadcastBatchJob implements ShouldQueue
{
    use Queueable;

    /**
     * @param  list<int>  $userIds
     */
    public function __construct(
        public string $campaignKey,
        public array $userIds,
        public ?string $testEmail = null,
        public bool $isTest = false,
    ) {}

    public function handle(): void
    {
        $queue = $this->queue ?? (string) config('mutqin.registered_users.broadcast_email.queue', 'default');

        if ($this->isTest && is_string($this->testEmail) && $this->testEmail !== '') {
            SendRegisteredUserBroadcastEmailJob::dispatch(
                $this->campaignKey,
                null,
                $this->testEmail,
                'Preview recipient',
                true,
            )->onQueue($queue);

            return;
        }

        $users = User::query()
            ->whereIn('id', $this->userIds)
            ->orderBy('id')
            ->get(['id', 'name', 'email']);

        foreach ($users as $user) {
            SendRegisteredUserBroadcastEmailJob::dispatch(
                $this->campaignKey,
                (int) $user->id,
                (string) $user->email,
                (string) $user->name,
                false,
            )->onQueue($queue);
        }
    }
}

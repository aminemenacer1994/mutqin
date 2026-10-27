<?php

namespace App\Jobs;

use App\Models\WaitingListEntry;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class DispatchWaitingListLaunchBatchJob implements ShouldQueue
{
    use Queueable;

    /**
     * @param  list<int>  $entryIds
     */
    public function __construct(
        public string $campaignKey,
        public array $entryIds,
        public ?string $testEmail = null,
        public bool $isTest = false,
    ) {}

    public function handle(): void
    {
        if ($this->isTest && is_string($this->testEmail) && $this->testEmail !== '') {
            SendWaitingListLaunchEmailJob::dispatch(
                $this->campaignKey,
                null,
                $this->testEmail,
                'Waiting list preview',
                true,
            )->onQueue($this->queue ?? (string) config('mutqin.waiting_list.launch_email.queue', 'default'));

            return;
        }

        $queue = $this->queue ?? (string) config('mutqin.waiting_list.launch_email.queue', 'default');

        $entries = WaitingListEntry::query()
            ->whereIn('id', $this->entryIds)
            ->orderBy('id')
            ->get(['id', 'name', 'email']);

        foreach ($entries as $entry) {
            SendWaitingListLaunchEmailJob::dispatch(
                $this->campaignKey,
                (int) $entry->id,
                (string) $entry->email,
                (string) $entry->name,
                false,
            )->onQueue($queue);
        }
    }
}

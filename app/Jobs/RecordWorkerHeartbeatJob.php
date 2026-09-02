<?php

namespace App\Jobs;

use App\Support\Monitoring\HealthHeartbeat;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class RecordWorkerHeartbeatJob implements ShouldQueue
{
    use Queueable;

    public function handle(HealthHeartbeat $heartbeats): void
    {
        $heartbeats->touch(HealthHeartbeat::KIND_WORKER);
    }
}

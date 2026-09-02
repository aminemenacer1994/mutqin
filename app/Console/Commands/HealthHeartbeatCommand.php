<?php

namespace App\Console\Commands;

use App\Jobs\RecordWorkerHeartbeatJob;
use App\Support\Monitoring\HealthHeartbeat;
use Illuminate\Console\Command;

class HealthHeartbeatCommand extends Command
{
    protected $signature = 'mutqin:health-heartbeat';

    protected $description = 'Record scheduler heartbeat and dispatch a queue-worker freshness probe.';

    public function handle(HealthHeartbeat $heartbeats): int
    {
        $heartbeats->touch(HealthHeartbeat::KIND_SCHEDULER);

        $connection = (string) config('queue.default');
        $driver = (string) config("queue.connections.{$connection}.driver", $connection);

        // sync / null / deferred run inline — not evidence of a background worker.
        if (in_array($driver, ['sync', 'null', 'deferred'], true)) {
            $this->line('Scheduler heartbeat recorded (queue worker probe skipped for '.$driver.').');

            return self::SUCCESS;
        }

        RecordWorkerHeartbeatJob::dispatch();
        $this->line('Scheduler heartbeat recorded; worker probe dispatched.');

        return self::SUCCESS;
    }
}

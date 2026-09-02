<?php

namespace App\Console\Commands;

use App\Services\Health\HealthCheckService;
use Illuminate\Console\Command;

class HealthEvaluateCommand extends Command
{
    protected $signature = 'mutqin:health-evaluate';

    protected $description = 'Evaluate health checks and emit rate-limited ops alerts (logs / Sentry).';

    public function handle(HealthCheckService $health): int
    {
        if (! filter_var(config('monitoring.evaluate_enabled', true), FILTER_VALIDATE_BOOL)) {
            $this->line('Health evaluation disabled.');

            return self::SUCCESS;
        }

        $result = $health->evaluateAndAlert();
        $this->line('Health status: '.$result['status']);

        return $result['status'] === 'unavailable' ? self::FAILURE : self::SUCCESS;
    }
}

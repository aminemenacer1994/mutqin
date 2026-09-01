<?php

namespace App\Console\Commands;

use App\Services\SpeechmaticsUsageCap;
use App\Support\MutqinLog;
use Illuminate\Console\Command;

class SpeechmaticsUsageReportCommand extends Command
{
    protected $signature = 'mutqin:speechmatics-usage-report
                            {--user= : Optional user id to include per-user mint counts}';

    protected $description = 'Log a UTC-day Speechmatics mint snapshot for capacity monitoring (no audio stored).';

    public function handle(SpeechmaticsUsageCap $usageCap): int
    {
        if (! $usageCap->isEnabled()) {
            $this->warn('Speechmatics usage cap is disabled; snapshot reflects cache counters only.');

            return self::SUCCESS;
        }

        $userId = $this->option('user') !== null ? (int) $this->option('user') : null;
        $snapshot = $usageCap->usageSnapshot($userId);

        MutqinLog::info('speechmatics.usage.daily_snapshot', $snapshot);

        $global = $snapshot['global'];
        $provider = $snapshot['provider_reference'];

        $this->info(sprintf(
            'UTC %s — global mints: %d / %s (~%.1f session-min); provider reference headroom: %s mints',
            $snapshot['date'],
            $global['used'],
            $global['limit'] ?? 'unset',
            $global['estimated_session_minutes'],
            $provider['headroom_mints'] ?? 'unset (configure SPEECHMATICS_PROVIDER_*)'
        ));

        return self::SUCCESS;
    }
}

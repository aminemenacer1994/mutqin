<?php

namespace App\Console\Commands;

use App\Support\BulkMailQueue;
use Illuminate\Console\Command;

class DeliverCampaignEmailCommand extends Command
{
    protected $signature = 'mutqin:deliver-campaign-email
        {--limit=25 : Maximum messages to submit this run}
        {--max-seconds=20 : Stop after this many seconds}';

    protected $description = 'Send queued registered-user and waiting-list campaign emails in a short batch.';

    public function handle(): int
    {
        $limit = max(1, (int) $this->option('limit'));
        $maxSeconds = max(1, (int) $this->option('max-seconds'));

        $result = BulkMailQueue::deliverPending($limit, $maxSeconds);

        $this->line('Processed '.$result['processed'].' campaign email(s).');

        return self::SUCCESS;
    }
}

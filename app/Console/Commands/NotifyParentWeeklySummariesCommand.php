<?php

namespace App\Console\Commands;

use App\Services\Parent\ParentNoticeService;
use Illuminate\Console\Command;

class NotifyParentWeeklySummariesCommand extends Command
{
    protected $signature = 'mutqin:notify-parent-weekly-summaries {--limit=200 : Maximum guardian links to consider}';

    protected $description = 'Send optional weekly progress summaries to parents who opted in.';

    public function handle(ParentNoticeService $notices): int
    {
        $sent = $notices->weeklySummaries(max(1, (int) $this->option('limit')));
        $this->line('Parent weekly summaries='.$sent.'.');

        return self::SUCCESS;
    }
}

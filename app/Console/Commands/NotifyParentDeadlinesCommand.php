<?php

namespace App\Console\Commands;

use App\Services\Parent\ParentNoticeService;
use Illuminate\Console\Command;

class NotifyParentDeadlinesCommand extends Command
{
    protected $signature = 'mutqin:notify-parent-deadlines {--limit=200 : Maximum assignments to consider}';

    protected $description = 'Notify parents when linked homework is due within two days.';

    public function handle(ParentNoticeService $notices): int
    {
        $sent = $notices->approachingDeadlines(max(1, (int) $this->option('limit')));
        $this->line('Parent deadline notices='.$sent.'.');

        return self::SUCCESS;
    }
}

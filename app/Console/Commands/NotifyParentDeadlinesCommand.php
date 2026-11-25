<?php

namespace App\Console\Commands;

use App\Services\Parent\ParentNoticeService;
use Illuminate\Console\Command;

class NotifyParentDeadlinesCommand extends Command
{
    protected $signature = 'mutqin:notify-parent-deadlines {--limit=200 : Maximum assignments to consider}';

    protected $description = 'Notify parents when linked homework is due soon or overdue.';

    public function handle(ParentNoticeService $notices): int
    {
        $limit = max(1, (int) $this->option('limit'));
        $soon = $notices->approachingDeadlines($limit);
        $overdue = $notices->overdueHomework($limit);
        $this->line('Parent deadline notices='.$soon.', overdue='.$overdue.'.');

        return self::SUCCESS;
    }
}

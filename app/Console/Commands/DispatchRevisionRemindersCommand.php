<?php

namespace App\Console\Commands;

use App\Services\RevisionReminders\RevisionReminderDispatchService;
use Illuminate\Console\Command;

class DispatchRevisionRemindersCommand extends Command
{
    protected $signature = 'mutqin:dispatch-revision-reminders
        {--limit=100 : Maximum reminders to consider this run}';

    protected $description = 'Send in-app and opt-in email notifications for due revision reminders.';

    public function handle(RevisionReminderDispatchService $dispatch): int
    {
        $limit = max(1, (int) $this->option('limit'));
        $result = $dispatch->dispatchDue($limit);

        $this->line(
            'Dispatched in-app='.$result['in_app']
            .' email='.$result['email']
            .' skipped='.$result['skipped']
            .'.'
        );

        return self::SUCCESS;
    }
}

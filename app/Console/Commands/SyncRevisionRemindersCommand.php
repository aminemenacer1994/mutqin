<?php

namespace App\Console\Commands;

use App\Services\RevisionReminders\RevisionReminderSyncService;
use Illuminate\Console\Command;

class SyncRevisionRemindersCommand extends Command
{
    protected $signature = 'mutqin:sync-revision-reminders
        {--limit=200 : Maximum users to sync this run}';

    protected $description = 'Generate and refresh automated revision reminders from progress, teacher tasks, and practice plans.';

    public function handle(RevisionReminderSyncService $sync): int
    {
        $limit = max(1, (int) $this->option('limit'));
        $result = $sync->syncDueUsers($limit);

        $this->line('Synced '.$result['users'].' user(s); upserted '.$result['upserted'].' reminder source(s).');

        return self::SUCCESS;
    }
}

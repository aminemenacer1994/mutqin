<?php

namespace App\Console\Commands;

use App\Models\WaitingListEntry;
use App\Services\AdminDashboardService;
use App\Support\MutqinDomains;
use App\Support\WaitingListDatabase;
use Illuminate\Console\Command;

class WaitingListRestoreCommand extends Command
{
    protected $signature = 'mutqin:waiting-list-restore
                            {--dry-run : Show how many archived signups would be restored}';

    protected $description = 'Restore archived (soft-deleted) waiting-list signups on the configured database.';

    public function handle(): int
    {
        if (! WaitingListDatabase::hasTable()) {
            $this->error('Table waiting_list_entries does not exist on connection ['.WaitingListDatabase::connectionName().'].');

            return self::FAILURE;
        }

        $archived = WaitingListEntry::onlyTrashed()->count();
        $active = WaitingListEntry::query()->count();
        $database = WaitingListDatabase::databaseLabel();

        $this->line("Database [{$database}] — active: {$active}, archived: {$archived}");

        if ($archived === 0) {
            $this->warn('No archived signups to restore.');
            if ($active === 0) {
                $this->line('If you ran migrate:fresh locally, waiting-list rows were dropped permanently.');
                $this->line('Production signups live on the production database — restore from Laravel Cloud DB backup or run this command on production after enabling MUTQIN_SIGNUP_DB_*.');
                $this->line('Admin: '.MutqinDomains::adminUrl('waiting-list'));
            }

            return self::SUCCESS;
        }

        if ($this->option('dry-run')) {
            $this->info("Dry run: would restore {$archived} signup(s).");

            return self::SUCCESS;
        }

        if (! $this->confirm("Restore {$archived} archived signup(s)?", true)) {
            return self::SUCCESS;
        }

        $restored = 0;
        WaitingListEntry::onlyTrashed()
            ->orderBy('id')
            ->chunkById(200, function ($rows) use (&$restored): void {
                foreach ($rows as $row) {
                    $row->restore();
                    $restored++;
                }
            });

        AdminDashboardService::invalidateCaches();

        $this->info("Restored {$restored} signup(s). Active total: ".WaitingListEntry::query()->count());

        return self::SUCCESS;
    }
}

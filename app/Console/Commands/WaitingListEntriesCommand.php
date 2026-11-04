<?php

namespace App\Console\Commands;

use App\Models\WaitingListEntry;
use App\Support\MutqinDomains;
use App\Support\WaitingListDatabase;
use Illuminate\Console\Command;

class WaitingListEntriesCommand extends Command
{
    protected $signature = 'mutqin:waiting-list
                            {--csv : Output as CSV (name,email,joined_at)}';

    protected $description = 'List waiting-list signups from the database this app is connected to.';

    public function handle(): int
    {
        if (! WaitingListDatabase::hasTable()) {
            $this->error('Table waiting_list_entries does not exist on connection ['.WaitingListDatabase::connectionName().']. Run php artisan migrate.');

            return self::FAILURE;
        }

        $database = WaitingListDatabase::databaseLabel();
        $count = WaitingListEntry::query()->count();
        $archived = WaitingListEntry::onlyTrashed()->count();

        if ($count === 0 && $archived === 0) {
            $this->warn("No signups in database [{$database}].");
            $this->line('Live production signups are on the production MySQL cluster, not local phpMyAdmin.');
            $this->line('View them at: '.MutqinDomains::adminUrl('waiting-list').' (admin login)');
            $this->line('If you ran migrate:fresh, local rows were dropped — use a DB backup or production connection.');
            $this->line('Archived signups can be restored with: php artisan mutqin:waiting-list-restore');

            return self::SUCCESS;
        }

        if ($count === 0 && $archived > 0) {
            $this->warn("No active signups in database [{$database}], but {$archived} archived (soft-deleted).");
            $this->line('Restore them with: php artisan mutqin:waiting-list-restore');

            return self::SUCCESS;
        }

        $this->info("Waiting list ({$count} active, {$archived} archived) — database [{$database}]");

        if ($this->option('csv')) {
            $this->line('name,email,joined_at');
            WaitingListEntry::query()
                ->orderBy('id')
                ->each(function (WaitingListEntry $entry): void {
                    $this->line(sprintf(
                        '%s,%s,%s',
                        $this->escapeCsv($entry->name),
                        $this->escapeCsv($entry->email),
                        $entry->created_at?->toIso8601String() ?? ''
                    ));
                });

            return self::SUCCESS;
        }

        $rows = WaitingListEntry::query()
            ->latest()
            ->limit(500)
            ->get(['name', 'email', 'created_at'])
            ->map(fn (WaitingListEntry $entry) => [
                $entry->name,
                $entry->email,
                $entry->created_at?->format('Y-m-d H:i') ?? '',
            ])
            ->all();

        $this->table(['Name', 'Email', 'Joined'], $rows);

        if ($count > 500) {
            $this->comment('Showing latest 500 rows. Use --csv for full export.');
        }

        return self::SUCCESS;
    }

    private function escapeCsv(string $value): string
    {
        if (str_contains($value, ',') || str_contains($value, '"') || str_contains($value, "\n")) {
            return '"'.str_replace('"', '""', $value).'"';
        }

        return $value;
    }
}

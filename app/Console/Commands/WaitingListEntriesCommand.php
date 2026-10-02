<?php

namespace App\Console\Commands;

use App\Models\WaitingListEntry;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

class WaitingListEntriesCommand extends Command
{
    protected $signature = 'mutqin:waiting-list
                            {--csv : Output as CSV (name,email,joined_at)}';

    protected $description = 'List waiting-list signups from the database this app is connected to.';

    public function handle(): int
    {
        if (! Schema::hasTable('waiting_list_entries')) {
            $this->error('Table waiting_list_entries does not exist. Run php artisan migrate.');

            return self::FAILURE;
        }

        $database = (string) config('database.connections.'.config('database.default').'.database');
        $count = WaitingListEntry::query()->count();

        if ($count === 0) {
            $this->warn("No signups in database [{$database}].");
            $this->line('Live signups from mutqin.ai are stored on app.mutqin.ai (Laravel Cloud app DB), not local phpMyAdmin.');
            $this->line('View them at: https://app.mutqin.ai/admin/waiting-list (admin login)');

            return self::SUCCESS;
        }

        $this->info("Waiting list ({$count}) — database [{$database}]");

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

<?php

namespace App\Console\Commands;

use App\Services\MadaniMushaf\MadaniMushafImportService;
use App\Services\MadaniMushaf\MadaniMushafQuranComImportService;
use App\Services\MadaniMushaf\MadaniMushafStorage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class ImportMadaniMushafCommand extends Command
{
    protected $signature = 'mutqin:import-madani-mushaf
                            {--layout= : Path to QUL KFGQPC V2 layout SQLite (resource 10)}
                            {--script= : Path to QUL QPC V2 glyph script SQLite (resource 61)}
                            {--from-qurancom : Import all pages from Quran.com (no QUL download needed)}
                            {--from=1 : First page when using --from-qurancom}
                            {--to=604 : Last page when using --from-qurancom}
                            {--fixtures : Import bundled test fixtures instead of SQLite}
                            {--fixtures-path= : Custom fixtures directory (JSON pages)}';

    protected $description = 'Import KFGQPC V2 1421H Madani Mushaf layout and glyph data from QUL SQLite exports';

    public function handle(
        MadaniMushafImportService $import,
        MadaniMushafQuranComImportService $quranComImport,
        MadaniMushafStorage $storage,
    ): int {
        $this->info('Mutqin Madani Mushaf import (KFGQPC V2 1421H)');

        try {
            if ($this->option('fixtures')) {
                $path = $this->option('fixtures-path')
                    ?: database_path('fixtures/madani-mushaf/pages');
                $this->warn("Importing fixture JSON from: {$path}");
                $summary = $import->importFromFixtureJson($path);
            } elseif ($this->option('from-qurancom')) {
                $from = (int) $this->option('from');
                $to = (int) $this->option('to');
                $this->warn('Importing from Quran.com (bridge — not authoritative QUL layout).');
                $this->line('For production-quality KFGQPC V2 layout, import QUL SQLite when available.');
                $this->newLine();

                $bar = $this->output->createProgressBar(max(1, $to - $from + 1));
                $bar->setFormat(' %current%/%max% [%bar%] %percent:3s%% — page %message%');
                $bar->setMessage((string) $from);
                $bar->start();

                $summary = $quranComImport->importPages($from, $to, function (int $page) use ($bar) {
                    $bar->setMessage((string) $page);
                    $bar->advance();
                });

                $bar->finish();
                $this->newLine(2);
            } else {
                $this->line('Source: Quranic Universal Library — https://qul.tarteel.ai/resources/mushaf-layout/10');

                $layout = $this->option('layout')
                    ?: storage_path('app/madani-mushaf/source/layout.sqlite');
                $script = $this->option('script')
                    ?: storage_path('app/madani-mushaf/source/script.sqlite');

                if (! is_readable($layout) || ! is_readable($script)) {
                    $this->printQulMissingHelp($layout, $script);

                    return self::FAILURE;
                }

                $summary = $import->importFromSqlite($layout, $script);
            }
        } catch (\Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        Cache::flush();

        $this->newLine();
        $this->info('Import complete');
        $this->table(
            ['Metric', 'Count'],
            [
                ['Pages', $summary['pages']],
                ['Lines', $summary['lines']],
                ['Words', $summary['words']],
            ]
        );

        if (! empty($summary['failed'])) {
            $this->warn('Failed pages: '.implode(', ', array_slice($summary['failed'], 0, 20))
                .(count($summary['failed']) > 20 ? '…' : ''));
        }

        if (! empty($summary['errors'])) {
            foreach (array_slice($summary['errors'], 0, 10) as $err) {
                $this->warn($err);
            }
        }

        $this->line('Stored under: '.$storage->pagesPath());

        return empty($summary['failed'] ?? []) ? self::SUCCESS : self::FAILURE;
    }

    private function printQulMissingHelp(string $layout, string $script): void
    {
        $this->error('QUL SQLite files not found.');
        $this->line('');
        $this->line('Option A — Import all 604 pages from Quran.com (no QUL login):');
        $this->line('  php artisan mutqin:import-madani-mushaf --from-qurancom');
        $this->line('');
        $this->line('Option B — Authoritative QUL import (login required on QUL):');
        $this->line('  Layout: https://qul.tarteel.ai/resources/mushaf-layout/10');
        $this->line('  Script: https://qul.tarteel.ai/resources/quran-script/61');
        $this->line('');
        $this->line('Place files at:');
        $this->line('  '.$layout);
        $this->line('  '.$script);
        $this->line('');
        $this->line('Option C — Dev fixtures only (pages 1–2):');
        $this->line('  php artisan mutqin:import-madani-mushaf --fixtures');
    }
}

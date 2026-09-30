<?php

namespace App\Console\Commands;

use App\Support\Mushaf\MushafCatalog;
use App\Support\Mushaf\MushafPageImporter;
use Illuminate\Console\Command;
use InvalidArgumentException;
use Throwable;

class ImportMushafCommand extends Command
{
    protected $signature = 'mushaf:import {edition : Mushaf edition id (for example indopak-15-qudratullah)}';

    protected $description = 'Import a QUL mushaf layout and word script into generated page JSON';

    public function handle(): int
    {
        $editionId = (string) $this->argument('edition');

        try {
            $edition = MushafCatalog::get($editionId);
        } catch (InvalidArgumentException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info(sprintf(
            'Importing %s (%d pages)...',
            $edition->name,
            $edition->expectedPageCount(),
        ));

        try {
            $result = MushafPageImporter::forEdition($edition)->import();
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info(sprintf(
            'Wrote %d page JSON files (~%s), verse-page-map.json (%d verses), and manifest.json.',
            $result['pages'],
            $this->formatBytes($result['bytes']),
            $result['verses'],
        ));

        return self::SUCCESS;
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes < 1024) {
            return $bytes.' B';
        }
        if ($bytes < 1024 * 1024) {
            return round($bytes / 1024, 1).' KB';
        }

        return round($bytes / (1024 * 1024), 2).' MB';
    }
}

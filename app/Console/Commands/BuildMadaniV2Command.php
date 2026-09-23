<?php

namespace App\Console\Commands;

use App\Support\Madani\MadaniV2StaticExporter;
use Illuminate\Console\Command;

class BuildMadaniV2Command extends Command
{
    protected $signature = 'quran:build-madani-v2 {--force : Rewrite every page JSON even if it already exists}';

    protected $description = 'Build browser-ready KFGQPC V2 Madani page JSON under public/quran/madani-v2/pages';

    public function handle(MadaniV2StaticExporter $exporter): int
    {
        $this->info('Building Madani V2 static page data (604 pages + verse index)...');

        $result = $exporter->exportAll((bool) $this->option('force'));

        $this->info(sprintf(
            'Wrote %d page JSON files (~%s) and verse-pages.json.',
            $result['pages'],
            $this->formatBytes($result['bytes'])
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

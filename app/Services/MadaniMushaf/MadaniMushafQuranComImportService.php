<?php

namespace App\Services\MadaniMushaf;

use RuntimeException;

class MadaniMushafQuranComImportService
{
    public function __construct(
        private readonly MadaniMushafStorage $storage,
        private readonly MadaniMushafQuranComFallback $fallback,
    ) {}

    /**
     * @return array{pages:int,lines:int,words:int,errors:array<int,string>,failed:array<int,int>}
     */
    public function importPages(int $from = 1, int $to = 604, ?callable $onProgress = null): array
    {
        if (! $this->fallback->isEnabled()) {
            throw new RuntimeException('Quran.com fallback is disabled (MADANI_MUSHAF_QURANCOM_FALLBACK=false).');
        }

        $start = max(1, min(604, $from));
        $end = max($start, min(604, $to));

        $summary = [
            'pages' => 0,
            'lines' => 0,
            'words' => 0,
            'errors' => [],
            'failed' => [],
        ];

        for ($page = $start; $page <= $end; $page += 1) {
            if ($onProgress) {
                $onProgress($page, $end);
            }

            $payload = $this->fallback->fetchPage($page);
            if ($payload === null) {
                $summary['failed'][] = $page;
                $summary['errors'][] = "Page {$page}: Quran.com fetch failed";

                continue;
            }

            $this->storage->writePage($page, $payload);
            $summary['pages']++;
            $summary['lines'] += count($payload['lines'] ?? []);
            $summary['words'] += array_sum(array_map(
                fn (array $line) => count($line['words'] ?? []),
                $payload['lines'] ?? []
            ));

            // Gentle pacing for upstream API.
            usleep(120000);
        }

        if ($summary['pages'] === 0) {
            throw new RuntimeException('No pages were imported from Quran.com.');
        }

        $this->storage->writeManifest([
            'imported_at' => now()->toIso8601String(),
            'layout_name' => config('madani_mushaf.layout_name').' (Quran.com bridge)',
            'layout_source' => 'qurancom',
            'total_pages' => $summary['pages'],
            'page_range' => [$start, $end],
            'attribution' => [
                ...config('madani_mushaf.attribution'),
                'bridge' => 'Line/word data imported from api.quran.com — replace with QUL SQLite for authoritative KFGQPC V2 layout.',
            ],
        ]);

        return $summary;
    }
}

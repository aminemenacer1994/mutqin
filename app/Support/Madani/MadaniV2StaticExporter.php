<?php

namespace App\Support\Madani;

use RuntimeException;

final class MadaniV2StaticExporter
{
    public function __construct(
        private readonly QpcV2PageAdapter $pages = new QpcV2PageAdapter,
    ) {}

    /**
     * @return array{pages: int, bytes: int, manifest: array<string, mixed>}
     */
    public function exportAll(bool $force = false): array
    {
        $directory = MadaniV2StaticPaths::pagesDirectory();
        if (! is_dir($directory) && ! mkdir($directory, 0755, true) && ! is_dir($directory)) {
            throw new RuntimeException('Could not create Madani V2 public pages directory.');
        }

        $bytes = 0;
        $checksums = [];
        for ($page = QpcV2PageAdapter::MIN_PAGE; $page <= QpcV2PageAdapter::MAX_PAGE; $page++) {
            $path = MadaniV2StaticPaths::pageJsonPath($page);
            if (! $force && is_file($path)) {
                $bytes += (int) filesize($path);
                $checksums[sprintf('%03d', $page)] = hash_file('sha256', $path) ?: '';

                continue;
            }

            $envelope = $this->buildPageEnvelope($page);
            $json = json_encode($envelope, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
            if (file_put_contents($path, $json) === false) {
                throw new RuntimeException("Could not write Madani V2 page JSON for page {$page}.");
            }
            $bytes += strlen($json);
            $checksums[sprintf('%03d', $page)] = hash('sha256', $json);
        }

        $verseIndex = $this->pages->versePageIndex();
        $verseJson = json_encode($verseIndex, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        if (file_put_contents(MadaniV2StaticPaths::versePagesPath(), $verseJson) === false) {
            throw new RuntimeException('Could not write Madani V2 verse-pages.json.');
        }

        $manifest = [
            'version' => 1,
            'generated_at' => gmdate('c'),
            'page_count' => QpcV2PageAdapter::MAX_PAGE,
            'page_min' => QpcV2PageAdapter::MIN_PAGE,
            'page_max' => QpcV2PageAdapter::MAX_PAGE,
            'pages_path' => '/'.MadaniV2StaticPaths::PAGES_DIR,
            'verse_pages_path' => '/'.MadaniV2StaticPaths::VERSE_PAGES_FILE,
            'font_url_pattern' => '/madani/font/p{page}.woff2',
            'checksums' => $checksums,
        ];
        file_put_contents(
            MadaniV2StaticPaths::manifestPath(),
            json_encode($manifest, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)
        );

        $this->validateSamplePages();

        return [
            'pages' => QpcV2PageAdapter::MAX_PAGE,
            'bytes' => $bytes,
            'manifest' => $manifest,
        ];
    }

    /**
     * @return array{page: array<string, mixed>, font_family: string, font_url: string}
     */
    public function buildPageEnvelope(int $pageNumber): array
    {
        return [
            'page' => $this->pages->page($pageNumber),
            'font_family' => QpcV2PageAdapter::pageFontFamily($pageNumber),
            'font_url' => MadaniV2StaticPaths::fontUrl($pageNumber),
        ];
    }

    private function validateSamplePages(): void
    {
        foreach ([1, 2, 6, 300, 603, 604] as $sample) {
            $envelope = MadaniV2StaticPaths::readPageEnvelope($sample);
            if ($envelope === null) {
                throw new RuntimeException("Madani V2 static page {$sample} is missing after export.");
            }
            if ((int) ($envelope['page']['page_number'] ?? 0) !== $sample) {
                throw new RuntimeException("Madani V2 static page {$sample} has mismatched page_number.");
            }
        }
    }
}

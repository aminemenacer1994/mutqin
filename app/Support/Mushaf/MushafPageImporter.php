<?php

namespace App\Support\Mushaf;

use RuntimeException;

/**
 * Import a QUL layout + word script into generated page JSON.
 * Quran text is copied verbatim; missing word mappings fail the import.
 */
final class MushafPageImporter
{
    public function __construct(
        private readonly MushafEdition $edition,
        private readonly QulLayoutAdapter $pages,
    ) {}

    public static function forEdition(MushafEdition $edition): self
    {
        return new self($edition, new QulLayoutAdapter($edition));
    }

    /**
     * @return array{pages: int, bytes: int, verses: int, manifest: array<string, mixed>}
     */
    public function import(): array
    {
        $this->ensureImportMemory();
        $this->pages->assertSequentialPages();

        $pageCount = count($this->pages->pageNumbers());
        if ($pageCount !== $this->edition->expectedPageCount()) {
            throw new RuntimeException(sprintf(
                '%s expected %d pages, found %d.',
                $this->edition->name,
                $this->edition->expectedPageCount(),
                $pageCount,
            ));
        }

        $this->preparePagesDirectory();

        $bytes = 0;
        $checksums = [];
        for ($page = $this->edition->minPage; $page <= $this->edition->maxPage; $page++) {
            $payload = $this->pages->page($page);
            $this->assertPagePayload($payload, $page);

            $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
            $path = $this->edition->pageJsonPath($page);
            if (file_put_contents($path, $json) === false) {
                throw new RuntimeException("Could not write {$this->edition->name} page JSON for page {$page}.");
            }
            $bytes += strlen($json);
            $checksums[(string) $page] = hash('sha256', $json);
        }

        $verseIndex = $this->pages->versePageIndex();
        if ($verseIndex === []) {
            throw new RuntimeException("{$this->edition->name} verse-page map is empty.");
        }

        $verseJson = json_encode($verseIndex, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        if (file_put_contents($this->edition->versePageMapPath(), $verseJson) === false) {
            throw new RuntimeException("Could not write {$this->edition->name} verse-page-map.json.");
        }

        $info = $this->pages->layoutInfo();
        $manifest = [
            'id' => $this->edition->id,
            'name' => $this->edition->name,
            'version' => 1,
            'generatedAt' => gmdate('c'),
            'pageCount' => $this->edition->expectedPageCount(),
            'pageMin' => $this->edition->minPage,
            'pageMax' => $this->edition->maxPage,
            'linesPerPage' => isset($info['lines_per_page']) ? (int) $info['lines_per_page'] : null,
            'fontName' => isset($info['font_name']) ? (string) $info['font_name'] : ($this->edition->source['font'] ?? null),
            'source' => $this->edition->source,
            'pagesPath' => 'pages',
            'versePageMapPath' => 'verse-page-map.json',
            'checksums' => $checksums,
        ];

        $manifestJson = json_encode($manifest, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        if (file_put_contents($this->edition->manifestPath(), $manifestJson) === false) {
            throw new RuntimeException("Could not write {$this->edition->name} manifest.json.");
        }

        $this->validateGeneratedPages();

        return [
            'pages' => $this->edition->expectedPageCount(),
            'bytes' => $bytes,
            'verses' => count($verseIndex),
            'manifest' => $manifest,
        ];
    }

    private function ensureImportMemory(): void
    {
        $limit = ini_get('memory_limit');
        if ($limit === '-1') {
            return;
        }

        $bytes = $this->memoryLimitBytes((string) $limit);
        if ($bytes !== null && $bytes < 256 * 1024 * 1024) {
            ini_set('memory_limit', '256M');
        }
    }

    private function memoryLimitBytes(string $limit): ?int
    {
        if ($limit === '-1') {
            return null;
        }

        if (preg_match('/^(\d+)\s*([KMG])?$/i', trim($limit), $match) !== 1) {
            return null;
        }

        $value = (int) $match[1];
        $unit = strtoupper($match[2] ?? '');

        return match ($unit) {
            'G' => $value * 1024 * 1024 * 1024,
            'M' => $value * 1024 * 1024,
            'K' => $value * 1024,
            default => $value,
        };
    }

    private function preparePagesDirectory(): string
    {
        $pagesDirectory = $this->edition->pagesDirectory();
        if (! is_dir($pagesDirectory) && ! mkdir($pagesDirectory, 0755, true) && ! is_dir($pagesDirectory)) {
            throw new RuntimeException("Could not create {$this->edition->name} generated pages directory.");
        }

        foreach (glob($pagesDirectory.DIRECTORY_SEPARATOR.'*.json') ?: [] as $stale) {
            unlink($stale);
        }

        return $pagesDirectory;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function assertPagePayload(array $payload, int $pageNumber): void
    {
        if ((int) ($payload['pageNumber'] ?? 0) !== $pageNumber) {
            throw new RuntimeException("{$this->edition->name} page {$pageNumber} payload has a mismatched pageNumber.");
        }

        $lines = $payload['lines'] ?? null;
        if (! is_array($lines) || $lines === []) {
            throw new RuntimeException("{$this->edition->name} page {$pageNumber} has no lines.");
        }

        foreach ($lines as $line) {
            if (! is_array($line)) {
                throw new RuntimeException("{$this->edition->name} page {$pageNumber} has a malformed line.");
            }
            foreach ($line['words'] ?? [] as $word) {
                if (! is_array($word) || ! isset($word['wordIndex'], $word['verseKey'], $word['wordPosition'], $word['location'], $word['text'])) {
                    throw new RuntimeException("{$this->edition->name} page {$pageNumber} has a word missing Mutqin interaction fields.");
                }
                if (! is_string($word['text'])) {
                    throw new RuntimeException("{$this->edition->name} page {$pageNumber} has a word with non-string text.");
                }
            }
        }
    }

    private function validateGeneratedPages(): void
    {
        foreach ([$this->edition->minPage, $this->edition->maxPage] as $sample) {
            $path = $this->edition->pageJsonPath($sample);
            if (! is_file($path)) {
                throw new RuntimeException("{$this->edition->name} generated page {$sample} is missing after import.");
            }

            $decoded = json_decode((string) file_get_contents($path), true);
            if (! is_array($decoded) || (int) ($decoded['pageNumber'] ?? 0) !== $sample) {
                throw new RuntimeException("{$this->edition->name} generated page {$sample} is invalid.");
            }
        }

        $written = glob($this->edition->pagesDirectory().DIRECTORY_SEPARATOR.'*.json') ?: [];
        if (count($written) !== $this->edition->expectedPageCount()) {
            throw new RuntimeException(sprintf(
                '%s expected %d generated page files, found %d.',
                $this->edition->name,
                $this->edition->expectedPageCount(),
                count($written),
            ));
        }
    }
}

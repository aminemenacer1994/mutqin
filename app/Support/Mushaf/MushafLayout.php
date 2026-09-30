<?php

namespace App\Support\Mushaf;

use InvalidArgumentException;

/**
 * Runtime mushaf layout descriptor. Page bounds come from the layout, never a global 604.
 */
final class MushafLayout
{
    /**
     * @param  array<string, mixed>  $source
     */
    public function __construct(
        public readonly string $id,
        public readonly string $name,
        public readonly string $variant,
        public readonly int $pageCount,
        public readonly int $defaultLinesPerPage,
        public readonly string $direction,
        public readonly string $fontFamily,
        public readonly string $dataRoot,
        public readonly string $pagesDirectoryName = 'pages',
        public readonly string $versePageMapFile = 'verse-page-map.json',
        public readonly int $pageFilePadding = 0,
        public readonly ?string $publicPagesBase = null,
        public readonly array $source = [],
    ) {
        if ($this->id === '') {
            throw new InvalidArgumentException('Mushaf layout id is required.');
        }
        if ($this->pageCount < 1) {
            throw new InvalidArgumentException("Mushaf layout {$this->id} must declare a page count.");
        }
        if ($this->defaultLinesPerPage < 1) {
            throw new InvalidArgumentException("Mushaf layout {$this->id} must declare default lines per page.");
        }
        if ($this->direction !== 'rtl' && $this->direction !== 'ltr') {
            throw new InvalidArgumentException("Mushaf layout {$this->id} direction must be rtl or ltr.");
        }
    }

    public function minPage(): int
    {
        return 1;
    }

    public function maxPage(): int
    {
        return $this->pageCount;
    }

    public function hasPage(int $pageNumber): bool
    {
        return $pageNumber >= $this->minPage() && $pageNumber <= $this->maxPage();
    }

    public function clampPage(int|float|string|null $pageNumber): int
    {
        $page = (int) $pageNumber;
        if ($page < $this->minPage()) {
            return $this->minPage();
        }
        if ($page > $this->maxPage()) {
            return $this->maxPage();
        }

        return $page;
    }

    public function dataRootPath(): string
    {
        return $this->dataRoot;
    }

    public function pagesDirectory(): string
    {
        return $this->dataRootPath().DIRECTORY_SEPARATOR.$this->pagesDirectoryName;
    }

    public function pageFileName(int $pageNumber): string
    {
        $page = $this->clampPage($pageNumber);
        if ($this->pageFilePadding > 0) {
            return str_pad((string) $page, $this->pageFilePadding, '0', STR_PAD_LEFT).'.json';
        }

        return $page.'.json';
    }

    public function pageJsonPath(int $pageNumber): string
    {
        return $this->pagesDirectory().DIRECTORY_SEPARATOR.$this->pageFileName($pageNumber);
    }

    public function versePageMapPath(): string
    {
        return $this->dataRootPath().DIRECTORY_SEPARATOR.$this->versePageMapFile;
    }

    public function manifestPath(): string
    {
        return $this->dataRootPath().DIRECTORY_SEPARATOR.'manifest.json';
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'variant' => $this->variant,
            'pageCount' => $this->pageCount,
            'defaultLinesPerPage' => $this->defaultLinesPerPage,
            'direction' => $this->direction,
            'fontFamily' => $this->fontFamily,
            'dataRoot' => $this->dataRoot,
            'pagesDirectory' => $this->pagesDirectoryName,
            'versePageMapFile' => $this->versePageMapFile,
            'pageFilePadding' => $this->pageFilePadding,
            'publicPagesBase' => $this->publicPagesBase,
            'source' => $this->source,
        ];
    }
}

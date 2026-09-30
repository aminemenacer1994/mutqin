<?php

namespace App\Support\Mushaf;

/**
 * Catalog entry for a QUL-style mushaf edition (layout DB + word-by-word script).
 */
final class MushafEdition
{
    /**
     * @param  array<string, mixed>  $source
     */
    public function __construct(
        public readonly string $id,
        public readonly string $name,
        public readonly int $minPage,
        public readonly int $maxPage,
        public readonly string $layoutDbRelative,
        public readonly string $wordScriptRelative,
        public readonly string $generatedRelative,
        public readonly array $source = [],
        public readonly ?string $generatedAbsolute = null,
    ) {
        if ($this->minPage < 1 || $this->maxPage < $this->minPage) {
            throw new \InvalidArgumentException("Mushaf edition {$id} has an invalid page range.");
        }
    }

    public function expectedPageCount(): int
    {
        return $this->maxPage - $this->minPage + 1;
    }

    public function layoutDbPath(): string
    {
        return resource_path($this->layoutDbRelative);
    }

    public function wordScriptPath(): string
    {
        return resource_path($this->wordScriptRelative);
    }

    public function generatedDirectory(): string
    {
        return $this->generatedAbsolute ?? resource_path($this->generatedRelative);
    }

    public function pagesDirectory(): string
    {
        return $this->generatedDirectory().DIRECTORY_SEPARATOR.'pages';
    }

    public function pageJsonPath(int $pageNumber): string
    {
        return $this->pagesDirectory().DIRECTORY_SEPARATOR.$pageNumber.'.json';
    }

    public function versePageMapPath(): string
    {
        return $this->generatedDirectory().DIRECTORY_SEPARATOR.'verse-page-map.json';
    }

    public function manifestPath(): string
    {
        return $this->generatedDirectory().DIRECTORY_SEPARATOR.'manifest.json';
    }
}

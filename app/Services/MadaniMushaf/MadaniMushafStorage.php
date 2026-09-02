<?php

namespace App\Services\MadaniMushaf;

use Illuminate\Support\Facades\File;

class MadaniMushafStorage
{
    public function basePath(): string
    {
        return storage_path('app/'.config('madani_mushaf.storage_path'));
    }

    public function pagesPath(): string
    {
        return $this->basePath().'/'.config('madani_mushaf.pages_subdir');
    }

    public function manifestPath(): string
    {
        return $this->basePath().'/'.config('madani_mushaf.manifest_file');
    }

    public function pageFilePath(int $pageNumber): string
    {
        return $this->pagesPath().'/'.max(1, min(604, $pageNumber)).'.json';
    }

    public function ensureDirectories(): void
    {
        File::ensureDirectoryExists($this->pagesPath());
    }

    public function writePage(int $pageNumber, array $payload): void
    {
        $this->ensureDirectories();
        $path = $this->pageFilePath($pageNumber);
        File::put($path, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    }

    public function readPage(int $pageNumber): ?array
    {
        $path = $this->pageFilePath($pageNumber);
        if (! File::exists($path)) {
            return null;
        }

        $decoded = json_decode(File::get($path), true);

        return is_array($decoded) ? $decoded : null;
    }

    public function writeManifest(array $manifest): void
    {
        $this->ensureDirectories();
        File::put($this->manifestPath(), json_encode($manifest, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    }

    public function readManifest(): ?array
    {
        if (! File::exists($this->manifestPath())) {
            return null;
        }

        $decoded = json_decode(File::get($this->manifestPath()), true);

        return is_array($decoded) ? $decoded : null;
    }

    public function importedPageNumbers(): array
    {
        if (! File::isDirectory($this->pagesPath())) {
            return [];
        }

        $pages = [];
        foreach (File::files($this->pagesPath()) as $file) {
            if ($file->getExtension() !== 'json') {
                continue;
            }
            $num = (int) $file->getFilenameWithoutExtension();
            if ($num >= 1 && $num <= 604) {
                $pages[] = $num;
            }
        }

        sort($pages);

        return $pages;
    }

    public function isImported(): bool
    {
        return count($this->importedPageNumbers()) > 0;
    }
}

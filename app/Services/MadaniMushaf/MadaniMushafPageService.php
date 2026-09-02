<?php

namespace App\Services\MadaniMushaf;

use App\Support\QuranMetadata;
use Illuminate\Support\Facades\Cache;

class MadaniMushafPageService
{
    public function __construct(
        private readonly MadaniMushafStorage $storage,
        private readonly MadaniMushafQuranComFallback $fallback,
    ) {}

    public function getPage(int $pageNumber): ?array
    {
        $page = max(1, min(604, $pageNumber));
        $ttl = (int) config('madani_mushaf.cache_ttl');

        return Cache::remember(
            "madani_mushaf_page:{$page}",
            $ttl,
            function () use ($page) {
                $local = $this->storage->readPage($page);
                if ($local !== null) {
                    return $local;
                }

                $built = $this->fallback->fetchPage($page);
                if ($built !== null) {
                    // Lazy-cache so later requests skip the upstream call.
                    $this->storage->writePage($page, $built);
                }

                return $built;
            }
        );
    }

    public function resolvePageFromVerseKey(string $verseKey): ?int
    {
        if (! preg_match('/^(\d+):(\d+)$/', trim($verseKey), $m)) {
            return null;
        }

        return $this->resolvePageFromSurahAyah((int) $m[1], (int) $m[2]);
    }

    public function resolvePageFromSurahAyah(int $surah, int $ayah): ?int
    {
        if (! QuranMetadata::isValidAyah($surah, $ayah)) {
            return null;
        }

        $cacheKey = "madani_mushaf_verse_page:{$surah}:{$ayah}";

        return Cache::remember($cacheKey, 86400, function () use ($surah, $ayah) {
            $fromLocal = $this->resolveFromLocalIndex($surah, $ayah);
            if ($fromLocal !== null) {
                return $fromLocal;
            }

            return $this->fallback->resolveVersePage("{$surah}:{$ayah}");
        });
    }

    public function isAvailable(): bool
    {
        return $this->storage->isImported() || $this->fallback->isEnabled();
    }

    public function manifest(): ?array
    {
        $manifest = $this->storage->readManifest();
        if ($manifest !== null) {
            return $manifest;
        }

        if (! $this->fallback->isEnabled()) {
            return null;
        }

        return [
            'imported' => false,
            'fallback' => 'qurancom',
            'layout_name' => config('madani_mushaf.layout_name'),
            'attribution' => config('madani_mushaf.attribution'),
        ];
    }

    private function resolveFromLocalIndex(int $surah, int $ayah): ?int
    {
        foreach ($this->storage->importedPageNumbers() as $pageNum) {
            $page = $this->storage->readPage($pageNum);
            if (! $page) {
                continue;
            }
            foreach ($page['lines'] ?? [] as $line) {
                foreach ($line['words'] ?? [] as $word) {
                    if ((int) ($word['surahNumber'] ?? 0) === $surah
                        && (int) ($word['ayahNumber'] ?? 0) === $ayah) {
                        return $pageNum;
                    }
                }
            }
        }

        return null;
    }
}

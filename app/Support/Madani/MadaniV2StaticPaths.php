<?php

namespace App\Support\Madani;

final class MadaniV2StaticPaths
{
    public const PAGES_DIR = 'quran/madani-v2/pages';

    public const VERSE_PAGES_FILE = 'quran/madani-v2/verse-pages.json';

    public const MANIFEST_FILE = 'quran/madani-v2/manifest.json';

    public static function pagesDirectory(): string
    {
        return public_path(self::PAGES_DIR);
    }

    public static function pageJsonPath(int $pageNumber): string
    {
        $pageNumber = max(QpcV2PageAdapter::MIN_PAGE, min(QpcV2PageAdapter::MAX_PAGE, $pageNumber));

        return self::pagesDirectory().'/'.str_pad((string) $pageNumber, 3, '0', STR_PAD_LEFT).'.json';
    }

    public static function versePagesPath(): string
    {
        return public_path(self::VERSE_PAGES_FILE);
    }

    public static function manifestPath(): string
    {
        return public_path(self::MANIFEST_FILE);
    }

    public static function fontUrl(int $pageNumber): string
    {
        return '/madani/font/p'.$pageNumber.'.woff2';
    }

    /**
     * @return array{page: array<string, mixed>, font_family: string, font_url: string}|null
     */
    public static function readPageEnvelope(int $pageNumber): ?array
    {
        $path = self::pageJsonPath($pageNumber);
        if (! is_file($path)) {
            return null;
        }

        $decoded = json_decode((string) file_get_contents($path), true);
        if (! is_array($decoded) || ! is_array($decoded['page'] ?? null)) {
            return null;
        }

        return [
            'page' => $decoded['page'],
            'font_family' => (string) ($decoded['font_family'] ?? QpcV2PageAdapter::pageFontFamily($pageNumber)),
            'font_url' => (string) ($decoded['font_url'] ?? self::fontUrl($pageNumber)),
        ];
    }
}

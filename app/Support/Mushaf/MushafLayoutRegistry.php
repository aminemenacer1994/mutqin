<?php

namespace App\Support\Mushaf;

use InvalidArgumentException;

/**
 * Central registry of renderable mushaf layouts.
 * Import-only editions stay in MushafCatalog; this registry is the runtime layout list.
 */
final class MushafLayoutRegistry
{
    public const MADANI_V2 = 'madani-v2';

    public const INDOPAK_15_QUDRATULLAH = 'indopak-15-qudratullah';

    public const DEFAULT_ID = self::MADANI_V2;

    /**
     * @return array<string, MushafLayout>
     */
    public static function all(): array
    {
        return [
            self::MADANI_V2 => self::madaniV2(),
            self::INDOPAK_15_QUDRATULLAH => self::indopak15Qudratullah(),
        ];
    }

    public static function ids(): array
    {
        return array_keys(self::all());
    }

    public static function has(string $id): bool
    {
        return isset(self::all()[$id]);
    }

    public static function default(): MushafLayout
    {
        return self::get(self::DEFAULT_ID);
    }

    public static function get(string $id): MushafLayout
    {
        $layout = self::all()[$id] ?? null;
        if (! $layout instanceof MushafLayout) {
            $known = implode(', ', self::ids());
            throw new InvalidArgumentException(
                "Unknown mushaf layout [{$id}]. Known layouts: {$known}."
            );
        }

        return $layout;
    }

    public static function madaniV2(): MushafLayout
    {
        return new MushafLayout(
            id: self::MADANI_V2,
            name: 'Madani',
            variant: 'V2',
            pageCount: 604,
            defaultLinesPerPage: 15,
            direction: 'rtl',
            fontFamily: 'QCF2',
            dataRoot: public_path('quran/madani-v2'),
            pagesDirectoryName: 'pages',
            versePageMapFile: 'verse-pages.json',
            pageFilePadding: 3,
            publicPagesBase: '/quran/madani-v2/pages',
            source: [
                'kind' => 'qpc-v2-static',
                'layout_db' => 'qpc-v2-15-lines.db',
                'word_script' => 'qpc-v2.json',
            ],
        );
    }

    public static function indopak15Qudratullah(): MushafLayout
    {
        return new MushafLayout(
            id: self::INDOPAK_15_QUDRATULLAH,
            name: 'IndoPak 15 Lines',
            variant: 'Qudratullah',
            pageCount: 610,
            defaultLinesPerPage: 15,
            direction: 'rtl',
            fontFamily: 'IndopakNastaleeq',
            dataRoot: resource_path('quran/indopak-15-qudratullah/generated'),
            pagesDirectoryName: 'pages',
            versePageMapFile: 'verse-page-map.json',
            pageFilePadding: 0,
            publicPagesBase: null,
            source: [
                'kind' => 'generated-qul',
                'layout_db' => 'indopak-15-lines.db',
                'word_script' => 'indopak-nastaleeq.json',
                'font' => 'indopak-nastaleeq',
                'font_family' => IndopakNastaleeqFont::FAMILY,
                'font_url' => IndopakNastaleeqFont::url(),
                'font_path' => IndopakNastaleeqFont::RELATIVE_PATH,
            ],
        );
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function summaries(): array
    {
        return array_values(array_map(
            static fn (MushafLayout $layout): array => $layout->toArray(),
            self::all(),
        ));
    }
}

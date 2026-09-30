<?php

namespace App\Support\Mushaf;

/**
 * Single Unicode IndoPak Nastaleeq face for indopak-15-qudratullah.
 * Distinct from Madani V2 page-specific QPC glyph fonts.
 */
final class IndopakNastaleeqFont
{
    public const FAMILY = 'IndopakNastaleeq';

    public const LAYOUT_ID = MushafLayoutRegistry::INDOPAK_15_QUDRATULLAH;

    public const RELATIVE_PATH = 'quran/indopak-15-qudratullah/source/fonts/indopak-nastaleeq/indopak-nastaleeq.woff2';

    public const PUBLIC_URL = '/indopak/font/indopak-nastaleeq.woff2';

    public static function path(): string
    {
        return resource_path(self::RELATIVE_PATH);
    }

    public static function exists(): bool
    {
        return is_file(self::path());
    }

    public static function url(): string
    {
        return self::PUBLIC_URL;
    }
}

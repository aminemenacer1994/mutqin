<?php

namespace App\Support\Mushaf;

use InvalidArgumentException;

/**
 * Importable QUL mushaf editions.
 * Runtime layouts (including Madani V2) live in MushafLayoutRegistry.
 */
final class MushafCatalog
{
    public const INDOPAK_15_QUDRATULLAH = 'indopak-15-qudratullah';

    /**
     * @return array<string, MushafEdition>
     */
    public static function all(): array
    {
        return [
            self::INDOPAK_15_QUDRATULLAH => self::indopak15Qudratullah(),
        ];
    }

    public static function has(string $id): bool
    {
        return isset(self::all()[$id]);
    }

    public static function get(string $id): MushafEdition
    {
        $edition = self::all()[$id] ?? null;
        if (! $edition instanceof MushafEdition) {
            $known = implode(', ', array_keys(self::all()));
            throw new InvalidArgumentException(
                "Unknown mushaf edition [{$id}]. Known editions: {$known}."
            );
        }

        return $edition;
    }

    public static function indopak15Qudratullah(): MushafEdition
    {
        return new MushafEdition(
            id: self::INDOPAK_15_QUDRATULLAH,
            name: 'IndoPak 15 Lines — Qudratullah',
            minPage: 1,
            maxPage: 610,
            layoutDbRelative: 'quran/indopak-15-qudratullah/source/indopak-15-lines.db',
            wordScriptRelative: 'quran/indopak-15-qudratullah/source/indopak-nastaleeq.json',
            generatedRelative: 'quran/indopak-15-qudratullah/generated',
            source: [
                'layout_db' => 'indopak-15-lines.db',
                'word_script' => 'indopak-nastaleeq.json',
                'font' => 'indopak-nastaleeq',
            ],
        );
    }
}

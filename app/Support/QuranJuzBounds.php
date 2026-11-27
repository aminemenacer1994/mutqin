<?php

namespace App\Support;

/** Standard Madani 30 Juz start points (surah, ayah). */
final class QuranJuzBounds
{
    /**
     * @var list<array{0: int, 1: int}>
     */
    public const STARTS = [
        [1, 1], [2, 142], [2, 253], [3, 93], [4, 24],
        [4, 148], [5, 82], [6, 111], [7, 88], [8, 41],
        [9, 93], [11, 6], [12, 53], [15, 1], [17, 1],
        [18, 75], [21, 1], [23, 1], [25, 21], [27, 56],
        [29, 46], [33, 31], [36, 28], [39, 32], [41, 47],
        [46, 1], [51, 31], [58, 1], [67, 1], [78, 1],
    ];

    /**
     * @return array{start_surah: int, start_ayah: int, end_surah: int, end_ayah: int}
     */
    public static function juzBounds(int $juz): array
    {
        $n = max(1, min(30, $juz));
        [$startSurah, $startAyah] = self::STARTS[$n - 1];
        if ($n === 30) {
            $endSurah = 114;
            $endAyah = QuranMetadata::ayahCount(114) ?? 6;

            return [
                'start_surah' => $startSurah,
                'start_ayah' => $startAyah,
                'end_surah' => $endSurah,
                'end_ayah' => $endAyah,
            ];
        }
        [$nextSurah, $nextAyah] = self::STARTS[$n];
        $end = self::previousAyah($nextSurah, $nextAyah);

        return [
            'start_surah' => $startSurah,
            'start_ayah' => $startAyah,
            'end_surah' => $end['surah'],
            'end_ayah' => $end['ayah'],
        ];
    }

    /**
     * @return array{start_surah: int, start_ayah: int, end_surah: int, end_ayah: int}
     */
    public static function hizbBounds(int $hizb): array
    {
        $hizb = max(1, min(60, $hizb));
        $juz = (int) ceil($hizb / 2);
        $juzRange = self::juzBounds($juz);
        if ($hizb % 2 === 1) {
            $mid = self::midpointAyah($juzRange);

            return [
                'start_surah' => $juzRange['start_surah'],
                'start_ayah' => $juzRange['start_ayah'],
                'end_surah' => $mid['surah'],
                'end_ayah' => $mid['ayah'],
            ];
        }

        $firstHalfEnd = self::midpointAyah($juzRange);
        $afterMid = self::nextAyah($firstHalfEnd['surah'], $firstHalfEnd['ayah']);

        return [
            'start_surah' => $afterMid['surah'],
            'start_ayah' => $afterMid['ayah'],
            'end_surah' => $juzRange['end_surah'],
            'end_ayah' => $juzRange['end_ayah'],
        ];
    }

    /**
     * @param  array{start_surah: int, start_ayah: int, end_surah: int, end_ayah: int}  $bounds
     * @return array{surah: int, ayah: int}
     */
    private static function midpointAyah(array $bounds): array
    {
        $startGlobal = QuranRangeResolver::globalAyahNumber($bounds['start_surah'], $bounds['start_ayah']);
        $endGlobal = QuranRangeResolver::globalAyahNumber($bounds['end_surah'], $bounds['end_ayah']);
        $midGlobal = (int) floor(($startGlobal + $endGlobal) / 2);

        return QuranRangeResolver::fromGlobalAyahNumber($midGlobal);
    }

    /**
     * @return array{surah: int, ayah: int}
     */
    public static function previousAyah(int $surah, int $ayah): array
    {
        if ($ayah > 1) {
            return ['surah' => $surah, 'ayah' => $ayah - 1];
        }
        if ($surah <= 1) {
            return ['surah' => 1, 'ayah' => 1];
        }
        $prevSurah = $surah - 1;
        $count = QuranMetadata::ayahCount($prevSurah) ?? 1;

        return ['surah' => $prevSurah, 'ayah' => $count];
    }

    /**
     * @return array{surah: int, ayah: int}
     */
    public static function nextAyah(int $surah, int $ayah): array
    {
        $max = QuranMetadata::ayahCount($surah) ?? 1;
        if ($ayah < $max) {
            return ['surah' => $surah, 'ayah' => $ayah + 1];
        }
        if ($surah >= 114) {
            return ['surah' => 114, 'ayah' => $max];
        }

        return ['surah' => $surah + 1, 'ayah' => 1];
    }
}
<?php

namespace App\Support;

/**
 * Resolves Qur'an passage pools (surah, juz, hizb, custom) into ordered ayah refs.
 */
final class QuranRangeResolver
{
    /**
     * @return list<array{surah: int, ayah: int, key: string}>
     */
    public static function expandPool(string $poolType, array $config, ?int $fallbackSurah = null, ?int $fallbackAyahStart = null, ?int $fallbackAyahEnd = null): array
    {
        $poolType = strtolower(trim($poolType));
        if ($poolType === '' || $poolType === 'surah') {
            $surah = (int) ($config['surah'] ?? $fallbackSurah ?? 0);
            $from = (int) ($config['ayah_start'] ?? $config['from'] ?? $fallbackAyahStart ?? 1);
            $to = (int) ($config['ayah_end'] ?? $config['to'] ?? $fallbackAyahEnd ?? QuranMetadata::ayahCount($surah) ?? $from);

            return self::expandSurahRange($surah, $from, $to);
        }

        if ($poolType === 'juz') {
            $fromJuz = (int) ($config['from'] ?? $config['juz_from'] ?? 1);
            $toJuz = (int) ($config['to'] ?? $config['juz_to'] ?? $fromJuz);

            return self::expandJuzRange($fromJuz, $toJuz);
        }

        if ($poolType === 'hizb') {
            $fromHizb = (int) ($config['from'] ?? $config['hizb_from'] ?? 1);
            $toHizb = (int) ($config['to'] ?? $config['hizb_to'] ?? $fromHizb);

            return self::expandHizbRange($fromHizb, $toHizb);
        }

        if ($poolType === 'custom') {
            $surah = (int) ($config['surah'] ?? $fallbackSurah ?? 0);
            $from = (int) ($config['ayah_start'] ?? $fallbackAyahStart ?? 1);
            $to = (int) ($config['ayah_end'] ?? $fallbackAyahEnd ?? $from);

            return self::expandSurahRange($surah, $from, $to);
        }

        return [];
    }

    /**
     * @return list<array{surah: int, ayah: int, key: string}>
     */
    public static function expandSurahRange(int $surah, int $from, int $to): array
    {
        if ($surah < 1 || $surah > 114) {
            return [];
        }
        $max = QuranMetadata::ayahCount($surah) ?? 0;
        $start = max(1, min($max, $from));
        $end = max($start, min($max, $to));
        $out = [];
        for ($ayah = $start; $ayah <= $end; $ayah++) {
            $out[] = ['surah' => $surah, 'ayah' => $ayah, 'key' => "{$surah}:{$ayah}"];
        }

        return $out;
    }

    /**
     * @return list<array{surah: int, ayah: int, key: string}>
     */
    public static function expandJuzRange(int $fromJuz, int $toJuz): array
    {
        $from = max(1, min(30, $fromJuz));
        $to = max($from, min(30, $toJuz));
        $start = QuranJuzBounds::juzBounds($from);
        $end = QuranJuzBounds::juzBounds($to);

        return self::expandCrossSurah($start['start_surah'], $start['start_ayah'], $end['end_surah'], $end['end_ayah']);
    }

    /**
     * @return list<array{surah: int, ayah: int, key: string}>
     */
    public static function expandHizbRange(int $fromHizb, int $toHizb): array
    {
        $from = max(1, min(60, $fromHizb));
        $to = max($from, min(60, $toHizb));
        $start = QuranJuzBounds::hizbBounds($from);
        $end = QuranJuzBounds::hizbBounds($to);

        return self::expandCrossSurah($start['start_surah'], $start['start_ayah'], $end['end_surah'], $end['end_ayah']);
    }

    /**
     * @return list<array{surah: int, ayah: int, key: string}>
     */
    public static function expandCrossSurah(int $fromSurah, int $fromAyah, int $toSurah, int $toAyah): array
    {
        $out = [];
        $cursor = ['surah' => $fromSurah, 'ayah' => $fromAyah];
        $endGlobal = self::globalAyahNumber($toSurah, $toAyah);
        $guard = 0;
        while ($guard < 7000) {
            $guard++;
            $key = "{$cursor['surah']}:{$cursor['ayah']}";
            $out[] = ['surah' => $cursor['surah'], 'ayah' => $cursor['ayah'], 'key' => $key];
            if (self::globalAyahNumber($cursor['surah'], $cursor['ayah']) >= $endGlobal) {
                break;
            }
            $cursor = QuranJuzBounds::nextAyah($cursor['surah'], $cursor['ayah']);
        }

        return $out;
    }

    public static function globalAyahNumber(int $surah, int $ayah): int
    {
        $surah = max(1, min(114, $surah));
        $total = 0;
        for ($s = 1; $s < $surah; $s++) {
            $total += QuranMetadata::ayahCount($s) ?? 0;
        }
        $max = QuranMetadata::ayahCount($surah) ?? 1;
        $ayah = max(1, min($max, $ayah));

        return $total + $ayah;
    }

    /**
     * @return array{surah: int, ayah: int}
     */
    public static function fromGlobalAyahNumber(int $global): array
    {
        $global = max(1, min(QuranMetadata::totalAyahCount(), $global));
        $remaining = $global;
        for ($s = 1; $s <= 114; $s++) {
            $count = QuranMetadata::ayahCount($s) ?? 0;
            if ($remaining <= $count) {
                return ['surah' => $s, 'ayah' => $remaining];
            }
            $remaining -= $count;
        }

        return ['surah' => 114, 'ayah' => QuranMetadata::ayahCount(114) ?? 6];
    }

    /**
     * @param  list<array{surah: int, ayah: int, key: string}>  $pool
     * @return array{surah: int, ayah: int}|null
     */
    public static function recitationEnd(array $pool, int $startSurah, int $startAyah, int $lengthAyahs): ?array
    {
        if ($lengthAyahs < 1) {
            return null;
        }
        $keys = array_column($pool, 'key');
        $startKey = "{$startSurah}:{$startAyah}";
        $index = array_search($startKey, $keys, true);
        if ($index === false) {
            return null;
        }
        $endIndex = $index + $lengthAyahs - 1;
        if ($endIndex >= count($pool)) {
            $last = $pool[count($pool) - 1];

            return ['surah' => $last['surah'], 'ayah' => $last['ayah']];
        }
        $end = $pool[$endIndex];

        return ['surah' => $end['surah'], 'ayah' => $end['ayah']];
    }
}
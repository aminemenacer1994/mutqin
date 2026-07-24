<?php

namespace App\Support;

/**
 * Deterministic ayah workload scoring for balanced memorisation ranges.
 *
 * Uses space-delimited Arabic word counts (Tanzil simple-plain) plus a
 * light character-density factor so one very long ayah can fill a set while
 * several short ayat may still fit comfortably.
 */
final class AyahWorkload
{
    /** Target band for a typical new-learning set (word-equivalent score). */
    public const TARGET_MIN = 28;

    public const TARGET_MAX = 52;

    public const TARGET_IDEAL = 38;

    public const MIN_AYAHS = 1;

    public const MAX_AYAHS = 3;

    /** Soft preference when previous session size is known. */
    public const PREFERRED_SIZE_WEIGHT = 0.35;

    /**
     * @var array<int, list<int>>|null
     */
    private static ?array $wordCounts = null;

    public static function wordCount(int $surah, int $ayah): int
    {
        $counts = self::wordCountsForSurah($surah);
        if ($counts === null || $ayah < 1 || $ayah > count($counts)) {
            return self::fallbackWordEstimate($surah, $ayah);
        }

        return max(1, (int) $counts[$ayah - 1]);
    }

    /**
     * Workload score for a single ayah (word-equivalent units).
     */
    public static function ayahScore(int $surah, int $ayah): float
    {
        $words = self::wordCount($surah, $ayah);

        // Long ayat carry a mild extra cost so a single dense ayah can fill the band alone.
        if ($words >= 80) {
            return round($words * 1.15, 2);
        }
        if ($words >= 45) {
            return round($words * 1.08, 2);
        }

        return (float) $words;
    }

    /**
     * @return array{
     *   from: int,
     *   to: int,
     *   count: int,
     *   score: float,
     *   word_count: int,
     *   target_min: int,
     *   target_max: int,
     *   within_band: bool
     * }
     */
    public static function selectBalancedRange(
        int $surah,
        int $from,
        ?int $preferredAyahCount = null,
        ?int $targetMin = null,
        ?int $targetMax = null,
        ?int $targetIdeal = null,
    ): array {
        $ayahCount = QuranMetadata::ayahCount($surah) ?? 0;
        $from = max(1, $from);
        if ($ayahCount < 1 || $from > $ayahCount) {
            return self::emptyRange($from);
        }

        $min = $targetMin ?? self::TARGET_MIN;
        $max = $targetMax ?? self::TARGET_MAX;
        $ideal = $targetIdeal ?? self::TARGET_IDEAL;
        if ($min > $max) {
            [$min, $max] = [$max, $min];
        }

        $remaining = $ayahCount - $from + 1;
        $maxAyahs = min(self::MAX_AYAHS, $remaining);
        $preferred = $preferredAyahCount
            ? max(self::MIN_AYAHS, min($maxAyahs, $preferredAyahCount))
            : null;

        $bestTo = $from;
        $bestScore = self::ayahScore($surah, $from);
        $bestWords = self::wordCount($surah, $from);
        $bestDistance = INF;

        $runningScore = 0.0;
        $runningWords = 0;

        for ($to = $from; $to <= $from + $maxAyahs - 1; $to++) {
            $runningScore += self::ayahScore($surah, $to);
            $runningWords += self::wordCount($surah, $to);
            $count = $to - $from + 1;

            // Prefer landing inside the band; otherwise get as close as possible without overshooting too far.
            $distance = self::bandDistance($runningScore, $min, $max, $ideal);
            if ($preferred !== null) {
                $distance += abs($count - $preferred) * self::PREFERRED_SIZE_WEIGHT;
            }

            $withinBand = $runningScore >= $min && $runningScore <= $max;
            $accept = false;

            if ($count === 1) {
                $accept = true;
            } elseif ($withinBand && $distance <= $bestDistance) {
                $accept = true;
            } elseif ($runningScore < $min && $distance <= $bestDistance) {
                $accept = true;
            } elseif ($runningScore > $max) {
                // Stop once we clearly overshoot unless the previous pick was still below the minimum.
                if ($bestScore < $min) {
                    $accept = true;
                }
                if ($accept) {
                    $bestTo = $to;
                    $bestScore = $runningScore;
                    $bestWords = $runningWords;
                    $bestDistance = $distance;
                }
                break;
            } elseif ($distance < $bestDistance) {
                $accept = true;
            }

            if ($accept) {
                $bestTo = $to;
                $bestScore = $runningScore;
                $bestWords = $runningWords;
                $bestDistance = $distance;
            }

            if ($withinBand && $runningScore >= $ideal && ($preferred === null || $count >= $preferred)) {
                break;
            }
        }

        // If remaining ayat are few and still under max, take them to finish the surah section.
        if ($remaining <= 3 && ($from + $remaining - 1) <= $ayahCount) {
            $end = $ayahCount;
            $score = 0.0;
            $words = 0;
            for ($a = $from; $a <= $end; $a++) {
                $score += self::ayahScore($surah, $a);
                $words += self::wordCount($surah, $a);
            }
            if ($score <= $max * 1.35 || $remaining <= 2) {
                $bestTo = $end;
                $bestScore = $score;
                $bestWords = $words;
            }
        }

        $count = max(1, $bestTo - $from + 1);

        return [
            'from' => $from,
            'to' => $bestTo,
            'count' => $count,
            'score' => round($bestScore, 2),
            'word_count' => $bestWords,
            'target_min' => $min,
            'target_max' => $max,
            'within_band' => $bestScore >= $min && $bestScore <= $max,
        ];
    }

    /**
     * @return array{score: float, word_count: int, ayah_count: int}
     */
    public static function rangeStats(int $surah, int $from, int $to): array
    {
        $from = max(1, $from);
        $to = max($from, $to);
        $score = 0.0;
        $words = 0;
        for ($a = $from; $a <= $to; $a++) {
            $score += self::ayahScore($surah, $a);
            $words += self::wordCount($surah, $a);
        }

        return [
            'score' => round($score, 2),
            'word_count' => $words,
            'ayah_count' => $to - $from + 1,
        ];
    }

    /**
     * @return list<int>|null
     */
    private static function wordCountsForSurah(int $surah): ?array
    {
        if (self::$wordCounts === null) {
            $path = __DIR__.'/data/ayah_word_counts.php';
            self::$wordCounts = is_file($path) ? require $path : [];
        }

        return self::$wordCounts[$surah] ?? null;
    }

    private static function fallbackWordEstimate(int $surah, int $ayah): int
    {
        $ayahCount = QuranMetadata::ayahCount($surah) ?? 1;
        // Longer surahs average denser Madani ayat; short surahs are lighter.
        $base = $ayahCount >= 100 ? 18 : ($ayahCount >= 40 ? 12 : 7);
        // Mild positional variation so ranges stay deterministic without identical scores.
        $jitter = (($surah * 17) + ($ayah * 13)) % 9;

        return max(1, $base + $jitter - 4);
    }

    private static function bandDistance(float $score, int $min, int $max, int $ideal): float
    {
        if ($score >= $min && $score <= $max) {
            return abs($score - $ideal) * 0.25;
        }
        if ($score < $min) {
            return ($min - $score) + abs($ideal - $min) * 0.1;
        }

        return ($score - $max) + abs($ideal - $max) * 0.1;
    }

    /**
     * @return array{
     *   from: int,
     *   to: int,
     *   count: int,
     *   score: float,
     *   word_count: int,
     *   target_min: int,
     *   target_max: int,
     *   within_band: bool
     * }
     */
    private static function emptyRange(int $from): array
    {
        return [
            'from' => $from,
            'to' => $from,
            'count' => 1,
            'score' => 0.0,
            'word_count' => 0,
            'target_min' => self::TARGET_MIN,
            'target_max' => self::TARGET_MAX,
            'within_band' => false,
        ];
    }
}

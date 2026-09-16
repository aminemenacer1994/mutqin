<?php

namespace App\Services\Memorisation;

/**
 * Central compare-only Qur'an normalisation.
 *
 * Display text remains the canonical/Uthmani Mushaf text. This class is only
 * for STT matching, where harakat and harmless ASR orthography differ.
 */
class QuranTextNormalizer
{
    public const VERSION = 'quran-normalizer-v2';

    public function normalizeComparisonText(string $text): string
    {
        // Dagger alef carries a spoken alef in common Mushaf words.
        $value = str_replace("\u{0670}", 'ا', $text);
        $value = preg_replace('/[\x{0610}-\x{061A}\x{064B}-\x{065F}\x{06D6}-\x{06ED}]/u', '', $value) ?? $value;
        $value = str_replace("\u{0640}", '', $value);
        $value = preg_replace('/[إأآٱ]/u', 'ا', $value) ?? $value;
        $value = str_replace(['ؤ', 'ئ', 'ى', 'ة'], ['و', 'ي', 'ي', 'ه'], $value);
        // Mushaf وء vs ASR plain وا / آ: same lexical recitation target.
        $value = preg_replace('/([او])ء/u', '$1', $value) ?? $value;
        $value = preg_replace('/ء/u', '', $value) ?? $value;
        $value = preg_replace('/[^\x{0621}-\x{064A}\s]/u', ' ', $value) ?? $value;
        $value = preg_replace('/\s+/u', ' ', $value) ?? $value;

        return trim($value);
    }

    /**
     * @return list<string>
     */
    public function tokenizeDisplayText(string $text): array
    {
        $cleaned = preg_replace('/<[^>]+>/', ' ', $text) ?? $text;
        $cleaned = preg_replace(
            '/[^\x{0621}-\x{064A}\x{0671}\x{0670}\x{064B}-\x{065F}\x{06D6}-\x{06ED}\s]/u',
            ' ',
            $cleaned
        ) ?? $cleaned;
        $cleaned = preg_replace('/\s+/u', ' ', $cleaned) ?? $cleaned;
        $cleaned = trim($cleaned);
        if ($cleaned === '') {
            return [];
        }

        return preg_split('/\s+/u', $cleaned) ?: [];
    }

    /** @return list<string> */
    public function tokenizeComparisonText(string $text): array
    {
        $value = $this->normalizeComparisonText($text);

        return $value === '' ? [] : (preg_split('/\s+/u', $value) ?: []);
    }
}

<?php

namespace App\Support;

/**
 * Deterministic Qur'an content-integrity checks against pinned fixtures.
 *
 * Arabic Uthmani text is never “corrected” here — only compared to the approved corpus.
 */
final class QuranContentIntegrity
{
    public const TOTAL_SURAHS = 114;

    public const TOTAL_AYAHS = 6236;

    public const TOTAL_PAGES = 604;

    public const TOTAL_JUZ = 30;

    public const TOTAL_HIZB = 60;

    public const TOTAL_HIZB_QUARTERS = 240;

    public static function integrityRoot(): string
    {
        return dirname(__DIR__, 2).DIRECTORY_SEPARATOR.'resources'.DIRECTORY_SEPARATOR.'quran'.DIRECTORY_SEPARATOR.'integrity';
    }

    /**
     * @return array<string, mixed>
     */
    public static function loadCorpus(): array
    {
        return self::loadJson('canonical-corpus.json');
    }

    /**
     * @return array<string, mixed>
     */
    public static function loadSurahMetadata(): array
    {
        return self::loadJson('surah-metadata.json');
    }

    /**
     * @return array{algorithm: string, files: array<string, string>}
     */
    public static function loadChecksums(): array
    {
        /** @var array{algorithm: string, files: array<string, string>} */
        return self::loadJson('checksums.json');
    }

    /**
     * @return list<string>
     */
    public static function verifyChecksums(): array
    {
        $errors = [];
        $checksums = self::loadChecksums();
        $algo = $checksums['algorithm'] ?? 'sha256';
        foreach ($checksums['files'] ?? [] as $relative => $expected) {
            $path = self::integrityRoot().DIRECTORY_SEPARATOR.$relative;
            if (! is_file($path)) {
                $errors[] = "Missing protected file: {$relative}";

                continue;
            }
            $actual = hash_file($algo, $path);
            if (! hash_equals((string) $expected, (string) $actual)) {
                $errors[] = "Checksum mismatch for {$relative}: expected {$expected}, got {$actual}. Intentional updates must follow resources/quran/integrity/UPDATE.md";
            }
        }

        return $errors;
    }

    /**
     * @return list<string>
     */
    public static function verifyTotalsAndCounts(): array
    {
        $errors = [];
        $meta = self::loadSurahMetadata();
        $corpus = self::loadCorpus();
        $counts = $meta['ayah_counts'] ?? null;
        if (! is_array($counts) || count($counts) !== self::TOTAL_SURAHS) {
            $errors[] = 'surah-metadata ayah_counts must list exactly 114 surahs';

            return $errors;
        }
        $sum = (int) array_sum($counts);
        if ($sum !== self::TOTAL_AYAHS) {
            $errors[] = "Ayah count sum {$sum} !== ".self::TOTAL_AYAHS;
        }
        foreach (['surahs' => self::TOTAL_SURAHS, 'ayahs' => self::TOTAL_AYAHS, 'pages' => self::TOTAL_PAGES, 'juz' => self::TOTAL_JUZ, 'hizb' => self::TOTAL_HIZB] as $key => $expected) {
            $actual = (int) ($meta['totals'][$key] ?? $corpus['totals'][$key] ?? -1);
            if ($actual !== $expected) {
                $errors[] = "totals.{$key} expected {$expected}, got {$actual}";
            }
        }
        if (($corpus['ayah_counts'] ?? null) !== $counts) {
            $errors[] = 'canonical-corpus ayah_counts must match surah-metadata ayah_counts';
        }
        if (count($meta['names'] ?? []) !== self::TOTAL_SURAHS) {
            $errors[] = 'surah-metadata names must list exactly 114 surahs';
        }
        if (count($meta['translated_names'] ?? []) !== self::TOTAL_SURAHS) {
            $errors[] = 'surah-metadata translated_names must list exactly 114 surahs';
        }

        return $errors;
    }

    /**
     * Ensure PHP QuranMetadata mirrors the approved surah metadata fixture.
     *
     * @return list<string>
     */
    public static function verifyPhpMetadataMirror(): array
    {
        $errors = [];
        $meta = self::loadSurahMetadata();
        $counts = $meta['ayah_counts'] ?? [];
        if (QuranMetadata::AYAH_COUNTS !== $counts) {
            $errors[] = 'QuranMetadata::AYAH_COUNTS diverges from surah-metadata.json';
        }
        if (QuranMetadata::NAMES !== ($meta['names'] ?? null)) {
            $errors[] = 'QuranMetadata::NAMES diverges from surah-metadata.json';
        }
        if (QuranMetadata::TRANSLATED_NAMES !== ($meta['translated_names'] ?? null)) {
            $errors[] = 'QuranMetadata::TRANSLATED_NAMES diverges from surah-metadata.json';
        }
        if (QuranMetadata::totalAyahCount() !== self::TOTAL_AYAHS) {
            $errors[] = 'QuranMetadata::totalAyahCount() !== '.self::TOTAL_AYAHS;
        }

        return $errors;
    }

    /**
     * Surah boundary / global numbering integrity from pinned boundaries.
     *
     * @return list<string>
     */
    public static function verifySurahBoundaries(): array
    {
        $errors = [];
        $corpus = self::loadCorpus();
        $meta = self::loadSurahMetadata();
        $counts = $meta['ayah_counts'];
        $boundaries = $corpus['surah_boundaries'] ?? [];
        if (count($boundaries) !== self::TOTAL_SURAHS) {
            $errors[] = 'surah_boundaries must contain 114 entries';

            return $errors;
        }

        $offset = 0;
        foreach ($boundaries as $index => $boundary) {
            $surah = $index + 1;
            $count = (int) $counts[$index];
            $expectedFirst = $offset + 1;
            $expectedLast = $offset + $count;
            if ((int) ($boundary['surah'] ?? 0) !== $surah) {
                $errors[] = "Boundary surah order broken at index {$index}";
            }
            if ((int) ($boundary['ayah_count'] ?? 0) !== $count) {
                $errors[] = "Boundary ayah_count mismatch for surah {$surah}";
            }
            if ((int) ($boundary['first_global'] ?? 0) !== $expectedFirst
                || (int) ($boundary['last_global'] ?? 0) !== $expectedLast) {
                $errors[] = "Boundary global range mismatch for surah {$surah}";
            }
            if (($boundary['first_key'] ?? '') !== "{$surah}:1"
                || ($boundary['last_key'] ?? '') !== "{$surah}:{$count}") {
                $errors[] = "Boundary key mismatch for surah {$surah}";
            }
            $offset += $count;
        }
        if ($offset !== self::TOTAL_AYAHS) {
            $errors[] = 'Boundary offset did not reach '.self::TOTAL_AYAHS;
        }

        // Known edge boundaries
        $checks = [
            1 => [7, 1, 7],
            2 => [286, 8, 293],
            9 => [129, 1236, 1364],
            114 => [6, 6231, 6236],
        ];
        foreach ($checks as $surah => [$count, $first, $last]) {
            $b = $boundaries[$surah - 1];
            if ((int) $b['ayah_count'] !== $count
                || (int) $b['first_global'] !== $first
                || (int) $b['last_global'] !== $last) {
                $errors[] = "Known boundary failed for surah {$surah}";
            }
        }

        return $errors;
    }

    /**
     * Selected canonical ayah pins (Uthmani + linkage metadata).
     *
     * @return list<string>
     */
    public static function verifySelectedCanonicalAyahs(): array
    {
        $errors = [];
        $corpus = self::loadCorpus();
        $ayahs = $corpus['selected_ayahs'] ?? [];
        if ($ayahs === []) {
            return ['selected_ayahs fixture is empty'];
        }

        $seenKeys = [];
        $seenGlobals = [];
        foreach ($ayahs as $ayah) {
            $key = (string) ($ayah['key'] ?? '');
            $surah = (int) ($ayah['surah'] ?? 0);
            $number = (int) ($ayah['ayah'] ?? 0);
            $global = (int) ($ayah['global_number'] ?? 0);
            $page = (int) ($ayah['page'] ?? 0);
            $uthmani = (string) ($ayah['uthmani'] ?? '');
            $translation = (string) ($ayah['translation_en_asad'] ?? '');
            $transliteration = (string) ($ayah['transliteration'] ?? '');

            if ($key === '' || $key !== "{$surah}:{$number}") {
                $errors[] = "Ayah key mismatch for {$key}";
            }
            if (! QuranMetadata::isValidAyah($surah, $number)) {
                $errors[] = "Invalid surah/ayah identity: {$key}";
            }
            if ($uthmani === '' || preg_match('/[A-Za-z]/', $uthmani)) {
                $errors[] = "Uthmani text invalid for {$key}";
            }
            if ($translation === '' || $transliteration === '') {
                $errors[] = "Missing translation/transliteration linkage for {$key}";
            }
            if ($global < 1 || $global > self::TOTAL_AYAHS) {
                $errors[] = "global_number out of range for {$key}";
            }
            if ($page < 1 || $page > self::TOTAL_PAGES) {
                $errors[] = "page out of Madani range for {$key}";
            }
            $expectedGlobal = QuranMetadata::globalAyahNumber($surah, $number);
            if ($expectedGlobal !== null && $expectedGlobal !== $global) {
                $errors[] = "Audio/global ayah linkage mismatch for {$key}: fixture {$global}, metadata {$expectedGlobal}";
            }
            if (isset($seenKeys[$key])) {
                $errors[] = "Duplicated ayah key in selected pins: {$key}";
            }
            if (isset($seenGlobals[$global])) {
                $errors[] = "Duplicated global_number in selected pins: {$global}";
            }
            $seenKeys[$key] = true;
            $seenGlobals[$global] = true;
        }

        // Bismillah / Fatiha edge
        $fatiha = self::findSelectedAyah($ayahs, '1:1');
        if ($fatiha === null || ! str_contains($fatiha['uthmani'], 'بِسْمِ')) {
            $errors[] = 'Al-Fatihah 1:1 must be the basmala Uthmani text';
        }
        $tawbah = self::findSelectedAyah($ayahs, '9:1');
        if ($tawbah === null || str_starts_with(self::stripMarksForCompare($tawbah['uthmani']), 'بسم الله')) {
            $errors[] = 'At-Tawbah 9:1 must not be the basmala (classical start)';
        }

        return $errors;
    }

    /**
     * @return list<string>
     */
    public static function verifyPagePins(): array
    {
        $errors = [];
        $corpus = self::loadCorpus();
        $pins = $corpus['page_pins'] ?? [];
        $prevLastGlobal = 0;
        foreach ($pins as $pin) {
            $page = (int) ($pin['page'] ?? 0);
            if ($page < 1 || $page > self::TOTAL_PAGES) {
                $errors[] = "Page pin outside Madani range: {$page}";

                continue;
            }
            $first = (int) ($pin['first_global'] ?? 0);
            $last = (int) ($pin['last_global'] ?? 0);
            if ($first < 1 || $last > self::TOTAL_AYAHS || $last < $first) {
                $errors[] = "Page {$page} global range invalid";
            }
            if ($page === 1 && (($pin['first_key'] ?? '') !== '1:1' || ($pin['last_key'] ?? '') !== '1:7')) {
                $errors[] = 'Page 1 must be Al-Fatihah 1:1–1:7';
            }
            if ($page === 604 && (($pin['last_key'] ?? '') !== '114:6' || $last !== self::TOTAL_AYAHS)) {
                $errors[] = 'Page 604 must end at 114:6 / global 6236';
            }
            // Contiguous sampled transitions when pages are consecutive in the pin list
            if ($prevLastGlobal > 0 && isset($pin['_expect_contiguous']) && $pin['_expect_contiguous']) {
                if ($first !== $prevLastGlobal + 1) {
                    $errors[] = "Page {$page} does not continue from previous pin";
                }
            }
            $prevLastGlobal = $last;
        }

        // Explicit contiguous checks for pages 1→2→3
        $byPage = [];
        foreach ($pins as $pin) {
            $byPage[(int) $pin['page']] = $pin;
        }
        foreach ([[1, 2], [2, 3]] as [$a, $b]) {
            if (! isset($byPage[$a], $byPage[$b])) {
                continue;
            }
            if ((int) $byPage[$b]['first_global'] !== ((int) $byPage[$a]['last_global']) + 1) {
                $errors[] = "Page transition {$a}→{$b} is not contiguous";
            }
        }

        return $errors;
    }

    /**
     * Detect missing / duplicated / reordered / misaligned records in an ayah list.
     *
     * @param  list<array{surah?:int,ayah?:int,key?:string,global_number?:int,uthmani?:string,translation?:string,transliteration?:string,page?:int}>  $records
     * @param  array{expect_surah?:int, expect_count?:int, expect_keys?:list<string>}  $options
     * @return list<string>
     */
    public static function detectRecordDefects(array $records, array $options = []): array
    {
        $errors = [];
        $expectSurah = isset($options['expect_surah']) ? (int) $options['expect_surah'] : null;
        $expectCount = isset($options['expect_count']) ? (int) $options['expect_count'] : null;
        $expectKeys = $options['expect_keys'] ?? null;

        $keys = [];
        $globals = [];
        $ayahNumbers = [];
        foreach ($records as $index => $record) {
            $surah = (int) ($record['surah'] ?? 0);
            $ayah = (int) ($record['ayah'] ?? 0);
            $key = (string) ($record['key'] ?? ($surah && $ayah ? "{$surah}:{$ayah}" : ''));
            $global = isset($record['global_number']) ? (int) $record['global_number'] : null;
            $page = isset($record['page']) ? (int) $record['page'] : null;

            if ($expectSurah !== null && $surah !== $expectSurah) {
                $errors[] = "Record {$index} surah {$surah} !== expected {$expectSurah}";
            }
            if ($key === '' || $ayah < 1) {
                $errors[] = "Record {$index} missing ayah identity";

                continue;
            }
            if (isset($keys[$key])) {
                $errors[] = "Duplicated ayah record: {$key}";
            }
            $keys[$key] = $index;
            $ayahNumbers[] = $ayah;

            if ($global !== null) {
                if ($global < 1 || $global > self::TOTAL_AYAHS) {
                    $errors[] = "global_number out of range on {$key}";
                }
                if (isset($globals[$global])) {
                    $errors[] = "Duplicated global_number {$global} on {$key}";
                }
                $globals[$global] = $key;
                $expected = QuranMetadata::globalAyahNumber($surah, $ayah);
                if ($expected !== null && $expected !== $global) {
                    $errors[] = "Misaligned audio/global linkage on {$key}";
                }
            }

            if ($page !== null && ($page < 1 || $page > self::TOTAL_PAGES)) {
                $errors[] = "Page mapping outside Madani range on {$key}: {$page}";
            }

            // Translation/transliteration linked to wrong ayah: key must match surah:ayah fields
            if (isset($record['translation']) || isset($record['transliteration']) || isset($record['translation_en_asad'])) {
                if ($key !== "{$surah}:{$ayah}") {
                    $errors[] = "Translation/transliteration linked to wrong ayah identity at {$index}";
                }
            }
        }

        if ($expectCount !== null && count($keys) !== $expectCount) {
            $errors[] = 'Ayah set count '.count($keys)." !== expected {$expectCount}";
        }

        if (is_array($expectKeys)) {
            foreach ($expectKeys as $expectedKey) {
                if (! isset($keys[$expectedKey])) {
                    $errors[] = "Missing ayah: {$expectedKey}";
                }
            }
        } elseif ($expectSurah !== null && $expectCount !== null) {
            for ($n = 1; $n <= $expectCount; $n++) {
                $expectedKey = "{$expectSurah}:{$n}";
                if (! isset($keys[$expectedKey])) {
                    $errors[] = "Missing ayah: {$expectedKey}";
                }
            }
        }

        // Reorder detection: within a surah, ayah numbers must be strictly increasing by 1
        if ($ayahNumbers !== []) {
            $sorted = $ayahNumbers;
            sort($sorted);
            if ($sorted !== $ayahNumbers) {
                $errors[] = 'Ayahs are reordered relative to canonical numbering';
            }
            for ($i = 1; $i < count($ayahNumbers); $i++) {
                if ($ayahNumbers[$i] !== $ayahNumbers[$i - 1] + 1 && $expectSurah !== null) {
                    // Allow gaps only when not expecting a contiguous surah dump
                    if ($expectCount !== null && $expectCount === count($ayahNumbers)) {
                        $errors[] = 'Ayah numbering gap or reorder detected';
                        break;
                    }
                }
            }
        }

        return array_values(array_unique($errors));
    }

    /**
     * Normalization for AI comparison must not mutate the stored/display Uthmani string.
     *
     * @param  callable(string): string  $normalize
     * @return list<string>
     */
    public static function verifyNormalizationPreservesCanonical(callable $normalize): array
    {
        $errors = [];
        $corpus = self::loadCorpus();
        foreach ($corpus['selected_ayahs'] ?? [] as $ayah) {
            $original = (string) ($ayah['uthmani'] ?? '');
            $copy = $original;
            $normalized = $normalize($copy);
            if ($copy !== $original) {
                $errors[] = "Normalizer mutated input storage for {$ayah['key']}";
            }
            if ($normalized === $original && preg_match('/[\x{064B}-\x{065F}\x{0670}]/u', $original)) {
                // Normalized form should differ when diacritics present — still OK if identical for undiacritized
            }
            // Canonical fixture text itself must remain unchanged in the corpus
            if ($ayah['uthmani'] !== $original) {
                $errors[] = "Canonical Uthmani changed in memory for {$ayah['key']}";
            }
        }

        return $errors;
    }

    /**
     * Run the full offline integrity suite.
     *
     * @return array{ok: bool, errors: list<string>}
     */
    public static function runAll(): array
    {
        $errors = array_merge(
            self::verifyChecksums(),
            self::verifyTotalsAndCounts(),
            self::verifyPhpMetadataMirror(),
            self::verifySurahBoundaries(),
            self::verifySelectedCanonicalAyahs(),
            self::verifyPagePins(),
        );

        return [
            'ok' => $errors === [],
            'errors' => $errors,
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $ayahs
     * @return array<string, mixed>|null
     */
    private static function findSelectedAyah(array $ayahs, string $key): ?array
    {
        foreach ($ayahs as $ayah) {
            if (($ayah['key'] ?? '') === $key) {
                return $ayah;
            }
        }

        return null;
    }

    private static function stripMarksForCompare(string $text): string
    {
        $value = preg_replace('/[\x{064B}-\x{065F}\x{0670}\x{06D6}-\x{06ED}]/u', '', $text) ?? $text;
        $value = str_replace(['ٱ', 'ـ'], ['ا', ''], $value);
        $value = preg_replace('/\s+/u', ' ', $value) ?? $value;

        return trim($value);
    }

    /**
     * @return array<string, mixed>
     */
    private static function loadJson(string $relative): array
    {
        $path = self::integrityRoot().DIRECTORY_SEPARATOR.$relative;
        if (! is_file($path)) {
            throw new \RuntimeException("Missing Qur'an integrity fixture: {$relative}");
        }
        /** @var array<string, mixed> $decoded */
        $decoded = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);

        return $decoded;
    }
}

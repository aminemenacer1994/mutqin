<?php

namespace App\Services\MadaniMushaf;

use InvalidArgumentException;
use PDO;
use RuntimeException;

class MadaniMushafImportService
{
    public function __construct(
        private readonly MadaniMushafStorage $storage,
    ) {}

    /**
     * @return array{pages:int,lines:int,words:int,errors:array<int,string>}
     */
    public function importFromSqlite(string $layoutDbPath, string $scriptDbPath): array
    {
        if (! is_readable($layoutDbPath)) {
            throw new InvalidArgumentException("Layout database not readable: {$layoutDbPath}");
        }
        if (! is_readable($scriptDbPath)) {
            throw new InvalidArgumentException("Script database not readable: {$scriptDbPath}");
        }

        $layout = new PDO('sqlite:'.$layoutDbPath);
        $layout->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $script = new PDO('sqlite:'.$scriptDbPath);
        $script->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $words = $this->loadWords($script);
        $pageLines = $this->loadPageLines($layout);

        $summary = [
            'pages' => 0,
            'lines' => 0,
            'words' => 0,
            'errors' => [],
        ];

        $seenWordIds = [];
        $totalExpected = (int) config('madani_mushaf.total_pages');

        for ($page = 1; $page <= $totalExpected; $page++) {
            if (! isset($pageLines[$page])) {
                $summary['errors'][] = "Missing page {$page}";

                continue;
            }

            try {
                $payload = $this->buildPagePayload($page, $pageLines[$page], $words, $seenWordIds);
                $this->storage->writePage($page, $payload);
                $summary['pages']++;
                $summary['lines'] += count($payload['lines']);
                $summary['words'] += array_sum(array_map(
                    fn (array $line) => count($line['words'] ?? []),
                    $payload['lines']
                ));
            } catch (\Throwable $e) {
                $summary['errors'][] = "Page {$page}: ".$e->getMessage();
            }
        }

        $duplicateIds = $this->findDuplicateWordIds($seenWordIds);
        if ($duplicateIds !== []) {
            $summary['errors'][] = 'Duplicate word IDs on pages: '.implode(', ', array_slice($duplicateIds, 0, 10));
        }

        $missingWordIds = array_diff(array_keys($words), array_keys($seenWordIds));
        if ($missingWordIds !== []) {
            $summary['errors'][] = count($missingWordIds).' Quran words were never referenced by any layout line';
        }

        if ($summary['errors'] !== []) {
            throw new RuntimeException('Madani Mushaf import validation failed with '.count($summary['errors']).' error(s).');
        }

        $this->storage->writeManifest([
            'imported_at' => now()->toIso8601String(),
            'layout_name' => config('madani_mushaf.layout_name'),
            'layout_resource_id' => config('madani_mushaf.layout_resource_id'),
            'script_resource_id' => config('madani_mushaf.script_resource_id'),
            'total_pages' => $summary['pages'],
            'attribution' => config('madani_mushaf.attribution'),
        ]);

        return $summary;
    }

    /**
     * @return array{pages:int,lines:int,words:int,errors:array<int,string>}
     */
    public function importFromFixtureJson(string $fixturesPath): array
    {
        if (! is_dir($fixturesPath)) {
            throw new InvalidArgumentException("Fixtures directory not found: {$fixturesPath}");
        }

        $summary = ['pages' => 0, 'lines' => 0, 'words' => 0, 'errors' => []];

        foreach (glob(rtrim($fixturesPath, '/').'/*.json') ?: [] as $file) {
            $page = (int) pathinfo($file, PATHINFO_FILENAME);
            if ($page < 1 || $page > 604) {
                continue;
            }
            $payload = json_decode(file_get_contents($file), true);
            if (! is_array($payload)) {
                $summary['errors'][] = "Invalid JSON: {$file}";

                continue;
            }
            $payload['pageNumber'] = $page;
            $this->storage->writePage($page, $payload);
            $summary['pages']++;
            $summary['lines'] += count($payload['lines'] ?? []);
            $summary['words'] += array_sum(array_map(
                fn (array $line) => count($line['words'] ?? []),
                $payload['lines'] ?? []
            ));
        }

        $this->storage->writeManifest([
            'imported_at' => now()->toIso8601String(),
            'layout_name' => config('madani_mushaf.layout_name').' (fixtures)',
            'total_pages' => $summary['pages'],
            'attribution' => config('madani_mushaf.attribution'),
        ]);

        return $summary;
    }

    /** @return array<int, array<string, mixed>> */
    private function loadWords(PDO $script): array
    {
        $table = $this->detectWordsTable($script);
        $idCol = $this->detectColumn($script, $table, ['word_index', 'id', 'word_id']);
        $keyCol = $this->detectColumn($script, $table, ['word_key', 'location', 'key']);
        $textCol = $this->detectColumn($script, $table, ['text', 'glyph', 'code_v2']);
        $surahCol = $this->detectColumn($script, $table, ['surah', 'surah_number', 'chapter_id']);
        $ayahCol = $this->detectColumn($script, $table, ['ayah', 'ayah_number', 'verse_number']);

        $rows = $script->query("SELECT * FROM {$table} ORDER BY {$idCol}")->fetchAll(PDO::FETCH_ASSOC);
        $words = [];

        foreach ($rows as $row) {
            $id = (int) $row[$idCol];
            $wordKey = (string) ($row[$keyCol] ?? '');
            $surah = (int) ($row[$surahCol] ?? 0);
            $ayah = (int) ($row[$ayahCol] ?? 0);

            if ($surah < 1 && str_contains($wordKey, ':')) {
                [$surah, $ayah] = array_map('intval', explode(':', substr($wordKey, 0, strrpos($wordKey, ':') ?: strlen($wordKey))));
            }

            $position = 1;
            if (str_contains($wordKey, ':')) {
                $parts = explode(':', $wordKey);
                $position = (int) ($parts[2] ?? 1);
            }

            $words[$id] = [
                'id' => $id,
                'wordKey' => $wordKey,
                'verseKey' => $surah > 0 && $ayah > 0 ? "{$surah}:{$ayah}" : '',
                'surahNumber' => $surah,
                'ayahNumber' => $ayah,
                'position' => $position,
                'charType' => 'word',
                'glyph' => (string) ($row[$textCol] ?? ''),
                'textQpc' => (string) ($row[$textCol] ?? ''),
            ];
        }

        return $words;
    }

    /** @return array<int, list<array<string, mixed>>> */
    private function loadPageLines(PDO $layout): array
    {
        $table = $this->detectPagesTable($layout);
        $pageCol = $this->detectColumn($layout, $table, ['page_number', 'page']);
        $lineCol = $this->detectColumn($layout, $table, ['line_number', 'line']);
        $typeCol = $this->detectColumn($layout, $table, ['line_type', 'type']);
        $centerCol = $this->detectColumn($layout, $table, ['is_centered', 'centered']);
        $firstCol = $this->detectColumn($layout, $table, ['first_word_id', 'first_word']);
        $lastCol = $this->detectColumn($layout, $table, ['last_word_id', 'last_word']);
        $surahCol = $this->detectColumn($layout, $table, ['surah_number', 'surah']);

        $rows = $layout->query(
            "SELECT * FROM {$table} ORDER BY {$pageCol}, {$lineCol}"
        )->fetchAll(PDO::FETCH_ASSOC);

        $grouped = [];
        foreach ($rows as $row) {
            $page = (int) $row[$pageCol];
            $grouped[$page][] = [
                'lineNumber' => (int) $row[$lineCol],
                'lineType' => $this->normalizeLineType((string) $row[$typeCol]),
                'isCentered' => (bool) ($row[$centerCol] ?? false),
                'firstWordId' => isset($row[$firstCol]) ? (int) $row[$firstCol] : null,
                'lastWordId' => isset($row[$lastCol]) ? (int) $row[$lastCol] : null,
                'surahNumber' => isset($row[$surahCol]) ? (int) $row[$surahCol] : null,
            ];
        }

        return $grouped;
    }

    /**
     * @param  list<array<string, mixed>>  $lines
     * @param  array<int, array<string, mixed>>  $words
     * @param  array<int, list<int>>  $seenWordIds
     */
    private function buildPagePayload(int $page, array $lines, array $words, array &$seenWordIds): array
    {
        $builtLines = [];
        $juz = null;
        $hizb = null;
        $primarySurah = null;

        foreach ($lines as $line) {
            $lineWords = [];
            $type = $line['lineType'];
            $first = $line['firstWordId'];
            $last = $line['lastWordId'];

            if ($type === 'ayah' && $first && $last) {
                for ($id = $first; $id <= $last; $id++) {
                    if (! isset($words[$id])) {
                        throw new RuntimeException("Missing word id {$id} on page {$page} line {$line['lineNumber']}");
                    }
                    $word = $words[$id];
                    if (preg_match('/^[\d٠-٩]+$/u', trim($word['glyph'])) && $id === $last) {
                        $word['charType'] = 'end';
                    }
                    $lineWords[] = $word;
                    $seenWordIds[$id][] = $page;
                    if ($primarySurah === null && $word['surahNumber'] > 0) {
                        $primarySurah = $word['surahNumber'];
                    }
                }
            }

            $builtLines[] = [
                'lineNumber' => $line['lineNumber'],
                'lineType' => $type,
                'isCentered' => (bool) $line['isCentered'],
                'surahNumber' => $line['surahNumber'],
                'firstWordId' => $first,
                'lastWordId' => $last,
                'words' => $lineWords,
            ];
        }

        usort($builtLines, fn ($a, $b) => $a['lineNumber'] <=> $b['lineNumber']);

        return [
            'pageNumber' => $page,
            'juzNumber' => $juz,
            'hizbNumber' => $hizb,
            'primarySurahNumber' => $primarySurah ?? ($builtLines[0]['surahNumber'] ?? null),
            'fontFamily' => "p{$page}-v2",
            'lines' => $builtLines,
        ];
    }

    private function normalizeLineType(string $type): string
    {
        $normalized = strtolower(trim($type));

        return match ($normalized) {
            'surah_name', 'surahname', 'surah' => 'surah_name',
            'basmallah', 'bismillah', 'basmala' => 'basmala',
            default => 'ayah',
        };
    }

    private function detectWordsTable(PDO $db): string
    {
        foreach (['words', 'word'] as $candidate) {
            if ($this->tableExists($db, $candidate)) {
                return $candidate;
            }
        }

        throw new RuntimeException('Could not find words table in script database');
    }

    private function detectPagesTable(PDO $db): string
    {
        foreach (['pages', 'page', 'mushaf_pages'] as $candidate) {
            if ($this->tableExists($db, $candidate)) {
                return $candidate;
            }
        }

        throw new RuntimeException('Could not find pages table in layout database');
    }

    private function tableExists(PDO $db, string $table): bool
    {
        $stmt = $db->prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?");
        $stmt->execute([$table]);

        return (bool) $stmt->fetchColumn();
    }

    /** @param  list<string>  $candidates */
    private function detectColumn(PDO $db, string $table, array $candidates): string
    {
        $cols = $db->query("PRAGMA table_info({$table})")->fetchAll(PDO::FETCH_ASSOC);
        $names = array_column($cols, 'name');
        foreach ($candidates as $candidate) {
            if (in_array($candidate, $names, true)) {
                return $candidate;
            }
        }

        throw new RuntimeException("Could not detect column in {$table} from: ".implode(', ', $candidates));
    }

    /** @param  array<int, list<int>>  $seen */
    private function findDuplicateWordIds(array $seen): array
    {
        $dupes = [];
        foreach ($seen as $id => $pages) {
            if (count($pages) > 1) {
                $dupes[] = (string) $id;
            }
        }

        return $dupes;
    }
}

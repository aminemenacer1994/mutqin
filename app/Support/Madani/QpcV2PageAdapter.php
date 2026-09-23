<?php

namespace App\Support\Madani;

use JsonException;
use PDO;
use RuntimeException;

/**
 * Read-only Madani page adapter for the verified QUL/KFGQPC V2 sources.
 * Does not rewrite glyphs, word order, or the layout database.
 */
final class QpcV2PageAdapter
{
    public const MIN_PAGE = 1;

    public const MAX_PAGE = 604;

    /**
     * @return array{
     *     page_number: int,
     *     font_family: string,
     *     lines: list<array{
     *         line_number: int,
     *         line_type: string,
     *         is_centered: int,
     *         surah_number: int|string,
     *         words: list<array{
     *             id: int,
     *             location: string,
     *             surah: string,
     *             ayah: string,
     *             word: string,
     *             text: string,
     *             page: int,
     *             line: int
     *         }>
     *     }>
     * }
     */
    public function page(int $pageNumber): array
    {
        $pageNumber = $this->assertValidPage($pageNumber);
        $rows = $this->layoutLines($pageNumber);
        if ($rows === []) {
            throw new RuntimeException('QPC V2 page has no layout rows.');
        }

        $wordsById = $this->wordsById($this->requestedWordIds($rows));

        $lines = [];
        foreach ($rows as $row) {
            $lines[] = $this->resolveLine($row, $wordsById, $pageNumber);
        }

        return [
            'page_number' => $pageNumber,
            'font_family' => self::pageFontFamily($pageNumber),
            'lines' => $lines,
        ];
    }

    public function pageOne(): array
    {
        return $this->page(1);
    }

    public static function pageFontFamily(int $pageNumber): string
    {
        $pageNumber = max(self::MIN_PAGE, min(self::MAX_PAGE, $pageNumber));

        return 'QCF2'.str_pad((string) $pageNumber, 3, '0', STR_PAD_LEFT);
    }

    public function pageFontPath(int $pageNumber): string
    {
        $pageNumber = $this->assertValidPage($pageNumber);

        return resource_path('quran/madani-v2/source/fonts/qpc-v2-fonts/p'.$pageNumber.'.woff2');
    }

    /**
     * @return list<int>
     */
    public function resolvablePageNumbers(): array
    {
        $rows = $this->pdo()->query(
            'SELECT DISTINCT page_number FROM pages ORDER BY page_number'
        )->fetchAll();

        $pages = [];
        foreach ($rows as $row) {
            $page = (int) $row['page_number'];
            if ($page < self::MIN_PAGE || $page > self::MAX_PAGE) {
                continue;
            }
            if (! is_file($this->pageFontPath($page))) {
                continue;
            }
            $pages[] = $page;
        }

        return $pages;
    }

    /**
     * @return array<string, int> verse keys (`surah:ayah`) to earliest QPC page containing that ayah
     */
    public function versePageIndex(): array
    {
        static $index = null;
        if (is_array($index)) {
            return $index;
        }

        $wordToPage = $this->wordIdToPageMap();
        $path = resource_path('quran/madani-v2/source/qpc-v2.json');
        if (! is_file($path)) {
            throw new RuntimeException('QPC V2 glyph JSON is missing.');
        }

        static $raw = null;
        $raw ??= (string) file_get_contents($path);
        $pattern = '/\{\s*"id"\s*:\s*(\d+)\s*,\s*"surah"\s*:\s*"([^"]*)"\s*,\s*"ayah"\s*:\s*"([^"]*)"\s*,\s*"word"\s*:\s*"([^"]*)"\s*,\s*"location"\s*:\s*"([^"]*)"\s*,\s*"text"\s*:\s*"((?:\\\\.|[^"\\\\])*)"\s*\}/u';
        $offset = 0;
        $length = strlen($raw);
        $index = [];

        while ($offset < $length) {
            if (! preg_match($pattern, $raw, $match, PREG_OFFSET_CAPTURE, $offset)) {
                break;
            }

            $offset = $match[0][1] + strlen($match[0][0]);
            $id = (int) $match[1][0];
            $page = $wordToPage[$id] ?? null;
            if ($page === null) {
                continue;
            }

            $key = $match[2][0].':'.$match[3][0];
            if (! isset($index[$key]) || $page < $index[$key]) {
                $index[$key] = $page;
            }
        }

        return $index;
    }

    public function resolveMadaniPage(int $surah, int $ayah): int
    {
        return $this->pageForVerse($surah, $ayah);
    }

    public function pageForVerse(int $surah, int $ayah): int
    {
        if ($surah < 1 || $ayah < 1) {
            throw new RuntimeException('Verse coordinates are out of range.');
        }

        $key = $surah.':'.$ayah;
        $page = $this->versePageIndex()[$key] ?? null;
        if ($page === null) {
            throw new RuntimeException("QPC V2 page could not be resolved for {$key}.");
        }

        return $this->assertValidPage($page);
    }

    public function pageForVerseKey(string $verseKey): int
    {
        $parts = explode(':', trim($verseKey), 3);
        if (count($parts) < 2) {
            throw new RuntimeException('Verse key is invalid.');
        }

        return $this->pageForVerse((int) $parts[0], (int) $parts[1]);
    }

    /**
     * @return array<int, int>
     */
    private function wordIdToPageMap(): array
    {
        static $map = null;
        if (is_array($map)) {
            return $map;
        }

        $map = [];
        $rows = $this->pdo()->query(
            'SELECT page_number, first_word_id, last_word_id
             FROM pages
             ORDER BY page_number, line_number'
        )->fetchAll();

        foreach ($rows as $row) {
            if ($this->isBlank($row['first_word_id']) || $this->isBlank($row['last_word_id'])) {
                continue;
            }

            $pageNumber = (int) $row['page_number'];
            $first = (int) $row['first_word_id'];
            $last = (int) $row['last_word_id'];
            for ($id = $first; $id <= $last; $id++) {
                $map[$id] = $pageNumber;
            }
        }

        return $map;
    }

    private function assertValidPage(int $pageNumber): int
    {
        if ($pageNumber < self::MIN_PAGE || $pageNumber > self::MAX_PAGE) {
            throw new RuntimeException('QPC V2 page number is out of range.');
        }

        return $pageNumber;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function pdo(): PDO
    {
        static $pdo = null;
        if ($pdo instanceof PDO) {
            return $pdo;
        }

        $path = resource_path('quran/madani-v2/source/qpc-v2-15-lines.db');
        if (! is_file($path)) {
            throw new RuntimeException('QPC V2 layout database is missing.');
        }

        $pdo = new PDO('sqlite:'.$path, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

        return $pdo;
    }

    private function layoutLines(int $pageNumber): array
    {
        $statement = $this->pdo()->prepare(
            'SELECT page_number, line_number, line_type, is_centered, first_word_id, last_word_id, surah_number
             FROM pages
             WHERE page_number = :page
             ORDER BY line_number'
        );
        $statement->execute(['page' => $pageNumber]);

        return $statement->fetchAll();
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return list<int>
     */
    private function requestedWordIds(array $rows): array
    {
        $ids = [];
        foreach ($rows as $row) {
            if ($this->isBlank($row['first_word_id']) || $this->isBlank($row['last_word_id'])) {
                continue;
            }

            $first = (int) $row['first_word_id'];
            $last = (int) $row['last_word_id'];
            for ($id = $first; $id <= $last; $id++) {
                $ids[] = $id;
            }
        }

        return $ids;
    }

    /**
     * @param  list<int>  $ids
     * @return array<int, array<string, mixed>>
     */
    private function wordsById(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        $path = resource_path('quran/madani-v2/source/qpc-v2.json');
        if (! is_file($path)) {
            throw new RuntimeException('QPC V2 glyph JSON is missing.');
        }

        static $raw = null;
        $raw ??= (string) file_get_contents($path);
        $needed = array_fill_keys($ids, true);
        $words = [];
        $pattern = '/\{\s*"id"\s*:\s*(\d+)\s*,\s*"surah"\s*:\s*"([^"]*)"\s*,\s*"ayah"\s*:\s*"([^"]*)"\s*,\s*"word"\s*:\s*"([^"]*)"\s*,\s*"location"\s*:\s*"([^"]*)"\s*,\s*"text"\s*:\s*"((?:\\\\.|[^"\\\\])*)"\s*\}/u';
        $offset = 0;
        $length = strlen($raw);

        while (count($words) < count($needed) && $offset < $length) {
            if (! preg_match($pattern, $raw, $match, PREG_OFFSET_CAPTURE, $offset)) {
                break;
            }

            $offset = $match[0][1] + strlen($match[0][0]);
            $id = (int) $match[1][0];
            if (! isset($needed[$id])) {
                continue;
            }

            try {
                $text = json_decode('"'.$match[6][0].'"', true, 512, JSON_THROW_ON_ERROR);
            } catch (JsonException $exception) {
                throw new RuntimeException("QPC V2 word {$id} glyph could not be read.", 0, $exception);
            }

            if (! is_string($text)) {
                throw new RuntimeException("QPC V2 word {$id} glyph is missing.");
            }

            $words[$id] = [
                'id' => $id,
                'surah' => $match[2][0],
                'ayah' => $match[3][0],
                'word' => $match[4][0],
                'location' => $match[5][0],
                'text' => $text,
            ];
        }

        return $words;
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  array<int, array<string, mixed>>  $wordsById
     * @return array{
     *     line_number: int,
     *     line_type: string,
     *     is_centered: int,
     *     surah_number: int|string,
     *     words: list<array<string, mixed>>
     * }
     */
    private function resolveLine(array $row, array $wordsById, int $pageNumber): array
    {
        $lineNumber = (int) $row['line_number'];

        return [
            'line_number' => $lineNumber,
            'line_type' => (string) $row['line_type'],
            'is_centered' => (int) $row['is_centered'],
            'surah_number' => $this->isBlank($row['surah_number']) ? '' : (int) $row['surah_number'],
            'words' => $this->resolveWords($row, $wordsById, $pageNumber, $lineNumber),
        ];
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  array<int, array<string, mixed>>  $wordsById
     * @return list<array{
     *     id: int,
     *     location: string,
     *     surah: string,
     *     ayah: string,
     *     word: string,
     *     text: string,
     *     page: int,
     *     line: int
     * }>
     */
    private function resolveWords(array $row, array $wordsById, int $pageNumber, int $lineNumber): array
    {
        $firstBlank = $this->isBlank($row['first_word_id']);
        $lastBlank = $this->isBlank($row['last_word_id']);
        if ($firstBlank && $lastBlank) {
            return [];
        }

        if ($firstBlank || $lastBlank) {
            throw new RuntimeException('QPC V2 line has only one word-id bound set.');
        }

        $first = (int) $row['first_word_id'];
        $last = (int) $row['last_word_id'];
        if ($last < $first) {
            throw new RuntimeException('QPC V2 line word range is reversed.');
        }

        $words = [];
        for ($id = $first; $id <= $last; $id++) {
            $record = $wordsById[$id] ?? null;
            if (! is_array($record)) {
                throw new RuntimeException("QPC V2 word {$id} is missing from qpc-v2.json.");
            }

            $words[] = [
                'id' => (int) $record['id'],
                'location' => (string) $record['location'],
                'surah' => (string) $record['surah'],
                'ayah' => (string) $record['ayah'],
                'word' => (string) $record['word'],
                'text' => (string) $record['text'],
                'page' => $pageNumber,
                'line' => $lineNumber,
            ];
        }

        return $words;
    }

    private function isBlank(mixed $value): bool
    {
        return $value === null || $value === '';
    }
}

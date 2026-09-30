<?php

namespace App\Support\Mushaf;

use JsonException;
use PDO;
use RuntimeException;

/**
 * Read-only QUL layout adapter: pages table + word-by-word script keyed by `id`.
 * Does not rewrite glyphs, word order, or the layout database.
 */
final class QulLayoutAdapter
{
    private ?PDO $pdo = null;

    /** @var array<string, array<int, array<string, mixed>>> */
    private static array $wordScriptsByPath = [];

    public function __construct(
        private readonly MushafEdition $edition,
    ) {}

    /**
     * @return array{pageNumber: int, lines: list<array<string, mixed>>}
     */
    public function page(int $pageNumber): array
    {
        $pageNumber = $this->assertValidPage($pageNumber);
        $rows = $this->layoutLines($pageNumber);
        if ($rows === []) {
            throw new RuntimeException("{$this->edition->name} page {$pageNumber} has no layout rows.");
        }

        $lines = [];
        foreach ($rows as $row) {
            $lines[] = $this->normalizeLine($row, $pageNumber);
        }

        return [
            'pageNumber' => $pageNumber,
            'lines' => $lines,
        ];
    }

    /**
     * @return list<int>
     */
    public function pageNumbers(): array
    {
        $rows = $this->pdo()->query(
            'SELECT DISTINCT page_number FROM pages ORDER BY page_number'
        )->fetchAll();

        $pages = [];
        foreach ($rows as $row) {
            $pages[] = (int) $row['page_number'];
        }

        return $pages;
    }

    /**
     * @return array<string, int> verse keys (`surah:ayah`) to earliest page containing that ayah
     */
    public function versePageIndex(): array
    {
        $wordToPage = $this->wordIdToPageMap();
        $index = [];

        foreach ($this->wordScriptById() as $id => $record) {
            $page = $wordToPage[$id] ?? null;
            if ($page === null) {
                continue;
            }

            $verseKey = $this->verseKey($record);
            if (! isset($index[$verseKey]) || $page < $index[$verseKey]) {
                $index[$verseKey] = $page;
            }
        }

        ksort($index, SORT_NATURAL);

        return $index;
    }

    /**
     * @return array<string, mixed>
     */
    public function layoutInfo(): array
    {
        $row = $this->pdo()->query('SELECT name, number_of_pages, lines_per_page, font_name FROM info LIMIT 1')->fetch();

        return is_array($row) ? $row : [];
    }

    public static function forgetCachedWordScripts(): void
    {
        self::$wordScriptsByPath = [];
    }

    public function assertSequentialPages(): void
    {
        $pages = $this->pageNumbers();
        $expected = range($this->edition->minPage, $this->edition->maxPage);
        if ($pages !== $expected) {
            throw new RuntimeException(sprintf(
                '%s layout pages must be sequential %d–%d; found %d distinct page numbers (min %s, max %s).',
                $this->edition->name,
                $this->edition->minPage,
                $this->edition->maxPage,
                count($pages),
                $pages === [] ? 'none' : (string) $pages[0],
                $pages === [] ? 'none' : (string) $pages[array_key_last($pages)],
            ));
        }
    }

    /**
     * @return array{
     *     lineNumber: int,
     *     type: string,
     *     centered: bool,
     *     surahNumber: int|null,
     *     firstWordId: int|null,
     *     lastWordId: int|null,
     *     words: list<array<string, mixed>>
     * }
     */
    private function normalizeLine(array $row, int $pageNumber): array
    {
        $firstBlank = $this->isBlank($row['first_word_id'] ?? null);
        $lastBlank = $this->isBlank($row['last_word_id'] ?? null);
        $firstWordId = $firstBlank ? null : (int) $row['first_word_id'];
        $lastWordId = $lastBlank ? null : (int) $row['last_word_id'];

        return [
            'lineNumber' => (int) $row['line_number'],
            'type' => (string) $row['line_type'],
            'centered' => ((int) $row['is_centered']) === 1,
            'surahNumber' => $this->isBlank($row['surah_number'] ?? null) ? null : (int) $row['surah_number'],
            'firstWordId' => $firstWordId,
            'lastWordId' => $lastWordId,
            'words' => $this->normalizeWords($row, $pageNumber),
        ];
    }

    /**
     * @return list<array{wordIndex: int, verseKey: string, wordPosition: int, location: string, text: string}>
     */
    private function normalizeWords(array $row, int $pageNumber): array
    {
        $firstBlank = $this->isBlank($row['first_word_id'] ?? null);
        $lastBlank = $this->isBlank($row['last_word_id'] ?? null);
        if ($firstBlank && $lastBlank) {
            return [];
        }

        if ($firstBlank || $lastBlank) {
            throw new RuntimeException(sprintf(
                '%s page %d line %s has only one word-id bound set.',
                $this->edition->name,
                $pageNumber,
                (string) ($row['line_number'] ?? '?'),
            ));
        }

        $first = (int) $row['first_word_id'];
        $last = (int) $row['last_word_id'];
        if ($last < $first) {
            throw new RuntimeException(sprintf(
                '%s page %d line %s word range is reversed (%d–%d).',
                $this->edition->name,
                $pageNumber,
                (string) ($row['line_number'] ?? '?'),
                $first,
                $last,
            ));
        }

        $script = $this->wordScriptById();
        $words = [];
        for ($id = $first; $id <= $last; $id++) {
            $record = $script[$id] ?? null;
            if (! is_array($record)) {
                throw new RuntimeException(sprintf(
                    '%s layout word %d on page %d cannot be mapped to the word-by-word script.',
                    $this->edition->name,
                    $id,
                    $pageNumber,
                ));
            }

            $text = $record['text'] ?? null;
            if (! is_string($text)) {
                throw new RuntimeException(sprintf(
                    '%s word %d has no script text.',
                    $this->edition->name,
                    $id,
                ));
            }

            $location = (string) $record['location'];
            $wordPosition = (int) $record['word'];

            $words[] = [
                'wordIndex' => $id,
                'verseKey' => $this->verseKey($record),
                'wordPosition' => $wordPosition,
                'location' => $location,
                'text' => $text,
            ];
        }

        return $words;
    }

    /**
     * @return array<int, int>
     */
    private function wordIdToPageMap(): array
    {
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

    /**
     * @return list<array<string, mixed>>
     */
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
     * @return array<int, array<string, mixed>>
     */
    /**
     * @return array<int, array<string, mixed>>
     */
    private function wordScriptById(): array
    {
        $path = $this->edition->wordScriptPath();
        if (isset(self::$wordScriptsByPath[$path])) {
            return self::$wordScriptsByPath[$path];
        }

        if (! is_file($path)) {
            throw new RuntimeException("{$this->edition->name} word script is missing.");
        }

        try {
            $decoded = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new RuntimeException("{$this->edition->name} word script could not be parsed.", 0, $exception);
        }

        if (! is_array($decoded)) {
            throw new RuntimeException("{$this->edition->name} word script must be a JSON object.");
        }

        $byId = [];
        foreach ($decoded as $record) {
            if (! is_array($record) || ! isset($record['id'])) {
                continue;
            }

            $id = (int) $record['id'];
            if (isset($byId[$id])) {
                throw new RuntimeException("{$this->edition->name} word script has a duplicate id {$id}.");
            }
            $byId[$id] = [
                'id' => $id,
                'surah' => (string) ($record['surah'] ?? ''),
                'ayah' => (string) ($record['ayah'] ?? ''),
                'word' => (string) ($record['word'] ?? ''),
                'location' => (string) ($record['location'] ?? ''),
                'text' => $record['text'] ?? null,
            ];
        }
        unset($decoded);

        if ($byId === []) {
            throw new RuntimeException("{$this->edition->name} word script has no words.");
        }

        self::$wordScriptsByPath[$path] = $byId;

        return $byId;
    }

    /**
     * @param  array<string, mixed>  $record
     */
    private function verseKey(array $record): string
    {
        $surah = trim((string) ($record['surah'] ?? ''));
        $ayah = trim((string) ($record['ayah'] ?? ''));
        if ($surah === '' || $ayah === '') {
            throw new RuntimeException(sprintf(
                '%s word %s is missing surah/ayah coordinates.',
                $this->edition->name,
                (string) ($record['id'] ?? '?'),
            ));
        }

        return $surah.':'.$ayah;
    }

    private function assertValidPage(int $pageNumber): int
    {
        if ($pageNumber < $this->edition->minPage || $pageNumber > $this->edition->maxPage) {
            throw new RuntimeException("{$this->edition->name} page number is out of range.");
        }

        return $pageNumber;
    }

    private function pdo(): PDO
    {
        if ($this->pdo instanceof PDO) {
            return $this->pdo;
        }

        $path = $this->edition->layoutDbPath();
        if (! is_file($path)) {
            throw new RuntimeException("{$this->edition->name} layout database is missing.");
        }

        $this->pdo = new PDO('sqlite:'.$path, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

        return $this->pdo;
    }

    private function isBlank(mixed $value): bool
    {
        return $value === null || $value === '';
    }
}

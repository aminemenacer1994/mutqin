<?php

namespace App\Services\AskMutqin;

use App\Support\QuranMetadata;

/**
 * Resolves spoken Surah and reciter names onto Mutqin's existing ids.
 * Matching is phonetic so speech-to-text spellings can still land on the
 * canonical name. It does not invent a Surah or a reciter.
 */
final class SessionVoiceNames
{
    /**
     * Ordinary English that must never be treated as a Qur'an name.
     *
     * @var list<string>
     */
    private const SKIP = [
        'play', 'listen', 'recite', 'revise', 'review', 'please', 'slowly', 'slow', 'repeat', 'repeated',
        'repeating', 'verses', 'verse', 'ayah', 'ayahs', 'ayat', 'speed', 'times', 'time', 'first', 'whole',
        'entire', 'full', 'surah', 'surat', 'sura', 'chapter', 'want', 'like', 'help', 'from', 'with', 'half',
        'normal', 'fast', 'using', 'played', 'repetitions', 'repetition', 'can', 'you', 'the', 'and', 'for',
        'that', 'this', 'your', 'just', 'would', 'could', 'lets', 'let', 'make', 'actually', 'mean', 'wait',
        'instead', 'rather', 'onwards', 'onward', 'through', 'until', 'between', 'starting', 'start', 'again',
        'memorise', 'memorize', 'test', 'set', 'reciter', 'qari', 'sheikh', 'shaykh',
    ];

    /** @var array<string, list<int>>|null */
    private static ?array $surahIndex = null;

    /** @var array<string, list<string>>|null */
    private static ?array $reciterIndex = null;

    /**
     * @return list<array{id: int, at: int}>
     */
    public function surahHits(string $latin): array
    {
        $hits = [];
        foreach ($this->windows($latin) as $window) {
            $key = $window['key'];
            if ($key === '' || ! isset($this->surahIndex()[$key])) {
                continue;
            }
            foreach ($this->surahIndex()[$key] as $id) {
                $hits[] = ['id' => $id, 'at' => $window['at']];
            }
        }

        return $hits;
    }

    /**
     * @return list<array{id: string, at: int}>
     */
    public function reciterHits(string $latin): array
    {
        $index = $this->reciterIndex();
        $hits = [];
        foreach ($this->windows($latin) as $window) {
            $key = $window['key'];
            $ids = $index[$key] ?? (($window['words'] ?? 0) === 1 ? $this->nearIds($index, $key) : []);
            foreach ($ids as $id) {
                $hits[] = ['id' => $id, 'at' => $window['at']];
            }
        }

        return $hits;
    }

    /**
     * One-letter phonetic slips ("Sudice" → Sudais) count only when a single
     * reciter is that close. A tie is left unresolved.
     *
     * @param  array<string, list<string>>  $index
     * @return list<string>
     */
    private function nearIds(array $index, string $key): array
    {
        if (strlen($key) < 3) {
            return [];
        }

        $ids = [];
        foreach ($index as $candidate => $candidateIds) {
            if (strlen((string) $candidate) !== strlen($key) || levenshtein((string) $candidate, $key) !== 1) {
                continue;
            }
            foreach ($candidateIds as $id) {
                $ids[(string) $id] = $id;
            }
        }

        return count($ids) === 1 ? array_values($ids) : [];
    }

    /**
     * @return list<array{key: string, at: int, words: int}>
     */
    private function windows(string $latin): array
    {
        $parts = preg_split('/\s+/', trim($latin)) ?: [];
        $words = [];
        $offset = 0;
        $cursor = 0;
        foreach ($parts as $word) {
            if ($word === '') {
                continue;
            }
            $at = strpos($latin, $word, $cursor);
            if ($at === false) {
                $at = $offset;
            }
            $words[] = ['word' => $word, 'at' => (int) $at];
            $cursor = (int) $at + strlen($word);
            $offset = $cursor;
        }

        $windows = [];
        $count = count($words);
        for ($start = 0; $start < $count; $start++) {
            for ($length = 1; $length <= 4 && $start + $length <= $count; $length++) {
                $slice = array_slice($words, $start, $length);
                $tokens = array_map(fn (array $row) => $row['word'], $slice);
                if ($this->skippable($tokens)) {
                    continue;
                }
                $key = $this->key(implode(' ', $tokens));
                if (strlen($key) < 3) {
                    continue;
                }
                $windows[] = ['key' => $key, 'at' => $slice[0]['at'], 'words' => $length];
            }
        }

        return $windows;
    }

    /**
     * @param  list<string>  $tokens
     */
    private function skippable(array $tokens): bool
    {
        foreach ($tokens as $token) {
            if (! in_array($token, self::SKIP, true)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @return array<string, list<int>>
     */
    private function surahIndex(): array
    {
        if (self::$surahIndex !== null) {
            return self::$surahIndex;
        }

        $index = [];
        foreach (QuranMetadata::NAMES as $offset => $name) {
            $this->indexPhrase($index, $name, $offset + 1);
            $folded = strtolower(str_replace(['ʿ', 'ʾ', "'", '’', '-', '–'], ' ', $name));
            $stripped = trim((string) preg_replace('/^(al|ar|as|ash|at|an|ad|adh|az|the)\s+/', '', $folded));
            if ($stripped !== '' && $stripped !== $folded) {
                $this->indexPhrase($index, $stripped, $offset + 1);
            }
        }
        foreach (QuranMetadata::TRANSLATED_NAMES as $offset => $name) {
            if (! str_contains($name, ' ') || strlen($name) < 8) {
                continue;
            }
            $this->indexPhrase($index, $name, $offset + 1);
        }

        self::$surahIndex = $index;

        return self::$surahIndex;
    }

    /**
     * @return array<string, list<string>>
     */
    private function reciterIndex(): array
    {
        if (self::$reciterIndex !== null) {
            return self::$reciterIndex;
        }

        $index = [];
        foreach (CommandValidator::RECITERS as $id => $name) {
            $plain = trim((string) preg_replace('/\s*\(.*?\)/', '', $name));
            $this->indexPhrase($index, $plain, $id);
            foreach (preg_split('/\s+/', strtolower($plain)) ?: [] as $token) {
                $token = trim((string) $token, "-'");
                if (strlen($token) < 5 || $this->genericReciterToken($token)) {
                    continue;
                }
                $this->indexPhrase($index, $token, $id);
            }
        }

        self::$reciterIndex = $index;

        return self::$reciterIndex;
    }

    /**
     * @param  array<string, list<int|string>>  $index
     */
    private function indexPhrase(array &$index, string $phrase, int|string $id): void
    {
        $key = $this->key($phrase);
        if (strlen($key) < 3) {
            return;
        }
        $index[$key] ??= [];
        if (! in_array($id, $index[$key], true)) {
            $index[$key][] = $id;
        }
    }

    private function genericReciterToken(string $token): bool
    {
        return in_array($token, [
            'abdul', 'rahman', 'ahmed', 'mahmoud', 'khalil', 'rashid', 'mohamed',
            'siddiq', 'abdullah', 'ayman', 'shahriar', 'saud', 'abdur',
        ], true);
    }

    private function key(string $phrase): string
    {
        $text = strtolower($phrase);
        $text = str_replace(['ʿ', 'ʾ', "'", '’', '‘', '`', '-', '–', '.'], ' ', $text);
        $text = (string) preg_replace('/[^a-z\s]+/', ' ', $text);
        $text = (string) preg_replace('/\balpha\b/', 'alfa', $text);
        $words = preg_split('/\s+/', trim($text)) ?: [];
        $parts = [];
        foreach ($words as $word) {
            if ($word === '') {
                continue;
            }
            if (in_array($word, ['al', 'ar', 'as', 'ash', 'at', 'an', 'ad', 'adh', 'az', 'the', 'el'], true)) {
                continue;
            }
            if (str_starts_with($word, 'al') && strlen($word) > 4) {
                $word = substr($word, 2);
            }
            $word = strtr($word, [
                'ph' => 'f', 'kh' => 'k', 'gh' => 'g', 'dh' => 'd', 'th' => 't', 'sh' => 's', 'ch' => 'k',
                'ee' => 'i', 'oo' => 'u', 'ai' => 'a', 'ay' => 'a', 'ei' => 'a', 'ie' => 'i', 'ou' => 'u',
            ]);
            $word = str_replace(['q', 'c'], ['k', 'k'], $word);
            $word = (string) preg_replace('/[aeiouhw]/', '', $word);
            if ($word !== '' && ! str_starts_with($word, 'y')) {
                $word = str_replace('y', '', $word);
            } else {
                $word = substr($word, 0, 1).str_replace('y', '', substr($word, 1));
            }
            $word = (string) preg_replace('/(.)\1+/', '$1', $word);
            if ($word !== '') {
                $parts[] = $word;
            }
        }

        return implode('', $parts);
    }
}

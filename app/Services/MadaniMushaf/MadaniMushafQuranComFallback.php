<?php

namespace App\Services\MadaniMushaf;

use App\Support\ErrorReporting;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Builds Madani Mushaf page payloads from Quran.com when QUL-imported JSON is missing.
 * Results are cached locally on first fetch.
 */
class MadaniMushafQuranComFallback
{
    private const BASE_URL = 'https://api.quran.com/api/v4/';

    public function isEnabled(): bool
    {
        return (bool) config('madani_mushaf.qurancom_fallback', true);
    }

    public function fetchPage(int $pageNumber): ?array
    {
        if (! $this->isEnabled()) {
            return null;
        }

        $page = max(1, min(604, $pageNumber));

        try {
            $response = Http::timeout(25)
                ->acceptJson()
                ->withHeaders([
                    'User-Agent' => 'MutqinMadaniMushaf/1.0',
                    'Accept' => 'application/json',
                ])
                ->get(self::BASE_URL.'verses/by_page/'.$page, [
                    'words' => 'true',
                    'language' => 'en',
                    'per_page' => 50,
                    'word_fields' => 'code_v2,text_uthmani,text_qpc_hafs,line_number,page_number,char_type_name,position',
                    'fields' => 'verse_key,juz_number,hizb_number,page_number',
                ]);
        } catch (ConnectionException) {
            ErrorReporting::reportProviderFailure('quran.com', [
                'feature' => 'mushaf',
                'status' => 0,
                'reason' => 'connection',
                'operation' => 'fetch_page',
                'page' => $page,
            ]);

            return null;
        }

        if (! $response->successful()) {
            ErrorReporting::reportProviderFailure('quran.com', [
                'feature' => 'mushaf',
                'status' => $response->status(),
                'reason' => 'upstream_http',
                'operation' => 'fetch_page',
                'page' => $page,
            ]);

            return null;
        }

        $verses = $response->json('verses') ?? [];
        if ($verses === []) {
            return null;
        }

        return $this->buildPagePayload($page, $verses);
    }

    public function resolveVersePage(string $verseKey): ?int
    {
        if (! $this->isEnabled() || ! preg_match('/^(\d+):(\d+)$/', trim($verseKey), $m)) {
            return null;
        }

        try {
            $response = Http::timeout(15)
                ->acceptJson()
                ->withHeaders(['User-Agent' => 'MutqinMadaniMushaf/1.0'])
                ->get(self::BASE_URL.'verses/by_key/'.urlencode($verseKey), [
                    'fields' => 'page_number,verse_key',
                ]);
        } catch (ConnectionException) {
            ErrorReporting::reportProviderFailure('quran.com', [
                'feature' => 'mushaf',
                'status' => 0,
                'reason' => 'connection',
                'operation' => 'resolve_verse',
            ]);

            return null;
        }

        if (! $response->successful()) {
            ErrorReporting::reportProviderFailure('quran.com', [
                'feature' => 'mushaf',
                'status' => $response->status(),
                'reason' => 'upstream_http',
                'operation' => 'resolve_verse',
            ]);

            return null;
        }

        $page = (int) ($response->json('verse.page_number') ?? 0);

        return $page >= 1 && $page <= 604 ? $page : null;
    }

    /** @param  list<array<string, mixed>>  $verses */
    private function buildPagePayload(int $pageNumber, array $verses): array
    {
        $lineWords = [];

        foreach ($verses as $verse) {
            $verseKey = (string) ($verse['verse_key'] ?? '');
            if ($verseKey === '') {
                continue;
            }
            [$surah, $ayah] = array_map('intval', explode(':', $verseKey) + [0, 0]);

            foreach ($verse['words'] ?? [] as $word) {
                $lineNumber = (int) ($word['line_number'] ?? 0);
                if ($lineNumber < 1) {
                    continue;
                }

                $position = (int) ($word['position'] ?? 0);
                $charType = (string) ($word['char_type_name'] ?? 'word');
                $glyph = (string) ($word['code_v2'] ?? $word['text_uthmani'] ?? '');

                $lineWords[$lineNumber][] = [
                    'id' => (int) ($word['id'] ?? 0),
                    'wordKey' => "{$verseKey}:{$position}",
                    'verseKey' => $verseKey,
                    'surahNumber' => $surah,
                    'ayahNumber' => $ayah,
                    'position' => $position,
                    'charType' => $charType,
                    'glyph' => $glyph,
                    'textQpc' => (string) ($word['text_uthmani'] ?? $word['text_qpc_hafs'] ?? $glyph),
                    '_sort' => (int) ($word['id'] ?? 0),
                ];
            }
        }

        if ($lineWords === []) {
            throw new RuntimeException("No line data for page {$pageNumber}");
        }

        ksort($lineWords);

        $lines = [];
        foreach ($lineWords as $lineNumber => $words) {
            usort($words, fn ($a, $b) => $a['_sort'] <=> $b['_sort']);
            $words = array_map(function (array $word) {
                unset($word['_sort']);

                return $word;
            }, $words);

            $firstId = $words[0]['id'] ?? null;
            $lastId = $words[count($words) - 1]['id'] ?? null;

            $lines[] = [
                'lineNumber' => (int) $lineNumber,
                'lineType' => 'ayah',
                'isCentered' => false,
                'surahNumber' => $words[0]['surahNumber'] ?? null,
                'firstWordId' => $firstId,
                'lastWordId' => $lastId,
                'words' => $words,
            ];
        }

        $firstVerse = $verses[0];

        return [
            'pageNumber' => $pageNumber,
            'juzNumber' => (int) ($firstVerse['juz_number'] ?? 0) ?: null,
            'hizbNumber' => (int) ($firstVerse['hizb_number'] ?? 0) ?: null,
            'primarySurahNumber' => (int) (explode(':', (string) ($firstVerse['verse_key'] ?? ''))[0] ?? 0) ?: null,
            'fontFamily' => "p{$pageNumber}-v2",
            'layoutSource' => 'qurancom-fallback',
            'lines' => $lines,
        ];
    }
}

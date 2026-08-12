<?php

namespace App\Services\Quran;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class TafsirService
{
    /**
     * Fetch normalised English tafsir for every ayah in a surah.
     *
     * @return array{
     *     tafsir_source: string,
     *     tafsir_source_id: string,
     *     language: string,
     *     surah: int,
     *     ayahs: array<int, array{
     *         tafsir_text: string,
     *         tafsir_source: string,
     *         tafsir_source_id: string,
     *         language: string,
     *         surah: int,
     *         ayah: int,
     *         available: bool,
     *     }>,
     * }|null
     *
     * @throws ConnectionException
     * @throws RuntimeException
     */
    public function getForChapter(int $surah, ?string $resourceId = null): ?array
    {
        $surah = max(1, min(114, $surah));
        $resourceId = $resourceId ?: (string) (
            config('quran.tafsir.default_resource_id')
            ?: config('quran.tafsir.default_edition', '169')
        );
        $resources = config('quran.tafsir.resources', config('quran.tafsir.editions', []));
        $resourceMeta = is_array($resources) ? ($resources[$resourceId] ?? null) : null;

        if (!$resourceMeta) {
            return null;
        }

        $cacheKey = "quran_tafsir_chapter:{$resourceId}:{$surah}";
        $cacheTtl = (int) config('quran.tafsir.cache_ttl', 86400);

        $rows = Cache::remember($cacheKey, $cacheTtl, function () use ($surah, $resourceId) {
            return $this->fetchChapterFromUpstream($surah, $resourceId);
        });

        if ($rows === null) {
            Cache::forget($cacheKey);

            return null;
        }

        $sourceName = trim((string) ($resourceMeta['english_name'] ?? $resourceMeta['name'] ?? ''));
        if ($sourceName === '') {
            $sourceName = 'Tafsir';
        }

        $language = trim((string) ($resourceMeta['language'] ?? 'en'));
        $ayahs = [];

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $verseKey = (string) ($row['verse_key'] ?? '');
            if (! preg_match('/^(\d+):(\d+)$/', $verseKey, $matches)) {
                continue;
            }

            $ayahNumber = (int) $matches[2];
            $text = $this->cleanTafsirHtml((string) ($row['text'] ?? ''));
            if ($text === '') {
                continue;
            }

            $ayahs[$ayahNumber] = [
                'tafsir_text' => $text,
                'tafsir_source' => $sourceName,
                'tafsir_source_id' => $resourceId,
                'language' => $language,
                'surah' => $surah,
                'ayah' => $ayahNumber,
                'available' => true,
            ];
        }

        if ($ayahs === []) {
            Cache::forget($cacheKey);

            return null;
        }

        return [
            'tafsir_source' => $sourceName,
            'tafsir_source_id' => $resourceId,
            'language' => $language,
            'surah' => $surah,
            'ayahs' => $ayahs,
        ];
    }

    /**
     * @return array{
     *     tafsir_text: string,
     *     tafsir_source: string,
     *     tafsir_source_id: string,
     *     language: string,
     *     surah: int,
     *     ayah: int,
     *     available: bool,
     * }|null
     *
     * @throws ConnectionException
     * @throws RuntimeException
     */
    public function getForAyah(int $surah, int $ayah, ?string $resourceId = null): ?array
    {
        $surah = max(1, min(114, $surah));
        $ayah = max(1, min(300, $ayah));

        $chapter = $this->getForChapter($surah, $resourceId);

        return $chapter['ayahs'][$ayah] ?? null;
    }

    /**
     * @return list<array<string, mixed>>|null
     *
     * @throws ConnectionException
     * @throws RuntimeException
     */
    private function fetchChapterFromUpstream(int $surah, string $resourceId): ?array
    {
        $base = rtrim((string) config('quran.tafsir.upstream_base', 'https://api.quran.com/api/v4/'), '/');
        $url = "{$base}/tafsirs/{$resourceId}/by_chapter/{$surah}";

        $response = $this->requestUpstream($url);
        if (!$response) {
            return null;
        }

        $body = $response->json();
        if (!is_array($body)) {
            return null;
        }

        $tafsirs = $body['tafsirs'] ?? null;

        return is_array($tafsirs) && $tafsirs !== [] ? $tafsirs : null;
    }

    /**
     * @throws ConnectionException
     * @throws RuntimeException
     */
    private function requestUpstream(string $url): ?\Illuminate\Http\Client\Response
    {
        $response = null;
        $attempts = 3;

        for ($attempt = 1; $attempt <= $attempts; $attempt += 1) {
            try {
                $response = Http::timeout(30)
                    ->acceptJson()
                    ->withHeaders([
                        'User-Agent' => 'MutqinTafsir/1.0',
                        'Accept' => 'application/json',
                    ])
                    ->get($url);
            } catch (ConnectionException $exception) {
                if ($attempt >= $attempts) {
                    throw $exception;
                }
                usleep(250000 * $attempt);
                continue;
            }

            if ($response->successful()) {
                return $response;
            }

            if (in_array($response->status(), [404, 410], true)) {
                return null;
            }

            if (in_array($response->status(), [429, 502, 503, 504], true) && $attempt < $attempts) {
                usleep(300000 * $attempt);
                continue;
            }

            break;
        }

        if (!$response || !$response->successful()) {
            $status = $response?->status() ?: 502;
            throw new RuntimeException("Upstream tafsir request failed with status {$status}");
        }

        return $response;
    }

    private function cleanTafsirHtml(string $html): string
    {
        $text = trim($html);
        if ($text === '') {
            return '';
        }

        $text = preg_replace('/<\/(?:p|div|h[1-6]|li|blockquote)>\s*/i', "\n\n", $text) ?? $text;
        $text = strip_tags($text);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace("/[ \t\x{00A0}]+/u", ' ', $text) ?? $text;
        $text = preg_replace("/\n{3,}/", "\n\n", $text) ?? $text;

        return trim($text);
    }
}

<?php

namespace App\Http\Controllers;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Same-origin ayah audio for bundled onboarding sets (e.g. Al-Fatihah).
 *
 * The frontend prefers /audio/ayah/{reciter}/{n}.mp3 so playback works when CDNs
 * are blocked. When no file is checked into public/, we proxy allowed CDNs.
 */
class AyahAudioController extends Controller
{
    private const PROXY_CACHE_TTL_SECONDS = 86400;

    /**
     * @return list<string>
     */
    public static function remoteCandidateUrls(string $reciter, int $ayah): array
    {
        $id = preg_match('/^[a-z0-9._-]+$/i', $reciter) ? $reciter : 'ar.alafasy';

        // Stay on the requested reciter. A missing Sudais file must not be
        // replaced with Mishary, or the session label and the voice disagree.
        // 128 kbps is the default in the UI; some reciters (e.g. Sudais) only allow 64/192.
        return array_values(array_unique([
            "https://cdn.islamic.network/quran/audio/128/{$id}/{$ayah}.mp3",
            "https://cdn.islamic.network/quran/audio/64/{$id}/{$ayah}.mp3",
            "https://cdn.islamic.network/quran/audio/192/{$id}/{$ayah}.mp3",
            "https://cdn.alquran.cloud/media/audio/ayah/{$id}/{$ayah}",
        ]));
    }

    public function __invoke(Request $request, string $reciter, int $ayah): Response|BinaryFileResponse
    {
        if (! preg_match('/^[a-z0-9._-]+$/i', $reciter)) {
            abort(400, 'Invalid reciter');
        }

        if ($ayah < 1 || $ayah > 6236) {
            abort(404);
        }

        $localPath = public_path("audio/ayah/{$reciter}/{$ayah}.mp3");
        if (is_file($localPath)) {
            return response()->file($localPath, [
                'Content-Type' => 'audio/mpeg',
                'Content-Disposition' => $this->contentDisposition($request, $ayah),
                'Cache-Control' => 'public, max-age=31536000, immutable',
                'X-Content-Type-Options' => 'nosniff',
            ]);
        }

        $cacheKey = "ayah-audio:v2:{$reciter}:{$ayah}";
        // Binary MP3 must not go through the database cache store (utf8 columns
        // reject \\xFF\\xFB… and the failed SQL dump corrupts laravel.log).
        $audioCache = Cache::store('file');
        $cached = $audioCache->get($cacheKey);
        if (is_array($cached) && is_string($cached['body'] ?? null) && $cached['body'] !== '') {
            return $this->audioResponse($cached['body'], $ayah, $request);
        }

        $candidates = self::remoteCandidateUrls($reciter, $ayah);

        $lastStatus = 502;
        foreach ($candidates as $url) {
            $parts = parse_url($url);
            $host = $parts['host'] ?? '';
            if ($host !== 'cdn.islamic.network' && $host !== 'cdn.alquran.cloud') {
                continue;
            }

            try {
                $response = Http::timeout(20)->get($url);
            } catch (ConnectionException) {
                $lastStatus = 502;

                continue;
            }

            if ($response->successful()) {
                $body = $response->body();
                if (is_string($body) && $body !== '') {
                    try {
                        $audioCache->put($cacheKey, ['body' => $body], self::PROXY_CACHE_TTL_SECONDS);
                    } catch (\Throwable $e) {
                        report($e);
                    }
                }

                return $this->audioResponse($body, $ayah, $request);
            }

            $lastStatus = $response->status() ?: 502;
        }

        abort($lastStatus, 'Failed to fetch audio');
    }

    private function contentDisposition(Request $request, int $ayah): string
    {
        $filename = preg_replace('/[^A-Za-z0-9._-]/', '-', (string) $request->query('filename', ''))
            ?: "{$ayah}.mp3";

        return ($request->boolean('download') ? 'attachment' : 'inline').'; filename="'.$filename.'"';
    }

    private function audioResponse(string $body, int $ayah, Request $request): Response
    {
        return response($body, 200, [
            'Content-Type' => 'audio/mpeg',
            'Content-Length' => (string) strlen($body),
            'Content-Disposition' => $this->contentDisposition($request, $ayah),
            'Cache-Control' => 'public, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}

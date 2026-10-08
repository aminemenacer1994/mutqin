<?php

namespace App\Http\Controllers;

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
                'Cache-Control' => 'public, max-age=31536000, immutable',
                'X-Content-Type-Options' => 'nosniff',
            ]);
        }

        $cacheKey = "ayah-audio:v1:{$reciter}:{$ayah}";
        $cached = Cache::get($cacheKey);
        if (is_array($cached) && is_string($cached['body'] ?? null) && $cached['body'] !== '') {
            return $this->audioResponse($cached['body'], $ayah);
        }

        $candidates = array_values(array_unique([
            "https://cdn.islamic.network/quran/audio/128/{$reciter}/{$ayah}.mp3",
            "https://cdn.islamic.network/quran/audio/128/ar.alafasy/{$ayah}.mp3",
            "https://cdn.alquran.cloud/media/audio/ayah/{$reciter}/{$ayah}",
            "https://cdn.alquran.cloud/media/audio/ayah/ar.alafasy/{$ayah}",
        ]));

        $lastStatus = 502;
        foreach ($candidates as $url) {
            $parts = parse_url($url);
            $host = $parts['host'] ?? '';
            if ($host !== 'cdn.islamic.network' && $host !== 'cdn.alquran.cloud') {
                continue;
            }

            $response = Http::timeout(20)->get($url);
            if ($response->successful()) {
                $body = $response->body();
                if (is_string($body) && $body !== '') {
                    try {
                        Cache::put($cacheKey, ['body' => $body], self::PROXY_CACHE_TTL_SECONDS);
                    } catch (\Throwable $e) {
                        report($e);
                    }
                }

                return $this->audioResponse($body, $ayah);
            }

            $lastStatus = $response->status() ?: 502;
        }

        abort($lastStatus, 'Failed to fetch audio');
    }

    private function audioResponse(string $body, int $ayah): Response
    {
        return response($body, 200, [
            'Content-Type' => 'audio/mpeg',
            'Content-Length' => (string) strlen($body),
            'Content-Disposition' => 'inline; filename="'.$ayah.'.mp3"',
            'Cache-Control' => 'public, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}

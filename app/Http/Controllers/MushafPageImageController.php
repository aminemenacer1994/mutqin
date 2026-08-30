<?php

namespace App\Http\Controllers;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Same-origin proxy for official Madani (Hafs) Mushaf page images.
 *
 * Upstream is the Quran Foundation page-image CDN used by Quran Android.
 */
class MushafPageImageController extends Controller
{
    private const TOTAL_PAGES = 604;

    private const WIDTHS = [512, 800, 1024, 1260, 1920];

    private const CACHE_TTL = 604800;

    public function __invoke(Request $request, int $page): Response
    {
        $page = $this->normalizePage($page);
        $width = $this->normalizeWidth($request->query('w'));

        $cacheKey = "mushaf_page_image:{$page}:{$width}";

        try {
            $payload = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($page, $width) {
                $padded = str_pad((string) $page, 3, '0', STR_PAD_LEFT);
                $candidates = [
                    "https://files.quran.app/hafs/madani/width_{$width}/page{$padded}.png",
                    "https://android.quran.com/data/width_{$width}/page{$padded}.png",
                ];

                $response = null;
                $lastStatus = 502;
                foreach ($candidates as $candidate) {
                    $attempts = 2;
                    for ($attempt = 1; $attempt <= $attempts; $attempt += 1) {
                        try {
                            $attemptResponse = Http::timeout(25)
                                ->withHeaders([
                                    'User-Agent' => 'MutqinMushafPage/1.0',
                                    'Accept' => 'image/png,image/*;q=0.8',
                                ])
                                ->get($candidate);
                        } catch (ConnectionException $exception) {
                            if ($attempt >= $attempts) {
                                throw $exception;
                            }
                            usleep(200000 * $attempt);
                            continue;
                        }

                        if ($attemptResponse->successful() && $this->looksLikePng($attemptResponse->body())) {
                            $response = $attemptResponse;
                            break 2;
                        }

                        $lastStatus = $attemptResponse->status() ?: 502;
                        if (in_array($attemptResponse->status(), [429, 502, 503, 504], true) && $attempt < $attempts) {
                            usleep(250000 * $attempt);
                            continue;
                        }
                        break;
                    }
                }

                if (! $response) {
                    throw new HttpException($lastStatus, 'Upstream Mushaf page image request failed');
                }

                return [
                    'body' => $response->body(),
                    'content_type' => $response->header('Content-Type') ?: 'image/png',
                ];
            });
        } catch (HttpException $exception) {
            throw $exception;
        } catch (ConnectionException $exception) {
            abort(502, __('ui.quran_api_upstream_unreachable'));
        } catch (\Throwable $exception) {
            report($exception);
            abort(502, __('ui.quran_api_proxy_failed'));
        }

        return response($payload['body'], 200, [
            'Content-Type' => $payload['content_type'] ?: 'image/png',
            'Cache-Control' => 'public, max-age=604800, immutable',
            'X-Content-Type-Options' => 'nosniff',
            'X-Mushaf-Page' => (string) $page,
        ]);
    }

    private function normalizePage(int $page): int
    {
        if ($page < 1 || $page > self::TOTAL_PAGES) {
            abort(404, 'Unknown Mushaf page');
        }

        return $page;
    }

    private function normalizeWidth(mixed $width): int
    {
        $requested = (int) $width;
        if (in_array($requested, self::WIDTHS, true)) {
            return $requested;
        }

        return 1024;
    }

    private function looksLikePng(string $body): bool
    {
        return strlen($body) > 24 && str_starts_with($body, "\x89PNG\r\n\x1a\n");
    }
}

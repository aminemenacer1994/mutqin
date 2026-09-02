<?php

namespace App\Http\Controllers;

use App\Support\ErrorReporting;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Same-origin proxy for Quran text APIs.
 *
 * Browsers cannot call api.alquran.cloud / api.quran.com directly from localhost
 * when those upstreams omit CORS headers — so the app fetches via Laravel.
 */
class QuranProxyController extends Controller
{
    private const PROVIDERS = [
        'alquran' => [
            'base' => 'https://api.alquran.cloud/v1/',
            'host' => 'api.alquran.cloud',
            'cache_ttl' => 3600,
        ],
        'qurancom' => [
            'base' => 'https://api.quran.com/api/v4/',
            'host' => 'api.quran.com',
            'cache_ttl' => 3600,
        ],
    ];

    public function __invoke(Request $request, string $provider, string $path = ''): Response
    {
        $config = self::PROVIDERS[$provider] ?? null;
        if (! $config) {
            abort(404, __('ui.quran_api_unknown_provider'));
        }

        $normalizedPath = $this->normalizePath($path);
        if ($normalizedPath === null) {
            abort(400, __('ui.quran_api_invalid_path'));
        }

        $query = $request->query();
        ksort($query);
        $upstreamUrl = rtrim($config['base'], '/').'/'.$normalizedPath;
        if ($query !== []) {
            $upstreamUrl .= '?'.http_build_query($query);
        }

        $cacheKey = 'quran_proxy:'.sha1($provider.'|'.$upstreamUrl);

        try {
            $payload = Cache::remember($cacheKey, (int) $config['cache_ttl'], function () use ($upstreamUrl) {
                $response = null;
                $attempts = 3;
                for ($attempt = 1; $attempt <= $attempts; $attempt += 1) {
                    try {
                        $response = Http::timeout(25)
                            ->acceptJson()
                            ->withHeaders([
                                'User-Agent' => 'MutqinQuranProxy/1.0',
                                'Accept' => 'application/json',
                            ])
                            ->get($upstreamUrl);
                    } catch (ConnectionException $exception) {
                        if ($attempt >= $attempts) {
                            throw $exception;
                        }
                        usleep(250000 * $attempt);

                        continue;
                    }

                    if ($response->successful()) {
                        break;
                    }

                    // Upstream edge occasionally returns 503 — retry before failing.
                    if (in_array($response->status(), [429, 502, 503, 504], true) && $attempt < $attempts) {
                        usleep(300000 * $attempt);

                        continue;
                    }

                    break;
                }

                if (! $response || ! $response->successful()) {
                    throw new HttpException(
                        $response?->status() ?: 502,
                        'Upstream Quran API request failed'
                    );
                }

                return [
                    'status' => $response->status(),
                    'body' => $response->body(),
                    'content_type' => $response->header('Content-Type') ?: 'application/json',
                ];
            });
        } catch (HttpException $exception) {
            ErrorReporting::reportProviderFailure('quran', [
                'feature' => 'quran',
                'provider' => $provider,
                'status' => $exception->getStatusCode(),
                'reason' => 'upstream_http',
                'host' => $config['host'],
            ]);
            throw $exception;
        } catch (ConnectionException $exception) {
            ErrorReporting::reportProviderFailure('quran', [
                'feature' => 'quran',
                'provider' => $provider,
                'status' => 0,
                'reason' => 'connection',
                'host' => $config['host'],
            ]);
            abort(502, __('ui.quran_api_upstream_unreachable'));
        } catch (\Throwable $exception) {
            report($exception);
            abort(502, __('ui.quran_api_proxy_failed'));
        }

        return response($payload['body'], (int) $payload['status'], [
            'Content-Type' => $payload['content_type'],
            'Cache-Control' => 'private, max-age=300',
            'X-Quran-Proxy' => $provider,
        ]);
    }

    private function normalizePath(string $path): ?string
    {
        $path = trim(rawurldecode($path), '/');
        if ($path === '') {
            return null;
        }

        if (str_contains($path, '..') || str_contains($path, '\\')) {
            return null;
        }

        // Allow surah/ayah/edition/quran/verses paths and comma-separated editions.
        if (! preg_match('/^[A-Za-z0-9._\\/\\-,]+$/', $path)) {
            return null;
        }

        return $path;
    }
}

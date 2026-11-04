<?php

namespace App\Http\Middleware;

use App\Support\MutqinDomains;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * App shell needs same-origin + known CDN scripts/styles. Some embedded previews
 * ship a broken {@code script-src 'none'} policy — replace it for HTML only.
 */
class SetMutqinContentSecurityPolicy
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        if (! $this->isHtmlDocument($request, $response)) {
            return $response;
        }

        $existing = strtolower((string) $response->headers->get('Content-Security-Policy', ''));

        if ($existing !== '' && ! $this->shouldReplacePolicy($existing)) {
            return $response;
        }

        $response->headers->remove('Content-Security-Policy');
        $response->headers->remove('Content-Security-Policy-Report-Only');
        $response->headers->set('Content-Security-Policy', self::buildPolicy($request));

        return $response;
    }

    private function shouldReplacePolicy(string $existing): bool
    {
        if ($existing === '') {
            return true;
        }

        if (str_contains($existing, "script-src 'none'")) {
            return true;
        }

        // Broken or foreign policies that omit same-origin scripts.
        if (! str_contains($existing, "'self'")) {
            return true;
        }

        return false;
    }

    public static function buildPolicy(?Request $request = null): string
    {
        $scriptSrc = "'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com";
        if (! app()->isProduction() || config('app.debug')) {
            // Webpack watch/dev lazy chunks and some tooling still rely on eval.
            $scriptSrc .= " 'unsafe-eval'";
        }

        $formAction = self::formActionDirective($request);

        return "default-src 'self'; "
            ."base-uri 'self'; "
            ."form-action {$formAction}; "
            ."frame-ancestors 'none'; "
            ."object-src 'none'; "
            ."script-src {$scriptSrc}; "
            ."style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com https://fonts.bunny.net; "
            ."font-src 'self' data: https://cdn.jsdelivr.net https://fonts.gstatic.com https://fonts.bunny.net https://verses.quran.foundation; "
            ."img-src 'self' data: blob: https:; "
            ."media-src 'self' blob: data: https:; "
            ."connect-src 'self' https: wss:; "
            ."worker-src 'self' blob:; "
            ."manifest-src 'self';";
    }

    /**
     * Allow same-origin forms; in local dev also permit APP_URL when it differs from the
     * browser host (common localhost vs 127.0.0.1 mismatch with absolute form actions).
     */
    private static function formActionDirective(?Request $request): string
    {
        $sources = ["'self'"];

        $candidates = [];
        if ($request instanceof Request) {
            $candidates[] = rtrim($request->getSchemeAndHttpHost(), '/');
        }
        $candidates[] = rtrim((string) config('app.url'), '/');

        if (! app()->environment('local', 'testing')) {
            $candidates[] = rtrim(MutqinDomains::marketingUrl(''), '/');
        } else {
            $candidates[] = 'http://localhost:8000';
            $candidates[] = 'http://127.0.0.1:8000';
            $candidates[] = 'http://localhost';
            $candidates[] = 'http://127.0.0.1';
        }

        foreach ($candidates as $origin) {
            if ($origin === '' || in_array($origin, $sources, true)) {
                continue;
            }
            if (preg_match('#\Ahttps?://#i', $origin) === 1) {
                $sources[] = $origin;
            }
        }

        return implode(' ', $sources);
    }

    private function isHtmlDocument(Request $request, Response $response): bool
    {
        if ($request->is('api/*') || $request->expectsJson()) {
            return false;
        }

        $contentType = strtolower((string) $response->headers->get('Content-Type', ''));
        if ($contentType !== '' && ! str_contains($contentType, 'text/html')) {
            return false;
        }

        return $request->isMethod('GET') || $request->isMethod('HEAD');
    }
}

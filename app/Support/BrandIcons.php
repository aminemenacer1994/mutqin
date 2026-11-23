<?php

namespace App\Support;

/**
 * PWA / favicon cache busting. Bump {@see version()} when icon PNG/SVG assets change
 * (run scripts/render-brand-icons.py) and deploy; it is folded into the HTML asset-build
 * marker so clients drop stale service-worker icon caches.
 */
final class BrandIcons
{
    public static function version(): string
    {
        return (string) config('mutqin.brand_icons.version', '20261123b');
    }

    public static function url(string $path): string
    {
        $path = '/'.ltrim($path, '/');

        return $path.'?v='.rawurlencode(self::version());
    }
}
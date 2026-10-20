<?php

namespace App\Support;

use Illuminate\Foundation\MixFileNotFoundException;
use Throwable;

final class MixAssetUrl
{
    /**
     * Short fingerprint of mix-manifest.json for cache-busting entry bundles
     * when lazy-loaded chunks change without a new Mix ?id= hash.
     */
    public static function manifestFingerprint(?string $manifestPath = null): string
    {
        $path = $manifestPath ?? public_path('mix-manifest.json');

        return is_file($path) ? substr(md5_file($path), 0, 12) : 'no-manifest';
    }

    /**
     * Mix versioned URL plus a manifest fingerprint query param.
     * Uses ? or & correctly so URLs stay valid when Mix returns an unversioned path.
     * Falls back to asset() when the Mix entry is missing so pages never 500.
     */
    public static function withManifestBuild(string $mixPath, ?string $manifestPath = null): string
    {
        $normalized = '/'.ltrim($mixPath, '/');
        try {
            $url = mix($mixPath);
        } catch (MixFileNotFoundException|Throwable) {
            $disk = public_path(ltrim($normalized, '/'));
            $version = is_file($disk) ? substr((string) md5_file($disk), 0, 12) : 'missing';
            $url = asset(ltrim($normalized, '/')).'?id='.$version;
        }

        $build = self::manifestFingerprint($manifestPath);
        $separator = str_contains($url, '?') ? '&' : '?';

        return $url.$separator.'build='.$build;
    }

    /**
     * Whether compiled Mix CSS exists on disk (gitignored — requires npm run build).
     */
    public static function compiledStylesExist(): bool
    {
        return is_file(public_path('css/app.css'));
    }
}

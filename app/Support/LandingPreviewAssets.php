<?php

namespace App\Support;

use Illuminate\Support\Facades\File;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Version-controlled marketing screenshots served only under /preview/assets.
 */
final class LandingPreviewAssets
{
    private const BASE = 'marketing/preview-2.0';

    /**
     * @return list<string> Basenames without extension.
     */
    public static function allowedBasenames(): array
    {
        return [
            'overview',
            'overview-priorities',
            'students',
            'assignments',
            'assignment-create',
            'assignment-detail',
            'learning-plan',
            'reviews',
            'review-detail',
            'parents',
            'messages',
        ];
    }

    public static function resolvePath(string $basename): ?string
    {
        $basename = strtolower(trim($basename));

        if (! in_array($basename, self::allowedBasenames(), true)) {
            return null;
        }

        $path = resource_path(self::BASE.'/'.$basename.'.png');

        return File::isFile($path) ? $path : null;
    }

    public static function stream(string $basename): BinaryFileResponse
    {
        $path = self::resolvePath($basename);

        if ($path === null) {
            abort(404);
        }

        return response()->file($path, [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'private, no-store, max-age=0',
            'X-Robots-Tag' => 'noindex, nofollow',
        ]);
    }
}

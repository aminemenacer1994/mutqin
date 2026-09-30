<?php

namespace App\Http\Controllers;

use App\Support\Mushaf\IndopakNastaleeqFont;
use App\Support\Mushaf\MushafLayoutRegistry;
use App\Support\Mushaf\MushafPageRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

class IndopakFontController extends Controller
{
    public function nastaleeq(): BinaryFileResponse
    {
        abort_unless(IndopakNastaleeqFont::exists(), 404);

        return response()->file(IndopakNastaleeqFont::path(), [
            'Content-Type' => 'font/woff2',
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }

    /**
     * Serve generated IndoPak page JSON (raw camelCase source).
     */
    public function page(int $page): BinaryFileResponse|JsonResponse
    {
        $layout = MushafLayoutRegistry::indopak15Qudratullah();
        abort_unless($layout->hasPage($page), 404);

        $path = $layout->pageJsonPath($page);
        if (is_file($path)) {
            return Response::file($path, [
                'Content-Type' => 'application/json; charset=UTF-8',
                'Cache-Control' => 'public, max-age=31536000, immutable',
            ]);
        }

        abort(404);
    }

    /**
     * Envelope consumed by the shared mushaf page renderer.
     */
    public function pageData(int $page): JsonResponse
    {
        $layout = MushafLayoutRegistry::indopak15Qudratullah();
        abort_unless($layout->hasPage($page), 404);

        try {
            $raw = MushafPageRepository::forId($layout->id)->page($page);
        } catch (Throwable) {
            abort(404);
        }

        return response()->json([
            'page' => $raw,
            'font_family' => IndopakNastaleeqFont::FAMILY,
            'font_url' => IndopakNastaleeqFont::url(),
            'layout_id' => $layout->id,
        ], 200, [
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    /**
     * Verse key → IndoPak page map (never reuse Madani page numbers).
     */
    public function versePages(): BinaryFileResponse|JsonResponse
    {
        $layout = MushafLayoutRegistry::indopak15Qudratullah();
        $path = $layout->versePageMapPath();
        abort_unless(is_file($path), 404);

        return Response::file($path, [
            'Content-Type' => 'application/json; charset=UTF-8',
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }
}

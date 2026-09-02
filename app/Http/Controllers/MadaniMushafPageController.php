<?php

namespace App\Http\Controllers;

use App\Services\MadaniMushaf\MadaniMushafPageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MadaniMushafPageController extends Controller
{
    public function __construct(
        private readonly MadaniMushafPageService $pages,
    ) {}

    public function show(int $page): JsonResponse
    {
        if ($page < 1 || $page > 604) {
            return response()->json([
                'error' => 'invalid_page',
                'message' => 'Page number must be between 1 and 604.',
            ], 422);
        }

        if (! $this->pages->isAvailable()) {
            return response()->json([
                'error' => 'not_imported',
                'message' => 'Madani Mushaf layout data has not been imported. Run: php artisan mutqin:import-madani-mushaf',
            ], 503);
        }

        $payload = $this->pages->getPage($page);
        if (! $payload) {
            return response()->json([
                'error' => 'page_not_found',
                'message' => "Page {$page} is not available.",
            ], 404);
        }

        return response()
            ->json($payload)
            ->header('Cache-Control', 'public, max-age=604800, immutable');
    }

    public function resolve(Request $request): JsonResponse
    {
        $verseKey = trim((string) $request->query('verse_key', ''));
        $surah = (int) $request->query('surah', 0);
        $ayah = (int) $request->query('ayah', 0);

        $page = null;
        if ($verseKey !== '') {
            $page = $this->pages->resolvePageFromVerseKey($verseKey);
        } elseif ($surah >= 1 && $ayah >= 1) {
            $page = $this->pages->resolvePageFromSurahAyah($surah, $ayah);
        }

        if ($page === null) {
            return response()->json([
                'error' => 'not_found',
                'message' => 'Could not resolve a Mushaf page for the given reference.',
            ], 404);
        }

        return response()->json(['pageNumber' => $page]);
    }

    public function manifest(): JsonResponse
    {
        $manifest = $this->pages->manifest();
        if (! $manifest) {
            return response()->json(['imported' => false], 200);
        }

        return response()->json([
            'imported' => true,
            ...$manifest,
        ]);
    }
}

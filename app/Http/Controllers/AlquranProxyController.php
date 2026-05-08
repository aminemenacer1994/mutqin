<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AlquranProxyController extends Controller
{
    private const BASE = 'https://api.alquran.cloud/v1';

    public function ayahEdition(Request $request, int $ayah, string $edition)
    {
        return $this->proxy("/ayah/{$ayah}/{$edition}", $request->query());
    }

    public function edition(Request $request)
    {
        return $this->proxy('/edition', $request->query());
    }

    public function editionByLanguage(Request $request, string $language)
    {
        return $this->proxy("/edition/language/{$language}", $request->query());
    }

    public function surahEdition(Request $request, int $surah, string $edition)
    {
        return $this->proxy("/surah/{$surah}/{$edition}", $request->query());
    }

    public function surahEditions(Request $request, int $surah, string $editions)
    {
        return $this->proxy("/surah/{$surah}/editions/{$editions}", $request->query());
    }

    public function quranEdition(Request $request, string $edition)
    {
        return $this->proxy("/quran/{$edition}", $request->query());
    }

    private function proxy(string $path, array $query = [])
    {
        $response = Http::acceptJson()
            ->timeout(20)
            ->retry(2, 200)
            ->get(self::BASE.$path, $query);

        return response($response->body(), $response->status())
            ->header('Content-Type', $response->header('Content-Type', 'application/json'));
    }
}

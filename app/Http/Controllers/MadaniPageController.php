<?php

namespace App\Http\Controllers;

use App\Support\Madani\MadaniV2StaticPaths;
use App\Support\Madani\QpcV2PageAdapter;
use Illuminate\Support\Facades\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class MadaniPageController extends Controller
{
    public function show(int $page, QpcV2PageAdapter $pages)
    {
        abort_unless($page >= QpcV2PageAdapter::MIN_PAGE && $page <= QpcV2PageAdapter::MAX_PAGE, 404);

        $static = MadaniV2StaticPaths::readPageEnvelope($page);
        if ($static !== null) {
            return view('madani.page', [
                'page' => $static['page'],
                'pageNumber' => $page,
                'fontFamily' => $static['font_family'],
                'fontUrl' => $static['font_url'],
            ]);
        }

        abort_unless(is_file($pages->pageFontPath($page)), 404);

        try {
            $payload = $pages->page($page);
        } catch (\RuntimeException) {
            abort(404);
        }

        return view('madani.page', [
            'page' => $payload,
            'pageNumber' => $page,
            'fontFamily' => QpcV2PageAdapter::pageFontFamily($page),
            'fontUrl' => MadaniV2StaticPaths::fontUrl($page),
        ]);
    }

    public function data(int $page, QpcV2PageAdapter $pages)
    {
        abort_unless($page >= QpcV2PageAdapter::MIN_PAGE && $page <= QpcV2PageAdapter::MAX_PAGE, 404);

        $path = MadaniV2StaticPaths::pageJsonPath($page);
        if (is_file($path)) {
            return Response::file($path, [
                'Content-Type' => 'application/json; charset=UTF-8',
                'Cache-Control' => 'public, max-age=31536000, immutable',
            ]);
        }

        abort_unless(is_file($pages->pageFontPath($page)), 404);

        try {
            $payload = $pages->page($page);
        } catch (\RuntimeException) {
            abort(404);
        }

        return response()->json([
            'page' => $payload,
            'font_family' => QpcV2PageAdapter::pageFontFamily($page),
            'font_url' => MadaniV2StaticPaths::fontUrl($page),
        ]);
    }

    public function font(int $page, QpcV2PageAdapter $pages): BinaryFileResponse
    {
        abort_unless($page >= QpcV2PageAdapter::MIN_PAGE && $page <= QpcV2PageAdapter::MAX_PAGE, 404);

        $path = $pages->pageFontPath($page);
        abort_unless(is_file($path), 404);

        return response()->file($path, [
            'Content-Type' => 'font/woff2',
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }

    public function versePages(QpcV2PageAdapter $pages)
    {
        $path = MadaniV2StaticPaths::versePagesPath();
        if (is_file($path)) {
            return Response::file($path, [
                'Content-Type' => 'application/json; charset=UTF-8',
                'Cache-Control' => 'public, max-age=31536000, immutable',
            ]);
        }

        return response()->json($pages->versePageIndex(), 200, [
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    public function resolveVerse(int $surah, int $ayah, QpcV2PageAdapter $pages)
    {
        abort_unless($surah >= 1 && $ayah >= 1, 404);

        try {
            $page = $pages->pageForVerse($surah, $ayah);
        } catch (\RuntimeException) {
            abort(404);
        }

        return response()->json([
            'surah' => $surah,
            'ayah' => $ayah,
            'verse_key' => $surah.':'.$ayah,
            'page' => $page,
        ]);
    }
}

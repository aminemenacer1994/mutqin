<?php

namespace App\Http\Controllers\Seo;

use App\Http\Controllers\Controller;
use App\Support\Seo\SeoArticles;
use Illuminate\View\View;

class SeoArticleController extends Controller
{
    public function show(string $slug): View
    {
        $seoPage = SeoArticles::pagePayload($slug);
        abort_unless($seoPage !== null, 404);

        return view('content.seo-article', [
            'seoPage' => $seoPage,
        ]);
    }
}

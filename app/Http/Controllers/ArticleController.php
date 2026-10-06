<?php

namespace App\Http\Controllers;

use App\Support\Articles\PlaceholderArticles;
use Illuminate\View\View;

class ArticleController extends Controller
{
    public function show(string $slug): View
    {
        $article = PlaceholderArticles::pagePayload($slug);
        abort_unless($article !== null, 404);

        return view('content.article', [
            'article' => $article,
        ]);
    }
}

<?php

namespace App\Http\Controllers\Seo;

use App\Http\Controllers\Controller;
use App\Support\Seo\SeoGuideIndex;
use Illuminate\Http\Request;
use Illuminate\View\View;

class SeoGuidesController extends Controller
{
    public function index(Request $request): View
    {
        $category = $request->query('category');
        $seoPage = SeoGuideIndex::page(is_string($category) ? $category : null);

        return view('content.seo-launch', [
            'seoPage' => $seoPage,
        ]);
    }
}

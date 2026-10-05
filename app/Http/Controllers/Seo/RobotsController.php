<?php

namespace App\Http\Controllers\Seo;

use App\Support\Seo\SeoCatalog;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class RobotsController
{
    public function __invoke(Request $request): Response
    {
        return response(SeoCatalog::robotsTxt($request), 200, [
            'Content-Type' => 'text/plain; charset=UTF-8',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }
}

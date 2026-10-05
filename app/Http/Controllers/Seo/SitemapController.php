<?php

namespace App\Http\Controllers\Seo;

use App\Support\Seo\SeoCatalog;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class SitemapController
{
    public function __invoke(Request $request): Response
    {
        $urls = '';
        foreach (SeoCatalog::sitemapEntries($request) as $entry) {
            $urls .= '  <url>'."\n";
            $urls .= '    <loc>'.e($entry['loc']).'</loc>'."\n";
            $urls .= '    <changefreq>'.e($entry['changefreq']).'</changefreq>'."\n";
            $urls .= '    <priority>'.e($entry['priority']).'</priority>'."\n";
            $urls .= '  </url>'."\n";
        }

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n"
            .'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n"
            .$urls
            .'</urlset>'."\n";

        return response($xml, 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }
}

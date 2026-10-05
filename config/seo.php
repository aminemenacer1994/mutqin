<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Search Console / Bing site verification
    |--------------------------------------------------------------------------
    |
    | Paste the token values from Google Search Console (HTML tag method) or
    | Bing Webmaster Tools (meta tag). Leave empty until you have real tokens.
    | Never invent or commit verification tokens.
    |
    | Google meta: <meta name="google-site-verification" content="…">
    | Bing meta:   <meta name="msvalidate.01" content="…">
    |
    */
    'google_site_verification' => trim((string) env('SEO_GOOGLE_SITE_VERIFICATION', '')),
    'bing_site_verification' => trim((string) env('SEO_BING_SITE_VERIFICATION', '')),

    /*
    |--------------------------------------------------------------------------
    | Live verify defaults (mutqin:seo-verify --live)
    |--------------------------------------------------------------------------
    */
    'verify' => [
        'marketing_base' => env('SEO_VERIFY_MARKETING_BASE', 'https://mutqin.ai'),
        'app_base' => env('SEO_VERIFY_APP_BASE', 'https://app.mutqin.ai'),
        'timeout' => max(5, (int) env('SEO_VERIFY_TIMEOUT', 20)),
    ],
];

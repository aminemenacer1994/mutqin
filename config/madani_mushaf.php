<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Madani Mushaf (KFGQPC V2 1421H) storage
    |--------------------------------------------------------------------------
    |
    | Processed page JSON is written under storage/app/madani-mushaf/pages/.
    | Import via: php artisan mutqin:import-madani-mushaf
    |
    | Source attribution: Quranic Universal Library (QUL) — Tarteel AI
    | Layout resource: https://qul.tarteel.ai/resources/mushaf-layout/10
    | Script resource: https://qul.tarteel.ai/resources/quran-script/61
    |
    */
    'storage_path' => 'madani-mushaf',
    'pages_subdir' => 'pages',
    'manifest_file' => 'manifest.json',
    'total_pages' => 604,
    'lines_per_page' => 15,
    'layout_name' => 'KFGQPC V2 1421H Madani Mushaf',
    'layout_resource_id' => 10,
    'script_resource_id' => 61,
    'cache_ttl' => 604800, // 7 days — immutable page payloads
    'qurancom_fallback' => env('MADANI_MUSHAF_QURANCOM_FALLBACK', true),
    'attribution' => [
        'layout' => 'KFGQPC V2 layout (1421H print) — Quranic Universal Library (QUL)',
        'script' => 'QPC V2 Glyph Word by Word — Quranic Universal Library (QUL)',
        'url' => 'https://qul.tarteel.ai',
    ],
];

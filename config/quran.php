<?php

return [

    /*
    |--------------------------------------------------------------------------
    | English tafsir (Quran.com API v4)
    |--------------------------------------------------------------------------
    |
    | Resource IDs match api.quran.com. Commentary is fetched server-side,
    | cached, and exposed to the memorisation UI as inline English tafsir.
    |
    */

    'tafsir' => [
        'default_edition' => env('QURAN_TAFSIR_RESOURCE_ID', '169'),
        'default_resource_id' => env('QURAN_TAFSIR_RESOURCE_ID', '169'),
        'cache_ttl' => (int) env('QURAN_TAFSIR_CACHE_TTL', 86400),
        'upstream_base' => 'https://api.quran.com/api/v4/',
        'editions' => [
            '169' => [
                'reference' => 'Ibn Kathir (Abridged) · English',
                'english_name' => 'Tafsir Ibn Kathir (Abridged)',
                'author' => 'Hafiz Ibn Kathir',
                'language' => 'en',
                'direction' => 'ltr',
            ],
        ],
        'resources' => [
            '169' => [
                'name' => 'Tafsir Ibn Kathir (Abridged)',
                'author' => 'Hafiz Ibn Kathir',
                'language' => 'en',
                'direction' => 'ltr',
            ],
        ],
    ],

];

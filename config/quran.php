<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Translation editions (Al Quran Cloud)
    |--------------------------------------------------------------------------
    */

    'translation' => [
        'default_edition' => env('QURAN_TRANSLATION_EDITION', 'en.asad'),
        'editions' => [
            'en.asad' => [
                'name' => 'Muhammad Asad',
                'english_name' => 'Muhammad Asad — The Message of the Qur\'an',
                'reference' => 'Muhammad Asad',
                'language' => 'en',
                'direction' => 'ltr',
            ],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Transliteration editions (Al Quran Cloud)
    |--------------------------------------------------------------------------
    */

    'transliteration' => [
        'default_edition' => env('QURAN_TRANSLITERATION_EDITION', 'en.transliteration'),
        'editions' => [
            'en.transliteration' => [
                'name' => 'English Transliteration',
                'english_name' => 'English Transliteration',
                'reference' => 'English Transliteration',
                'language' => 'en',
                'direction' => 'ltr',
            ],
        ],
    ],

];

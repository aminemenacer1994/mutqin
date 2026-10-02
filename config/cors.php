<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        'https://mutqin.ai',
        'https://www.mutqin.ai',
        'https://app.mutqin.ai',
    ],
    'allowed_origins_patterns' => [
        '#\Ahttps://([a-z0-9-]+\.)?mutqin\.ai\z#',
        '#\Ahttp://(localhost|127\.0\.0\.1)(:\d+)?\z#',
    ],
    'allowed_headers' => ['*'],
    'exposed_headers' => ['X-Request-Id'],
    'max_age' => 0,
    'supports_credentials' => false,
];

<?php

return [
    /*
    | Release shown in Sentry / structured logs. Prefer a git SHA in CI
    | (SENTRY_RELEASE or MUTQIN_RELEASE). Falls back to the asset build stamp.
    */
    'release' => env('SENTRY_RELEASE', env('MUTQIN_RELEASE')),

    'asset_build' => env('MUTQIN_ASSET_BUILD', 'v165'),

    /*
    | Authorized probe at GET /internal/error-test.
    | Non-production: always available. Production: verified admins only.
    | Set false to disable the route everywhere.
    */
    'probe_enabled' => env('ERROR_TRACKING_PROBE_ENABLED', true),
];

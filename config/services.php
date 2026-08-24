<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'speechmatics' => [
        'api_key' => env('SPEECHMATICS_API_KEY'),
        'region' => env('SPEECHMATICS_REGION'),
        // Realtime temporary token lifetime (seconds). Usage-cap minutes convert with this TTL.
        'token_ttl' => env('SPEECHMATICS_TOKEN_TTL', 120),
        /*
         * Daily cost guard for AI Recite / Check memorisation token mints.
         * Counts successful mints per UTC day (cache). Not a billing system.
         * Tester defaults: 30 mints/user (~60 min) and 200 global (~400 min).
         * See README "Speechmatics usage cap" and .env.example.
         */
        'usage_cap' => [
            'enabled' => env('SPEECHMATICS_USAGE_CAP_ENABLED', true),
            'daily_user_token_mints' => env('SPEECHMATICS_DAILY_USER_TOKEN_MINTS', 30),
            'daily_global_token_mints' => env('SPEECHMATICS_DAILY_GLOBAL_TOKEN_MINTS', 200),
            'daily_user_session_minutes' => env('SPEECHMATICS_DAILY_USER_SESSION_MINUTES'),
            'daily_global_session_minutes' => env('SPEECHMATICS_DAILY_GLOBAL_SESSION_MINUTES'),
        ],
    ],

    'google' => [
        // Trim: Laravel Cloud / .env editors often leave trailing whitespace that
        // produces Google's "OAuth client was not found" (invalid_client).
        'client_id' => trim((string) env('GOOGLE_CLIENT_ID', '')),
        'client_secret' => trim((string) env('GOOGLE_CLIENT_SECRET', '')),
        // Must exactly match an Authorized redirect URI in Google Cloud Console.
        'redirect' => trim((string) (
            env('GOOGLE_REDIRECT_URI')
            ?: rtrim((string) env('APP_URL', 'http://localhost'), '/').'/auth/google/callback'
        )),
    ],

    'stripe' => [
        'publishable_key' => env('STRIPE_PUBLISHABLE_KEY'),
        'secret_key' => env('STRIPE_SECRET_KEY'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
    ],

];

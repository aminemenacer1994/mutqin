<?php

use App\Support\GoogleOAuthRedirect;

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
        'key' => env('RESEND_KEY', env('RESEND_API_KEY')),
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
         * Informational provider budget (Speechmatics portal / account contract).
         * Not enforced via API — set only after you raise the cap in the dashboard.
         * Used for soft-cap alerts so ops see usage vs. the account limit before
         * Speechmatics hard-stops traffic. See docs/speechmatics-capacity.md.
         */
        'provider' => [
            'reference_daily_session_minutes' => env('SPEECHMATICS_PROVIDER_DAILY_SESSION_MINUTES'),
            'reference_daily_token_mints' => env('SPEECHMATICS_PROVIDER_DAILY_TOKEN_MINTS'),
        ],
        /*
         * Daily cost guard for AI Recite / Check memorisation token mints.
         * Counts successful mints per UTC day (cache). Not a billing system.
         * Keep application limits below SPEECHMATICS_PROVIDER_* reference values.
         * Tester defaults: 30 mints/user (~60 min) and 200 global (~400 min).
         * See README "Speechmatics usage cap" and docs/speechmatics-capacity.md.
         */
        'usage_cap' => [
            'enabled' => env('SPEECHMATICS_USAGE_CAP_ENABLED', true),
            'daily_user_token_mints' => env('SPEECHMATICS_DAILY_USER_TOKEN_MINTS', 30),
            'daily_global_token_mints' => env('SPEECHMATICS_DAILY_GLOBAL_TOKEN_MINTS', 200),
            'daily_user_session_minutes' => env('SPEECHMATICS_DAILY_USER_SESSION_MINUTES'),
            'daily_global_session_minutes' => env('SPEECHMATICS_DAILY_GLOBAL_SESSION_MINUTES'),
            // Optional stricter kill-switch (defaults to daily_global_token_mints when unset).
            'emergency_global_token_mints' => env('SPEECHMATICS_EMERGENCY_GLOBAL_TOKEN_MINTS'),
            'emergency_global_session_minutes' => env('SPEECHMATICS_EMERGENCY_GLOBAL_SESSION_MINUTES'),
            // Soft-cap log thresholds (% of the relevant limit). Hard deny still uses mint counts above.
            'warn_percent' => env('SPEECHMATICS_USAGE_WARN_PERCENT', 80),
            'critical_percent' => env('SPEECHMATICS_USAGE_CRITICAL_PERCENT', 95),
        ],
        /*
         * Burst / per-minute HTTP guard for POST /memorisation/transcription-token.
         * Runs before Speechmatics is contacted. Counts every attempt (including
         * upstream failures) so retries cannot multiply provider calls. Defaults
         * allow a normal AMD session + soft-recover without blocking learners.
         * Admin/demo bypass is OFF unless explicitly enabled.
         */
        'rate_limit' => [
            'enabled' => env('SPEECHMATICS_RATE_LIMIT_ENABLED', true),
            'per_user_per_minute' => env('SPEECHMATICS_RATE_LIMIT_PER_USER_PER_MINUTE', 10),
            'per_ip_per_minute' => env('SPEECHMATICS_RATE_LIMIT_PER_IP_PER_MINUTE', 30),
            'burst_per_user' => env('SPEECHMATICS_RATE_LIMIT_BURST_PER_USER', 3),
            'burst_seconds' => env('SPEECHMATICS_RATE_LIMIT_BURST_SECONDS', 10),
            'bypass_admin' => env('SPEECHMATICS_RATE_LIMIT_BYPASS_ADMIN', false),
            'bypass_demo' => env('SPEECHMATICS_RATE_LIMIT_BYPASS_DEMO', false),
        ],
    ],

    'google_analytics' => [
        // Public GA4 Measurement ID (not a secret). Empty disables the tag.
        'measurement_id' => trim((string) env('GOOGLE_ANALYTICS_ID', 'G-W4K8J2T0SG')),
        // Off in local/testing so localhost does not pollute production reports.
        'enabled' => filter_var(
            env('GOOGLE_ANALYTICS_ENABLED', env('APP_ENV') === 'production'),
            FILTER_VALIDATE_BOOL
        ),
    ],

    'google' => [
        // Trim: Laravel Cloud / .env editors often leave trailing whitespace that
        // produces Google's "OAuth client was not found" (invalid_client).
        'client_id' => trim((string) env('GOOGLE_CLIENT_ID', '')),
        'client_secret' => trim((string) env('GOOGLE_CLIENT_SECRET', '')),
        // Must exactly match an Authorized redirect URI in Google Cloud Console.
        // Laravel Cloud does not interpolate ${APP_URL}; PHP expands it here.
        'redirect' => GoogleOAuthRedirect::fromEnvironment(
            env('GOOGLE_REDIRECT_URI'),
            env('APP_URL', 'http://localhost')
        ),
    ],

    'stripe' => [
        'publishable_key' => env('STRIPE_PUBLISHABLE_KEY'),
        'secret_key' => env('STRIPE_SECRET_KEY'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
    ],

];

<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Production health & uptime
    |--------------------------------------------------------------------------
    |
    | Public GET /health returns only { status }. Detailed checks live at
    | GET /internal/health (staging open; production admins or token).
    | Do not invent a second APM stack — use Sentry + Laravel Cloud alerts.
    | See docs/monitoring.md.
    |
    */

    'probe_enabled' => env('MONITORING_PROBE_ENABLED', true),

    /*
    | Optional bearer / X-Mutqin-Monitoring-Token for machine access to
    | /internal/health and /internal/alert-test. Never commit a real token.
    */
    'internal_token' => env('MONITORING_INTERNAL_TOKEN'),

    /*
    | Heartbeat keys are written by mutqin:health-heartbeat (scheduler) and
    | RecordWorkerHeartbeatJob (queue worker). Freshness is age-based — not
    | "config exists".
    */
    'heartbeats' => [
        'cache_store' => env('MONITORING_HEARTBEAT_CACHE_STORE'),
        'scheduler_key' => 'mutqin:monitoring:scheduler_heartbeat',
        'worker_key' => 'mutqin:monitoring:worker_heartbeat',
        // Scheduler runs every minute; allow clock skew + a missed tick.
        'scheduler_max_age_seconds' => (int) env('MONITORING_SCHEDULER_MAX_AGE', 180),
        // Worker job is dispatched every minute when async queues are used.
        'worker_max_age_seconds' => (int) env('MONITORING_WORKER_MAX_AGE', 300),
    ],

    /*
    | When overall status leaves "ok", emit structured logs (and optional
    | Sentry messages for unavailable) at most this often.
    */
    'alert_cooldown_seconds' => (int) env('MONITORING_ALERT_COOLDOWN', 300),

    /*
    | Scheduled health evaluation (mutqin:health-evaluate). Writes transition
    | logs without exposing diagnostics on the public endpoint.
    */
    'evaluate_enabled' => filter_var(
        env('MONITORING_EVALUATE_ENABLED', true),
        FILTER_VALIDATE_BOOL
    ),

];

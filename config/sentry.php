<?php

use App\Support\ErrorReporting;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Sentry is Mutqin's single error-tracking provider.
 *
 * Privacy defaults: no PII, no SQL bindings, no HTTP-client breadcrumbs
 * (those can include Speechmatics auth), no request bodies. before_send
 * scrubs leftovers. DSN is never committed — set SENTRY_LARAVEL_DSN in
 * the hosting environment.
 *
 * @see https://docs.sentry.io/platforms/php/guides/laravel/configuration/options/
 */
return [

    'dsn' => env('SENTRY_LARAVEL_DSN', env('SENTRY_DSN')),

    'release' => env('SENTRY_RELEASE', env('MUTQIN_RELEASE')),

    'environment' => env('SENTRY_ENVIRONMENT'),

    'org_id' => env('SENTRY_ORG_ID') === null ? null : (int) env('SENTRY_ORG_ID'),

    'sample_rate' => env('SENTRY_SAMPLE_RATE') === null ? 1.0 : (float) env('SENTRY_SAMPLE_RATE'),

    // Tracing off unless explicitly enabled — spans can capture provider URLs.
    'traces_sample_rate' => env('SENTRY_TRACES_SAMPLE_RATE') === null ? 0.0 : (float) env('SENTRY_TRACES_SAMPLE_RATE'),

    'profiles_sample_rate' => env('SENTRY_PROFILES_SAMPLE_RATE') === null ? null : (float) env('SENTRY_PROFILES_SAMPLE_RATE'),

    'strict_trace_continuation' => env('SENTRY_STRICT_TRACE_CONTINUATION', false),

    'enable_logs' => env('SENTRY_ENABLE_LOGS', false),

    'enable_metrics' => env('SENTRY_ENABLE_METRICS', false),

    'log_flush_threshold' => env('SENTRY_LOG_FLUSH_THRESHOLD') === null ? null : (int) env('SENTRY_LOG_FLUSH_THRESHOLD'),

    'logs_channel_level' => env('SENTRY_LOG_LEVEL', env('SENTRY_LOGS_LEVEL', env('LOG_LEVEL', 'debug'))),

    'send_default_pii' => env('SENTRY_SEND_DEFAULT_PII', false),

    'ignore_exceptions' => [
        ValidationException::class,
        AuthenticationException::class,
        AuthorizationException::class,
        TokenMismatchException::class,
        ModelNotFoundException::class,
        NotFoundHttpException::class,
    ],

    'ignore_transactions' => [
        '/up',
        '/internal/error-test',
    ],

    'before_send' => [ErrorReporting::class, 'beforeSend'],

    'breadcrumbs' => [
        'logs' => env('SENTRY_BREADCRUMBS_LOGS_ENABLED', true),
        'cache' => env('SENTRY_BREADCRUMBS_CACHE_ENABLED', false),
        'livewire' => false,
        // SQL may include āyah notes / Qur'an text.
        'sql_queries' => env('SENTRY_BREADCRUMBS_SQL_QUERIES_ENABLED', false),
        'sql_bindings' => false,
        'queue_info' => env('SENTRY_BREADCRUMBS_QUEUE_INFO_ENABLED', true),
        'command_info' => env('SENTRY_BREADCRUMBS_COMMAND_JOBS_ENABLED', true),
        // HTTP client breadcrumbs can include Speechmatics API keys in headers.
        'http_client_requests' => false,
        'notifications' => env('SENTRY_BREADCRUMBS_NOTIFICATIONS_ENABLED', false),
    ],

    'tracing' => [
        'queue_job_transactions' => env('SENTRY_TRACE_QUEUE_ENABLED', false),
        'queue_jobs' => env('SENTRY_TRACE_QUEUE_JOBS_ENABLED', false),
        'sql_queries' => env('SENTRY_TRACE_SQL_QUERIES_ENABLED', false),
        'sql_bindings' => false,
        'sql_origin' => false,
        'sql_origin_threshold_ms' => env('SENTRY_TRACE_SQL_ORIGIN_THRESHOLD_MS', 100),
        'views' => env('SENTRY_TRACE_VIEWS_ENABLED', false),
        'livewire' => false,
        'http_client_requests' => false,
        'cache' => env('SENTRY_TRACE_CACHE_ENABLED', false),
        'redis_commands' => false,
        'redis_origin' => false,
        'notifications' => false,
        'missing_routes' => false,
        'continue_after_response' => env('SENTRY_TRACE_CONTINUE_AFTER_RESPONSE', false),
        'gen_ai' => false,
        'gen_ai_invoke_agent' => false,
        'gen_ai_chat' => false,
        'gen_ai_execute_tool' => false,
        'gen_ai_embeddings' => false,
        'default_integrations' => env('SENTRY_TRACE_DEFAULT_INTEGRATIONS_ENABLED', true),
    ],

];

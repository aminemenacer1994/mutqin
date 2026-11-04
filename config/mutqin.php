<?php

$rawRecordingRetention = strtolower(trim((string) env(
    'MUTQIN_RAW_RECORDING_RETENTION',
    // Legacy boolean: true → retain, false → temporary (never accidental indefinite retention).
    filter_var(env('MUTQIN_RETAIN_RAW_AUDIO', false), FILTER_VALIDATE_BOOL) ? 'retain' : 'temporary'
)));

if (! in_array($rawRecordingRetention, ['never', 'temporary', 'retain'], true)) {
    $rawRecordingRetention = 'temporary';
}

return [
    /*
     | Post-session recommendation plan.
     |
     | Keep disabled while completed practice sessions return to the learner
     | dashboard. Re-enable the intact plan flow with SHOW_RECOMMENDATION_PLAN=true.
     */
    'show_recommendation_plan' => filter_var(env('SHOW_RECOMMENDATION_PLAN', false), FILTER_VALIDATE_BOOL),

    /*
     | Teacher and student management (registration roles, organisations,
     | teacher dashboard, assignments, notes, groups).
     |
     | Off unless MUTQIN_TEACHER_FEATURES_ENABLED=true. Do not infer this from
     | APP_ENV. Laravel Cloud config:cache reads this value at deploy time, so
     | set it in each environment before caching config. One application serves
     | the public site, so false hides teacher features everywhere.
     */
    'teacher_features_enabled' => filter_var(env('MUTQIN_TEACHER_FEATURES_ENABLED', false), FILTER_VALIDATE_BOOL),

    /*
     | Learner dashboard block ("From your teacher"). Requires teacher_features_enabled.
     | Off by default in deployed environments; local/testing mirror teacher_features unless set.
     */
    'learner_teacher_section_enabled' => filter_var(
        env(
            'MUTQIN_LEARNER_TEACHER_SECTION_ENABLED',
            in_array(env('APP_ENV', 'production'), ['local', 'testing'], true)
                ? env('MUTQIN_TEACHER_FEATURES_ENABLED', false)
                : false
        ),
        FILTER_VALIDATE_BOOL
    ),

    /*
     | Comma-separated student mailboxes enrolled into every demo teacher group when
     | organisation-network or teacher-demo seeders run (non-production only).
     | Leave empty in production. Example: menacer72@gmail.com
     */
    'teacher_anchor_student_emails' => array_values(array_filter(array_map(
        static fn (string $email): string => strtolower(trim($email)),
        explode(',', (string) env('MUTQIN_TEACHER_ANCHOR_STUDENT_EMAILS', 'menacer72@gmail.com'))
    ))),

    /*
     | Host-based routing (production): mutqin.ai is the canonical app and marketing host.
     | Disabled when marketing and app hosts match (local/tests).
     */
    'domains' => [
        'marketing_host' => env('MUTQIN_MARKETING_HOST', 'mutqin.ai'),
        'app_host' => env('MUTQIN_APP_HOST', 'mutqin.ai'),
        'enable_in_local' => filter_var(env('MUTQIN_DOMAIN_ROUTING_IN_LOCAL', false), FILTER_VALIDATE_BOOL),
        'enable_in_tests' => filter_var(env('MUTQIN_DOMAIN_ROUTING_IN_TESTS', false), FILTER_VALIDATE_BOOL),
        'force_enabled' => filter_var(env('MUTQIN_DOMAIN_ROUTING_FORCE', false), FILTER_VALIDATE_BOOL),
        'force_disabled' => filter_var(env('MUTQIN_DOMAIN_ROUTING_DISABLE', false), FILTER_VALIDATE_BOOL),
    ],

    // MVP admin allowlist (MUTQIN_ADMIN_EMAILS). Used with users.is_admin + verified email.
    // Also blocks these mailboxes on register/profile for non-admins.
    // Default primary operator when env is unset (Laravel Cloud). Override with
    // MUTQIN_ADMIN_EMAILS= or a comma-separated list for multiple super admins.
    'admin_emails' => array_values(array_filter(array_map(
        static fn (string $email): string => strtolower(trim($email)),
        explode(',', (string) env('MUTQIN_ADMIN_EMAILS', 'menacer72@gmail.com'))
    ))),

    // Who sees the admin nav item. Narrower than the admin role allowlist.
    'admin_navigation_emails' => array_values(array_filter(array_map(
        static fn (string $email): string => strtolower(trim($email)),
        explode(',', (string) env('MUTQIN_ADMIN_NAVIGATION_EMAILS', 'menacer72@gmail.com'))
    ))),

    'learning_history' => [
        // Explainable historical results.
        'algorithm_version' => env('MUTQIN_ALGORITHM_VERSION', 'mutqin-recitation-v1'),
        'default_model_version' => env('MUTQIN_MODEL_VERSION', 'client-asr-v1'),
        'default_review_days' => (int) env('MUTQIN_DEFAULT_REVIEW_DAYS', 1),
        // 0 disables automatic soft-deletion of old completed assessments.
        'assessment_soft_delete_days' => (int) env('MUTQIN_ASSESSMENT_SOFT_DELETE_DAYS', 0),
        // Legacy alias: true only when raw_recording_retention === retain.
        'retain_raw_audio' => $rawRecordingRetention === 'retain',
    ],

    /**
     * Microphone + AI audio privacy.
     *
     * raw_recording_retention:
     * - never: do not persist learner audio blobs (memory/review URLs only for the active turn)
     * - temporary: may persist briefly, then delete via TTL / cleanup jobs (default)
     * - retain: intentionally keep local/session audio for learner replay (still never sold)
     *
     * Mutqin servers never store raw learner recordings in assessment tables regardless of mode.
     * Live PCM may be streamed to the configured external processor during an AI check.
     */
    'audio_privacy' => [
        'policy_version' => (string) env('MUTQIN_AUDIO_PRIVACY_POLICY_VERSION', '2026-09-01'),
        'processor_name' => (string) env('MUTQIN_AUDIO_PROCESSOR_NAME', 'Speechmatics'),
        'raw_recording_retention' => $rawRecordingRetention,
        // Hours before temporary local/server temp audio must be deleted.
        'temporary_ttl_hours' => max(1, (int) env('MUTQIN_TEMPORARY_RECORDING_TTL_HOURS', 24)),
        // Server-side scratch directory for any accidental temp audio files (never for long-term storage).
        'temp_disk_path' => env('MUTQIN_LEARNER_AUDIO_TEMP_PATH')
            ?: storage_path('app/tmp/learner-audio'),
    ],

    'recitation_mastery' => [
        'ema_alpha' => 0.15,
        'max_session_delta' => 0.10,
        'high_confidence_threshold' => 0.72,
        'persistent_weak_attempts' => 2,
    ],

    'ai_recite' => [
        'pause_policy' => [
            'hesitation_seconds' => max(0.5, (float) env('MUTQIN_HESITATION_PAUSE_SECONDS', 1.35)),
            'self_correction_seconds' => max(0.0, (float) env('MUTQIN_SELF_CORRECTION_PAUSE_SECONDS', 0.55)),
        ],
        /*
         * Optional default lifetime cap on AI voice checks (MemorisationAssessment rows).
         * Null / empty = no default cap; per-user override via users.ai_recite_lifetime_limit.
         */
        'default_lifetime_limit' => env('MUTQIN_AI_RECITE_DEFAULT_LIFETIME_LIMIT'),
        // UTC-day cap on saved voice checks (MemorisationAssessment rows). 0 disables.
        'default_daily_limit' => max(0, (int) env('MUTQIN_AI_RECITE_DEFAULT_DAILY_LIMIT', 10)),
        'daily_limit_exempt_emails' => array_values(array_filter(array_map(
            static fn (string $email): string => strtolower(trim($email)),
            explode(',', (string) env('MUTQIN_AI_RECITE_DAILY_LIMIT_EXEMPT_EMAILS', 'menacer72@gmail.com'))
        ))),
        'daily_limit_exempt_names' => array_values(array_filter(array_map(
            static fn (string $name): string => strtolower(preg_replace('/\s+/', ' ', trim($name)) ?? ''),
            explode('|', (string) env('MUTQIN_AI_RECITE_DAILY_LIMIT_EXEMPT_NAMES', 'amine menacer'))
        ))),
    ],

    /*
     | User-owned durable files (feedback screenshots). Not AI temp audio.
     | Disk name must exist in config/filesystems.php (local | user_files | s3 | …).
     */
    'user_files' => [
        'disk' => env('MUTQIN_USER_FILES_DISK', 'local'),
        'screenshot_prefix' => 'feedback-screenshots',
    ],

    /*
     | App-level encrypted backups (spatie/laravel-backup). Off by default until
     | destination credentials + archive password + scheduler are configured.
     | Laravel Cloud MySQL snapshots remain the primary DB recovery path.
     | See docs/backups.md.
     */
    'backup' => [
        'enabled' => filter_var(env('MUTQIN_BACKUP_ENABLED', false), FILTER_VALIDATE_BOOL),
        'disk' => env('BACKUP_DISK', 'backups'),
        'require_encryption' => filter_var(env('BACKUP_REQUIRE_ENCRYPTION', true), FILTER_VALIDATE_BOOL),
        'clean_at' => env('BACKUP_CLEAN_AT', '01:00'),
        'run_at' => env('BACKUP_RUN_AT', '01:30'),
        'monitor_at' => env('BACKUP_MONITOR_AT', '02:00'),
        // Laravel Cloud MySQL automated snapshot retention (dashboard), documented for ops.
        'cloud_mysql_retention_days' => (int) env('MUTQIN_CLOUD_MYSQL_BACKUP_RETENTION_DAYS', 30),
    ],

    'registered_users' => [
        'broadcast_email' => [
            'campaign_key' => (string) env('MUTQIN_REGISTERED_USER_BROADCAST_CAMPAIGN_KEY', 'registered_broadcast_2026'),
            'batch_size' => max(1, (int) env('MUTQIN_REGISTERED_USER_BROADCAST_BATCH_SIZE', 25)),
            'batch_delay_seconds' => max(1, (int) env('MUTQIN_REGISTERED_USER_BROADCAST_BATCH_DELAY_SECONDS', 60)),
            'queue' => (string) env('MUTQIN_REGISTERED_USER_BROADCAST_QUEUE', 'default'),
        ],
    ],

    /*
     | When true, authenticated learners pass all plan:premium / plan:pro gates
     | (Find by voice token mint, AI assessments, offline audio, etc.).
     | Defaults on. Set MUTQIN_UNRESTRICTED_SUBSCRIPTION=false to restore paid gates.
     */
    'unrestricted_subscription' => filter_var(
        env('MUTQIN_UNRESTRICTED_SUBSCRIPTION', true),
        FILTER_VALIDATE_BOOL
    ),

    'waiting_list' => [
        // Set true only in local/dev if DNS checks block legitimate test signups.
        'skip_mail_domain_dns_check' => filter_var(env('MUTQIN_WAITING_LIST_SKIP_DNS', true), FILTER_VALIDATE_BOOL),
        // mutqin.ai Cloud env: set to mysql, mutqin_signups, or attach the app MySQL cluster
        // as the default DB (see .env.example). When MUTQIN_SIGNUP_DB_DATABASE is set,
        // mutqin_signups is used automatically unless MUTQIN_WAITING_LIST_DB_CONNECTION overrides.
        'database_connection' => env('MUTQIN_WAITING_LIST_DB_CONNECTION')
            ?: (trim((string) env('MUTQIN_SIGNUP_DB_DATABASE', '')) !== ''
                ? 'mutqin_signups'
                : null),
        'launch_email' => [
            'campaign_key' => (string) env('MUTQIN_WAITLIST_LAUNCH_CAMPAIGN_KEY', 'waitlist_launch_2026'),
            'batch_size' => max(1, (int) env('MUTQIN_WAITLIST_LAUNCH_BATCH_SIZE', 25)),
            'batch_delay_seconds' => max(1, (int) env('MUTQIN_WAITLIST_LAUNCH_BATCH_DELAY_SECONDS', 60)),
            'queue' => (string) env('MUTQIN_WAITLIST_LAUNCH_QUEUE', 'default'),
        ],
    ],
];

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
    // MVP admin allowlist (MUTQIN_ADMIN_EMAILS). Used with users.is_admin + verified email.
    // Also blocks these mailboxes on register/profile for non-admins.
    'admin_emails' => array_values(array_filter(array_map(
        static fn (string $email): string => strtolower(trim($email)),
        explode(',', (string) env('MUTQIN_ADMIN_EMAILS', ''))
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
];

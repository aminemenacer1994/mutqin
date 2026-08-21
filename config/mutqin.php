<?php

return [
    // Reserved mailboxes only (registration/profile deny-list). Privilege is users.is_admin.
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
        // Optional recordings are purged on account deletion / anonymisation.
        'retain_raw_audio' => filter_var(env('MUTQIN_RETAIN_RAW_AUDIO', false), FILTER_VALIDATE_BOOL),
    ],

    'recitation_mastery' => [
        'ema_alpha' => 0.15,
        'max_session_delta' => 0.10,
        'high_confidence_threshold' => 0.72,
        'persistent_weak_attempts' => 2,
    ],
];

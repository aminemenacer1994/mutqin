<?php

use Spatie\Backup\Notifications\Notifiable;
use Spatie\Backup\Notifications\Notifications\BackupHasFailedNotification;
use Spatie\Backup\Notifications\Notifications\BackupWasSuccessfulNotification;
use Spatie\Backup\Notifications\Notifications\CleanupHasFailedNotification;
use Spatie\Backup\Notifications\Notifications\CleanupWasSuccessfulNotification;
use Spatie\Backup\Notifications\Notifications\HealthyBackupWasFoundNotification;
use Spatie\Backup\Notifications\Notifications\UnhealthyBackupWasFoundNotification;
use Spatie\Backup\Tasks\Cleanup\Strategies\DefaultStrategy;
use Spatie\Backup\Tasks\Monitor\HealthChecks\MaximumAgeInDays;
use Spatie\Backup\Tasks\Monitor\HealthChecks\MaximumStorageInMegabytes;

$archivePassword = env('BACKUP_ARCHIVE_PASSWORD');
$archivePassword = is_string($archivePassword) && $archivePassword !== '' ? $archivePassword : null;

$backupDisk = env('BACKUP_DISK', 'backups');
$notifyMail = env('BACKUP_NOTIFICATION_MAIL');
$notifyWebhook = env('BACKUP_NOTIFICATION_WEBHOOK_URL');
$failureChannels = array_values(array_filter([
    $notifyMail ? 'mail' : null,
    (is_string($notifyWebhook) && $notifyWebhook !== '') ? 'webhook' : null,
]));

return [

    'backup' => [
        /*
         * Archive namespace under the destination disk. Keep stable so monitor/clean
         * can find historical copies (do not use APP_NAME — it may change).
         */
        'name' => env('BACKUP_NAME', 'mutqin'),

        'source' => [
            'files' => [
                /*
                 * Only durable user-owned files that live on the local private disk.
                 * When MUTQIN_USER_FILES_DISK points at object storage, mutqin:backup
                 * stages feedback-screenshots into this path before the zip runs.
                 * Never include caches, build output, or AI temp audio.
                 */
                'include' => [
                    storage_path('app/private/feedback-screenshots'),
                ],

                'exclude' => [
                    base_path('vendor'),
                    base_path('node_modules'),
                    base_path('public/js'),
                    base_path('public/css'),
                    storage_path('framework'),
                    storage_path('logs'),
                    storage_path('app/backup-temp'),
                    storage_path('app/private/backups'),
                    storage_path('app/tmp'),
                    storage_path('app/tmp/learner-audio'),
                    storage_path('app/sourcemaps'),
                ],

                'follow_links' => false,

                'ignore_unreadable_directories' => true,

                'relative_path' => storage_path('app/private'),
            ],

            /*
             * Default DB connection. MySQL dumps need mysqldump on the host PATH
             * (or BACKUP_DB_DUMP_BINARY_PATH). On Laravel Cloud, provider snapshots
             * remain the primary DB recovery path — see docs/backups.md.
             */
            'databases' => [
                env('DB_CONNECTION', 'sqlite'),
            ],
        ],

        'database_dump_compressor' => null,

        'database_dump_file_timestamp_format' => null,

        'database_dump_filename_base' => 'database',

        'database_dump_file_extension' => '',

        'destination' => [
            'compression_method' => ZipArchive::CM_DEFAULT,

            'compression_level' => 9,

            'filename_prefix' => env('BACKUP_FILENAME_PREFIX', 'mutqin-'),

            /*
             * Must be a private disk (local under storage/app/private/backups, or a
             * private S3/R2 bucket). Never use the public disk.
             */
            'disks' => [
                $backupDisk,
            ],

            'continue_on_failure' => false,
        ],

        'temporary_directory' => storage_path('app/backup-temp'),

        'password' => $archivePassword,

        'encryption' => $archivePassword ? 'default' : 'none',

        'verify_backup' => filter_var(env('BACKUP_VERIFY', true), FILTER_VALIDATE_BOOL),

        'tries' => (int) env('BACKUP_TRIES', 1),

        'retry_delay' => (int) env('BACKUP_RETRY_DELAY', 0),
    ],

    'notifications' => [
        'notifications' => [
            BackupHasFailedNotification::class => $failureChannels,
            UnhealthyBackupWasFoundNotification::class => $failureChannels,
            CleanupHasFailedNotification::class => $failureChannels,
            // Successes are logged only (avoid inbox noise).
            BackupWasSuccessfulNotification::class => [],
            HealthyBackupWasFoundNotification::class => [],
            CleanupWasSuccessfulNotification::class => [],
        ],

        'notifiable' => Notifiable::class,

        'mail' => [
            'to' => $notifyMail ?: 'ops@example.invalid',

            'from' => [
                'address' => env('MAIL_FROM_ADDRESS', 'hello@example.com'),
                'name' => env('MAIL_FROM_NAME', 'Mutqin'),
            ],
        ],

        'slack' => [
            'webhook_url' => '',
            'channel' => null,
            'username' => null,
            'icon' => null,
        ],

        'discord' => [
            'webhook_url' => '',
            'username' => '',
            'avatar_url' => '',
        ],

        'webhook' => [
            'url' => is_string($notifyWebhook) ? $notifyWebhook : '',
        ],
    ],

    'log_channel' => null,

    'monitor_backups' => [
        [
            'name' => env('BACKUP_NAME', 'mutqin'),
            'disks' => [$backupDisk],
            'health_checks' => [
                MaximumAgeInDays::class => (int) env('BACKUP_MONITOR_MAX_AGE_DAYS', 2),
                MaximumStorageInMegabytes::class => (int) env('BACKUP_MONITOR_MAX_STORAGE_MB', 10240),
            ],
        ],
    ],

    'cleanup' => [
        'strategy' => DefaultStrategy::class,

        /*
         * Retention tiers (env-tunable). Default: keep everything for a week,
         * then daily for ~2 weeks more, weekly for ~2 months, monthly for a year.
         */
        'default_strategy' => [
            'keep_all_backups_for_days' => (int) env('BACKUP_KEEP_ALL_DAYS', 7),
            'keep_daily_backups_for_days' => (int) env('BACKUP_KEEP_DAILY_DAYS', 16),
            'keep_weekly_backups_for_weeks' => (int) env('BACKUP_KEEP_WEEKLY_WEEKS', 8),
            'keep_monthly_backups_for_months' => (int) env('BACKUP_KEEP_MONTHLY_MONTHS', 12),
            'keep_yearly_backups_for_years' => (int) env('BACKUP_KEEP_YEARLY_YEARS', 2),
            'delete_oldest_backups_when_using_more_megabytes_than' => (int) env('BACKUP_MAX_STORAGE_MB', 10240),
        ],

        'tries' => 1,

        'retry_delay' => 0,
    ],

];

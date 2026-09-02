<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application for file storage.
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Below you may configure as many filesystem disks as necessary, and you
    | may even configure multiple disks for the same driver. Examples for
    | most supported storage drivers are configured here for reference.
    |
    | Supported drivers: "local", "ftp", "sftp", "s3"
    |
    */

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
            'report' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => rtrim(env('APP_URL', 'http://localhost'), '/').'/storage',
            'visibility' => 'public',
            'throw' => false,
            'report' => false,
        ],

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            // Laravel Cloud Object Storage (R2): bucket visibility is set in the dashboard.
            // Do not set Flysystem visibility=public — R2 rejects per-object ACLs.
            'throw' => false,
            'report' => false,
        ],

        /*
         * Durable user-owned files (feedback screenshots). Local by default.
         * On Laravel Cloud the app filesystem is ephemeral — attach a *private*
         * Object Storage bucket and set MUTQIN_USER_FILES_DISK to that disk name
         * (often `s3` or a custom name from the Cloud canvas).
         */
        'user_files' => [
            'driver' => env('MUTQIN_USER_FILES_DRIVER', 'local'),
            'root' => storage_path('app/private'),
            'serve' => false,
            'visibility' => 'private',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
            'report' => false,
        ],

        /*
         * Encrypted backup archives only. Never public. Prefer a *separate* private
         * Object Storage / S3 bucket from user_files so deleting app files cannot
         * wipe recovery archives. Local driver keeps archives under private/.
         */
        'backups' => [
            'driver' => env('BACKUP_DISK_DRIVER', 'local'),
            'root' => storage_path('app/private/backups'),
            'serve' => false,
            'visibility' => 'private',
            'key' => env('BACKUP_AWS_ACCESS_KEY_ID', env('AWS_ACCESS_KEY_ID')),
            'secret' => env('BACKUP_AWS_SECRET_ACCESS_KEY', env('AWS_SECRET_ACCESS_KEY')),
            'region' => env('BACKUP_AWS_DEFAULT_REGION', env('AWS_DEFAULT_REGION', 'auto')),
            'bucket' => env('BACKUP_AWS_BUCKET'),
            'url' => env('BACKUP_AWS_URL'),
            'endpoint' => env('BACKUP_AWS_ENDPOINT', env('AWS_ENDPOINT')),
            'use_path_style_endpoint' => filter_var(
                env('BACKUP_AWS_USE_PATH_STYLE_ENDPOINT', env('AWS_USE_PATH_STYLE_ENDPOINT', false)),
                FILTER_VALIDATE_BOOL
            ),
            'throw' => false,
            'report' => false,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];

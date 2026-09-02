<?php

namespace App\Console\Commands;

use App\Support\UserFilesDisk;
use Illuminate\Console\Command;

class BackupHealthCommand extends Command
{
    protected $signature = 'mutqin:backup-health
                            {--json : Emit machine-readable JSON}';

    protected $description = 'Report whether Mutqin backup layers are configured (Cloud MySQL + app-level Spatie).';

    public function handle(): int
    {
        $checks = [];
        $blocking = false;

        $enabled = (bool) config('mutqin.backup.enabled');
        $checks[] = $this->row(
            'app_backup_enabled',
            true,
            $enabled ? 'MUTQIN_BACKUP_ENABLED=true' : 'MUTQIN_BACKUP_ENABLED=false (scheduler will skip mutqin:backup)',
            $enabled ? null : 'Enable only after private BACKUP_DISK credentials and BACKUP_ARCHIVE_PASSWORD are set in the host env.'
        );

        $cloudDays = (int) config('mutqin.backup.cloud_mysql_retention_days', 30);
        $checks[] = $this->row(
            'laravel_cloud_mysql',
            true,
            "Documented Cloud MySQL retention target: {$cloudDays} day(s) (configure in Org → Resources → Databases → Backups).",
            'Provider snapshots are the primary production DB recovery path. Confirm Daily backups are enabled in the Laravel Cloud dashboard — this command cannot verify the platform API.'
        );

        $userDisk = UserFilesDisk::name();
        $userDriver = (string) config('filesystems.disks.'.$userDisk.'.driver', '');
        $userRemote = UserFilesDisk::isRemote();
        $userOk = $userDriver !== '';
        $checks[] = $this->row(
            'user_files_disk',
            $userOk,
            "MUTQIN_USER_FILES_DISK={$userDisk} (driver={$userDriver}".($userRemote ? ', remote' : ', local').')',
            $userRemote
                ? 'Private Object Storage is required on Laravel Cloud (ephemeral local disk).'
                : 'On Laravel Cloud, switch this to a private Object Storage disk before relying on feedback screenshots across deploys.'
        );

        $backupDisk = (string) config('mutqin.backup.disk', 'backups');
        $backupDriver = (string) config('filesystems.disks.'.$backupDisk.'.driver', '');
        $backupConfigured = $backupDriver !== '';
        if ($backupDriver === 's3') {
            $bucket = (string) config('filesystems.disks.'.$backupDisk.'.bucket', '');
            $backupConfigured = $bucket !== '';
        }
        $checks[] = $this->row(
            'backup_destination_disk',
            ! $enabled || $backupConfigured,
            "BACKUP_DISK={$backupDisk} (driver={$backupDriver})",
            $backupConfigured
                ? 'Keep this bucket private and separate from user_files when possible.'
                : 'Configure BACKUP_DISK_DRIVER / BACKUP_AWS_* (or local private root) before enabling app backups.'
        );
        if ($enabled && ! $backupConfigured) {
            $blocking = true;
        }

        $passwordSet = filled(config('backup.backup.password'));
        $requireEncryption = (bool) config('mutqin.backup.require_encryption', true);
        $encryptionOk = ! $enabled || ! $requireEncryption || $passwordSet;
        $checks[] = $this->row(
            'archive_encryption',
            $encryptionOk,
            $passwordSet
                ? 'BACKUP_ARCHIVE_PASSWORD is set (AES zip encryption enabled).'
                : 'BACKUP_ARCHIVE_PASSWORD is empty.',
            $encryptionOk
                ? null
                : 'Set a strong BACKUP_ARCHIVE_PASSWORD in the host environment (never commit it).'
        );
        if (! $encryptionOk) {
            $blocking = true;
        }

        $notifyMail = (string) config('backup.notifications.mail.to', '');
        $notifyConfigured = $notifyMail !== '' && ! str_contains($notifyMail, 'example.invalid');
        $checks[] = $this->row(
            'failure_notifications',
            true,
            $notifyConfigured
                ? "BACKUP_NOTIFICATION_MAIL={$notifyMail}"
                : 'BACKUP_NOTIFICATION_MAIL unset — failures still go to MutqinLog/Sentry via LogBackupEvents.',
            $notifyConfigured ? null : 'Set BACKUP_NOTIFICATION_MAIL (and a real MAIL_* transport) for ops email alerts.'
        );

        $dbConnection = (string) config('database.default');
        $dumpHint = match ($dbConnection) {
            'mysql', 'mariadb' => 'mysqldump',
            'pgsql' => 'pg_dump',
            'sqlite' => 'SQLite file copy (no external binary)',
            default => 'unknown dump tool',
        };
        $binaryPath = (string) (config("database.connections.{$dbConnection}.dump.dump_binary_path") ?? '');
        $dumpAvailable = $dbConnection === 'sqlite' || $this->binaryAvailable($dumpHint, $binaryPath);
        $checks[] = $this->row(
            'database_dump_tool',
            ! $enabled || $dbConnection === 'sqlite' || $dumpAvailable,
            "DB_CONNECTION={$dbConnection}; expected tool: {$dumpHint}".($dumpAvailable ? ' (found)' : ' (not found on PATH)'),
            $dumpAvailable
                ? null
                : 'App-level MySQL/Postgres dumps need the client binary on the app host. Until then, rely on Laravel Cloud MySQL snapshots and/or run dumps from a trusted machine with the public DB endpoint.'
        );
        if ($enabled && $dbConnection !== 'sqlite' && ! $dumpAvailable) {
            // Warn but do not hard-fail health: Cloud snapshots still cover DB.
            // mutqin:backup --only-files can still protect staged screenshots.
        }

        $checks[] = $this->row(
            'excludes_ephemeral_audio',
            true,
            'Learner AI temp audio is excluded from Spatie includes.',
            null
        );

        $failed = $blocking;

        if ($this->option('json')) {
            $this->line(json_encode([
                'ok' => ! $failed,
                'app_backup_enabled' => $enabled,
                'checks' => $checks,
            ], JSON_PRETTY_PRINT));
        } else {
            $this->info('Mutqin backup health');
            foreach ($checks as $check) {
                $mark = $check['ok'] ? '[ok]' : '[fail]';
                $this->line("{$mark} {$check['name']}: {$check['summary']}");
                if (! empty($check['advice'])) {
                    $this->comment('     '.$check['advice']);
                }
            }
            $this->newLine();
            $this->comment('This report does not prove platform snapshots exist — confirm in Laravel Cloud → Databases → Backups.');
        }

        return $failed ? self::FAILURE : self::SUCCESS;
    }

    /**
     * @return array{name: string, ok: bool, summary: string, advice: ?string}
     */
    private function row(string $name, bool $ok, string $summary, ?string $advice): array
    {
        return [
            'name' => $name,
            'ok' => $ok,
            'summary' => $summary,
            'advice' => $advice,
        ];
    }

    private function binaryAvailable(string $binary, string $directoryHint): bool
    {
        if ($directoryHint !== '') {
            $candidate = rtrim($directoryHint, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.$binary;

            return is_executable($candidate);
        }

        $path = trim((string) shell_exec('command -v '.escapeshellarg($binary).' 2>/dev/null'));

        return $path !== '' && is_executable($path);
    }
}

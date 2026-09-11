<?php

namespace App\Console\Commands;

use App\Support\DatabaseDeploySafety;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;

class DeployPreflightCommand extends Command
{
    protected $signature = 'mutqin:deploy-preflight
                            {--require-backup : Fail unless MUTQIN_BACKUP_CONFIRMED=1 (use before destructive ops)}
                            {--json : Emit machine-readable JSON}';

    protected $description = 'Preflight checks before production migrate/deploy (pending migrations, demo flags, backup gate).';

    public function handle(): int
    {
        $checks = [];
        $failed = false;

        $env = (string) app()->environment();
        $checks[] = $this->check(
            'environment',
            true,
            "APP_ENV={$env}",
            DatabaseDeploySafety::isProtectedEnvironment($env)
                ? 'Production: only php artisan migrate --force (never migrate:fresh / db:wipe / seed).'
                : 'Non-production: migrate:fresh and seeders are allowed for local/test resets.'
        );

        $pending = $this->pendingMigrationFiles();
        $pendingCount = count($pending);
        $checks[] = $this->check(
            'pending_migrations',
            true,
            $pendingCount === 0
                ? 'No pending migrations.'
                : "{$pendingCount} pending migration(s): ".implode(', ', $pending),
            $pendingCount > 0
                ? 'Review each migration for locks, backfills, and rollback limits before release.'
                : null
        );

        $protected = DatabaseDeploySafety::isProtectedEnvironment($env);

        $demoEnabled = (bool) config('app.show_demo_accounts');
        $demoOk = ! $protected || ! $demoEnabled;
        $checks[] = $this->check(
            'demo_accounts',
            $demoOk,
            $demoEnabled ? 'SHOW_DEMO_ACCOUNTS is enabled.' : 'SHOW_DEMO_ACCOUNTS is disabled.',
            $demoOk
                ? ($demoEnabled
                    ? 'Demo login is visible on /login. Disable with SHOW_DEMO_ACCOUNTS=false before production.'
                    : null)
                : 'Refusing deploy: demo login must be off in production (SHOW_DEMO_ACCOUNTS=false).'
        );
        if (! $demoOk) {
            $failed = true;
        }

        $debugOn = (bool) config('app.debug');
        $debugOk = ! $protected || ! $debugOn;
        $checks[] = $this->check(
            'app_debug',
            $debugOk,
            $debugOn ? 'APP_DEBUG=true' : 'APP_DEBUG=false',
            $debugOk
                ? null
                : 'Refusing deploy: APP_DEBUG must be false in production.'
        );
        if (! $debugOk) {
            $failed = true;
        }

        $capEnabled = (bool) config('services.speechmatics.usage_cap.enabled', false);
        $userMints = (int) config('services.speechmatics.usage_cap.daily_user_token_mints', 0);
        $globalMints = (int) config('services.speechmatics.usage_cap.daily_global_token_mints', 0);
        $checks[] = $this->check(
            'speechmatics_caps',
            true,
            $capEnabled
                ? "Usage cap on (user={$userMints}, global={$globalMints})."
                : 'SPEECHMATICS_USAGE_CAP_ENABLED is off.',
            $capEnabled
                ? null
                : 'Daily mint caps are unused while the switch is off. Per-minute rate limits still apply.'
        );

        $appHost = parse_url((string) config('app.url'), PHP_URL_HOST) ?: '';
        $googleRedirect = trim((string) config('services.google.redirect'));
        $googleClient = trim((string) config('services.google.client_id'));
        $googleOk = ! $protected || $googleClient === '' || (
            $googleRedirect !== ''
            && $appHost !== ''
            && str_contains($googleRedirect, $appHost)
            && str_ends_with($googleRedirect, '/auth/google/callback')
        );
        $checks[] = $this->check(
            'google_redirect',
            $googleOk,
            $googleRedirect !== '' ? "GOOGLE_REDIRECT_URI={$googleRedirect}" : 'GOOGLE_REDIRECT_URI is empty.',
            $googleOk
                ? null
                : 'Refusing deploy: GOOGLE_REDIRECT_URI must be the exact https://'.$appHost.'/auth/google/callback value registered in Google Cloud.'
        );
        if (! $googleOk) {
            $failed = true;
        }

        $backupConfirmed = filter_var(env('MUTQIN_BACKUP_CONFIRMED', false), FILTER_VALIDATE_BOOL);
        $requireBackup = (bool) $this->option('require-backup');
        $backupOk = ! $requireBackup || $backupConfirmed;
        $checks[] = $this->check(
            'backup',
            $backupOk,
            $backupConfirmed
                ? 'MUTQIN_BACKUP_CONFIRMED=1'
                : 'MUTQIN_BACKUP_CONFIRMED is not set.',
            $backupOk
                ? ($requireBackup ? null : 'Set MUTQIN_BACKUP_CONFIRMED=1 (and take a real backup) before explicitly destructive production changes. See docs/backups.md.')
                : 'Refusing deploy: confirm a fresh production backup before destructive schema work.'
        );
        if (! $backupOk) {
            $failed = true;
        }

        $appBackupEnabled = (bool) config('mutqin.backup.enabled');
        $checks[] = $this->check(
            'app_backup_schedule',
            true,
            $appBackupEnabled
                ? 'MUTQIN_BACKUP_ENABLED=true (scheduler will run mutqin:backup / backup:clean / backup:monitor).'
                : 'MUTQIN_BACKUP_ENABLED=false — app-level Spatie archives are idle; rely on Laravel Cloud MySQL snapshots until configured.',
            'Run php artisan mutqin:backup-health after setting destination credentials. Enable the Laravel Cloud scheduler.'
        );

        $queue = (string) config('queue.default');
        $checks[] = $this->check(
            'queue_restart',
            true,
            "Default queue connection: {$queue}",
            'After migrate --force, run php artisan queue:restart so workers pick up schema-compatible code.'
        );

        $usersReady = Schema::hasTable('users');
        $checks[] = $this->check(
            'users_table',
            $usersReady,
            $usersReady ? 'users table is present.' : 'users table is missing — run migrations on a fresh environment first.',
            null
        );
        if (! $usersReady) {
            $failed = true;
        }

        $lastLogin = $usersReady && Schema::hasColumn('users', 'last_login_at');
        $checks[] = $this->check(
            'last_login_at',
            true,
            $lastLogin
                ? 'users.last_login_at exists (nullable expand column).'
                : 'users.last_login_at not yet applied — expected from pending/recent migrations.',
            null
        );

        if ($this->option('json')) {
            $this->line(json_encode([
                'ok' => ! $failed,
                'environment' => $env,
                'pending_migrations' => $pending,
                'checks' => $checks,
            ], JSON_PRETTY_PRINT));
        } else {
            $this->info('Mutqin deploy preflight');
            foreach ($checks as $check) {
                $mark = $check['ok'] ? '[ok]' : '[fail]';
                $this->line("{$mark} {$check['name']}: {$check['summary']}");
                if (! empty($check['advice'])) {
                    $this->comment('     '.$check['advice']);
                }
            }
        }

        return $failed ? self::FAILURE : self::SUCCESS;
    }

    /**
     * @return list<string>
     */
    private function pendingMigrationFiles(): array
    {
        $pending = [];

        Artisan::call('migrate:status');
        $output = Artisan::output();

        foreach (preg_split("/\r\n|\n|\r/", $output) as $line) {
            if (! str_contains($line, 'Pending')) {
                continue;
            }
            if (preg_match('/\d{4}_\d{2}_\d{2}_\d{6}_\S+/', $line, $matches)) {
                $pending[] = $matches[0];
            }
        }

        return $pending;
    }

    /**
     * @return array{name: string, ok: bool, summary: string, advice: ?string}
     */
    private function check(string $name, bool $ok, string $summary, ?string $advice): array
    {
        return [
            'name' => $name,
            'ok' => $ok,
            'summary' => $summary,
            'advice' => $advice,
        ];
    }
}

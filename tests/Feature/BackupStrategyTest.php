<?php

namespace Tests\Feature;

use App\Support\UserFilesDisk;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BackupStrategyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Config::set('mutqin.backup.enabled', false);
        Config::set('mutqin.backup.require_encryption', true);
        Config::set('backup.backup.password', null);
        Config::set('backup.backup.encryption', 'none');
        Config::set('mutqin.user_files.disk', 'local');
        Config::set('filesystems.disks.backups.driver', 'local');
        Config::set('filesystems.disks.backups.root', storage_path('app/private/backups-test'));
    }

    protected function tearDown(): void
    {
        File::deleteDirectory(storage_path('app/private/backups-test'));
        File::deleteDirectory(storage_path('app/backup-temp'));

        parent::tearDown();
    }

    public function test_backup_health_passes_when_app_backups_disabled(): void
    {
        $this->artisan('mutqin:backup-health')
            ->assertSuccessful();
    }

    public function test_backup_health_fails_when_enabled_without_encryption_password(): void
    {
        Config::set('mutqin.backup.enabled', true);
        Config::set('mutqin.backup.require_encryption', true);
        Config::set('backup.backup.password', null);

        $this->artisan('mutqin:backup-health')
            ->assertFailed();
    }

    public function test_mutqin_backup_refuses_when_disabled(): void
    {
        $this->artisan('mutqin:backup')
            ->expectsOutputToContain('MUTQIN_BACKUP_ENABLED')
            ->assertFailed();
    }

    public function test_mutqin_backup_runs_encrypted_sqlite_archive_when_enabled(): void
    {
        Config::set('mutqin.backup.enabled', true);
        Config::set('mutqin.backup.require_encryption', true);
        Config::set('backup.backup.password', 'test-archive-password-not-for-prod');
        Config::set('backup.backup.encryption', 'default');
        Config::set('backup.backup.destination.disks', ['backups']);
        Config::set('backup.backup.source.databases', [config('database.default')]);
        Config::set('backup.notifications.notifications', []);

        File::ensureDirectoryExists(storage_path('app/private/feedback-screenshots'));
        File::put(storage_path('app/private/feedback-screenshots/.gitignore'), "*\n!.gitignore\n");
        File::ensureDirectoryExists(storage_path('app/private/backups-test'));

        $this->artisan('mutqin:backup', ['--disable-notifications' => true])
            ->assertSuccessful();

        $files = File::allFiles(storage_path('app/private/backups-test'));
        $this->assertNotEmpty($files, 'Expected at least one archive under the private backups disk.');
    }

    public function test_backup_config_excludes_learner_audio_and_includes_feedback_screenshots(): void
    {
        $include = config('backup.backup.source.files.include');
        $exclude = config('backup.backup.source.files.exclude');

        $this->assertContains(storage_path('app/private/feedback-screenshots'), $include);
        $this->assertContains(storage_path('app/tmp/learner-audio'), $exclude);
        $this->assertContains(storage_path('framework'), $exclude);
    }

    public function test_user_files_disk_defaults_to_local_and_is_used_for_feedback_paths(): void
    {
        $this->assertSame('local', UserFilesDisk::name());
        $this->assertSame('feedback-screenshots', UserFilesDisk::screenshotPrefix());
        $this->assertFalse(UserFilesDisk::isRemote());

        Storage::fake('local');
        UserFilesDisk::disk()->put('feedback-screenshots/x.png', 'img');
        Storage::disk('local')->assertExists('feedback-screenshots/x.png');
    }

    public function test_deploy_preflight_mentions_app_backup_schedule(): void
    {
        $this->artisan('mutqin:deploy-preflight')
            ->expectsOutputToContain('app_backup_schedule')
            ->assertSuccessful();
    }
}

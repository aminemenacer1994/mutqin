<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Auth\EnsureDemoLoginAccount;
use App\Support\DatabaseDeploySafety;
use Database\Seeders\DemoDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;
use RuntimeException;
use Tests\TestCase;

class DatabaseDeploySafetyTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        // FreshCommand::prohibit() is static — restore testing defaults so
        // RefreshDatabase (migrate:fresh) keeps working for later tests.
        DB::prohibitDestructiveCommands(false);
        $this->app->detectEnvironment(fn () => 'testing');

        parent::tearDown();
    }

    public function test_last_login_at_is_nullable_and_touch_updates_it(): void
    {
        $this->assertTrue(Schema::hasColumn('users', 'last_login_at'));

        $user = User::factory()->create();
        $this->assertNull($user->fresh()->last_login_at);

        $user->touchLastLogin();

        $this->assertNotNull($user->fresh()->last_login_at);
    }

    public function test_users_last_login_at_index_exists(): void
    {
        $this->assertTrue(
            Schema::hasIndex('users', 'users_last_login_at_index'),
            'Admin activity filters expect users_last_login_at_index before hot queries rely on last_login_at.'
        );
    }

    public function test_destructive_migrate_fresh_is_prohibited_in_production(): void
    {
        DB::prohibitDestructiveCommands(true);

        $this->artisan('migrate:fresh')
            ->expectsOutputToContain('prohibited')
            ->assertFailed();
    }

    public function test_demo_seeder_aborts_in_production(): void
    {
        $this->app->detectEnvironment(fn () => 'production');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('production');

        // Call the seeder directly — db:seed's ConfirmableTrait prompts first.
        $this->app->make(DemoDataSeeder::class)->run();
    }

    public function test_demo_seeder_does_not_overwrite_real_user_mailboxes(): void
    {
        $real = User::factory()->create([
            'email' => 'learner@gmail.com',
            'name' => 'Real Learner',
            'password' => Hash::make('KeepMeSafe1!'),
        ]);

        // Seeder only upserts reserved demo domains; real users must remain untouched.
        $this->seed(DemoDataSeeder::class);

        $fresh = $real->fresh();
        $this->assertSame('Real Learner', $fresh->name);
        $this->assertSame('learner@gmail.com', $fresh->email);
        $this->assertTrue(Hash::check('KeepMeSafe1!', $fresh->password));
        $this->assertDatabaseMissing('users', ['email' => 'learner@gmail.com', 'name' => 'Tester — Beginner (EN)']);
    }

    public function test_demo_email_guard_rejects_real_domains(): void
    {
        $this->assertTrue(DatabaseDeploySafety::isDemoEmail('layla.beginner@mutqin.test'));
        $this->assertTrue(DatabaseDeploySafety::isDemoEmail('practice01@example.com'));
        $this->assertFalse(DatabaseDeploySafety::isDemoEmail('learner@gmail.com'));

        $this->expectException(InvalidArgumentException::class);
        DatabaseDeploySafety::assertDemoEmail('learner@gmail.com');
    }

    public function test_ensure_demo_login_creates_reserved_demo_account_in_production(): void
    {
        config(['app.show_demo_accounts' => true]);
        $this->app->detectEnvironment(fn () => 'production');

        $user = app(EnsureDemoLoginAccount::class)->ensure();

        $this->assertSame(EnsureDemoLoginAccount::DEFAULT_EMAIL, $user->email);
        $this->assertTrue(Hash::check(EnsureDemoLoginAccount::DEFAULT_PASSWORD, $user->password));
    }

    public function test_ensure_demo_login_refuses_non_demo_email(): void
    {
        config([
            'app.show_demo_accounts' => true,
            'app.demo_login.email' => 'real.user@gmail.com',
            'app.demo_login.password' => 'DemoPass1!',
        ]);

        $victim = User::factory()->create([
            'email' => 'real.user@gmail.com',
            'password' => Hash::make('OriginalPass1!'),
            'name' => 'Victim',
        ]);

        try {
            app(EnsureDemoLoginAccount::class)->ensure();
            $this->fail('Expected non-demo email to be rejected.');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('non-demo email', $e->getMessage());
        }

        $fresh = $victim->fresh();
        $this->assertSame('Victim', $fresh->name);
        $this->assertTrue(Hash::check('OriginalPass1!', $fresh->password));
    }

    public function test_ensure_demo_login_creates_reserved_demo_account_locally(): void
    {
        config([
            'app.show_demo_accounts' => true,
            'app.demo_login.email' => EnsureDemoLoginAccount::DEFAULT_EMAIL,
            'app.demo_login.password' => EnsureDemoLoginAccount::DEFAULT_PASSWORD,
            'app.demo_login.name' => EnsureDemoLoginAccount::DEFAULT_NAME,
        ]);

        $user = app(EnsureDemoLoginAccount::class)->ensure();

        $this->assertSame(EnsureDemoLoginAccount::DEFAULT_EMAIL, $user->email);
        $this->assertTrue(Hash::check(EnsureDemoLoginAccount::DEFAULT_PASSWORD, $user->password));
    }

    public function test_deploy_preflight_passes_in_testing(): void
    {
        $this->artisan('mutqin:deploy-preflight')
            ->assertSuccessful();
    }

    public function test_deploy_preflight_requires_backup_confirmation_when_requested(): void
    {
        $this->artisan('mutqin:deploy-preflight', ['--require-backup' => true])
            ->assertFailed();
    }

    public function test_show_demo_accounts_forced_off_in_production_config_shape(): void
    {
        $this->assertTrue(DatabaseDeploySafety::isProtectedEnvironment('production'));
        $this->assertFalse(DatabaseDeploySafety::isProtectedEnvironment('local'));
        $this->assertTrue(DatabaseDeploySafety::allowsForcedMigrate('production'));
        $this->assertFalse(DatabaseDeploySafety::allowsForcedMigrate('local'));
    }
}

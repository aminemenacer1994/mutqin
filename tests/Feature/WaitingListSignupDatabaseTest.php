<?php

namespace Tests\Feature;

use App\Models\WaitingListEntry;
use App\Support\WaitingListDatabase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class WaitingListSignupDatabaseTest extends TestCase
{
    use RefreshDatabase;

    public function test_waiting_list_uses_mutqin_signups_when_signup_database_env_is_set(): void
    {
        Config::set('database.connections.mutqin_signups', [
            'driver' => 'sqlite',
            'database' => ':memory:',
            'prefix' => '',
            'foreign_key_constraints' => true,
        ]);
        Config::set('mutqin.waiting_list.database_connection', 'mutqin_signups');
        Config::set('database.default', 'sqlite');

        $this->artisan('migrate', [
            '--path' => 'database/migrations/2026_08_09_233200_create_waiting_list_entries_table.php',
            '--database' => 'mutqin_signups',
        ]);

        WaitingListEntry::query()->create([
            'name' => 'Layla',
            'email' => 'layla@example.com',
        ]);

        $this->assertSame('mutqin_signups', WaitingListDatabase::connectionName());
        $this->assertSame(1, WaitingListEntry::query()->count());
        $this->assertSame(0, \App\Models\User::query()->count());
    }
}

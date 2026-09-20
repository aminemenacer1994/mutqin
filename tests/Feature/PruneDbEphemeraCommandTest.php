<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PruneDbEphemeraCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_prunes_only_expired_database_cache_rows(): void
    {
        config(['cache.default' => 'database']);

        DB::table('cache')->insert([
            [
                'key' => 'mutqin-cache-live',
                'value' => 'alive',
                'expiration' => time() + 3600,
            ],
            [
                'key' => 'mutqin-cache-stale',
                'value' => 'dead',
                'expiration' => time() - 10,
            ],
        ]);

        $exit = Artisan::call('mutqin:prune-db-ephemera', ['--json' => true]);
        $this->assertSame(0, $exit);

        $payload = json_decode(Artisan::output(), true);
        $this->assertSame(1, $payload['cache_deleted']);
        $this->assertDatabaseHas('cache', ['key' => 'mutqin-cache-live']);
        $this->assertDatabaseMissing('cache', ['key' => 'mutqin-cache-stale']);
    }
}

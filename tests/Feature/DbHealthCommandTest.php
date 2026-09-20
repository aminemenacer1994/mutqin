<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class DbHealthCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_db_health_command_runs_read_only(): void
    {
        $exit = Artisan::call('mutqin:db-health', ['--json' => true]);
        $this->assertSame(0, $exit);

        $payload = json_decode(Artisan::output(), true);
        $this->assertIsArray($payload);
        $this->assertArrayHasKey('driver', $payload);
        $this->assertArrayHasKey('app_drivers', $payload);
        $this->assertArrayHasKey('tables', $payload);
        $this->assertSame((string) config('cache.default'), $payload['app_drivers']['cache']);
    }
}

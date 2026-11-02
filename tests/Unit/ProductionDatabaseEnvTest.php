<?php

namespace Tests\Unit;

use App\Support\ProductionDatabaseEnv;
use Tests\TestCase;

class ProductionDatabaseEnvTest extends TestCase
{
    public function test_detects_default_local_mysql_credentials(): void
    {
        config([
            'database.default' => 'mysql',
            'database.connections.mysql.host' => '127.0.0.1',
            'database.connections.mysql.database' => 'laravel',
        ]);

        $this->assertTrue(ProductionDatabaseEnv::usesDefaultLocalMysqlCredentials());
    }

    public function test_cloud_host_is_not_treated_as_default_local(): void
    {
        config([
            'database.default' => 'mysql',
            'database.connections.mysql.host' => 'mysql.example.laravel.cloud',
            'database.connections.mysql.database' => 'main',
        ]);

        $this->assertFalse(ProductionDatabaseEnv::usesDefaultLocalMysqlCredentials());
    }
}

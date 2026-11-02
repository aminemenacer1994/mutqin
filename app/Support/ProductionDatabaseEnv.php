<?php

namespace App\Support;

/**
 * Detect Laravel Cloud production misconfiguration when only DB_CONNECTION=mysql
 * is set but linked MySQL secrets (DB_HOST, DB_DATABASE, …) were never injected.
 */
final class ProductionDatabaseEnv
{
    public static function driver(): string
    {
        return strtolower(trim((string) config('database.default', '')));
    }

    public static function isSqlite(): bool
    {
        return self::driver() === 'sqlite';
    }

    /**
     * mysql driver with Laravel skeleton defaults (127.0.0.1 + database "laravel").
     */
    public static function usesDefaultLocalMysqlCredentials(): bool
    {
        if (self::driver() !== 'mysql') {
            return false;
        }

        $host = strtolower(trim((string) config('database.connections.mysql.host', '')));
        $database = trim((string) config('database.connections.mysql.database', ''));

        return in_array($host, ['127.0.0.1', 'localhost', '::1'], true)
            && ($database === '' || $database === 'laravel');
    }

    public static function cloudMysqlLinkMessage(): string
    {
        return 'Link the Laravel Cloud MySQL resource under Settings → Injected variables → + Link secrets, keep DB_CONNECTION=mysql, remove local DB_HOST/DB_DATABASE overrides, redeploy, then run php artisan migrate --force.';
    }
}

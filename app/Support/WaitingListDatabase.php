<?php

namespace App\Support;

use App\Models\WaitingListEntry;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Waiting-list rows may live on a dedicated connection (production MySQL while the
 * admin UI runs at mutqin.ai/admin). Use this helper for schema checks and ops.
 */
final class WaitingListDatabase
{
    public const SIGNUPS_CONNECTION = 'mutqin_signups';

    public static function configuredConnectionName(): ?string
    {
        $explicit = config('mutqin.waiting_list.database_connection');
        if (is_string($explicit) && $explicit !== '') {
            return $explicit;
        }

        if (self::signupsConnectionConfigured()) {
            return self::SIGNUPS_CONNECTION;
        }

        return null;
    }

    public static function connectionName(): string
    {
        return (new WaitingListEntry)->getConnectionName()
            ?: (string) config('database.default', 'mysql');
    }

    public static function signupsConnectionConfigured(): bool
    {
        $database = trim((string) env('MUTQIN_SIGNUP_DB_DATABASE', ''));

        return $database !== '';
    }

    public static function hasTable(): bool
    {
        try {
            $model = new WaitingListEntry;

            return Schema::connection(self::connectionName())->hasTable($model->getTable());
        } catch (\Throwable) {
            return false;
        }
    }

    public static function databaseLabel(): string
    {
        $connection = self::connectionName();

        return (string) config("database.connections.{$connection}.database", $connection);
    }

    /**
     * Admin diagnostics: which connection is queried and whether signups may live elsewhere.
     *
     * @return array{
     *   connection: string,
     *   database: string,
     *   available: bool,
     *   alternate_connection: string|null,
     *   alternate_database: string|null,
     *   alternate_count: int|null,
     *   misconfigured: bool
     * }
     */
    public static function storageMeta(): array
    {
        $connection = self::connectionName();
        $database = self::databaseLabel();
        $available = self::hasTable();
        $defaultConnection = (string) config('database.default', 'mysql');
        $alternateConnection = $defaultConnection !== $connection ? $defaultConnection : null;
        $alternateDatabase = null;
        $alternateCount = null;

        if ($alternateConnection !== null) {
            try {
                $table = (new WaitingListEntry)->getTable();
                if (Schema::connection($alternateConnection)->hasTable($table)) {
                    $alternateDatabase = (string) config(
                        "database.connections.{$alternateConnection}.database",
                        $alternateConnection
                    );
                    $alternateCount = (int) DB::connection($alternateConnection)->table($table)->count();
                }
            } catch (\Throwable) {
                $alternateCount = null;
            }
        }

        $currentCount = $available
            ? (int) WaitingListEntry::query()->count()
            : 0;

        $misconfigured = $alternateCount !== null
            && $alternateCount > 0
            && $currentCount === 0
            && $alternateConnection !== null;

        return [
            'connection' => $connection,
            'database' => $database,
            'available' => $available,
            'alternate_connection' => $alternateConnection,
            'alternate_database' => $alternateDatabase,
            'alternate_count' => $alternateCount,
            'misconfigured' => $misconfigured,
        ];
    }
}

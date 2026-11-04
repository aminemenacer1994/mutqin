<?php

namespace App\Support;

use App\Models\WaitingListEntry;
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
     * @return array{active: int, archived: int}
     */
    public static function countsOnConnection(string $connection): array
    {
        try {
            $table = (new WaitingListEntry)->getTable();
            if (! Schema::connection($connection)->hasTable($table)) {
                return ['active' => 0, 'archived' => 0];
            }

            return [
                'active' => (int) WaitingListEntry::on($connection)->count(),
                'archived' => (int) WaitingListEntry::on($connection)->onlyTrashed()->count(),
            ];
        } catch (\Throwable) {
            return ['active' => 0, 'archived' => 0];
        }
    }

    /**
     * Admin diagnostics: which connection is queried and whether signups may live elsewhere.
     *
     * @return array{
     *   connection: string,
     *   database: string,
     *   available: bool,
     *   active_count: int,
     *   archived_count: int,
     *   alternate_connection: string|null,
     *   alternate_database: string|null,
     *   alternate_count: int|null,
     *   alternate_archived_count: int|null,
     *   misconfigured: bool
     * }
     */
    public static function storageMeta(): array
    {
        $connection = self::connectionName();
        $database = self::databaseLabel();
        $available = self::hasTable();
        $current = $available ? self::countsOnConnection($connection) : ['active' => 0, 'archived' => 0];

        $defaultConnection = (string) config('database.default', 'mysql');
        $alternateConnection = $defaultConnection !== $connection ? $defaultConnection : null;
        $alternateDatabase = null;
        $alternateCount = null;
        $alternateArchivedCount = null;

        if ($alternateConnection !== null) {
            $alternateDatabase = (string) config(
                "database.connections.{$alternateConnection}.database",
                $alternateConnection
            );
            $alternate = self::countsOnConnection($alternateConnection);
            $alternateCount = $alternate['active'];
            $alternateArchivedCount = $alternate['archived'];
        }

        $currentTotal = $current['active'] + $current['archived'];
        $alternateTotal = ($alternateCount ?? 0) + ($alternateArchivedCount ?? 0);

        $misconfigured = $alternateConnection !== null
            && $alternateTotal > 0
            && $currentTotal === 0;

        return [
            'connection' => $connection,
            'database' => $database,
            'available' => $available,
            'active_count' => $current['active'],
            'archived_count' => $current['archived'],
            'alternate_connection' => $alternateConnection,
            'alternate_database' => $alternateDatabase,
            'alternate_count' => $alternateCount,
            'alternate_archived_count' => $alternateArchivedCount,
            'misconfigured' => $misconfigured,
        ];
    }
}

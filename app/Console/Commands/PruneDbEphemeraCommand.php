<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Delete expired database-backed cache (and optionally session) rows.
 * Safe to run on Laravel Cloud — does not clear live cache entries.
 */
class PruneDbEphemeraCommand extends Command
{
    protected $signature = 'mutqin:prune-db-ephemera
                            {--sessions : Also delete expired database sessions}
                            {--json : Emit machine-readable JSON}';

    protected $description = 'Prune expired database cache rows (and optionally expired sessions) to reduce MySQL bloat.';

    public function handle(): int
    {
        $result = [
            'cache_deleted' => 0,
            'cache_locks_deleted' => 0,
            'sessions_deleted' => 0,
            'skipped' => [],
        ];

        if (config('cache.default') === 'database' && Schema::hasTable('cache')) {
            $table = (string) config('cache.stores.database.table', 'cache');
            $result['cache_deleted'] = DB::table($table)
                ->where('expiration', '<=', time())
                ->delete();

            $lockTable = (string) (config('cache.stores.database.lock_table') ?: 'cache_locks');
            if (Schema::hasTable($lockTable)) {
                $result['cache_locks_deleted'] = DB::table($lockTable)
                    ->where('expiration', '<=', time())
                    ->delete();
            }
        } else {
            $result['skipped'][] = 'cache_store_not_database';
        }

        if ($this->option('sessions')
            && config('session.driver') === 'database'
            && Schema::hasTable((string) config('session.table', 'sessions'))
        ) {
            $lifetime = (int) config('session.lifetime', 120) * 60;
            $result['sessions_deleted'] = DB::table((string) config('session.table', 'sessions'))
                ->where('last_activity', '<', time() - $lifetime)
                ->delete();
        } elseif ($this->option('sessions')) {
            $result['skipped'][] = 'session_driver_not_database';
        }

        if ($this->option('json')) {
            $this->line(json_encode($result, JSON_UNESCAPED_SLASHES));
        } else {
            $this->info(sprintf(
                'Pruned expired DB ephemera — cache: %d, locks: %d, sessions: %d',
                $result['cache_deleted'],
                $result['cache_locks_deleted'],
                $result['sessions_deleted']
            ));
        }

        return self::SUCCESS;
    }
}

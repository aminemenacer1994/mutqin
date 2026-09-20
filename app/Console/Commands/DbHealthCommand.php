<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

/**
 * Read-only MySQL/SQLite diagnostics for Laravel Cloud RAM / connection pressure.
 * Never alters server settings or prints secrets / user content.
 */
class DbHealthCommand extends Command
{
    protected $signature = 'mutqin:db-health
                            {--json : Emit machine-readable JSON}';

    protected $description = 'Report read-only database size, connections, top tables, and memory-related status (when permitted).';

    public function handle(): int
    {
        $driver = DB::connection()->getDriverName();
        $report = [
            'generated_at' => now()->toIso8601String(),
            'driver' => $driver,
            'database' => $this->safeDatabaseName(),
            'app_drivers' => [
                'cache' => (string) config('cache.default'),
                'session' => (string) config('session.driver'),
                'queue' => (string) config('queue.default'),
            ],
            'size' => null,
            'connections' => null,
            'tables' => [],
            'status' => [],
            'processlist' => [],
            'notes' => [],
        ];

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            $this->fillMysql($report);
        } elseif ($driver === 'sqlite') {
            $this->fillSqlite($report);
            $report['notes'][] = 'SQLite local/dev only — production Laravel Cloud uses MySQL.';
        } else {
            $report['notes'][] = "Driver {$driver} is not fully supported by this command.";
        }

        if (in_array(config('cache.default'), ['database'], true)
            || in_array(config('session.driver'), ['database'], true)
            || in_array(config('queue.default'), ['database'], true)
        ) {
            $report['notes'][] = 'Cache/session/queue currently use the database driver — consider Laravel Cloud Valkey/Redis to reduce MySQL pressure (see .env.example).';
        }

        if ($this->option('json')) {
            $this->line(json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            return self::SUCCESS;
        }

        $this->info('Mutqin DB health (read-only)');
        $this->line('Driver: '.$report['driver'].'  Database: '.$report['database']);
        $this->line(sprintf(
            'App drivers — cache: %s  session: %s  queue: %s',
            $report['app_drivers']['cache'],
            $report['app_drivers']['session'],
            $report['app_drivers']['queue']
        ));

        if (is_array($report['size'])) {
            $this->newLine();
            $this->line(sprintf(
                'DB size: %s MiB (data %s / index %s)',
                $report['size']['total_mib'] ?? 'n/a',
                $report['size']['data_mib'] ?? 'n/a',
                $report['size']['index_mib'] ?? 'n/a'
            ));
        }

        if (is_array($report['connections'])) {
            $this->newLine();
            $this->line(sprintf(
                'Connections: current=%s  max=%s  running=%s  sleeping=%s',
                $report['connections']['Threads_connected'] ?? 'n/a',
                $report['connections']['max_connections'] ?? 'n/a',
                $report['connections']['running'] ?? 'n/a',
                $report['connections']['sleeping'] ?? 'n/a'
            ));
        }

        if ($report['tables'] !== []) {
            $this->newLine();
            $this->table(
                ['table', 'approx_rows', 'data_mib', 'index_mib', 'total_mib'],
                array_map(static fn (array $row) => [
                    $row['name'],
                    $row['approx_rows'],
                    $row['data_mib'],
                    $row['index_mib'],
                    $row['total_mib'],
                ], $report['tables'])
            );
        }

        if ($report['status'] !== []) {
            $this->newLine();
            $this->line('Memory / buffer status (available vars only):');
            foreach ($report['status'] as $key => $value) {
                $this->line("  {$key}: {$value}");
            }
        }

        if ($report['processlist'] !== []) {
            $this->newLine();
            $this->line('Longest-running non-sleep queries (truncated):');
            foreach ($report['processlist'] as $row) {
                $this->line(sprintf(
                    '  id=%s time=%ss state=%s info=%s',
                    $row['id'],
                    $row['time'],
                    $row['state'],
                    $row['info']
                ));
            }
        }

        foreach ($report['notes'] as $note) {
            $this->newLine();
            $this->comment($note);
        }

        return self::SUCCESS;
    }

    /**
     * @param  array<string, mixed>  $report
     */
    private function fillMysql(array &$report): void
    {
        $schema = $this->safeDatabaseName();

        try {
            $size = DB::selectOne(
                'SELECT
                    ROUND(SUM(data_length) / 1024 / 1024, 2) AS data_mib,
                    ROUND(SUM(index_length) / 1024 / 1024, 2) AS index_mib,
                    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS total_mib
                 FROM information_schema.tables
                 WHERE table_schema = ?',
                [$schema]
            );
            $report['size'] = [
                'data_mib' => $size->data_mib ?? null,
                'index_mib' => $size->index_mib ?? null,
                'total_mib' => $size->total_mib ?? null,
            ];
        } catch (Throwable $e) {
            $report['notes'][] = 'Could not read information_schema.tables size: '.$this->safeError($e);
        }

        try {
            $tables = DB::select(
                'SELECT
                    table_name AS name,
                    table_rows AS approx_rows,
                    ROUND(data_length / 1024 / 1024, 2) AS data_mib,
                    ROUND(index_length / 1024 / 1024, 2) AS index_mib,
                    ROUND((data_length + index_length) / 1024 / 1024, 2) AS total_mib
                 FROM information_schema.tables
                 WHERE table_schema = ?
                 ORDER BY (data_length + index_length) DESC
                 LIMIT 15',
                [$schema]
            );
            $report['tables'] = array_map(static fn ($row) => [
                'name' => (string) $row->name,
                'approx_rows' => (int) ($row->approx_rows ?? 0),
                'data_mib' => $row->data_mib,
                'index_mib' => $row->index_mib,
                'total_mib' => $row->total_mib,
            ], $tables);
        } catch (Throwable $e) {
            $report['notes'][] = 'Could not list largest tables: '.$this->safeError($e);
        }

        $connections = [];
        foreach (['Threads_connected', 'Threads_running', 'Max_used_connections', 'Slow_queries', 'Questions'] as $var) {
            $value = $this->statusVar($var);
            if ($value !== null) {
                $connections[$var] = $value;
            }
        }
        $maxConn = $this->variable('max_connections');
        if ($maxConn !== null) {
            $connections['max_connections'] = $maxConn;
        }

        try {
            $states = DB::select(
                "SELECT
                    SUM(CASE WHEN command = 'Sleep' THEN 1 ELSE 0 END) AS sleeping,
                    SUM(CASE WHEN command != 'Sleep' THEN 1 ELSE 0 END) AS running
                 FROM information_schema.processlist
                 WHERE db = ?",
                [$schema]
            );
            if ($states !== []) {
                $connections['sleeping'] = (int) ($states[0]->sleeping ?? 0);
                $connections['running'] = (int) ($states[0]->running ?? 0);
            }
        } catch (Throwable) {
            // Managed MySQL may restrict PROCESSLIST; skip gracefully.
        }

        $report['connections'] = $connections !== [] ? $connections : null;

        $memoryKeys = [
            'Innodb_buffer_pool_bytes_data',
            'Innodb_buffer_pool_bytes_dirty',
            'Innodb_buffer_pool_pages_total',
            'Innodb_buffer_pool_pages_free',
            'Innodb_buffer_pool_read_requests',
            'Innodb_buffer_pool_reads',
            'Qcache_hits',
            'Opened_tables',
            'Open_tables',
            'Table_locks_waited',
            'Select_full_join',
            'Select_scan',
            'Created_tmp_disk_tables',
            'Slow_queries',
        ];
        foreach ($memoryKeys as $key) {
            $value = $this->statusVar($key);
            if ($value !== null) {
                $report['status'][$key] = $value;
            }
        }
        foreach (['innodb_buffer_pool_size', 'tmp_table_size', 'max_heap_table_size', 'sort_buffer_size', 'join_buffer_size'] as $var) {
            $value = $this->variable($var);
            if ($value !== null) {
                $report['status'][$var] = $value;
            }
        }

        try {
            $rows = DB::select(
                "SELECT id, time, state, LEFT(IFNULL(info, ''), 120) AS info
                 FROM information_schema.processlist
                 WHERE command != 'Sleep'
                   AND user != 'system user'
                 ORDER BY time DESC
                 LIMIT 5"
            );
            $report['processlist'] = array_map(static fn ($row) => [
                'id' => (int) $row->id,
                'time' => (int) $row->time,
                'state' => (string) ($row->state ?? ''),
                'info' => $this->sanitizeInfo((string) ($row->info ?? '')),
            ], $rows);
        } catch (Throwable) {
            $report['notes'][] = 'PROCESSLIST not available on this managed MySQL user (skipped).';
        }
    }

    /**
     * @param  array<string, mixed>  $report
     */
    private function fillSqlite(array &$report): void
    {
        try {
            $path = (string) DB::connection()->getDatabaseName();
            $bytes = is_file($path) ? filesize($path) : null;
            $report['size'] = [
                'total_mib' => $bytes !== false && $bytes !== null
                    ? round($bytes / 1024 / 1024, 2)
                    : null,
                'data_mib' => null,
                'index_mib' => null,
            ];
        } catch (Throwable $e) {
            $report['notes'][] = 'Could not read SQLite file size: '.$this->safeError($e);
        }

        try {
            $names = DB::select(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
            );
            $tables = [];
            foreach ($names as $row) {
                $name = (string) $row->name;
                if (! preg_match('/^[A-Za-z0-9_]+$/', $name)) {
                    continue;
                }
                $count = (int) DB::table($name)->count();
                $tables[] = [
                    'name' => $name,
                    'approx_rows' => $count,
                    'data_mib' => null,
                    'index_mib' => null,
                    'total_mib' => null,
                ];
            }
            usort($tables, static fn ($a, $b) => $b['approx_rows'] <=> $a['approx_rows']);
            $report['tables'] = array_slice($tables, 0, 15);
        } catch (Throwable $e) {
            $report['notes'][] = 'Could not count SQLite tables: '.$this->safeError($e);
        }
    }

    private function statusVar(string $name): ?string
    {
        try {
            $row = DB::selectOne('SHOW GLOBAL STATUS LIKE ?', [$name]);

            return $row->Value ?? $row->value ?? null;
        } catch (Throwable) {
            return null;
        }
    }

    private function variable(string $name): ?string
    {
        try {
            $row = DB::selectOne('SHOW VARIABLES LIKE ?', [$name]);

            return $row->Value ?? $row->value ?? null;
        } catch (Throwable) {
            return null;
        }
    }

    private function safeDatabaseName(): string
    {
        try {
            return (string) DB::connection()->getDatabaseName();
        } catch (Throwable) {
            return 'unknown';
        }
    }

    private function safeError(Throwable $e): string
    {
        return class_basename($e).': '.Str::limit($e->getMessage(), 120, '…');
    }

    private function sanitizeInfo(string $info): string
    {
        $info = preg_replace('/\s+/', ' ', $info) ?? $info;
        $info = preg_replace('/[\'"][^\'"]{8,}[\'"]/', "'…'", $info) ?? $info;

        return Str::limit($info, 100, '…');
    }
}

<?php

namespace Tests\Support;

use Illuminate\Support\Facades\DB;

/**
 * Counts database queries during a callback — used by performance baseline tests.
 */
trait QueryCounter
{
    /**
     * @template T
     * @param  callable(): T  $callback
     * @return array{result: T, count: int, queries: list<string>}
     */
    protected function countQueries(callable $callback): array
    {
        $queries = [];

        DB::flushQueryLog();
        DB::enableQueryLog();

        $result = $callback();

        $log = DB::getQueryLog();
        DB::disableQueryLog();

        foreach ($log as $entry) {
            $queries[] = (string) ($entry['query'] ?? '');
        }

        return [
            'result' => $result,
            'count' => count($queries),
            'queries' => $queries,
        ];
    }
}

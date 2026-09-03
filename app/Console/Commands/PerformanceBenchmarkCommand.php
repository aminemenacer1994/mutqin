<?php

namespace App\Console\Commands;

use App\Models\User;
use Database\Seeders\PerformanceLoadSeeder;
use Illuminate\Console\Command;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Repeatable API latency + query-count benchmark for staging/local perf passes.
 *
 * Outputs JSON suitable for before/after comparison. Never targets production
 * unless APP_URL explicitly points there (discouraged — use staging).
 */
class PerformanceBenchmarkCommand extends Command
{
    protected $signature = 'mutqin:perf-benchmark
                            {--seed : Seed perf users before benchmarking}
                            {--user=perf-user-1@mutqin-load.test : Email of benchmark user}
                            {--iterations=5 : Repetitions per endpoint for p50/p95}
                            {--json : Output machine-readable JSON only}';

    protected $description = 'Measure API latency (p50/p95/p99), query counts, and response sizes';

    private ?User $user = null;

    public function handle(): int
    {
        if ($this->option('seed')) {
            Artisan::call('db:seed', ['--class' => PerformanceLoadSeeder::class, '--force' => true]);
            if (! $this->option('json')) {
                $this->line(trim(Artisan::output()));
            }
        }

        $email = (string) $this->option('user');
        $this->user = User::query()->where('email', $email)->first();
        if (! $this->user) {
            $this->error("Benchmark user not found: {$email}. Run with --seed first.");

            return self::FAILURE;
        }

        config(['mutqin.perf_benchmarks' => true]);
        Auth::guard('web')->login($this->user);

        $iterations = max(1, min(20, (int) $this->option('iterations')));
        $baseUrl = rtrim((string) (config('app.url') ?: 'http://127.0.0.1:8000'), '/');

        $scenarios = [
            'dashboard' => '/api/dashboard?days=30',
            'state_show' => '/api/state',
            'session_current' => '/api/session/current',
            'progress_index' => '/api/progress',
            'sessions_history' => '/api/sessions/history',
            'ai_recite_attempts' => '/api/ai-recite-attempts',
            'recommendations_next' => '/api/recommendations/next',
            'ayah_notes' => '/api/ayah-notes',
            'analytics' => '/api/analytics',
        ];

        $report = [
            'generated_at' => now()->toIso8601String(),
            'environment' => app()->environment(),
            'base_url' => $baseUrl,
            'user_id' => $this->user->id,
            'iterations' => $iterations,
            'endpoints' => [],
            'bundles' => $this->measureBundles(),
            'memory_peak_mb' => round(memory_get_peak_usage(true) / 1048576, 2),
        ];

        foreach ($scenarios as $name => $uri) {
            $latencies = [];
            $sizes = [];
            $queryCount = null;
            $status = 0;

            for ($i = 0; $i < $iterations; $i += 1) {
                DB::flushQueryLog();
                DB::enableQueryLog();

                $start = hrtime(true);
                $response = $this->dispatchGet($uri);
                $elapsedMs = (hrtime(true) - $start) / 1_000_000;

                if ($i === 0) {
                    $queryCount = count(DB::getQueryLog());
                }
                DB::disableQueryLog();

                $status = $response->getStatusCode();
                $latencies[] = round($elapsedMs, 2);
                $sizes[] = strlen((string) $response->getContent());
            }

            sort($latencies);
            $report['endpoints'][$name] = [
                'status' => $status,
                'query_count' => $queryCount,
                'response_bytes' => $sizes[0] ?? 0,
                'latency_ms' => [
                    'p50' => $this->percentile($latencies, 50),
                    'p95' => $this->percentile($latencies, 95),
                    'p99' => $this->percentile($latencies, 99),
                    'min' => $latencies[0] ?? 0,
                    'max' => $latencies[count($latencies) - 1] ?? 0,
                ],
            ];
        }

        if ($this->option('json')) {
            $this->line(json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            return self::SUCCESS;
        }

        $this->table(
            ['Endpoint', 'Queries', 'Bytes', 'p50 ms', 'p95 ms', 'p99 ms'],
            collect($report['endpoints'])->map(function (array $row, string $name) {
                return [
                    $name,
                    $row['query_count'],
                    number_format($row['response_bytes']),
                    $row['latency_ms']['p50'],
                    $row['latency_ms']['p95'],
                    $row['latency_ms']['p99'],
                ];
            })->values()->all()
        );

        $this->newLine();
        $this->info('Bundle sizes (public/js):');
        foreach ($report['bundles'] as $file => $bytes) {
            $this->line(sprintf('  %-40s %s', $file, $this->formatBytes($bytes)));
        }

        return self::SUCCESS;
    }

    private function dispatchGet(string $uri): \Symfony\Component\HttpFoundation\Response
    {
        /** @var Kernel $kernel */
        $kernel = app(Kernel::class);

        $request = Request::create($uri, 'GET', [], [], [], [
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X-Requested-With' => 'XMLHttpRequest',
        ]);
        $request->setUserResolver(fn () => $this->user);

        $response = $kernel->handle($request);
        $kernel->terminate($request, $response);

        return $response;
    }

    /**
     * @param  list<float|int>  $sorted
     */
    private function percentile(array $sorted, int $p): float
    {
        if ($sorted === []) {
            return 0.0;
        }
        $index = (int) ceil(($p / 100) * count($sorted)) - 1;
        $index = max(0, min(count($sorted) - 1, $index));

        return (float) $sorted[$index];
    }

    /**
     * @return array<string, int>
     */
    private function measureBundles(): array
    {
        $dir = public_path('js');
        if (! is_dir($dir)) {
            return [];
        }

        $files = glob($dir.'/*.js') ?: [];
        $sizes = [];
        foreach ($files as $path) {
            $name = basename($path);
            if (str_contains($name, '.LICENSE.')) {
                continue;
            }
            $sizes[$name] = (int) filesize($path);
        }
        arsort($sizes);

        return array_slice($sizes, 0, 15, true);
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1048576) {
            return round($bytes / 1048576, 2).' MiB';
        }
        if ($bytes >= 1024) {
            return round($bytes / 1024, 1).' KiB';
        }

        return $bytes.' B';
    }
}

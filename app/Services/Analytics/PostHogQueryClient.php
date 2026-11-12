<?php

namespace App\Services\Analytics;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Server-side PostHog Query API. The personal key never leaves this class.
 * The browser project token cannot read analytics and is not used here.
 */
final class PostHogQueryClient
{
    public const APP_HOST = 'https://eu.posthog.com';

    public const TIMEZONE = 'Europe/London';

    private const CACHE_SECONDS = 90;

    private const MAX_IN_FLIGHT = 2;

    private static int $inFlight = 0;

    /**
     * Compare registration_completed events with the database. Missing or
     * failed queries return null counts, never a stand-in zero.
     *
     * @return array{
     *     status: string,
     *     registration_events: int|null,
     *     registration_people: int|null,
     *     production_events: int|null,
     *     non_production_events: int|null,
     *     message: string|null
     * }
     */
    public function registrationComparison(Carbon $from, Carbon $to, bool $refresh = false): array
    {
        $state = $this->keyState();
        if ($state !== 'ready') {
            return $this->emptyResult($state, $this->configurationMessage($state));
        }

        $fromDate = $from->copy()->timezone(self::TIMEZONE)->toDateString();
        $toDate = $to->copy()->timezone(self::TIMEZONE)->toDateString();
        $cacheKey = $this->cacheKey($fromDate, $toDate);
        if ($refresh) {
            Cache::forget($cacheKey);
        }

        $cached = Cache::get($cacheKey);
        if (is_array($cached) && ($cached['status'] ?? null) === 'ok') {
            return $cached;
        }

        if (self::$inFlight >= self::MAX_IN_FLIGHT) {
            return $this->emptyResult('busy', 'PostHog reporting is busy. Database metrics are unchanged.');
        }

        self::$inFlight++;
        try {
            $result = $this->queryRegistrations($from, $to);
        } catch (\Throwable $exception) {
            Log::warning('growth.posthog_query_failed', [
                'type' => $exception::class,
            ]);
            $result = $this->emptyResult('error', 'PostHog reporting failed. Database metrics are unchanged.');
        } finally {
            self::$inFlight--;
        }

        if ($result['status'] === 'ok') {
            Cache::put($cacheKey, $result, self::CACHE_SECONDS);
        }

        return $result;
    }

    public function forget(Carbon $from, Carbon $to): void
    {
        Cache::forget($this->cacheKey(
            $from->copy()->timezone(self::TIMEZONE)->toDateString(),
            $to->copy()->timezone(self::TIMEZONE)->toDateString(),
        ));
    }

    /**
     * @return array{
     *     status: string,
     *     registration_events: int|null,
     *     registration_people: int|null,
     *     production_events: int|null,
     *     non_production_events: int|null,
     *     message: string|null
     * }
     */
    private function queryRegistrations(Carbon $from, Carbon $to): array
    {
        $start = $this->hogqlInstant($from->copy()->timezone(self::TIMEZONE)->startOfDay());
        $end = $this->hogqlInstant($to->copy()->timezone(self::TIMEZONE)->startOfDay()->addDay());
        $hogql = <<<SQL
            SELECT
              count() AS events,
              count(DISTINCT person_id) AS people,
              countIf(toString(properties.environment) = 'production') AS production_events,
              countIf(toString(properties.environment) IN ('local', 'testing')) AS non_production_events
            FROM events
            WHERE event = 'registration_completed'
              AND timestamp >= toDateTime('{$start}')
              AND timestamp < toDateTime('{$end}')
            SQL;

        $projectId = $this->projectId();
        $key = $this->personalKey();
        try {
            $response = Http::timeout(8)
                ->connectTimeout(3)
                ->withToken($key)
                ->acceptJson()
                ->asJson()
                ->post(self::APP_HOST.'/api/projects/'.$projectId.'/query/', [
                    'query' => [
                        'kind' => 'HogQLQuery',
                        'query' => $hogql,
                    ],
                ]);
        } catch (ConnectionException) {
            return $this->emptyResult('error', 'PostHog reporting timed out. Database metrics are unchanged.');
        }

        if (! $response->successful()) {
            Log::warning('growth.posthog_query_rejected', [
                'status' => $response->status(),
            ]);

            return $this->emptyResult('error', 'PostHog reporting failed. Database metrics are unchanged.');
        }

        $row = $this->firstRow($response->json());
        if ($row === null) {
            return $this->emptyResult('error', 'PostHog reporting returned an unexpected result. Database metrics are unchanged.');
        }
        $events = $this->countValue($row['events'] ?? null);
        $people = $this->countValue($row['people'] ?? null);
        if ($events === null || $people === null) {
            return $this->emptyResult('error', 'PostHog reporting returned an unexpected result. Database metrics are unchanged.');
        }

        return [
            'status' => 'ok',
            'registration_events' => $events,
            'registration_people' => $people,
            'production_events' => $this->countValue($row['production_events'] ?? null),
            'non_production_events' => $this->countValue($row['non_production_events'] ?? null),
            'message' => null,
        ];
    }

    /**
     * @param  mixed  $payload
     * @return array<string, mixed>|null
     */
    private function firstRow(mixed $payload): ?array
    {
        if (! is_array($payload)) {
            return null;
        }
        $results = $payload['results'] ?? null;
        if (! is_array($results) || ! isset($results[0]) || ! is_array($results[0])) {
            return null;
        }
        $row = $results[0];
        if (! array_is_list($row)) {
            return $row;
        }
        $columns = $payload['columns'] ?? null;
        if (! is_array($columns) || count($columns) !== count($row)) {
            return null;
        }
        $mapped = [];
        foreach ($columns as $index => $column) {
            $mapped[(string) $column] = $row[$index];
        }

        return $mapped;
    }

    private function countValue(mixed $value): ?int
    {
        if (is_int($value)) {
            return $value;
        }
        if (is_float($value) || (is_string($value) && is_numeric($value))) {
            return (int) $value;
        }

        return null;
    }

    private function hogqlInstant(Carbon $moment): string
    {
        $formatted = $moment->copy()->utc()->format('Y-m-d H:i:s');
        if (preg_match('/\A\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\z/', $formatted) !== 1) {
            throw new \InvalidArgumentException('Invalid analytics instant.');
        }

        return $formatted;
    }

    private function keyState(): string
    {
        $key = $this->personalKey();
        if ($key === '') {
            return 'unconfigured';
        }
        if (str_starts_with($key, 'phc_') || preg_match('/\Aphx_[^\s\'"\\\\]{8,220}\z/', $key) !== 1) {
            return 'misconfigured';
        }

        return 'ready';
    }

    private function personalKey(): string
    {
        return trim((string) config('services.posthog.personal_api_key', ''));
    }

    private function projectId(): string
    {
        $project = trim((string) config('services.posthog.project_id', '347076'));
        if (preg_match('/\A\d{1,12}\z/', $project) !== 1) {
            return '347076';
        }

        return $project;
    }

    private function configurationMessage(string $state): string
    {
        if ($state === 'misconfigured') {
            return 'PostHog reporting is misconfigured. POSTHOG_PERSONAL_API_KEY must be a personal API key with query read access, not the project token. Database metrics are unchanged.';
        }

        return 'PostHog reporting is not configured. Add a server-side personal API key with query read access to compare signup events. The project token cannot read analytics. Database metrics are unchanged.';
    }

    /**
     * @return array{
     *     status: string,
     *     registration_events: int|null,
     *     registration_people: int|null,
     *     production_events: int|null,
     *     non_production_events: int|null,
     *     message: string|null
     * }
     */
    private function emptyResult(string $status, string $message): array
    {
        return [
            'status' => $status,
            'registration_events' => null,
            'registration_people' => null,
            'production_events' => null,
            'non_production_events' => null,
            'message' => $message,
        ];
    }

    private function cacheKey(string $from, string $to): string
    {
        return 'posthog-growth-signups:v1:'.$this->projectId().':'.$from.':'.$to;
    }
}

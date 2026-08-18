<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MutqinLog
{
    /**
     * @param  array<string, mixed>  $context
     */
    public static function info(string $event, array $context = []): void
    {
        Log::info($event, self::baseContext($context));
    }

    /**
     * @param  array<string, mixed>  $context
     */
    public static function warning(string $event, array $context = []): void
    {
        Log::warning($event, self::baseContext($context));
    }

    /**
     * @param  array<string, mixed>  $context
     */
    public static function fromRequest(Request $request, string $event, array $context = []): void
    {
        self::info($event, array_merge(self::requestContext($request), $context));
    }

    /**
     * @return array<string, mixed>
     */
    public static function requestContext(Request $request): array
    {
        return [
            'request_id' => $request->headers->get('X-Request-Id') ?: $request->attributes->get('mutqin.request_id'),
            'route' => $request->route()?->getName(),
            'method' => $request->method(),
            'path' => $request->path(),
            'user_id' => $request->user()?->id,
        ];
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    private static function baseContext(array $context): array
    {
        return array_merge([
            'service' => 'mutqin',
            'timestamp' => now()->toIso8601String(),
        ], $context);
    }
}

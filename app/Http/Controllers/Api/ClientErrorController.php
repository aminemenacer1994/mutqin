<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ClientErrorRequest;
use App\Support\ErrorReporting;
use App\Support\SensitiveDataRedactor;
use Illuminate\Http\JsonResponse;

class ClientErrorController extends Controller
{
    public function store(ClientErrorRequest $request): JsonResponse
    {
        $data = $request->validated();
        $meta = is_array($data['meta'] ?? null) ? SensitiveDataRedactor::redact($data['meta']) : [];

        ErrorReporting::reportClientEvent([
            'name' => SensitiveDataRedactor::redactString($data['name'] ?? 'ClientError', 120),
            'message' => SensitiveDataRedactor::redactString($data['message'] ?? '', 300),
            'stack' => SensitiveDataRedactor::redactString($data['stack'] ?? '', 1500),
            'kind' => SensitiveDataRedactor::redactString($data['kind'] ?? 'client', 60),
            'feature' => SensitiveDataRedactor::redactString($data['feature'] ?? ErrorReporting::featureFromRequest($request), 60),
            'route' => SensitiveDataRedactor::redactString($data['route'] ?? $request->headers->get('Referer', ''), 200),
            'release' => SensitiveDataRedactor::redactString($data['release'] ?? ErrorReporting::release(), 80),
            'request_id' => ErrorReporting::isValidRequestId($data['request_id'] ?? null)
                ? $data['request_id']
                : ErrorReporting::requestId($request),
            'status' => isset($data['status']) ? (int) $data['status'] : null,
            'latency_ms' => isset($data['latency_ms']) ? (int) $data['latency_ms'] : null,
            'environment' => SensitiveDataRedactor::redactString($data['environment'] ?? app()->environment(), 40),
            'meta' => $meta,
            'user_id' => $request->user()?->id,
        ]);

        return response()->json([
            'recorded' => true,
            'request_id' => ErrorReporting::requestId($request),
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Analytics\ProductEventRecorder;
use App\Support\Analytics\Acquisition;
use App\Support\Analytics\ProductEventName;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProductEventController extends Controller
{
    public function store(Request $request, ProductEventRecorder $recorder): JsonResponse
    {
        $validated = $request->validate([
            'event' => ['required', 'string', Rule::in(ProductEventName::clientEvents())],
            'anonymous_id' => ['nullable', 'uuid'],
            'idempotency_key' => ['required', 'string', 'max:80', 'regex:/^[A-Za-z0-9:._\-]+$/'],
            'utm_source' => ['nullable', 'string', 'max:40'],
            'utm_medium' => ['nullable', 'string', 'max:40'],
            'utm_campaign' => ['nullable', 'string', 'max:40'],
            'referral_code' => ['nullable', 'string', 'max:40'],
            'properties' => ['nullable', 'array'],
        ]);

        $event = $recorder->record(
            $validated['event'],
            $request->user(),
            $validated['anonymous_id'] ?? null,
            $validated['idempotency_key'],
            is_array($validated['properties'] ?? null) ? $validated['properties'] : [],
            [
                'utm_source' => $validated['utm_source'] ?? null,
                'utm_medium' => $validated['utm_medium'] ?? null,
                'utm_campaign' => $validated['utm_campaign'] ?? null,
                'referral_code' => $validated['referral_code'] ?? null,
            ],
        );

        if (! $event) {
            return response()->json(['message' => 'Event was not recorded.'], 422);
        }

        if ($request->hasSession()) {
            Acquisition::remember($request);
        }

        return response()->json([
            'recorded' => true,
            'duplicate' => ! $event->wasRecentlyCreated,
        ], $event->wasRecentlyCreated ? 201 : 200);
    }
}

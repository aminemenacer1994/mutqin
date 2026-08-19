<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreWaitingListEntryRequest;
use App\Models\WaitingListEntry;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;

class WaitingListController extends Controller
{
    public function store(StoreWaitingListEntryRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $existing = WaitingListEntry::query()
            ->where('email', $validated['email'])
            ->first();

        if ($existing) {
            return response()->json([
                'message' => __('ui.waiting_list_already_joined'),
                'already_joined' => true,
                'data' => [
                    'name' => $existing->name,
                    'email' => $existing->email,
                ],
            ]);
        }

        try {
            $entry = WaitingListEntry::query()->create($validated);
        } catch (UniqueConstraintViolationException) {
            return response()->json([
                'message' => __('ui.waiting_list_already_joined'),
                'already_joined' => true,
                'data' => [
                    'email' => $validated['email'],
                ],
            ]);
        }

        return response()->json([
            'message' => __('ui.waiting_list_joined'),
            'already_joined' => false,
            'data' => [
                'name' => $entry->name,
                'email' => $entry->email,
            ],
        ], 201);
    }
}

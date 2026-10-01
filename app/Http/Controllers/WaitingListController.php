<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreWaitingListEntryRequest;
use App\Models\WaitingListEntry;
use App\Support\MutqinLog;
use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Schema;

class WaitingListController extends Controller
{
    public function store(StoreWaitingListEntryRequest $request): JsonResponse
    {
        if (! Schema::hasTable('waiting_list_entries')) {
            MutqinLog::error('waiting_list.storage_unavailable', [
                'reason' => 'missing_table',
            ]);

            return response()->json([
                'message' => __('ui.waiting_list_unavailable'),
            ], 503);
        }

        $validated = $request->validated();
        $validated['name'] = isset($validated['name']) && is_string($validated['name'])
            ? $validated['name']
            : '';

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
        } catch (QueryException $exception) {
            MutqinLog::error('waiting_list.store_failed', [
                'reason' => 'query_exception',
                'code' => $exception->getCode(),
            ]);

            return response()->json([
                'message' => __('ui.waiting_list_unavailable'),
            ], 503);
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

<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreWaitingListEntryRequest;
use App\Models\WaitingListEntry;
use App\Services\AdminDashboardService;
use App\Support\MutqinLog;
use App\Support\WaitingListAttribution;
use App\Support\WaitingListDatabase;
use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class WaitingListController extends Controller
{
    public function store(StoreWaitingListEntryRequest $request): JsonResponse
    {
        try {
            if (! WaitingListDatabase::hasTable()) {
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

            $existing = WaitingListEntry::withTrashed()
                ->where('email', $validated['email'])
                ->first();

            if ($existing) {
                if ($existing->trashed()) {
                    $existing->restore();
                }

                return response()->json([
                    'message' => __('ui.waiting_list_already_joined'),
                    'already_joined' => true,
                    'data' => [
                        'name' => $existing->name,
                        'email' => $existing->email,
                    ],
                ]);
            }

            $attribution = WaitingListAttribution::normalise($request->input('attribution'));
            $entry = WaitingListEntry::query()->create($validated + [
                'attribution' => $attribution,
                'first_source' => $attribution['first']['source'] ?? null,
                'last_source' => $attribution['last']['source'] ?? null,
                'last_campaign' => $attribution['last']['utm_campaign'] ?? null,
            ]);
            AdminDashboardService::invalidateCaches();
        } catch (UniqueConstraintViolationException) {
            $existing = WaitingListEntry::withTrashed()
                ->where('email', $request->validated('email'))
                ->first();

            if ($existing?->trashed()) {
                $existing->restore();
            }

            if (! $existing) {
                MutqinLog::error('waiting_list.store_failed', [
                    'reason' => 'unique_without_row',
                ]);

                return response()->json([
                    'message' => __('ui.waiting_list_unavailable'),
                ], 503);
            }

            return response()->json([
                'message' => __('ui.waiting_list_already_joined'),
                'already_joined' => true,
                'data' => [
                    'name' => $existing->name,
                    'email' => $existing->email,
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
        } catch (\Throwable $exception) {
            MutqinLog::error('waiting_list.store_failed', [
                'reason' => 'unexpected',
                'exception' => $exception::class,
            ]);

            return response()->json([
                'message' => __('ui.waiting_list_unavailable'),
            ], 503);
        }

        return response()->json([
            'message' => __('ui.waiting_list_joined'),
            'already_joined' => false,
            'conversion_event_id' => (string) Str::uuid(),
            'data' => [
                'name' => $entry->name,
                'email' => $entry->email,
            ],
        ], 201);
    }
}

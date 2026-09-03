<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\SaveProgressRequest;
use App\Models\MemorisationProgress;
use App\Services\DashboardService;
use App\Support\QuranMetadata;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProgressController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'surah_number' => ['nullable', 'integer', 'min:1', 'max:114'],
            'updated_since' => ['nullable', 'date'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:2000'],
            'offset' => ['nullable', 'integer', 'min:0', 'max:100000'],
        ]);

        $limit = (int) ($validated['limit'] ?? 500);
        $offset = (int) ($validated['offset'] ?? 0);

        $baseQuery = MemorisationProgress::query()
            ->where('user_id', $request->user()->id);

        if (isset($validated['surah_number'])) {
            $baseQuery->where('surah_number', (int) $validated['surah_number']);
        }

        if (! empty($validated['updated_since'])) {
            $baseQuery->where('updated_at', '>=', $validated['updated_since']);
        }

        $total = (clone $baseQuery)->count();

        $progress = (clone $baseQuery)
            ->select([
                'id',
                'surah_number',
                'ayah_number',
                'status',
                'mastery_level',
                'repetitions',
                'completed_at',
                'updated_at',
            ])
            ->orderBy('surah_number')
            ->orderBy('ayah_number')
            ->offset($offset)
            ->limit($limit)
            ->get()
            ->map(function (MemorisationProgress $row) {
                $surah = (int) $row->surah_number;

                return [
                    'id' => $row->id,
                    'surah_number' => $surah,
                    'surah_name' => $surah > 0 ? (QuranMetadata::name($surah) ?: ('Surah '.$surah)) : null,
                    'ayah_number' => (int) $row->ayah_number,
                    'status' => $row->status,
                    'mastery_level' => (int) $row->mastery_level,
                    'repetitions' => (int) $row->repetitions,
                    'completed_at' => optional($row->completed_at)->toIso8601String(),
                    'updated_at' => optional($row->updated_at)->toIso8601String(),
                ];
            })
            ->values();

        return response()->json([
            'progress' => $progress,
            'meta' => [
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset,
                'has_more' => ($offset + $progress->count()) < $total,
            ],
        ]);
    }

    public function store(SaveProgressRequest $request): JsonResponse
    {
        $userId = $request->user()->id;
        $now = now();
        $rows = [];

        foreach ($request->validated()['items'] as $item) {
            $status = (string) ($item['status'] ?? 'learning');
            $completedAt = $item['completed_at'] ?? null;
            if (! $completedAt && in_array($status, ['memorised', 'mastered'], true)) {
                $completedAt = $now->toIso8601String();
            }

            $rows[] = [
                'user_id' => $userId,
                'surah_number' => (int) $item['surah_number'],
                'ayah_number' => (int) $item['ayah_number'],
                'status' => $status,
                'mastery_level' => (int) ($item['mastery_level'] ?? 0),
                'repetitions' => (int) ($item['repetitions'] ?? 0),
                'metadata' => isset($item['metadata'])
                    ? json_encode($item['metadata'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
                    : null,
                'completed_at' => $completedAt,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        foreach (array_chunk($rows, 200) as $chunk) {
            MemorisationProgress::upsert(
                $chunk,
                ['user_id', 'surah_number', 'ayah_number'],
                ['status', 'mastery_level', 'repetitions', 'metadata', 'completed_at', 'updated_at']
            );
        }

        DashboardService::forgetForUser($request->user());

        return response()->json(['saved' => true, 'count' => count($rows)]);
    }
}

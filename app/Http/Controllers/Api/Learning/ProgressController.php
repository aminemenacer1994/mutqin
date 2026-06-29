<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\SaveProgressRequest;
use App\Models\MemorisationProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProgressController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $progress = MemorisationProgress::query()
            ->where('user_id', $request->user()->id)
            ->orderBy('surah_number')
            ->orderBy('ayah_number')
            ->get();

        return response()->json(['progress' => $progress]);
    }

    public function store(SaveProgressRequest $request): JsonResponse
    {
        $userId = $request->user()->id;
        $now = now();
        $rows = [];

        foreach ($request->validated()['items'] as $item) {
            $rows[] = [
                'user_id' => $userId,
                'surah_number' => (int) $item['surah_number'],
                'ayah_number' => (int) $item['ayah_number'],
                'status' => $item['status'] ?? 'learning',
                'mastery_level' => (int) ($item['mastery_level'] ?? 0),
                'repetitions' => (int) ($item['repetitions'] ?? 0),
                'metadata' => isset($item['metadata'])
                    ? json_encode($item['metadata'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
                    : null,
                'completed_at' => $item['completed_at'] ?? null,
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

        return response()->json(['saved' => true, 'count' => count($rows)]);
    }
}

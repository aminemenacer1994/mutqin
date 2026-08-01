<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Models\AiReciteAttempt;
use App\Support\QuranMetadata;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiReciteAttemptController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $attempts = AiReciteAttempt::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        $items = $attempts->map(function (AiReciteAttempt $attempt) {
            $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
            $surah = (int) ($range['surah'] ?? $range['chapterId'] ?? 0);
            $from = (int) ($range['from'] ?? $range['rangeStart'] ?? $range['start'] ?? 0);
            $to = (int) ($range['to'] ?? $range['rangeEnd'] ?? $range['end'] ?? $from);

            return [
                'id' => $attempt->id,
                'surah_number' => $surah,
                'surah_name' => $surah > 0 ? (QuranMetadata::name($surah) ?: ('Surah '.$surah)) : null,
                'ayah_start' => $from > 0 ? $from : null,
                'ayah_end' => $to > 0 ? $to : null,
                'band' => $attempt->band,
                'accuracy_percent' => $attempt->accuracy_percent,
                'occurred_at' => optional($attempt->created_at)->toIso8601String(),
            ];
        })->values();

        return response()->json(['attempts' => $items]);
    }
}

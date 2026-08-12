<?php

namespace App\Http\Controllers\Api\Quran;

use App\Http\Controllers\Controller;
use App\Services\Quran\TafsirService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class TafsirController extends Controller
{
    public function __construct(
        private readonly TafsirService $tafsirService,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'surah_number' => ['required', 'integer', 'min:1', 'max:114'],
            'ayah_number' => ['nullable', 'integer', 'min:1', 'max:300'],
            'resource_id' => ['nullable', 'string', 'max:16', 'regex:/^[0-9]+$/'],
        ]);

        $surah = (int) $validated['surah_number'];
        $resourceId = isset($validated['resource_id']) ? (string) $validated['resource_id'] : null;

        try {
            if (isset($validated['ayah_number'])) {
                $tafsir = $this->tafsirService->getForAyah($surah, (int) $validated['ayah_number'], $resourceId);

                if ($tafsir === null) {
                    return response()->json([
                        'tafsir' => null,
                        'available' => false,
                    ]);
                }

                return response()->json([
                    'tafsir' => $tafsir,
                    'available' => true,
                ])->header('Cache-Control', 'private, max-age=300');
            }

            $chapter = $this->tafsirService->getForChapter($surah, $resourceId);
        } catch (ConnectionException) {
            return response()->json([
                'tafsir' => null,
                'available' => false,
                'error' => 'network',
                'message' => 'Could not reach the tafsir provider.',
            ], 502);
        } catch (RuntimeException) {
            return response()->json([
                'tafsir' => null,
                'available' => false,
                'error' => 'upstream',
                'message' => 'Tafsir provider returned an error.',
            ], 502);
        }

        if ($chapter === null) {
            return response()->json([
                'tafsir' => null,
                'available' => false,
            ]);
        }

        return response()->json([
            'tafsir' => $chapter,
            'available' => true,
        ])->header('Cache-Control', 'private, max-age=300');
    }
}

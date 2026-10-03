<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Models\MutashabihatPair;
use App\Services\Memorisation\MutashabihatComparisonService;
use App\Services\Memorisation\MutashabihatProgressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MutashabihatController extends Controller
{
    public function __construct(
        private readonly MutashabihatComparisonService $comparisonService,
        private readonly MutashabihatProgressService $progressService,
    ) {}

    public function catalog(): JsonResponse
    {
        $pairs = MutashabihatPair::query()
            ->orderBy('id')
            ->get([
                'id',
                'surah_number_1',
                'ayah_number_1',
                'surah_number_2',
                'ayah_number_2',
                'verse_key_1',
                'verse_key_2',
                'pair_key',
            ]);

        return response()->json(['pairs' => $pairs]);
    }

    public function forAyah(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'verse_key' => ['required', 'string', 'regex:/^\d{1,3}:\d{1,3}$/'],
        ]);

        $verseKey = $validated['verse_key'];
        $pairs = MutashabihatPair::query()
            ->where('verse_key_1', $verseKey)
            ->orWhere('verse_key_2', $verseKey)
            ->orderBy('id')
            ->get([
                'id',
                'surah_number_1',
                'ayah_number_1',
                'surah_number_2',
                'ayah_number_2',
                'verse_key_1',
                'verse_key_2',
            ]);

        return response()->json(['pairs' => $pairs]);
    }

    public function compare(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'left_text' => ['required', 'string', 'max:8000'],
            'right_text' => ['required', 'string', 'max:8000'],
            'pair_id' => ['nullable', 'integer', 'exists:mutashabihat_pairs,id'],
        ]);

        $diff = $this->comparisonService->compareDisplayTexts(
            $validated['left_text'],
            $validated['right_text'],
        );

        return response()->json([
            'diff' => $diff,
            'pair_id' => $validated['pair_id'] ?? null,
        ]);
    }

    public function progressIndex(Request $request): JsonResponse
    {
        $rows = $this->progressService->listForUser($request->user());

        return response()->json([
            'progress' => $rows->map(fn ($row) => $this->serializeProgress($row)),
        ]);
    }

    public function recordConfusion(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'pair_id' => ['required', 'integer', 'exists:mutashabihat_pairs,id'],
            'expected_verse_key' => ['required', 'string', 'regex:/^\d{1,3}:\d{1,3}$/'],
            'confused_verse_key' => ['required', 'string', 'regex:/^\d{1,3}:\d{1,3}$/'],
        ]);

        $pair = MutashabihatPair::query()->findOrFail((int) $validated['pair_id']);
        $progress = $this->progressService->recordConfusion(
            $request->user(),
            $pair,
            $validated['expected_verse_key'],
            $validated['confused_verse_key'],
        );

        return response()->json(['progress' => $this->serializeProgress($progress)]);
    }

    public function recordPractice(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'pair_id' => ['required', 'integer', 'exists:mutashabihat_pairs,id'],
            'success' => ['required', 'boolean'],
        ]);

        $pair = MutashabihatPair::query()->findOrFail((int) $validated['pair_id']);
        $progress = $this->progressService->recordPracticeAttempt(
            $request->user(),
            $pair,
            (bool) $validated['success'],
        );

        return response()->json(['progress' => $this->serializeProgress($progress)]);
    }

    private function serializeProgress($row): array
    {
        $pair = $row->pair;

        return [
            'id' => $row->id,
            'pair_id' => $row->mutashabihat_pair_id,
            'expected_verse_key' => $row->expected_verse_key,
            'confused_verse_key' => $row->confused_verse_key,
            'confusion_count' => (int) $row->confusion_count,
            'practice_attempts' => (int) $row->practice_attempts,
            'successful_attempts' => (int) $row->successful_attempts,
            'status' => $row->status instanceof \BackedEnum ? $row->status->value : (string) $row->status,
            'last_practised_at' => $row->last_practised_at?->toIso8601String(),
            'last_confused_at' => $row->last_confused_at?->toIso8601String(),
            'pair' => $pair ? [
                'id' => $pair->id,
                'verse_key_1' => $pair->verse_key_1,
                'verse_key_2' => $pair->verse_key_2,
                'surah_number_1' => $pair->surah_number_1,
                'ayah_number_1' => $pair->ayah_number_1,
                'surah_number_2' => $pair->surah_number_2,
                'ayah_number_2' => $pair->ayah_number_2,
            ] : null,
        ];
    }
}

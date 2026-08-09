<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\StoreAyahNoteRequest;
use App\Http\Requests\Learning\UpdateAyahNoteRequest;
use App\Models\AyahNote;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AyahNoteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'surah_number' => ['nullable', 'integer', 'min:1', 'max:114'],
            'ayah_number' => ['nullable', 'integer', 'min:1', 'max:300'],
        ]);

        $query = AyahNote::query()
            ->where('user_id', $request->user()->id);

        if (isset($validated['surah_number'])) {
            $query->where('surah_number', (int) $validated['surah_number']);
        }

        if (isset($validated['ayah_number'])) {
            $query->where('ayah_number', (int) $validated['ayah_number']);
        }

        $notes = $query
            ->select([
                'id',
                'surah_number',
                'ayah_number',
                'title',
                'body',
                'created_at',
                'updated_at',
            ])
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->limit(500)
            ->get();

        return response()->json(['notes' => $notes]);
    }

    public function counts(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'surah_number' => ['required', 'integer', 'min:1', 'max:114'],
        ]);

        $rows = AyahNote::query()
            ->where('user_id', $request->user()->id)
            ->where('surah_number', (int) $validated['surah_number'])
            ->selectRaw('ayah_number, COUNT(*) as notes_count')
            ->groupBy('ayah_number')
            ->get();

        $counts = [];
        foreach ($rows as $row) {
            $key = ((int) $validated['surah_number']).':'.((int) $row->ayah_number);
            $counts[$key] = (int) $row->notes_count;
        }

        return response()->json(['counts' => $counts]);
    }

    public function store(StoreAyahNoteRequest $request): JsonResponse
    {
        $data = $request->validated();

        $note = AyahNote::query()->create([
            'user_id' => $request->user()->id,
            'surah_number' => (int) $data['surah_number'],
            'ayah_number' => (int) $data['ayah_number'],
            'title' => isset($data['title']) ? trim((string) $data['title']) ?: null : null,
            'body' => trim((string) $data['body']),
        ]);

        DashboardService::forgetForUser($request->user());

        return response()->json(['note' => $note], 201);
    }

    public function update(UpdateAyahNoteRequest $request, AyahNote $ayahNote): JsonResponse
    {
        $this->authorizeOwner($request, $ayahNote);

        $data = $request->validated();

        $ayahNote->fill([
            'title' => array_key_exists('title', $data)
                ? (trim((string) ($data['title'] ?? '')) ?: null)
                : $ayahNote->title,
            'body' => trim((string) $data['body']),
        ]);
        $ayahNote->save();

        return response()->json(['note' => $ayahNote->fresh()]);
    }

    public function destroy(Request $request, AyahNote $ayahNote): JsonResponse
    {
        $this->authorizeOwner($request, $ayahNote);
        $ayahNote->delete();
        DashboardService::forgetForUser($request->user());

        return response()->json(['deleted' => true]);
    }

    private function authorizeOwner(Request $request, AyahNote $ayahNote): void
    {
        if ((int) $ayahNote->user_id !== (int) $request->user()->id) {
            abort(404);
        }
    }
}

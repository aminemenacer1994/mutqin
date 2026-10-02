<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\WaitingListEntry;
use App\Rules\WaitingListEmail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WaitingListController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->admin($request);

        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:200'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:10', 'max:50'],
        ]);

        $search = trim((string) ($validated['q'] ?? ''));
        $page = max(1, (int) ($validated['page'] ?? 1));
        $perPage = min(50, max(10, (int) ($validated['per_page'] ?? 25)));

        $query = WaitingListEntry::query();

        if ($search !== '') {
            $like = '%'.addcslashes($search, '%_\\').'%';
            $query->where(function ($inner) use ($like, $search): void {
                $inner->where('name', 'like', $like)
                    ->orWhere('email', 'like', $like);

                if (ctype_digit($search)) {
                    $inner->orWhere('id', (int) $search);
                }
            });
        }

        $total = (clone $query)->count();
        $totalPages = max(1, (int) ceil($total / $perPage));
        if ($page > $totalPages) {
            $page = $totalPages;
        }

        $rows = $query
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->forPage($page, $perPage)
            ->get();

        return response()
            ->json([
                'items' => $rows->map(fn (WaitingListEntry $row) => $this->serialize($row))->values()->all(),
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'total_pages' => $totalPages,
            ])
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function show(Request $request, WaitingListEntry $entry): JsonResponse
    {
        $this->admin($request);

        return response()
            ->json(['entry' => $this->serialize($entry)])
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function update(Request $request, WaitingListEntry $entry): JsonResponse
    {
        $this->admin($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'max:255',
                new WaitingListEmail(),
                Rule::unique(WaitingListEntry::class, 'email')->ignore($entry->getKey()),
            ],
        ]);

        $validated['name'] = trim($validated['name']);
        $validated['email'] = strtolower(trim($validated['email']));

        $entry->update($validated);

        return response()->json([
            'entry' => $this->serialize($entry->fresh()),
        ]);
    }

    public function destroy(Request $request, WaitingListEntry $entry): JsonResponse
    {
        $this->admin($request);

        $entry->delete();

        return response()->json([
            'message' => __('admin.waiting_list.deleted'),
        ]);
    }

    /**
     * @return array{id: int, name: string, email: string, created_at: string|null, joined_at: string|null}
     */
    private function serialize(WaitingListEntry $entry): array
    {
        return [
            'id' => (int) $entry->id,
            'name' => (string) $entry->name,
            'email' => (string) $entry->email,
            'created_at' => $entry->created_at?->toIso8601String(),
            'joined_at' => $entry->created_at?->format('j M Y, H:i'),
        ];
    }

    private function admin(Request $request): void
    {
        abort_unless($request->user()?->can('access-admin'), 403);
    }
}

<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WaitingListEntry;
use App\Rules\WaitingListEmail;
use App\Services\AdminDashboardService;
use App\Services\WaitingListAnalyticsService;
use App\Services\WaitingListLaunchCampaignService;
use App\Support\BulkMailQueue;
use App\Support\WaitingListDatabase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class WaitingListController extends Controller
{
    public function analytics(Request $request, WaitingListAnalyticsService $analytics): JsonResponse
    {
        $this->admin($request);

        return response()->json($analytics->report())
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function launchEmailPreview(Request $request, WaitingListLaunchCampaignService $campaign): JsonResponse
    {
        $this->superAdmin($request);

        return response()
            ->json($campaign->preview())
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function launchEmailStatus(Request $request, WaitingListLaunchCampaignService $campaign): JsonResponse
    {
        $this->superAdmin($request);

        return response()
            ->json([
                'campaign_key' => $campaign->campaignKey(),
                'deliveries' => $campaign->deliveryCounts(),
            ])
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function launchEmailSend(Request $request, WaitingListLaunchCampaignService $campaign): JsonResponse
    {
        $admin = $this->superAdmin($request);

        $validated = $request->validate([
            'confirm_count' => ['nullable', 'integer', 'min:0'],
            'test_email' => ['nullable', 'string', 'max:255'],
            'confirm_send' => ['required', 'accepted'],
        ]);

        $testEmail = isset($validated['test_email']) ? trim((string) $validated['test_email']) : null;
        if ($testEmail === '') {
            $testEmail = null;
        }

        $confirmCount = (int) ($validated['confirm_count'] ?? 0);

        $result = $campaign->dispatchSend((int) $admin->id, $confirmCount, $testEmail);

        return response()->json($result);
    }

    public function launchEmailPump(Request $request): JsonResponse
    {
        $this->superAdmin($request);

        $result = BulkMailQueue::deliverPending(20, 12, 'waiting_list');

        return response()->json([
            'processed' => $result['processed'],
            'deliveries' => $result['waiting_list'],
        ])->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function index(Request $request): JsonResponse
    {
        $this->admin($request);

        $storage = WaitingListDatabase::storageMeta();
        if ($storage['misconfigured']) {
            return response()->json([
                'message' => __('admin.waiting_list.storage_mismatch', [
                    'count' => (int) ($storage['alternate_count'] ?? 0),
                    'database' => (string) ($storage['alternate_database'] ?? ''),
                ]),
                'storage' => $storage,
            ], 503);
        }
        if (! $storage['available']) {
            return response()->json([
                'message' => __('admin.waiting_list.storage_unavailable'),
                'storage' => $storage,
            ], 503);
        }

        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:200'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:10', 'max:50'],
            'archived' => ['nullable', 'boolean'],
        ]);

        $search = trim((string) ($validated['q'] ?? ''));
        $page = max(1, (int) ($validated['page'] ?? 1));
        $perPage = min(50, max(10, (int) ($validated['per_page'] ?? 25)));
        $archived = $request->boolean('archived');

        $query = $archived
            ? WaitingListEntry::onlyTrashed()
            : WaitingListEntry::query();

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
        $archivedTotal = $archived
            ? $total
            : (int) WaitingListEntry::onlyTrashed()->count();
        $totalPages = max(1, (int) ceil($total / $perPage));
        if ($page > $totalPages) {
            $page = $totalPages;
        }

        $rows = $query
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->forPage($page, $perPage)
            ->get();
        $registeredEmails = $this->registeredEmails($rows->pluck('email')->all());

        return response()
            ->json([
                'items' => $rows->map(fn (WaitingListEntry $row) => $this->serialize($row, $registeredEmails))->values()->all(),
                'archived' => $archived,
                'archived_total' => $archivedTotal,
                'active_total' => $archived ? (int) WaitingListEntry::query()->count() : $total,
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'total_pages' => $totalPages,
            ])
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function export(Request $request): StreamedResponse
    {
        $this->admin($request);

        $archived = $request->boolean('archived');
        $search = trim((string) $request->query('q', ''));
        $query = $archived
            ? WaitingListEntry::onlyTrashed()
            : WaitingListEntry::query();
        if ($search !== '') {
            $like = '%'.addcslashes($search, '%_\\').'%';
            $query->where(function ($inner) use ($like): void {
                $inner->where('name', 'like', $like)->orWhere('email', 'like', $like);
            });
        }

        $filename = 'waiting-list-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($query): void {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['id', 'name', 'email', 'status', 'created_at', 'unsubscribed_at', 'deleted_at']);
            $query->orderBy('id')->chunk(200, function ($rows) use ($handle): void {
                $registered = $this->registeredEmails($rows->pluck('email')->all());
                foreach ($rows as $row) {
                    $payload = $this->serialize($row, $registered);
                    fputcsv($handle, [
                        $payload['id'],
                        $payload['name'],
                        $payload['email'],
                        $payload['status'],
                        $payload['created_at'],
                        $row->unsubscribed_at?->toIso8601String(),
                        $row->deleted_at?->toIso8601String(),
                    ]);
                }
            });
            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function show(Request $request, int $entry): JsonResponse
    {
        $this->admin($request);

        $row = WaitingListEntry::withTrashed()->findOrFail($entry);

        return response()
            ->json(['entry' => $this->serialize($row)])
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
                new WaitingListEmail,
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

        AdminDashboardService::invalidateCaches();

        return response()->json([
            'message' => __('admin.waiting_list.deleted'),
        ]);
    }

    public function restoreArchived(Request $request): JsonResponse
    {
        $this->admin($request);

        $restored = 0;
        WaitingListEntry::onlyTrashed()
            ->orderBy('id')
            ->chunkById(200, function ($rows) use (&$restored): void {
                foreach ($rows as $row) {
                    $row->restore();
                    $restored++;
                }
            });

        AdminDashboardService::invalidateCaches();

        return response()->json([
            'message' => __('admin.waiting_list.restored_all', ['count' => $restored]),
            'restored' => $restored,
        ]);
    }

    public function restore(Request $request, int $entry): JsonResponse
    {
        $this->admin($request);

        $row = WaitingListEntry::onlyTrashed()->findOrFail($entry);
        $row->restore();

        AdminDashboardService::invalidateCaches();

        return response()->json([
            'message' => __('admin.waiting_list.restored'),
            'entry' => $this->serialize($row->fresh()),
        ]);
    }

    /**
     * @param  list<string>  $emails
     * @return array<string, true>
     */
    private function registeredEmails(array $emails): array
    {
        $normalized = array_values(array_unique(array_filter(array_map(
            fn ($email) => strtolower(trim((string) $email)),
            $emails
        ))));
        if ($normalized === []) {
            return [];
        }

        return User::query()
            ->whereIn('email', $normalized)
            ->pluck('email')
            ->mapWithKeys(fn ($email) => [strtolower((string) $email) => true])
            ->all();
    }

    /**
     * @param  array<string, true>  $registeredEmails
     * @return array<string, mixed>
     */
    private function serialize(WaitingListEntry $entry, array $registeredEmails = []): array
    {
        $email = strtolower((string) $entry->email);
        $registered = $registeredEmails !== []
            ? isset($registeredEmails[$email])
            : User::query()->where('email', $email)->exists();
        $status = $entry->trashed()
            ? 'archived'
            : ($registered
                ? 'registered'
                : ($entry->unsubscribed_at ? 'unsubscribed' : 'pending'));

        return [
            'id' => (int) $entry->id,
            'name' => (string) $entry->name,
            'email' => (string) $entry->email,
            'status' => $status,
            'registered' => $status === 'registered',
            'created_at' => $entry->created_at?->toIso8601String(),
            'joined_at' => $entry->created_at?->format('j M Y, H:i'),
            'attribution' => $entry->attribution,
        ];
    }

    private function admin(Request $request): \App\Models\User
    {
        $user = $request->user();
        abort_unless($user?->can('access-admin'), 403);

        return $user;
    }

    private function superAdmin(Request $request): \App\Models\User
    {
        $user = $this->admin($request);
        abort_unless($user->can('manage-waitlist-launch-email'), 403);

        return $user;
    }
}

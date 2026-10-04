<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\WaitingListEntry;
use App\Services\AdminDashboardService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Schema;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\StreamedResponse;

class WaitingListController extends Controller
{
    public function index(): View
    {
        $entries = WaitingListEntry::query()
            ->latest()
            ->paginate(25);

        return view('admin.waiting-list.index', [
            'entries' => $entries,
            'totalEntries' => Schema::hasTable('waiting_list_entries')
                ? WaitingListEntry::query()->count()
                : 0,
        ]);
    }

    public function export(): StreamedResponse
    {
        $filename = 'mutqin-waiting-list-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function (): void {
            $handle = fopen('php://output', 'w');
            if ($handle === false) {
                return;
            }

            fputcsv($handle, ['name', 'email', 'joined_at']);

            WaitingListEntry::query()
                ->orderBy('id')
                ->chunk(200, function ($entries) use ($handle): void {
                    foreach ($entries as $entry) {
                        fputcsv($handle, [
                            $entry->name,
                            $entry->email,
                            $entry->created_at?->toIso8601String(),
                        ]);
                    }
                });

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function destroy(WaitingListEntry $entry): RedirectResponse
    {
        $entry->delete();

        AdminDashboardService::invalidateCaches();

        return redirect()
            ->route('admin.waiting-list.index')
            ->with('waiting_list_status', __('admin.waiting_list.deleted_flash'));
    }
}

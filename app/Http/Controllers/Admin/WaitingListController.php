<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\WaitingListEntry;
use Illuminate\View\View;

class WaitingListController extends Controller
{
    public function index(): View
    {
        $entries = WaitingListEntry::query()
            ->latest()
            ->paginate(25);

        return view('admin.waiting-list.index', [
            'entries' => $entries,
        ]);
    }
}

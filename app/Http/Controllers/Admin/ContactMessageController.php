<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactSubmission;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ContactMessageController extends Controller
{
    public function index(Request $request)
    {
        $status = (string) $request->query('status', 'open');

        $messages = ContactSubmission::query()
            ->when($status === 'resolved', fn ($query) => $query->where('status', 'resolved'))
            ->when($status !== 'resolved', fn ($query) => $query->where('status', 'pending'))
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return view('admin.contact-messages.index', [
            'messages' => $messages,
            'status' => $status,
        ]);
    }

    public function resolve(ContactSubmission $contactMessage): RedirectResponse
    {
        $contactMessage->forceFill(['status' => 'resolved'])->save();

        return back()->with('contact_status', 'Message marked as resolved.');
    }

    public function destroy(ContactSubmission $contactMessage): RedirectResponse
    {
        $contactMessage->delete();

        return back()->with('contact_status', 'Message deleted.');
    }
}

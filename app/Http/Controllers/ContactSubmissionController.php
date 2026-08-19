<?php

namespace App\Http\Controllers;

use App\Models\ContactSubmission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactSubmissionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateSubmission($request);

        $submission = ContactSubmission::query()->create([
            ...$validated,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => __('ui.contact_message_sent'),
            'data' => $submission,
        ], 201);
    }

    private function validateSubmission(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
        ], [
            'name.required' => __('ui.contact_name_required'),
            'email.required' => __('ui.contact_email_required'),
            'email.email' => __('ui.contact_email_invalid'),
            'subject.required' => __('ui.contact_subject_required'),
            'message.required' => __('ui.contact_message_required'),
        ]);
    }
}

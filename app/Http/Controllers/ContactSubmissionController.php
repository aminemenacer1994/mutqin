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
            'message' => 'Your message has been sent successfully.',
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
            'name.required' => 'Please enter your name.',
            'email.required' => 'Please enter your email address.',
            'email.email' => 'Please enter a valid email address.',
            'subject.required' => 'Please enter a subject.',
            'message.required' => 'Please enter a message.',
        ]);
    }
}

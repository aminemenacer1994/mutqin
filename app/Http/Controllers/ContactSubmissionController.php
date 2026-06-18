<?php

namespace App\Http\Controllers;

use App\Models\ContactSubmission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactSubmissionController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(ContactSubmission::query()->latest()->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateSubmission($request);

        $submission = ContactSubmission::query()->create($validated);

        return response()->json([
            'message' => 'Your message has been sent successfully.',
            'data' => $submission,
        ], 201);
    }

    public function show(ContactSubmission $contact): JsonResponse
    {
        return response()->json($contact);
    }

    public function update(Request $request, ContactSubmission $contact): JsonResponse
    {
        $validated = $this->validateSubmission($request);

        $contact->update($validated);

        return response()->json([
            'message' => 'Contact submission updated successfully.',
            'data' => $contact->fresh(),
        ]);
    }

    public function destroy(ContactSubmission $contact): JsonResponse
    {
        $contact->delete();

        return response()->json([
            'message' => 'Contact submission deleted successfully.',
        ]);
    }

    private function validateSubmission(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'subject' => ['nullable', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
        ], [
            'name.required' => 'Please enter your name.',
            'email.required' => 'Please enter your email address.',
            'email.email' => 'Please enter a valid email address.',
            'message.required' => 'Please enter a message.',
        ]);
    }
}

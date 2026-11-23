<?php

namespace App\Http\Controllers\Api\Parent;

use App\Http\Controllers\Controller;
use App\Models\TeacherNote;
use App\Models\User;
use App\Services\Parent\ParentNoticePreferences;
use App\Services\Parent\ParentTeacherConversationService;
use App\Support\ParentFeatures;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParentMessageController extends Controller
{
    public function index(Request $request, ParentTeacherConversationService $messages): JsonResponse
    {
        $parent = $this->parent($request);

        return response()->json(['conversations' => $messages->inbox($parent)]);
    }

    public function show(Request $request, User $teacher, User $student, ParentTeacherConversationService $messages): JsonResponse
    {
        $parent = $this->parent($request);

        $before = $request->query('before');

        return response()->json($messages->thread(
            $parent,
            $teacher,
            $student,
            is_numeric($before) ? (int) $before : null,
        ));
    }

    public function store(Request $request, User $teacher, User $student, ParentTeacherConversationService $messages): JsonResponse
    {
        $parent = $this->parent($request);
        $data = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
            'client_message_id' => ['nullable', 'uuid'],
        ]);
        $note = $messages->send($parent, $teacher, $student, $data['body'], $data['client_message_id'] ?? null, $request);

        return response()->json(['message' => $messages->present($note, $parent)], 201);
    }

    public function report(Request $request, TeacherNote $note, ParentTeacherConversationService $messages): JsonResponse
    {
        $parent = $this->parent($request);
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);
        $note = $messages->report($parent, $note, $data['reason'], $request);

        return response()->json(['message' => $messages->present($note, $parent)]);
    }

    public function preferences(Request $request, ParentNoticePreferences $preferences): JsonResponse
    {
        return response()->json(['preferences' => $preferences->for($this->parent($request))]);
    }

    public function updatePreferences(Request $request, ParentNoticePreferences $preferences): JsonResponse
    {
        $data = $request->validate([
            'homework' => ['sometimes', 'boolean'],
            'deadlines' => ['sometimes', 'boolean'],
            'feedback' => ['sometimes', 'boolean'],
            'messages' => ['sometimes', 'boolean'],
            'updates' => ['sometimes', 'boolean'],
            'weekly_summary' => ['sometimes', 'boolean'],
            'reports' => ['sometimes', 'boolean'],
        ]);

        return response()->json([
            'preferences' => $preferences->store($this->parent($request), $data),
        ]);
    }

    private function parent(Request $request): User
    {
        ParentFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User && $user->isParent(), 403);

        return $user;
    }
}

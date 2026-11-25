<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Learning\StudentNoticeInboxService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentNotificationController extends Controller
{
    public function index(Request $request, StudentNoticeInboxService $inbox): JsonResponse
    {
        $student = $this->student($request);
        $data = $request->validate([
            'limit' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'cursor' => ['sometimes', 'nullable', 'uuid'],
        ]);

        return response()->json($inbox->list(
            $student,
            isset($data['limit']) ? (int) $data['limit'] : 50,
            $data['cursor'] ?? null,
        ))->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function markRead(Request $request, string $notification, StudentNoticeInboxService $inbox): JsonResponse
    {
        $student = $this->student($request);
        abort_unless($inbox->markRead($student, $notification), 404);

        return response()->json(['ok' => true, 'unread_count' => $inbox->list($student, 1)['unread_count']]);
    }

    public function markAllRead(Request $request, StudentNoticeInboxService $inbox): JsonResponse
    {
        $student = $this->student($request);

        return response()->json([
            'marked' => $inbox->markAllRead($student),
            'unread_count' => 0,
        ]);
    }

    private function student(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return $user;
    }
}
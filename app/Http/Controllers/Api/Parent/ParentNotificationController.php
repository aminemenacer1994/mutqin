<?php

namespace App\Http\Controllers\Api\Parent;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Parent\ParentNoticeInboxService;
use App\Support\ParentFeatures;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParentNotificationController extends Controller
{
    public function index(Request $request, ParentNoticeInboxService $inbox): JsonResponse
    {
        $parent = $this->parent($request);
        $data = $request->validate([
            'limit' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'cursor' => ['sometimes', 'nullable', 'string', 'max:64'],
        ]);

        return response()->json($inbox->list(
            $parent,
            isset($data['limit']) ? (int) $data['limit'] : 50,
            $data['cursor'] ?? null,
        ));
    }

    public function markRead(Request $request, string $notification, ParentNoticeInboxService $inbox): JsonResponse
    {
        $parent = $this->parent($request);
        abort_unless($inbox->markRead($parent, $notification), 404);

        return response()->json(['ok' => true]);
    }

    public function markAllRead(Request $request, ParentNoticeInboxService $inbox): JsonResponse
    {
        $parent = $this->parent($request);

        return response()->json(['marked' => $inbox->markAllRead($parent)]);
    }

    private function parent(Request $request): User
    {
        ParentFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User && $user->isParent(), 403);

        return $user;
    }
}
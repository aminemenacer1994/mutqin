<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\LearningGroup;
use App\Models\LearningGroupInvitation;
use App\Models\User;
use App\Services\Organisations\LearningGroupInvitationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeacherClassInviteController extends Controller
{
    public function store(Request $request, LearningGroup $group, LearningGroupInvitationService $invites): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $data = $request->validate([
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        $result = $invites->issue($user, $group, $data['email'] ?? null);

        return response()->json([
            'invitation' => [
                'id' => $result['invitation']->id,
                'expires_at' => $result['invitation']->expires_at?->toIso8601String(),
            ],
            'invite_url' => $result['invite_url'],
            'code' => $result['code'],
        ], 201);
    }

    public function revoke(
        Request $request,
        LearningGroupInvitation $invitation,
        LearningGroupInvitationService $invites,
    ): JsonResponse {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $invites->revoke($user, $invitation);

        return response()->json(['ok' => true]);
    }
}

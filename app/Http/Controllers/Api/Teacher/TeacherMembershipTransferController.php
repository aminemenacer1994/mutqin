<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\User;
use App\Services\Organisations\GroupMembershipService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeacherMembershipTransferController extends Controller
{
    public function store(
        Request $request,
        GroupMembership $membership,
        GroupMembershipService $memberships,
    ): JsonResponse {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $data = $request->validate([
            'learning_group_id' => ['required', 'integer', 'exists:learning_groups,id'],
        ]);

        $destination = LearningGroup::query()->findOrFail((int) $data['learning_group_id']);
        $updated = $memberships->transfer($user, $membership, $destination);

        return response()->json([
            'membership' => [
                'id' => $updated->id,
                'status' => $updated->status?->value ?? $updated->status,
                'learning_group_id' => $updated->learning_group_id,
            ],
        ]);
    }
}

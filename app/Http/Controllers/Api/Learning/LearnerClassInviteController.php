<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Organisations\LearningGroupInvitationService;
use App\Services\Teacher\TeacherDashboardService;
use App\Support\TeacherFeatures;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LearnerClassInviteController extends Controller
{
    public function preview(
        Request $request,
        LearningGroupInvitationService $invites,
    ): JsonResponse {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $data = $request->validate([
            'code' => ['required', 'string', 'max:2048'],
        ]);

        return response()->json($invites->preview($user, (string) $data['code']))
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function redeem(
        Request $request,
        LearningGroupInvitationService $invites,
        TeacherDashboardService $dashboard,
    ): JsonResponse {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $data = $request->validate([
            // Allow pasted invite URLs; the service normalizes to token/code.
            'code' => ['required', 'string', 'max:2048'],
        ]);

        $invites->redeem($user, (string) $data['code']);

        return response()->json($dashboard->learnerSupport($user->refresh()))
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }
}

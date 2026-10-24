<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\TeacherAssignmentRecipient;
use App\Models\User;
use App\Services\Organisations\GroupMembershipService;
use App\Services\Teacher\TeacherAssignmentService;
use App\Services\Teacher\TeacherDashboardService;
use App\Support\TeacherFeatures;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LearnerSupportController extends Controller
{
    public function show(Request $request, TeacherDashboardService $dashboard): JsonResponse
    {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return response()->json($dashboard->learnerSupport($user))
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function requestGroup(Request $request, LearningGroup $group, GroupMembershipService $memberships, TeacherDashboardService $dashboard): JsonResponse
    {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $memberships->requestJoin($user, $group);

        return response()->json($dashboard->learnerSupport($user));
    }

    public function grantConsent(Request $request, GroupMembership $membership, GroupMembershipService $memberships, TeacherDashboardService $dashboard): JsonResponse
    {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $memberships->grantAnalyticsConsent($user, $membership);

        return response()->json($dashboard->learnerSupport($user));
    }

    public function startAssignment(Request $request, TeacherAssignmentRecipient $recipient, TeacherAssignmentService $assignments): JsonResponse
    {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $recipient->loadMissing('assignment');
        $updated = $assignments->start($user, $recipient);
        $updated->loadMissing('assignment');

        $resumeSessionId = $updated->assignment
            ? $assignments->resumeSessionId($updated)
            : null;

        return response()->json([
            'recipient' => $assignments->presentRecipient($updated),
            'href' => $updated->assignment
                ? $assignments->practiceHref($updated->assignment, $resumeSessionId, (int) $updated->id)
                : null,
        ]);
    }

    public function completeAssignment(Request $request, TeacherAssignmentRecipient $recipient, TeacherAssignmentService $assignments, TeacherDashboardService $dashboard): JsonResponse
    {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $assignments->completeByStudent($user, $recipient);

        return response()->json($dashboard->learnerSupport($user))
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function storeAssignmentMessage(Request $request, TeacherAssignmentRecipient $recipient, TeacherAssignmentService $assignments): JsonResponse
    {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);

        $message = $assignments->addLearnerMessage($user, $recipient, $data['body']);

        return response()->json([
            'message' => $assignments->presentAssignmentMessage($message),
        ], 201)->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }
}

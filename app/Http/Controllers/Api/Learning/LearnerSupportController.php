<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherNote;
use App\Models\User;
use App\Services\Organisations\GroupMembershipService;
use App\Services\Teacher\TeacherAssignmentMessageAudioService;
use App\Services\Teacher\TeacherAssignmentService;
use App\Services\Teacher\TeacherDashboardService;
use App\Services\Teacher\TeacherDirectMessageService;
use App\Support\TeacherFeatures;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

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
            'recipient' => $assignments->presentRecipient($updated, false, null, null, null, (int) $user->id),
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
        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:2000'],
            'audio' => ['nullable', 'file', 'max:8192'],
            'duration_ms' => ['nullable', 'integer', 'between:1,120000'],
            'client_message_id' => ['nullable', 'uuid'],
        ]);

        $message = $assignments->addLearnerMessage(
            $user,
            $recipient,
            (string) ($data['body'] ?? ''),
            $request->file('audio'),
            isset($data['duration_ms']) ? (int) $data['duration_ms'] : null,
            $data['client_message_id'] ?? null,
        );

        return response()->json([
            'message' => $assignments->presentAssignmentMessage($message, (int) $user->id),
        ], 201)->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function storeTeacherMessage(Request $request, User $teacher, TeacherDirectMessageService $messages): JsonResponse
    {
        TeacherFeatures::abortUnlessEnabled();
        $student = $request->user();
        abort_unless($student instanceof User, 401);
        $data = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
            'client_message_id' => ['nullable', 'uuid'],
        ]);

        return response()->json(['message' => $messages->present($messages->send(
            $student,
            $teacher,
            $student,
            $data['body'],
            $data['client_message_id'] ?? null,
        ), $student)], 201)
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function teacherMessages(Request $request, User $teacher, TeacherDirectMessageService $messages): JsonResponse
    {
        TeacherFeatures::abortUnlessEnabled();
        $student = $request->user();
        abort_unless($student instanceof User, 401);

        return response()->json(['messages' => $messages->thread($teacher, $student, $student)])
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function assignmentMessageAudio(
        Request $request,
        TeacherNote $note,
        TeacherAssignmentMessageAudioService $audio,
    ): Response {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $response = $audio->stream($user, $note);
        if ($response === null) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        return $response;
    }
}

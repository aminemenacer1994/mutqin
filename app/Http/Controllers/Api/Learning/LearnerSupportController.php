<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherNote;
use App\Models\User;
use App\Services\Learning\LearnerConnectionGate;
use App\Services\Learning\StudentCircleService;
use App\Services\Organisations\GroupMembershipService;
use App\Services\Teacher\StudentSelfAssessmentService;
use App\Models\TeacherAssignmentAudioAsset;
use App\Services\Teacher\TeacherAssignmentInstructionAudioService;
use App\Services\Teacher\TeacherAssignmentMessageAudioService;
use App\Services\Teacher\TeacherAssignmentService;
use App\Services\Teacher\TeacherDashboardService;
use App\Services\Teacher\TeacherDirectMessageService;
use App\Support\TeacherFeatures;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
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

    public function assignment(Request $request, int $recipient, \App\Services\Learning\StudentAssignmentListService $list): JsonResponse
    {
        TeacherFeatures::abortUnlessEnabled();
        $student = $request->user();
        abort_unless($student instanceof User, 401);

        return response()->json(['assignment' => $list->detail($student, $recipient)])
            ->header('Cache-Control', 'private, no-store');
    }

    public function assignments(Request $request, \App\Services\Learning\StudentAssignmentListService $list): JsonResponse
    {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $filters = $request->validate([
            'status' => ['sometimes', Rule::in(['todo', 'progress', 'review', 'revision', 'completed'])],
            'category' => ['sometimes', Rule::in(['all', 'nazra', 'hifz', 'tajweed', 'revision'])],
            'due' => ['sometimes', Rule::in(['all', 'today', 'upcoming', 'overdue'])],
            'sort' => ['sometimes', Rule::in(['priority', 'due', 'recent'])],
            'teacher_id' => ['nullable', 'integer', 'min:1'],
            'search' => ['nullable', 'string', 'max:120'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:25'],
        ]);

        return response()->json($list->page($user, $filters))
            ->header('Cache-Control', 'private, no-store');
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

    public function rejectMembership(
        Request $request,
        GroupMembership $membership,
        GroupMembershipService $memberships,
        TeacherDashboardService $dashboard,
        StudentCircleService $circle,
    ): JsonResponse {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $memberships->reject($user, $membership);
        $user->refresh();

        if (app(LearnerConnectionGate::class)->connected($user)) {
            return response()->json($dashboard->learnerSupport($user))
                ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
        }

        return response()->json([
            'circle' => $circle->present($user),
        ])->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
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

        $data = $request->validate([
            'self_assessment' => ['nullable', 'array'],
            'self_assessment.feeling' => ['required_with:self_assessment', Rule::in(['easy', 'manageable', 'difficult', 'need_help'])],
            'self_assessment.comment' => ['nullable', 'string', 'max:500'],
            'self_assessment.note' => ['nullable', 'string', 'max:500'],
            'self_assessment.help_request' => ['nullable', 'string', 'max:500'],
            'self_assessment.confidence' => ['nullable', Rule::in(['low', 'steady', 'confident'])],
            'self_assessment.difficult_ayahs' => ['nullable', 'string', 'max:120'],
            'self_assessment.wants_revision' => ['nullable', 'boolean'],
        ]);

        $assignments->completeByStudent($user, $recipient);
        if (is_array($data['self_assessment'] ?? null)) {
            $assessment = $data['self_assessment'];
            $comment = trim((string) ($assessment['comment'] ?? ''));
            if ($comment !== '') {
                $assessment['note'] = $comment;
                $assessment['help_request'] = $comment;
            }
            app(StudentSelfAssessmentService::class)->record($user, array_merge(
                $assessment,
                ['teacher_assignment_recipient_id' => $recipient->id],
            ));
        }

        return response()->json($dashboard->learnerSupport($user))
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function storeSelfAssessment(Request $request, StudentSelfAssessmentService $reflections): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $data = $request->validate([
            'feeling' => ['required', Rule::in(['easy', 'manageable', 'difficult', 'need_help'])],
            'confidence' => ['nullable', Rule::in(['low', 'steady', 'confident'])],
            'help_request' => ['nullable', 'string', 'max:1000'],
            'difficult_ayahs' => ['nullable', 'string', 'max:120'],
            'wants_revision' => ['nullable', 'boolean'],
            'note' => ['nullable', 'string', 'max:1000'],
            'teacher_assignment_recipient_id' => ['nullable', 'integer'],
            'teacher_lesson_id' => ['nullable', 'integer'],
            'surah_number' => ['nullable', 'integer', 'between:1,114'],
            'ayah_start' => ['nullable', 'integer', 'min:1'],
            'ayah_end' => ['nullable', 'integer', 'min:1'],
        ]);

        return response()->json([
            'self_assessment' => $reflections->present($reflections->record($user, $data)),
        ])->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function assignmentMessages(Request $request, TeacherAssignmentRecipient $recipient, TeacherAssignmentService $assignments): JsonResponse
    {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $messages = $assignments->learnerAssignmentThread($user, $recipient);
        $unread = count(array_filter(
            $messages,
            fn (array $message) => ($message['sender'] ?? null) === 'teacher' && ($message['unread'] ?? false),
        ));

        return response()->json([
            'messages' => $messages,
            'thread_unread_count' => $unread,
        ])->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
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

        $data = $request->validate(['before' => ['nullable', 'integer', 'min:1']]);
        $rows = $messages->thread($teacher, $student, $student, true, isset($data['before']) ? (int) $data['before'] : null, 30);

        return response()->json(['messages' => $rows,
            'unread_count' => $messages->unreadForStudent($teacher, $request->user()), 'next_before' => count($rows) === 30 ? $rows[0]['id'] : null])
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

    public function assignmentInstructionAudio(
        Request $request,
        TeacherAssignmentAudioAsset $asset,
        TeacherAssignmentInstructionAudioService $audio,
    ): Response {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $response = $audio->stream($user, $asset);
        if ($response === null) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        return $response;
    }
}

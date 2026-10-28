<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\MemorisationPracticePlan;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\AiReciteAttempt;
use App\Models\TeacherRecitationAssessment;
use App\Models\User;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Services\Memorisation\LearningHistoryRetentionService;
use App\Services\Organisations\GroupMembershipService;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Services\Teacher\TeacherAssignmentService;
use App\Services\Teacher\TeacherAttendanceService;
use App\Services\Teacher\TeacherDirectMessageService;
use App\Services\Teacher\TeacherReportService;
use App\Services\Teacher\TeacherDashboardService;
use App\Support\TeacherFeatures;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TeacherDashboardController extends Controller
{
    public function overview(Request $request, TeacherDashboardService $dashboard): JsonResponse
    {
        $teacher = $this->teacher($request);
        $days = (int) $request->query('days', 30);

        return $this->json($dashboard->overview($teacher, $days));
    }

    public function students(Request $request, TeacherDashboardService $dashboard): JsonResponse
    {
        $teacher = $this->teacher($request);

        return $this->json($dashboard->students($teacher, $request->query()));
    }

    public function attendance(Request $request, TeacherAttendanceService $attendance): JsonResponse
    {
        $data = $request->validate([
            'group_id' => ['nullable', 'integer'],
            'week_start' => ['nullable', 'date_format:Y-m-d'],
            'month' => ['nullable', 'date_format:Y-m'],
        ]);

        $teacher = $this->teacher($request);
        if (! empty($data['month'])) {
            return $this->json($attendance->month($teacher, $data['group_id'] ?? null, $data['month']));
        }

        return $this->json($attendance->week($teacher, $data['group_id'] ?? null, $data['week_start'] ?? null));
    }

    public function setAttendance(Request $request, LearningGroup $group, User $student, TeacherAttendanceService $attendance): JsonResponse
    {
        $data = $request->validate([
            'date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'status' => ['required', Rule::in([...TeacherAttendanceService::STATUSES, 'clear'])],
        ]);
        $attendance->setStatus($this->teacher($request), $group, $student, $data['date'], $data['status']);

        return $this->json([
            'date' => $data['date'],
            'status' => $data['status'],
            'source' => 'teacher_recorded',
        ]);
    }

    public function show(Request $request, User $student, TeacherDashboardService $dashboard): JsonResponse
    {
        $teacher = $this->teacher($request);

        return $this->json($dashboard->profile($teacher, $student, (string) $request->query('section', 'overview')));
    }

    public function report(Request $request, User $student, TeacherReportService $reports): JsonResponse
    {
        $data = $request->validate([
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
        ]);

        return $this->json($reports->summary($this->teacher($request), $student, $data['from'] ?? null, $data['to'] ?? null));
    }

    public function studentMessages(Request $request, User $student, TeacherDirectMessageService $messages): JsonResponse
    {
        $teacher = $this->teacher($request);

        return $this->json(['messages' => $messages->thread($teacher, $student, $teacher)]);
    }

    public function sendStudentMessage(Request $request, User $student, TeacherDirectMessageService $messages): JsonResponse
    {
        $teacher = $this->teacher($request);
        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:2000'],
            'audio' => ['nullable', 'file', 'max:8192'],
            'duration_ms' => ['nullable', 'integer', 'between:1,120000'],
            'client_message_id' => ['nullable', 'uuid'],
        ]);

        return $this->json(['message' => $messages->present($messages->send(
            $teacher,
            $teacher,
            $student,
            (string) ($data['body'] ?? ''),
            $data['client_message_id'] ?? null,
            $request->file('audio'),
            isset($data['duration_ms']) ? (int) $data['duration_ms'] : null,
        ), $teacher)], 201);
    }

    public function deleteStudentMessage(Request $request, User $student, TeacherNote $note, TeacherDirectMessageService $messages): JsonResponse
    {
        $teacher = $this->teacher($request);
        abort_unless((int) $note->student_id === (int) $student->id, 404);
        $messages->delete($teacher, $student, (int) $note->id);

        return $this->json(['deleted' => true]);
    }

    public function deleteStudent(Request $request, User $student, StudentAccessAuthorizer $access, LearningHistoryRetentionService $retention): JsonResponse
    {
        $teacher = $this->teacher($request);
        abort_unless($access->allows($teacher, $student)
            && (int) $teacher->organisation_id === (int) $student->organisation_id
            && ! $student->hasPersistedAdminRole(), 404);
        $data = $request->validate(['confirmation' => ['required', 'string']]);
        abort_unless(hash_equals(mb_strtolower((string) $student->email), mb_strtolower(trim($data['confirmation']))), 422);

        $studentGroupIds = GroupMembership::query()
            ->where('user_id', $student->id)
            ->where('membership_role', MembershipRole::Student->value)
            ->where('status', MembershipStatus::Approved->value)
            ->pluck('learning_group_id');
        $otherTeacherExists = GroupMembership::query()
            ->whereIn('learning_group_id', $studentGroupIds)
            ->where('membership_role', MembershipRole::Teacher->value)
            ->where('status', MembershipStatus::Approved->value)
            ->where('user_id', '!=', $teacher->id)
            ->exists();
        abort_if($studentGroupIds->diff($access->teacherGroupIds($teacher))->isNotEmpty() || $otherTeacherExists, 409, 'This student belongs to another teacher. Ask an administrator to delete the account.');

        $retention->deleteUserAccount($student, $teacher);
        $retention->permanentlyDeleteUserAccount($student, $teacher);

        return $this->json(['deleted' => true]);
    }

    public function assessRecitation(Request $request, User $student, AiReciteAttempt $attempt, StudentAccessAuthorizer $access): JsonResponse
    {
        $teacher = $this->teacher($request);
        abort_unless($access->allows($teacher, $student) && (int) $attempt->user_id === (int) $student->id, 404);
        $data = $request->validate([
            'tajweed_score' => ['required', 'integer', 'between:1,5'],
            'annotation' => ['nullable', 'string', 'max:2000'],
        ]);
        $assessment = TeacherRecitationAssessment::query()
            ->where('teacher_id', $teacher->id)
            ->where('ai_recite_attempt_id', $attempt->id)
            ->first() ?: new TeacherRecitationAssessment;
        $assessment->forceFill([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'ai_recite_attempt_id' => $attempt->id,
            'tajweed_score' => $data['tajweed_score'],
            'annotation' => trim((string) ($data['annotation'] ?? '')) ?: null,
        ])->save();

        return $this->json(['assessment' => [
            'score' => (int) $assessment->tajweed_score,
            'annotation' => $assessment->annotation,
            'updated_at' => $assessment->updated_at?->toIso8601String(),
        ]]);
    }

    public function completeReview(Request $request, User $student, MemorisationPracticePlan $practicePlan, StudentAccessAuthorizer $access): JsonResponse
    {
        $teacher = $this->teacher($request);
        abort_unless($access->allows($teacher, $student) && (int) $practicePlan->user_id === (int) $student->id, 404);
        abort_unless($practicePlan->status === MemorisationPracticePlan::STATUS_ACTIVE, 409);

        MemorisationPracticePlan::query()
            ->where('user_id', $student->id)
            ->where('status', MemorisationPracticePlan::STATUS_ACTIVE)
            ->where('surah_number', $practicePlan->surah_number)
            ->where('start_ayah', $practicePlan->start_ayah)
            ->where('end_ayah', $practicePlan->end_ayah)
            ->where('practice_scope', $practicePlan->practice_scope)
            ->where('recommended_review_at', $practicePlan->recommended_review_at)
            ->update([
            'status' => MemorisationPracticePlan::STATUS_COMPLETED,
            'completed_at' => now(),
            'completion_outcome' => 'teacher_reviewed',
            ]);

        return $this->json(['id' => (int) $practicePlan->id, 'status' => MemorisationPracticePlan::STATUS_COMPLETED]);
    }

    public function groups(Request $request, TeacherDashboardService $dashboard): JsonResponse
    {
        return $this->json($dashboard->groups($this->teacher($request)));
    }

    public function storeGroup(Request $request, TeacherDashboardService $dashboard): JsonResponse
    {
        $teacher = $this->teacher($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
        ]);

        $group = $dashboard->createGroup($teacher, $data['name']);

        return $this->json($dashboard->group($teacher, $group), 201);
    }

    public function showGroup(Request $request, LearningGroup $group, TeacherDashboardService $dashboard): JsonResponse
    {
        return $this->json($dashboard->group($this->teacher($request), $group));
    }

    public function joinGroup(Request $request, LearningGroup $group, GroupMembershipService $memberships, TeacherDashboardService $dashboard): JsonResponse
    {
        $teacher = $this->teacher($request);
        $memberships->joinAsTeacher($teacher, $group);

        return $this->json($dashboard->group($teacher, $group));
    }

    public function approveMembership(Request $request, GroupMembership $membership, GroupMembershipService $memberships): JsonResponse
    {
        $updated = $memberships->teacherApprove($this->teacher($request), $membership);

        return $this->json(['id' => (int) $updated->id, 'status' => $updated->status->value]);
    }

    public function rejectMembership(Request $request, GroupMembership $membership, GroupMembershipService $memberships): JsonResponse
    {
        $updated = $memberships->teacherReject($this->teacher($request), $membership);

        return $this->json(['id' => (int) $updated->id, 'status' => $updated->status->value]);
    }

    public function removeMembership(Request $request, GroupMembership $membership, GroupMembershipService $memberships): JsonResponse
    {
        $updated = $memberships->teacherRemove($this->teacher($request), $membership);

        return $this->json(['id' => (int) $updated->id, 'status' => $updated->status->value]);
    }

    public function assignments(Request $request, TeacherAssignmentService $assignments, StudentAccessAuthorizer $access): JsonResponse
    {
        $teacher = $this->teacher($request);
        $ids = $access->authorizedStudentIds($teacher)->all();
        $assignments->refreshStatuses($teacher, $ids);

        $rows = TeacherAssignment::query()
            ->where('teacher_id', $teacher->id)
            ->whereHas('recipients', function ($query) use ($ids) {
                $query->whereIn('student_id', $ids === [] ? [0] : $ids);
            })
            ->with(['recipients' => function ($query) use ($ids) {
                $query->whereIn('student_id', $ids === [] ? [0] : $ids)->with('student:id,name');
            }, 'learningGroup:id,name', 'notes.teacher:id,name'])
            ->latest('id')
            ->get()
            ->map(function (TeacherAssignment $assignment) use ($assignments, $teacher) {
                return [
                    'assignment' => $assignments->presentAssignment($assignment),
                    'can_manage' => $assignments->canManage($assignment),
                    'group_name' => $assignment->learningGroup?->name,
                    'recipients' => $assignment->recipients->map(function ($recipient) use ($assignments, $teacher) {
                        $payload = $assignments->presentRecipient($recipient, true, null, null, null, (int) $teacher->id);
                        $payload['student_name'] = $recipient->student?->name;

                        return $payload;
                    })->values()->all(),
                ];
            })->all();

        return $this->json(['data' => $rows]);
    }

    public function storeAssignment(Request $request, TeacherAssignmentService $assignments): JsonResponse
    {
        $teacher = $this->teacher($request);
        $data = $request->validate([
            'kind' => ['required', Rule::in(['practice', 'ai_recite'])],
            'hifz_category' => ['required', Rule::in(['sabaq', 'sabqi', 'manzil'])],
            'surah_number' => ['required', 'integer', 'between:1,114'],
            'ayah_start' => ['required', 'integer', 'min:1'],
            'ayah_end' => ['required', 'integer', 'min:1'],
            'repetition_target' => ['nullable', 'integer', 'between:1,50'],
            'due_at' => ['required', 'date'],
            'feedback' => ['nullable', 'string', 'max:2000'],
            'student_id' => ['nullable', 'integer', 'required_without:learning_group_id'],
            'learning_group_id' => ['nullable', 'integer', 'required_without:student_id'],
        ]);

        $assignment = $assignments->create($teacher, $data);

        return $this->json([
            'assignment' => $assignments->presentAssignment($assignment),
            'recipients' => $assignment->recipients->map(fn ($recipient) => $assignments->presentRecipient($recipient->setRelation('assignment', $assignment)))->values()->all(),
        ], 201);
    }

    public function updateAssignment(Request $request, TeacherAssignment $assignment, TeacherAssignmentService $assignments): JsonResponse
    {
        $teacher = $this->teacher($request);
        $data = $request->validate([
            'kind' => ['required', Rule::in(['practice', 'ai_recite'])],
            'hifz_category' => ['required', Rule::in(['sabaq', 'sabqi', 'manzil'])],
            'surah_number' => ['required', 'integer', 'between:1,114'],
            'ayah_start' => ['required', 'integer', 'min:1'],
            'ayah_end' => ['required', 'integer', 'min:1'],
            'repetition_target' => ['nullable', 'integer', 'between:1,50'],
            'due_at' => ['required', 'date'],
            'feedback' => ['nullable', 'string', 'max:2000'],
        ]);

        return $this->json(['assignment' => $assignments->presentAssignment($assignments->update($teacher, $assignment, $data))]);
    }

    public function destroyAssignment(Request $request, TeacherAssignment $assignment, TeacherAssignmentService $assignments): JsonResponse
    {
        $assignments->remove($this->teacher($request), $assignment);

        return $this->json(['removed' => true]);
    }

    public function storeAssignmentMessage(Request $request, TeacherAssignmentRecipient $recipient, TeacherAssignmentService $assignments): JsonResponse
    {
        $teacher = $this->teacher($request);
        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:2000'],
            'audio' => ['nullable', 'file', 'max:8192'],
            'duration_ms' => ['nullable', 'integer', 'between:1,120000'],
            'client_message_id' => ['nullable', 'uuid'],
        ]);
        $message = $assignments->addTeacherMessage(
            $teacher,
            $recipient,
            (string) ($data['body'] ?? ''),
            $request->file('audio'),
            isset($data['duration_ms']) ? (int) $data['duration_ms'] : null,
            $data['client_message_id'] ?? null,
        );

        return $this->json([
            'message' => $assignments->presentAssignmentMessage($message->loadMissing('teacher:id,name'), (int) $teacher->id),
        ], 201);
    }

    public function approveAssignmentRecipient(Request $request, TeacherAssignmentRecipient $recipient, TeacherAssignmentService $assignments): JsonResponse
    {
        $teacher = $this->teacher($request);
        $updated = $assignments->approveByTeacher($teacher, $recipient);

        return $this->json([
            'recipient' => $assignments->presentRecipient($updated, false, null, null, null, (int) $teacher->id),
        ]);
    }

    public function requestAssignmentCorrection(Request $request, TeacherAssignmentRecipient $recipient, TeacherAssignmentService $assignments): JsonResponse
    {
        $teacher = $this->teacher($request);
        $data = $request->validate([
            'note' => ['nullable', 'string', 'max:2000'],
        ]);
        $updated = $assignments->requestCorrectionByTeacher($teacher, $recipient, $data['note'] ?? null);

        return $this->json([
            'recipient' => $assignments->presentRecipient($updated, false, null, null, null, (int) $teacher->id),
        ]);
    }

    public function storeNote(Request $request, User $student, TeacherDashboardService $dashboard): JsonResponse
    {
        $teacher = $this->teacher($request);
        $data = $request->validate([
            'kind' => ['required', Rule::in(['note', 'feedback'])],
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $note = $dashboard->addNote($teacher, $student, $data['kind'], $data['body']);

        return $this->json([
            'id' => (int) $note->id,
            'kind' => $note->kind->value,
            'body' => $note->body,
            'created_at' => $note->created_at?->toIso8601String(),
        ], 201);
    }

    private function teacher(Request $request): User
    {
        TeacherFeatures::abortUnlessEnabled();

        $user = $request->user();
        abort_unless($user instanceof User && $user->isTeacher(), 403);

        return $user;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function json(array $payload, int $status = 200): JsonResponse
    {
        return response()->json($payload, $status)
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }
}

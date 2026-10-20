<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\TeacherAssignment;
use App\Models\User;
use App\Services\Organisations\GroupMembershipService;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Services\Teacher\TeacherAssignmentService;
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

    public function show(Request $request, User $student, TeacherDashboardService $dashboard): JsonResponse
    {
        $teacher = $this->teacher($request);

        return $this->json($dashboard->profile($teacher, $student, (string) $request->query('section', 'overview')));
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
            ->with(['recipients' => function ($query) use ($ids) {
                $query->whereIn('student_id', $ids === [] ? [0] : $ids)->with('student:id,name');
            }, 'learningGroup:id,name'])
            ->latest('id')
            ->limit(50)
            ->get()
            ->map(function (TeacherAssignment $assignment) use ($assignments) {
                return [
                    'assignment' => $assignments->presentAssignment($assignment),
                    'group_name' => $assignment->learningGroup?->name,
                    'recipients' => $assignment->recipients->map(function ($recipient) use ($assignments) {
                        $payload = $assignments->presentRecipient($recipient, true);
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
            'surah_number' => ['required', 'integer', 'between:1,114'],
            'ayah_start' => ['required', 'integer', 'min:1'],
            'ayah_end' => ['required', 'integer', 'min:1'],
            'repetition_target' => ['nullable', 'integer', 'between:1,50'],
            'due_at' => ['nullable', 'date'],
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

<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\TeacherNoteKind;
use App\Enums\TeacherPrivateNoteCategory;
use App\Http\Controllers\Controller;
use App\Models\AiReciteAttempt;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\LearningPlan;
use App\Models\LearningPlanItem;
use App\Models\LearningPlanTemplate;
use App\Models\MemorisationPracticePlan;
use App\Models\MemorisationWeakSpot;
use App\Models\RevisionRecommendation;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherNote;
use App\Models\TeacherPrivateNote;
use App\Models\User;
use App\Services\Memorisation\LearningHistoryRetentionService;
use App\Services\Organisations\GroupMembershipService;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Services\Teacher\LearningPlanService;
use App\Services\Teacher\RecitationDifficultyService;
use App\Services\Teacher\RevisionRecommendationService;
use App\Services\Teacher\TeacherAssignmentMessageAudioService;
use App\Services\Teacher\TeacherAssignmentService;
use App\Services\Teacher\TeacherAttendanceService;
use App\Services\Teacher\TeacherDashboardService;
use App\Services\Teacher\TeacherDirectMessageService;
use App\Services\Teacher\TeacherPrivateNoteService;
use App\Services\Teacher\TeacherRecitationPlaybackService;
use App\Services\Teacher\TeacherReportService;
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
            'student_id' => ['nullable', 'integer'],
        ]);

        $teacher = $this->teacher($request);
        $studentId = isset($data['student_id']) ? (int) $data['student_id'] : null;
        if (! empty($data['month'])) {
            return $this->json($attendance->month($teacher, $data['group_id'] ?? null, $data['month'], $studentId));
        }

        return $this->json($attendance->week($teacher, $data['group_id'] ?? null, $data['week_start'] ?? null, $studentId));
    }

    public function scheduleLesson(Request $request, LearningGroup $group, TeacherAttendanceService $attendance): JsonResponse
    {
        $data = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'title' => ['nullable', 'string', 'max:120'],
        ]);
        $lesson = $attendance->schedule($this->teacher($request), $group, $data['date'], $data['title'] ?? null);

        return $this->json([
            'id' => (int) $lesson->id,
            'date' => $lesson->lesson_date->toDateString(),
            'title' => $lesson->title,
            'group_id' => (int) $lesson->learning_group_id,
        ], 201);
    }

    public function setAttendance(Request $request, LearningGroup $group, User $student, TeacherAttendanceService $attendance): JsonResponse
    {
        $data = $request->validate([
            'date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'status' => ['required', Rule::in([...TeacherAttendanceService::STATUSES, 'clear'])],
            'notes' => ['nullable', 'string', 'max:'.TeacherAttendanceService::NOTES_MAX],
        ]);
        $record = $attendance->setStatus(
            $this->teacher($request),
            $group,
            $student,
            $data['date'],
            $data['status'],
            array_key_exists('notes', $data) ? ($data['notes'] ?? '') : null,
        );

        return $this->json([
            'date' => $data['date'],
            'status' => $data['status'],
            'notes' => $record?->notes,
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

    public function assessRecitation(Request $request, User $student, AiReciteAttempt $attempt, TeacherRecitationPlaybackService $playback): JsonResponse
    {
        $data = $request->validate([
            'tajweed_score' => ['nullable', 'integer', 'between:1,5', 'required_without_all:memorisation,tajweed,pronunciation,fluency,general'],
            'annotation' => ['nullable', 'string', 'max:2000'],
            'general' => ['nullable', 'string', 'max:2000'],
            'memorisation' => ['nullable', 'array'],
            'memorisation.rating' => ['nullable', 'string', 'in:needs_work,sound,strong'],
            'memorisation.note' => ['nullable', 'string', 'max:2000'],
            'tajweed' => ['nullable', 'array'],
            'tajweed.rating' => ['nullable', 'string', 'in:needs_work,sound,strong'],
            'tajweed.note' => ['nullable', 'string', 'max:2000'],
            'pronunciation' => ['nullable', 'array'],
            'pronunciation.rating' => ['nullable', 'string', 'in:needs_work,sound,strong'],
            'pronunciation.note' => ['nullable', 'string', 'max:2000'],
            'fluency' => ['nullable', 'array'],
            'fluency.rating' => ['nullable', 'string', 'in:needs_work,sound,strong'],
            'fluency.note' => ['nullable', 'string', 'max:2000'],
            'heard_live' => ['sometimes', 'boolean'],
        ]);

        return $this->json($playback->storeAssessment($this->teacher($request), $student, $attempt, $data));
    }

    public function completeReview(Request $request, User $student, MemorisationPracticePlan $practicePlan, StudentAccessAuthorizer $access): JsonResponse
    {
        $teacher = $this->teacher($request);
        abort_unless($access->allows($teacher, $student) && (int) $practicePlan->user_id === (int) $student->id, 404);
        abort_unless($practicePlan->status === MemorisationPracticePlan::STATUS_ACTIVE, 409);

        // The roster shows one row for an exact retry duplicate. Completing
        // that row closes every matching active copy, not only the id clicked.
        $duplicates = MemorisationPracticePlan::query()
            ->where('user_id', $student->id)
            ->where('status', MemorisationPracticePlan::STATUS_ACTIVE)
            ->where('surah_number', $practicePlan->surah_number)
            ->where('start_ayah', $practicePlan->start_ayah)
            ->where('end_ayah', $practicePlan->end_ayah);
        if ($practicePlan->recommended_review_at === null) {
            $duplicates->whereNull('recommended_review_at');
        } else {
            $duplicates->where('recommended_review_at', $practicePlan->recommended_review_at);
        }
        $scope = $practicePlan->practice_scope;
        if ($scope === null || $scope === '') {
            $duplicates->where(function ($query) {
                $query->whereNull('practice_scope')->orWhere('practice_scope', '');
            });
        } else {
            $duplicates->where('practice_scope', $scope);
        }
        $duplicates->update([
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
            'activity' => ['nullable', Rule::in(['nazra', 'hifz', 'tajweed', 'revision'])],
            'recording_required' => ['nullable', 'boolean'],
            'surah_number' => ['required', 'integer', 'between:1,114'],
            'ayah_start' => ['required', 'integer', 'min:1'],
            'ayah_end' => ['required', 'integer', 'min:1'],
            'repetition_target' => ['nullable', 'integer', 'between:1,50'],
            'due_at' => ['required', 'date'],
            'priority' => ['nullable', Rule::in(['low', 'normal', 'high'])],
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
            'activity' => ['nullable', Rule::in(['nazra', 'hifz', 'tajweed', 'revision'])],
            'recording_required' => ['nullable', 'boolean'],
            'surah_number' => ['required', 'integer', 'between:1,114'],
            'ayah_start' => ['required', 'integer', 'min:1'],
            'ayah_end' => ['required', 'integer', 'min:1'],
            'repetition_target' => ['nullable', 'integer', 'between:1,50'],
            'due_at' => ['required', 'date'],
            'priority' => ['nullable', Rule::in(['low', 'normal', 'high'])],
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
            'body' => ['nullable', 'string', 'max:2000'],
            'audio' => ['nullable', 'file', 'max:8192'],
            'duration_ms' => ['nullable', 'integer', 'between:1,120000'],
            'surah_number' => ['nullable', 'integer', 'between:1,114'],
            'ayah_start' => ['nullable', 'integer', 'min:1'],
            'ayah_end' => ['nullable', 'integer', 'min:1'],
            'teacher_assignment_id' => ['nullable', 'integer'],
        ]);

        $note = $dashboard->addNote(
            $teacher,
            $student,
            $data['kind'],
            (string) ($data['body'] ?? ''),
            $request->file('audio'),
            isset($data['duration_ms']) ? (int) $data['duration_ms'] : null,
            isset($data['surah_number']) ? (int) $data['surah_number'] : null,
            isset($data['ayah_start']) ? (int) $data['ayah_start'] : null,
            isset($data['ayah_end']) ? (int) $data['ayah_end'] : null,
            isset($data['teacher_assignment_id']) ? (int) $data['teacher_assignment_id'] : null,
        );

        $audio = app(TeacherAssignmentMessageAudioService::class)->payload($note);

        return $this->json([
            'id' => (int) $note->id,
            'kind' => $note->kind instanceof TeacherNoteKind ? $note->kind->value : (string) $note->kind,
            'body' => $note->body,
            'audio' => $audio,
            'passage' => $note->surah_number ? [
                'surah_number' => (int) $note->surah_number,
                'ayah_start' => (int) $note->ayah_start,
                'ayah_end' => (int) ($note->ayah_end ?: $note->ayah_start),
            ] : null,
            'created_at' => $note->created_at?->toIso8601String(),
        ], 201);
    }

    public function privateNotes(Request $request, User $student, TeacherPrivateNoteService $notes): JsonResponse
    {
        return $this->json($notes->listForStudent($this->teacher($request), $student, $request->query()));
    }

    public function storePrivateNote(Request $request, User $student, TeacherPrivateNoteService $notes): JsonResponse
    {
        $data = $request->validate([
            'category' => ['required', Rule::in(TeacherPrivateNoteCategory::values())],
            'body' => ['required', 'string', 'max:'.TeacherPrivateNoteService::BODY_MAX],
            'pinned' => ['nullable', 'boolean'],
            'surah_number' => ['nullable', 'integer', 'between:1,114'],
            'ayah_start' => ['nullable', 'integer', 'min:1'],
            'ayah_end' => ['nullable', 'integer', 'min:1'],
            'teacher_assignment_id' => ['nullable', 'integer'],
        ]);

        $note = $notes->create($this->teacher($request), $student, $data);

        return $this->json(['note' => $notes->present($note)], 201);
    }

    public function updatePrivateNote(
        Request $request,
        User $student,
        TeacherPrivateNote $privateNote,
        TeacherPrivateNoteService $notes,
    ): JsonResponse {
        $this->assertPrivateNoteStudent($student, $privateNote);

        $data = $request->validate([
            'category' => ['sometimes', Rule::in(TeacherPrivateNoteCategory::values())],
            'body' => ['sometimes', 'string', 'max:'.TeacherPrivateNoteService::BODY_MAX],
            'pinned' => ['sometimes', 'boolean'],
            'surah_number' => ['nullable', 'integer', 'between:1,114'],
            'ayah_start' => ['nullable', 'integer', 'min:1'],
            'ayah_end' => ['nullable', 'integer', 'min:1'],
            'teacher_assignment_id' => ['nullable', 'integer'],
        ]);

        $note = $notes->update($this->teacher($request), $privateNote, $data);

        return $this->json(['note' => $notes->present($note)]);
    }

    public function destroyPrivateNote(
        Request $request,
        User $student,
        TeacherPrivateNote $privateNote,
        TeacherPrivateNoteService $notes,
    ): JsonResponse {
        $this->assertPrivateNoteStudent($student, $privateNote);
        $notes->delete($this->teacher($request), $privateNote);

        return $this->json(['deleted' => true]);
    }

    public function archivePrivateNote(
        Request $request,
        User $student,
        TeacherPrivateNote $privateNote,
        TeacherPrivateNoteService $notes,
    ): JsonResponse {
        $this->assertPrivateNoteStudent($student, $privateNote);
        $note = $notes->archive($this->teacher($request), $privateNote);

        return $this->json(['note' => $notes->present($note)]);
    }

    public function unarchivePrivateNote(
        Request $request,
        User $student,
        TeacherPrivateNote $privateNote,
        TeacherPrivateNoteService $notes,
    ): JsonResponse {
        $this->assertPrivateNoteStudent($student, $privateNote);
        $note = $notes->unarchive($this->teacher($request), $privateNote);

        return $this->json(['note' => $notes->present($note)]);
    }

    public function sharePrivateNote(
        Request $request,
        User $student,
        TeacherPrivateNote $privateNote,
        TeacherPrivateNoteService $notes,
    ): JsonResponse {
        $this->assertPrivateNoteStudent($student, $privateNote);
        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:2000'],
        ]);
        $note = $notes->shareWithStudent(
            $this->teacher($request),
            $privateNote,
            array_key_exists('body', $data) ? (string) $data['body'] : null,
        );

        return $this->json(['note' => $notes->present($note)], 201);
    }

    public function destroyAssignmentMessage(Request $request, TeacherNote $note, TeacherAssignmentService $assignments): JsonResponse
    {
        $teacher = $this->teacher($request);
        $assignments->deleteTeacherMessage($teacher, $note);

        return $this->json(['removed' => true]);
    }

    public function recitationDifficultyQueue(Request $request, RecitationDifficultyService $difficulties): JsonResponse
    {
        $teacher = $this->teacher($request);

        return $this->json(['data' => $difficulties->reviewQueue($teacher, (int) $request->integer('limit', 12))]);
    }

    public function studentRecitationDifficulties(Request $request, User $student, RecitationDifficultyService $difficulties): JsonResponse
    {
        $teacher = $this->teacher($request);
        $page = $difficulties->listForStudent(
            $teacher,
            $student,
            (int) $request->integer('per_page', 20),
            $request->query('state'),
            $request->query('review'),
            true,
        );

        return $this->json([
            'summary' => $difficulties->studentSummary($teacher, $student)['counts'],
            'data' => $page->items(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function showStudentRecitationDifficulty(
        Request $request,
        User $student,
        MemorisationWeakSpot $spot,
        RecitationDifficultyService $difficulties,
    ): JsonResponse {
        $teacher = $this->teacher($request);

        return $this->json(['difficulty' => $difficulties->show($teacher, $student, $spot, true)]);
    }

    public function reviewStudentRecitationDifficulty(
        Request $request,
        User $student,
        MemorisationWeakSpot $spot,
        RecitationDifficultyService $difficulties,
    ): JsonResponse {
        $teacher = $this->teacher($request);
        $data = $request->validate([
            'status' => ['required', Rule::in(['confirmed', 'dismissed', 'clear'])],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        return $this->json(['difficulty' => $difficulties->review($teacher, $student, $spot, $data)]);
    }

    public function learningPlans(Request $request, LearningPlanService $plans): JsonResponse
    {
        $teacher = $this->teacher($request);
        $studentId = $request->query('student_id') ? (int) $request->query('student_id') : null;

        return $this->json(['data' => $plans->listForTeacher($teacher, $studentId)]);
    }

    public function storeLearningPlan(Request $request, LearningPlanService $plans): JsonResponse
    {
        $teacher = $this->teacher($request);
        $data = $request->validate([
            'student_id' => ['required', 'integer'],
            'title' => ['required', 'string', 'max:160'],
            'cadence' => ['nullable', Rule::in(['weekly', 'monthly', 'custom'])],
            'starts_on' => ['nullable', 'date'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'student_goal' => ['nullable', 'string', 'max:500'],
            'source_template_id' => ['nullable', 'integer'],
            'activate' => ['nullable', 'boolean'],
            'allow_duplicate' => ['nullable', 'boolean'],
            'items' => ['nullable', 'array'],
            'items.*.kind' => ['required_with:items', Rule::in(['practice', 'ai_recite', 'teacher_review'])],
            'items.*.activity' => ['nullable', Rule::in(['nazra', 'hifz', 'tajweed', 'revision', 'sabqi', 'manzil', 'ai_recite'])],
            'items.*.hifz_category' => ['nullable', Rule::in(['sabaq', 'sabqi', 'manzil'])],
            'items.*.surah_number' => ['required_with:items', 'integer', 'between:1,114'],
            'items.*.ayah_start' => ['required_with:items', 'integer', 'min:1'],
            'items.*.ayah_end' => ['required_with:items', 'integer', 'min:1'],
            'items.*.repetition_target' => ['nullable', 'integer', 'between:1,50'],
            'items.*.due_on' => ['nullable', 'date'],
            'items.*.priority' => ['nullable', Rule::in(['low', 'normal', 'high'])],
            'items.*.instructions' => ['nullable', 'string', 'max:2000'],
            'items.*.origin' => ['nullable', Rule::in(['assigned', 'suggested'])],
            'items.*.weak_spot_id' => ['nullable', 'integer'],
            'items.*.is_milestone' => ['nullable', 'boolean'],
        ]);

        $plan = $plans->createPlan($teacher, $data);

        return $this->json(['plan' => $plans->presentPlan($plan)], 201);
    }

    public function updateLearningPlan(Request $request, LearningPlan $plan, LearningPlanService $plans): JsonResponse
    {
        $teacher = $this->teacher($request);
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:160'],
            'cadence' => ['nullable', Rule::in(['weekly', 'monthly', 'custom'])],
            'starts_on' => ['nullable', 'date'],
            'ends_on' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'student_goal' => ['nullable', 'string', 'max:500'],
            'status' => ['nullable', Rule::in(['draft', 'active', 'paused', 'completed', 'archived'])],
            'items' => ['nullable', 'array'],
            'items.*.kind' => ['required_with:items', Rule::in(['practice', 'ai_recite', 'teacher_review'])],
            'items.*.activity' => ['nullable', Rule::in(['nazra', 'hifz', 'tajweed', 'revision', 'sabqi', 'manzil', 'ai_recite'])],
            'items.*.hifz_category' => ['nullable', Rule::in(['sabaq', 'sabqi', 'manzil'])],
            'items.*.surah_number' => ['required_with:items', 'integer', 'between:1,114'],
            'items.*.ayah_start' => ['required_with:items', 'integer', 'min:1'],
            'items.*.ayah_end' => ['required_with:items', 'integer', 'min:1'],
            'items.*.repetition_target' => ['nullable', 'integer', 'between:1,50'],
            'items.*.due_on' => ['nullable', 'date'],
            'items.*.priority' => ['nullable', Rule::in(['low', 'normal', 'high'])],
            'items.*.instructions' => ['nullable', 'string', 'max:2000'],
            'items.*.origin' => ['nullable', Rule::in(['assigned', 'suggested'])],
            'items.*.id' => ['nullable', 'integer'],
            'items.*.is_milestone' => ['nullable', 'boolean'],
        ]);
        $updated = $plans->updatePlan($teacher, $plan, $data);

        return $this->json(['plan' => $plans->presentPlan($updated)]);
    }

    public function setLearningPlanStatus(Request $request, LearningPlan $plan, LearningPlanService $plans): JsonResponse
    {
        $teacher = $this->teacher($request);
        $data = $request->validate([
            'status' => ['required', Rule::in(['draft', 'active', 'paused', 'completed', 'archived'])],
        ]);

        return $this->json(['plan' => $plans->presentPlan($plans->setStatus($teacher, $plan, $data['status']))]);
    }

    public function approveLearningPlanItem(Request $request, LearningPlanItem $item, LearningPlanService $plans): JsonResponse
    {
        $teacher = $this->teacher($request);

        return $this->json(['item' => $plans->presentItem($plans->approveSuggestion($teacher, $item))]);
    }

    public function skipLearningPlanItem(Request $request, LearningPlanItem $item, LearningPlanService $plans): JsonResponse
    {
        $teacher = $this->teacher($request);

        return $this->json(['item' => $plans->presentItem($plans->skipItem($teacher, $item))]);
    }

    public function learningPlanSuggestions(Request $request, User $student, LearningPlanService $plans): JsonResponse
    {
        $teacher = $this->teacher($request);

        return $this->json(['suggestions' => $plans->suggestFromWeakSpots($teacher, $student)]);
    }

    public function learningPlanTemplates(Request $request, LearningPlanService $plans): JsonResponse
    {
        $teacher = $this->teacher($request);

        return $this->json(['data' => $plans->listTemplates($teacher)]);
    }

    public function storeLearningPlanTemplate(Request $request, LearningPlanService $plans): JsonResponse
    {
        $teacher = $this->teacher($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'cadence' => ['nullable', Rule::in(['weekly', 'monthly'])],
            'is_shared' => ['nullable', 'boolean'],
            'items' => ['nullable', 'array'],
            'items.*.kind' => ['required_with:items', Rule::in(['practice', 'ai_recite', 'teacher_review'])],
            'items.*.activity' => ['nullable', Rule::in(['nazra', 'hifz', 'tajweed', 'revision', 'sabqi', 'manzil', 'ai_recite'])],
            'items.*.hifz_category' => ['nullable', Rule::in(['sabaq', 'sabqi', 'manzil'])],
            'items.*.surah_number' => ['required_with:items', 'integer', 'between:1,114'],
            'items.*.ayah_start' => ['required_with:items', 'integer', 'min:1'],
            'items.*.ayah_end' => ['required_with:items', 'integer', 'min:1'],
            'items.*.repetition_target' => ['nullable', 'integer', 'between:1,50'],
            'items.*.day_offset' => ['nullable', 'integer', 'min:0', 'max:60'],
            'items.*.priority' => ['nullable', Rule::in(['low', 'normal', 'high'])],
            'items.*.instructions' => ['nullable', 'string', 'max:2000'],
        ]);

        $template = $plans->saveTemplate($teacher, $data);

        return $this->json(['template' => $plans->presentTemplate($template)], 201);
    }

    public function applyLearningPlanTemplate(Request $request, LearningPlanTemplate $template, LearningPlanService $plans): JsonResponse
    {
        $teacher = $this->teacher($request);
        $data = $request->validate([
            'student_id' => ['required', 'integer'],
            'starts_on' => ['nullable', 'date'],
        ]);
        $plan = $plans->createFromTemplate($teacher, $template, (int) $data['student_id'], $data['starts_on'] ?? null);

        return $this->json(['plan' => $plans->presentPlan($plan)], 201);
    }

    public function rescheduleLearningPlanItem(Request $request, LearningPlanItem $item, LearningPlanService $plans): JsonResponse
    {
        $teacher = $this->teacher($request);
        $data = $request->validate([
            'due_on' => ['required', 'date'],
        ]);

        return $this->json(['item' => $plans->presentItem($plans->rescheduleItem($teacher, $item, $data['due_on']))]);
    }

    public function revisionRecommendations(Request $request, User $student, RevisionRecommendationService $recommendations): JsonResponse
    {
        $teacher = $this->teacher($request);

        return $this->json(['recommendations' => $recommendations->syncAndList($teacher, $student)]);
    }

    public function updateRevisionRecommendation(Request $request, RevisionRecommendation $recommendation, RevisionRecommendationService $recommendations): JsonResponse
    {
        $teacher = $this->teacher($request);
        $data = $request->validate([
            'activity' => ['sometimes', Rule::in(['nazra', 'hifz', 'tajweed', 'revision'])],
            'surah_number' => ['sometimes', 'integer', 'between:1,114'],
            'ayah_start' => ['sometimes', 'integer', 'min:1'],
            'ayah_end' => ['sometimes', 'integer', 'min:1'],
            'due_on' => ['nullable', 'date'],
            'instructions' => ['nullable', 'string', 'max:2000'],
        ]);

        return $this->json(['recommendation' => $recommendations->present($recommendations->update($teacher, $recommendation, $data))]);
    }

    public function acceptRevisionRecommendation(Request $request, RevisionRecommendation $recommendation, RevisionRecommendationService $recommendations): JsonResponse
    {
        $teacher = $this->teacher($request);

        return $this->json(['recommendation' => $recommendations->present($recommendations->accept($teacher, $recommendation))]);
    }

    public function dismissRevisionRecommendation(Request $request, RevisionRecommendation $recommendation, RevisionRecommendationService $recommendations): JsonResponse
    {
        $teacher = $this->teacher($request);

        return $this->json(['recommendation' => $recommendations->present($recommendations->dismiss($teacher, $recommendation))]);
    }

    public function assignRevisionRecommendation(Request $request, RevisionRecommendation $recommendation, RevisionRecommendationService $recommendations): JsonResponse
    {
        $teacher = $this->teacher($request);

        return $this->json(['recommendation' => $recommendations->present($recommendations->assign($teacher, $recommendation))]);
    }

    private function teacher(Request $request): User
    {
        TeacherFeatures::abortUnlessEnabled();

        $user = $request->user();
        abort_unless($user instanceof User && $user->isTeacher(), 403);

        return $user;
    }

    private function assertPrivateNoteStudent(User $student, TeacherPrivateNote $privateNote): void
    {
        abort_unless((int) $privateNote->student_id === (int) $student->id, 404);
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

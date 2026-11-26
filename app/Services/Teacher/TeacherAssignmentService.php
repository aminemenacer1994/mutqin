<?php

namespace App\Services\Teacher;

use App\Enums\AssignmentKind;
use App\Enums\AssignmentStatus;
use App\Enums\LearningPlanItemStatus;
use App\Enums\LearningPlanStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\RevisionReminderPriority;
use App\Enums\TeacherNoteKind;
use App\Enums\UserSessionStatus;
use App\Models\AiReciteAttempt;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\LearningPlan;
use App\Models\LearningPlanItem;
use App\Models\MemorisationAssessment;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherNote;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Learning\AiReciteAttemptAudioService;
use App\Services\Teacher\TeacherRecitationFeedbackSegmentService;
use App\Services\Learning\LearningTaskNotifier;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Services\RevisionReminders\RevisionReminderSyncService;
use App\Support\AssignmentDisplayStatus;
use App\Support\AssignmentListeningSettings;
use App\Support\AssignmentProgressiveHidingSettings;
use App\Support\AssignmentRecipientLifecycle;
use App\Support\LearnerCompletionAttempt;
use App\Support\TeacherOverviewCache;
use App\Support\QuranMetadata;
use App\Support\TeacherFeatures;
use App\Support\TeacherRecitationWordEvidence;
use App\Support\TeacherTaskState;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TeacherAssignmentService
{
    public function __construct(
        private readonly StudentAccessAuthorizer $access,
        private readonly TeacherAssignmentMessageAudioService $messageAudio,
        private readonly AiReciteAttemptAudioService $attemptAudio,
        private readonly TeacherRecitationFeedbackSegmentService $feedbackSegments,
    ) {}

    /**
     * @param  array<string, mixed>  $input
     */
    public function create(User $teacher, array $input): TeacherAssignment
    {
        TeacherFeatures::abortUnlessEnabled();

        if (! $teacher->isTeacher() || $teacher->organisation_id === null) {
            throw ValidationException::withMessages([
                'teacher' => 'Only a teacher can assign practice.',
            ]);
        }

        $kind = AssignmentKind::tryFrom((string) ($input['kind'] ?? ''));
        $surah = (int) ($input['surah_number'] ?? 0);
        $start = (int) ($input['ayah_start'] ?? 0);
        $end = (int) ($input['ayah_end'] ?? 0);
        $ayahCount = QuranMetadata::ayahCount($surah);
        if ($kind === null || $ayahCount === null || $start < 1 || $end < $start || $end > $ayahCount) {
            throw ValidationException::withMessages([
                'ayah_end' => 'Choose a surah and an ayah range that exists.',
            ]);
        }

        $studentId = isset($input['student_id']) ? (int) $input['student_id'] : null;
        $groupId = isset($input['learning_group_id']) ? (int) $input['learning_group_id'] : null;
        if (($studentId === null) === ($groupId === null)) {
            throw ValidationException::withMessages([
                'student_id' => 'Choose one student or one group.',
            ]);
        }

        $authorized = $this->access->authorizedStudentIds($teacher);
        $recipients = $studentId !== null
            ? $this->individualRecipients($teacher, $studentId, $authorized)
            : $this->groupRecipients($teacher, (int) $groupId, $authorized);

        if ($recipients->isEmpty()) {
            throw ValidationException::withMessages([
                'learning_group_id' => 'No students in this group have approved practice sharing.',
            ]);
        }

        [$activity, $recordingRequired, $kind] = $this->coachingActivity($input, $kind);
        $duplicateExists = TeacherAssignmentRecipient::query()
            ->whereIn('student_id', $recipients)
            ->whereNotIn('status', [
                AssignmentStatus::Completed->value,
                AssignmentStatus::Cancelled->value,
            ])
            ->whereHas('assignment', function ($query) use ($teacher, $kind, $input, $surah, $start, $end, $activity) {
                $query->where('teacher_id', $teacher->id)
                    ->where('kind', $kind->value)
                    ->where('hifz_category', (string) $input['hifz_category'])
                    ->when(
                        $activity === null,
                        fn ($inner) => $inner->whereNull('activity'),
                        fn ($inner) => $inner->where('activity', $activity),
                    )
                    ->where('surah_number', $surah)
                    ->where('ayah_start', $start)
                    ->where('ayah_end', $end);
            })
            ->exists();
        if ($duplicateExists && empty($input['allow_duplicate'])) {
            throw ValidationException::withMessages([
                'assignment' => 'This student already has an unresolved task for the same passage and action.',
            ]);
        }

        $target = $input['repetition_target'] ?? null;
        $target = $target === null || $target === '' ? null : (int) $target;
        if ($target !== null && ($target < 1 || $target > 50)) {
            throw ValidationException::withMessages([
                'repetition_target' => 'Repetition target must be between 1 and 50.',
            ]);
        }

        $priority = RevisionReminderPriority::normalise($input['priority'] ?? 'normal')->value;
        $sessionSettings = AssignmentListeningSettings::sanitize(
            array_key_exists('session_settings', $input) ? $input['session_settings'] : null
        );
        $sourceAttemptId = isset($input['source_ai_recite_attempt_id']) ? (int) $input['source_ai_recite_attempt_id'] : 0;
        if ($sourceAttemptId > 0) {
            $sourceOwned = $studentId !== null && AiReciteAttempt::query()
                ->whereKey($sourceAttemptId)
                ->where('user_id', $studentId)
                ->exists();
            if (! $sourceOwned) {
                throw ValidationException::withMessages([
                    'source_ai_recite_attempt_id' => 'The revision must follow this student\'s own recitation.',
                ]);
            }
        } else {
            $sourceAttemptId = null;
        }

        $created = DB::transaction(function () use ($teacher, $kind, $surah, $start, $end, $target, $input, $groupId, $recipients, $priority, $activity, $recordingRequired, $sourceAttemptId, $sessionSettings) {
            $assignment = new TeacherAssignment;
            $assignment->forceFill([
                'teacher_id' => $teacher->id,
                'organisation_id' => $teacher->organisation_id,
                'learning_group_id' => $groupId,
                'learning_plan_id' => isset($input['learning_plan_id']) ? (int) $input['learning_plan_id'] : null,
                'learning_plan_item_id' => isset($input['learning_plan_item_id']) ? (int) $input['learning_plan_item_id'] : null,
                'kind' => $kind->value,
                'hifz_category' => $input['hifz_category'],
                'activity' => $activity,
                'recording_required' => $recordingRequired,
                'surah_number' => $surah,
                'ayah_start' => $start,
                'ayah_end' => $end,
                'repetition_target' => $target,
                'due_at' => $input['due_at'] ?? null,
                'priority' => $priority,
                'feedback' => $this->nullableText($input['feedback'] ?? null),
                'session_settings' => $sessionSettings,
                'source_ai_recite_attempt_id' => $sourceAttemptId,
            ])->save();

            foreach ($recipients as $studentId) {
                $recipient = new TeacherAssignmentRecipient;
                $recipient->forceFill([
                    'teacher_assignment_id' => $assignment->id,
                    'student_id' => $studentId,
                    'status' => AssignmentStatus::Pending->value,
                ])->save();
            }

            $loaded = $assignment->load('recipients');
            $this->syncRevisionRemindersForAssignment($loaded);
            app(LearningTaskNotifier::class)->assignmentPublished($loaded);

            return $loaded;
        });
        TeacherOverviewCache::forget((int) $teacher->id);

        return $created;
    }

    public function canManage(TeacherAssignment $assignment, bool $forUpdate = false): bool
    {
        $query = $assignment->recipients();
        if ($forUpdate) {
            $query->lockForUpdate();
        }
        $recipients = $query->get(['id', 'started_at', 'completed_at', 'student_completed_at']);
        if ($recipients->isEmpty() || $recipients->contains(fn ($recipient) => $recipient->started_at !== null || $recipient->completed_at !== null || $recipient->student_completed_at !== null)) {
            return false;
        }

        $ids = $recipients->pluck('id')->all();

        return ! UserSession::query()->whereIn('teacher_assignment_recipient_id', $ids)->exists()
            && ! AiReciteAttempt::query()->whereIn('teacher_assignment_recipient_id', $ids)->exists();
    }

    /** @param array<string, mixed> $input */
    public function update(User $teacher, TeacherAssignment $assignment, array $input): TeacherAssignment
    {
        $surah = (int) $input['surah_number'];
        $start = (int) $input['ayah_start'];
        $end = (int) $input['ayah_end'];
        $ayahCount = QuranMetadata::ayahCount($surah);
        if ($ayahCount === null || $start < 1 || $end < $start || $end > $ayahCount) {
            throw ValidationException::withMessages(['ayah_end' => 'Choose a surah and an ayah range that exists.']);
        }

        $priority = RevisionReminderPriority::normalise($input['priority'] ?? $assignment->priority ?? 'normal')->value;
        $sessionSettings = array_key_exists('session_settings', $input)
            ? AssignmentListeningSettings::sanitize($input['session_settings'])
            : $assignment->session_settings;

        $kind = AssignmentKind::tryFrom((string) ($input['kind'] ?? '')) ?? $assignment->kind;
        [$activity, $recordingRequired, $kind] = $this->coachingActivity($input, $kind instanceof AssignmentKind ? $kind : AssignmentKind::Practice);

        $updated = DB::transaction(function () use ($teacher, $assignment, $input, $surah, $start, $end, $priority, $activity, $recordingRequired, $kind, $sessionSettings) {
            $locked = TeacherAssignment::query()->whereKey($assignment->id)->lockForUpdate()->firstOrFail();
            $this->assertManageable($teacher, $locked, true);
            $previousDue = $locked->due_at?->toDateString();
            $locked->forceFill([
                'kind' => $kind->value,
                'hifz_category' => $input['hifz_category'],
                'activity' => $activity,
                'recording_required' => $recordingRequired,
                'surah_number' => $surah,
                'ayah_start' => $start,
                'ayah_end' => $end,
                'repetition_target' => $input['repetition_target'] ?? null,
                'due_at' => $input['due_at'] ?? null,
                'priority' => $priority,
                'feedback' => $this->nullableText($input['feedback'] ?? null),
                'session_settings' => $sessionSettings,
            ])->save();

            $loaded = $locked->refresh()->load('recipients');
            $this->syncRevisionRemindersForAssignment($loaded);
            if ($previousDue !== $loaded->due_at?->toDateString()) {
                app(LearningTaskNotifier::class)->deadlineMoved($loaded);
            }

            return $loaded;
        });
        TeacherOverviewCache::forget((int) $teacher->id);

        return $updated;
    }

    public function remove(User $teacher, TeacherAssignment $assignment): void
    {
        DB::transaction(function () use ($teacher, $assignment) {
            $locked = TeacherAssignment::query()->whereKey($assignment->id)->lockForUpdate()->firstOrFail();
            $this->assertManageable($teacher, $locked, true);
            $locked->delete();
        });
        TeacherOverviewCache::forget((int) $teacher->id);
    }

    public function cancelRecipientByTeacher(
        User $teacher,
        TeacherAssignmentRecipient $recipient,
        ?string $note = null,
    ): TeacherAssignmentRecipient {
        TeacherFeatures::abortUnlessEnabled();

        return DB::transaction(function () use ($teacher, $recipient, $note) {
            $locked = TeacherAssignmentRecipient::query()
                ->with(['assignment', 'student'])
                ->lockForUpdate()
                ->findOrFail($recipient->id);
            $assignment = $locked->assignment;
            if ($assignment === null
                || (int) $assignment->teacher_id !== (int) $teacher->id
                || ! $teacher->isTeacher()
                || ! $this->access->allows($teacher, $locked->student)) {
                abort(404);
            }

            if ($this->lifecycleStatus($locked) === AssignmentStatus::Completed->value) {
                throw ValidationException::withMessages([
                    'assignment' => 'Completed tasks cannot be cancelled.',
                ]);
            }

            if (AssignmentRecipientLifecycle::isClosed($locked)) {
                return $locked->refresh()->load('assignment');
            }

            $evidence = is_array($locked->completion_evidence) ? $locked->completion_evidence : [];
            $evidence = AssignmentRecipientLifecycle::appendEvent($evidence, AssignmentRecipientLifecycle::EVENT_CANCELLED, array_filter([
                'note' => $note !== null && trim($note) !== '' ? trim($note) : null,
            ]));
            $evidence['lifecycle_closure'] = AssignmentRecipientLifecycle::CLOSURE_CANCELLED;
            $evidence['cancelled_at'] = now()->toIso8601String();
            if ($note !== null && trim($note) !== '') {
                $evidence['cancel_note'] = trim($note);
            }

            $locked->forceFill([
                'status' => AssignmentStatus::Cancelled->value,
                'completion_evidence' => $evidence,
            ])->save();
            try {
                app(RevisionReminderSyncService::class)->completeAssignmentReminder($locked->refresh(), 'cancelled');
            } catch (\Throwable $error) {
                report($error);
            }
            TeacherOverviewCache::forget((int) $teacher->id);

            return $locked->refresh()->load('assignment');
        });
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    public function reassignRecipientByTeacher(
        User $teacher,
        TeacherAssignmentRecipient $recipient,
        array $overrides = [],
    ): array {
        TeacherFeatures::abortUnlessEnabled();

        return DB::transaction(function () use ($teacher, $recipient, $overrides) {
            $locked = TeacherAssignmentRecipient::query()
                ->with(['assignment', 'student'])
                ->lockForUpdate()
                ->findOrFail($recipient->id);
            $assignment = $locked->assignment;
            if ($assignment === null
                || (int) $assignment->teacher_id !== (int) $teacher->id
                || ! $teacher->isTeacher()
                || ! $this->access->allows($teacher, $locked->student)) {
                abort(404);
            }

            if ($this->lifecycleStatus($locked) === AssignmentStatus::Completed->value) {
                throw ValidationException::withMessages([
                    'assignment' => 'Completed tasks cannot be reassigned.',
                ]);
            }

            if (AssignmentRecipientLifecycle::isClosed($locked)) {
                $successorId = AssignmentRecipientLifecycle::successorRecipientId($locked);
                if ($successorId !== null) {
                    $successor = TeacherAssignmentRecipient::query()->with('assignment')->find($successorId);
                    if ($successor !== null) {
                        return [
                            'previous' => $this->presentRecipient($locked, false, null, null, null, (int) $teacher->id),
                            'assignment' => $this->presentAssignment($successor->assignment),
                            'recipients' => [$this->presentRecipient($successor, false, null, null, null, (int) $teacher->id)],
                        ];
                    }
                }
            }

            $replacement = $this->duplicateAssignment($teacher, $assignment, array_merge($overrides, [
                'student_id' => (int) $locked->student_id,
                'allow_duplicate' => true,
            ]));
            $newRecipient = TeacherAssignmentRecipient::query()
                ->where('teacher_assignment_id', $replacement->id)
                ->where('student_id', $locked->student_id)
                ->firstOrFail();

            $evidence = is_array($locked->completion_evidence) ? $locked->completion_evidence : [];
            $evidence = AssignmentRecipientLifecycle::appendEvent($evidence, AssignmentRecipientLifecycle::EVENT_REASSIGNED, [
                'successor_recipient_id' => (int) $newRecipient->id,
                'successor_assignment_id' => (int) $replacement->id,
            ]);
            $evidence['lifecycle_closure'] = AssignmentRecipientLifecycle::CLOSURE_REASSIGNED;
            $evidence['successor_recipient_id'] = (int) $newRecipient->id;
            $evidence['reassigned_at'] = now()->toIso8601String();
            $locked->forceFill([
                'status' => AssignmentStatus::Cancelled->value,
                'completion_evidence' => $evidence,
            ])->save();

            $newEvidence = is_array($newRecipient->completion_evidence) ? $newRecipient->completion_evidence : [];
            $newEvidence['predecessor_recipient_id'] = (int) $locked->id;
            $newEvidence['predecessor_assignment_id'] = (int) $assignment->id;
            $newRecipient->forceFill(['completion_evidence' => $newEvidence])->save();

            try {
                app(RevisionReminderSyncService::class)->completeAssignmentReminder($locked->refresh(), 'reassigned');
                app(RevisionReminderSyncService::class)->syncTeacherAssignmentRecipient($newRecipient->refresh());
            } catch (\Throwable $error) {
                report($error);
            }
            TeacherOverviewCache::forget((int) $teacher->id);

            $newRecipient->load('assignment');

            return [
                'previous' => $this->presentRecipient($locked->refresh(), false, null, null, null, (int) $teacher->id),
                'assignment' => $this->presentAssignment($newRecipient->assignment),
                'recipients' => [$this->presentRecipient($newRecipient, false, null, null, null, (int) $teacher->id)],
            ];
        });
    }

    /**
     * Clone passage, coaching category and targets for the same or another student.
     *
     * @param  array<string, mixed>  $overrides
     */
    public function duplicateAssignment(User $teacher, TeacherAssignment $assignment, array $overrides = []): TeacherAssignment
    {
        TeacherFeatures::abortUnlessEnabled();
        if ((int) $assignment->teacher_id !== (int) $teacher->id
            || ! $teacher->isTeacher()
            || (int) $assignment->organisation_id !== (int) $teacher->organisation_id) {
            abort(404);
        }

        $input = array_merge([
            'kind' => $assignment->kind instanceof AssignmentKind ? $assignment->kind->value : (string) $assignment->kind,
            'hifz_category' => $assignment->hifz_category,
            'activity' => $assignment->activity,
            'recording_required' => (bool) $assignment->recording_required,
            'surah_number' => (int) $assignment->surah_number,
            'ayah_start' => (int) $assignment->ayah_start,
            'ayah_end' => (int) $assignment->ayah_end,
            'repetition_target' => $assignment->repetition_target,
            'due_at' => ($overrides['due_at'] ?? null) ?: optional($assignment->due_at)->toDateString(),
            'priority' => $assignment->priority,
            'feedback' => $assignment->feedback,
            'session_settings' => $assignment->session_settings,
            'source_ai_recite_attempt_id' => $assignment->source_ai_recite_attempt_id,
            'student_id' => $overrides['student_id'] ?? null,
            'learning_group_id' => $overrides['learning_group_id'] ?? $assignment->learning_group_id,
            'learning_plan_id' => $overrides['learning_plan_id'] ?? $assignment->learning_plan_id,
            'learning_plan_item_id' => $overrides['learning_plan_item_id'] ?? $assignment->learning_plan_item_id,
        ], $overrides);

        if (($input['student_id'] ?? null) === null && ($input['learning_group_id'] ?? null) === null) {
            $studentIds = $assignment->recipients()->pluck('student_id')->unique()->values()->all();
            if (count($studentIds) === 1) {
                $input['student_id'] = (int) $studentIds[0];
            }
        }

        if (! empty($overrides['allow_duplicate'])) {
            $input['allow_duplicate'] = true;
        }

        if (! empty($input['student_id'])) {
            unset($input['learning_group_id']);
        }

        return $this->create($teacher, $input);
    }

    private function assertManageable(User $teacher, TeacherAssignment $assignment, bool $forUpdate = false): void
    {
        TeacherFeatures::abortUnlessEnabled();
        if (! $teacher->isTeacher() || (int) $assignment->teacher_id !== (int) $teacher->id || (int) $assignment->organisation_id !== (int) $teacher->organisation_id) {
            abort(404);
        }
        if (! $this->canManage($assignment, $forUpdate)) {
            throw ValidationException::withMessages(['assignment' => 'This task has student activity and can no longer be changed or removed.']);
        }
    }

    /**
     * @param  list<int>  $studentIds
     */
    public function refreshStatuses(User $teacher, array $studentIds): void
    {
        TeacherFeatures::abortUnlessEnabled();

        if ($studentIds === []) {
            return;
        }

        $recipients = TeacherAssignmentRecipient::query()
            ->whereIn('student_id', $studentIds)
            ->whereHas('assignment', function ($query) use ($teacher) {
                $query->where('teacher_id', $teacher->id);
            })
            ->with('assignment')
            ->get();

        if ($recipients->isEmpty()) {
            return;
        }

        $recipientIds = $recipients->pluck('id')->map(fn ($id) => (int) $id)->all();

        $sessions = UserSession::query()
            ->whereIn('teacher_assignment_recipient_id', $recipientIds)
            ->where('is_onboarding_example', false)
            ->where('status', UserSessionStatus::Completed->value)
            ->get();

        $attempts = AiReciteAttempt::query()
            ->validScored()
            ->whereIn('teacher_assignment_recipient_id', $recipientIds)
            ->get();
        $attempts = $this->dedupeScoredAttempts($attempts);

        foreach ($recipients as $recipient) {
            $assignment = $recipient->assignment;
            if ($assignment === null) {
                continue;
            }

            $current = $recipient->status instanceof AssignmentStatus
                ? $recipient->status
                : AssignmentStatus::tryFrom((string) $recipient->status);

            if ($current === AssignmentStatus::Completed || $current === AssignmentStatus::Cancelled) {
                continue;
            }

            if ($recipient->student_completed_at !== null) {

                $evidence = is_array($recipient->completion_evidence) ? $recipient->completion_evidence : [];
                $awaitingTeacherCorrection = $current === AssignmentStatus::InProgress
                    && ! empty($evidence['correction_requested_at']);

                if ($awaitingTeacherCorrection) {
                    continue;
                }

                if ($current !== AssignmentStatus::AwaitingConfirmation) {
                    $recipient->forceFill([
                        'status' => AssignmentStatus::AwaitingConfirmation->value,
                    ])->save();
                }

                continue;
            }

            $matches = $this->completedRepeats($recipient, $sessions, $attempts);

            // Overdue stays a due-date flag. It must not replace pending or in progress.
            $status = AssignmentStatus::Pending;
            if ($matches > 0 || $recipient->started_at !== null) {
                $status = AssignmentStatus::InProgress;
            }

            $completedAt = $recipient->completed_at;
            if ($status !== AssignmentStatus::Completed) {
                $completedAt = null;
            }

            $current = $recipient->status instanceof AssignmentStatus
                ? $recipient->status
                : AssignmentStatus::tryFrom((string) $recipient->status);

            if ($current !== $status || $recipient->completed_at?->eq($completedAt) === false) {
                $recipient->forceFill([
                    'status' => $status->value,
                    'completed_at' => $completedAt,
                ])->save();
            }
        }
    }

    public function start(User $student, TeacherAssignmentRecipient $recipient): TeacherAssignmentRecipient
    {
        TeacherFeatures::abortUnlessEnabled();

        return DB::transaction(function () use ($student, $recipient) {
            $locked = TeacherAssignmentRecipient::query()
                ->with('assignment')
                ->lockForUpdate()
                ->findOrFail($recipient->id);
            $this->assertStudentCanWorkOn($student, $locked);

            if ($locked->started_at === null) {
                $this->markRecipientInProgress($locked);
            }

            return $locked->refresh()->load('assignment');
        });
    }

    public function completeByStudent(User $student, TeacherAssignmentRecipient $recipient): TeacherAssignmentRecipient
    {
        TeacherFeatures::abortUnlessEnabled();

        $changed = false;
        $fresh = DB::transaction(function () use ($student, $recipient, &$changed) {
            $locked = TeacherAssignmentRecipient::query()
                ->with('assignment')
                ->lockForUpdate()
                ->findOrFail($recipient->id);
            $this->assertStudentCanWorkOn($student, $locked, allowSubmitted: true);

            $evidence = is_array($locked->completion_evidence) ? $locked->completion_evidence : [];
            $resubmittingAfterCorrection = $this->reviewState($locked) === 'needs_correction';

            // A repeated click after a normal submission is harmless. It cannot
            // append another submission or advance the review state.
            if ($locked->student_completed_at !== null && ! $resubmittingAfterCorrection) {
                return $locked->refresh()->load('assignment');
            }

            $progress = $this->progressForRecipient($locked);
            if ((int) $progress['activity_count'] < (int) $progress['target']) {
                throw ValidationException::withMessages([
                    'assignment' => $resubmittingAfterCorrection
                        ? 'Complete the requested correction practice before resubmitting this task.'
                        : 'Complete the required linked activity before marking this task complete.',
                ]);
            }
            if ($locked->assignment->recording_required && ! $this->recipientHasPlayableRecording($locked)) {
                throw ValidationException::withMessages([
                    'audio' => 'Submit a recording before completing this task.',
                ]);
            }
            $completedAt = now();
            $submissions = is_array($evidence['submissions'] ?? null) ? $evidence['submissions'] : [];
            $submissions[] = [
                'activity_count' => (int) $progress['activity_count'],
                'target' => (int) $progress['target'],
                'submitted_at' => $completedAt->toIso8601String(),
                'kind' => $resubmittingAfterCorrection ? 'correction' : 'initial',
            ];
            unset(
                $evidence['correction_requested_at'],
                $evidence['correction_note'],
                $evidence['correction_activity_baseline'],
            );
            $locked->forceFill([
                'status' => AssignmentStatus::AwaitingConfirmation->value,
                'student_completed_at' => $completedAt,
                'completion_evidence' => array_merge($evidence, [
                    'activity_count' => (int) $progress['activity_count'],
                    'target' => (int) $progress['target'],
                    'confirmed_at' => $completedAt->toIso8601String(),
                    'submissions' => $submissions,
                ]),
            ])->save();
            TeacherOverviewCache::forget((int) $locked->assignment->teacher_id);
            $changed = true;

            return $locked->refresh()->load('assignment');
        });

        if ($changed) {
            $this->notifyLearningEvent(fn () => app(LearningTaskNotifier::class)->studentSubmitted($student, $fresh));
        }

        return $fresh;
    }

    public function approveByTeacher(User $teacher, TeacherAssignmentRecipient $recipient): TeacherAssignmentRecipient
    {
        TeacherFeatures::abortUnlessEnabled();

        $changed = false;
        $fresh = DB::transaction(function () use ($teacher, $recipient, &$changed) {
            $locked = TeacherAssignmentRecipient::query()
                ->with(['assignment', 'student'])
                ->lockForUpdate()
                ->findOrFail($recipient->id);
            $assignment = $locked->assignment;
            if ($assignment === null
                || (int) $assignment->teacher_id !== (int) $teacher->id
                || ! $teacher->isTeacher()
                || ! $this->access->allows($teacher, $locked->student)) {
                abort(404);
            }

            if ($locked->student_completed_at === null) {
                throw ValidationException::withMessages([
                    'assignment' => 'The student has not submitted this task yet.',
                ]);
            }

            if ($this->lifecycleStatus($locked) === AssignmentStatus::Completed->value) {
                return $locked->refresh()->load('assignment');
            }

            if ($this->lifecycleStatus($locked) !== AssignmentStatus::AwaitingConfirmation->value) {
                throw ValidationException::withMessages([
                    'assignment' => 'This task must be submitted again before it can be approved.',
                ]);
            }

            $locked->forceFill([
                'status' => AssignmentStatus::Completed->value,
                'completed_at' => now(),
            ])->save();

            $this->syncLearningPlanAfterApproval($assignment);
            $changed = true;

            return $locked->refresh()->load('assignment');
        });
        try {
            app(RevisionReminderSyncService::class)
                ->completeAssignmentReminder($fresh, 'assignment');
        } catch (\Throwable $error) {
            report($error);
        }

        TeacherOverviewCache::forget((int) $teacher->id);
        if ($changed) {
            $fresh->loadMissing('student');
            if ($fresh->student instanceof User) {
                $this->notifyLearningEvent(fn () => app(LearningTaskNotifier::class)->assignmentReviewed($fresh->student, $fresh, 'approved'));
            }
        }

        return $fresh;
    }

    /**
     * A linked plan advances only after teacher approval. Student submission and
     * AI wording-match evidence deliberately do not complete a plan activity.
     */
    private function syncLearningPlanAfterApproval(TeacherAssignment $assignment): void
    {
        $planId = (int) ($assignment->learning_plan_id ?? 0);
        if ($planId <= 0) {
            return;
        }

        $plan = LearningPlan::query()->whereKey($planId)->lockForUpdate()->first();
        if (! $plan || in_array($plan->status, [LearningPlanStatus::Completed, LearningPlanStatus::Archived], true)) {
            return;
        }

        $items = LearningPlanItem::query()
            ->where('learning_plan_id', $plan->id)
            ->where('origin', 'assigned')
            ->where('item_status', '!=', LearningPlanItemStatus::Skipped->value)
            ->with('assignment.recipients')
            ->lockForUpdate()
            ->get();
        if ($items->isEmpty()) {
            return;
        }

        $allApproved = $items->every(function (LearningPlanItem $item) {
            $recipients = $item->assignment?->recipients;

            return $item->teacher_assignment_id !== null
                && $recipients !== null
                && $recipients->isNotEmpty()
                && $recipients->every(function (TeacherAssignmentRecipient $recipient) {
                    $status = $recipient->status instanceof AssignmentStatus
                        ? $recipient->status
                        : AssignmentStatus::tryFrom((string) $recipient->status);

                    return $status === AssignmentStatus::Completed;
                });
        });

        if ($allApproved) {
            $plan->forceFill(['status' => LearningPlanStatus::Completed->value])->save();
        }
    }

    public function requestCorrectionByTeacher(
        User $teacher,
        TeacherAssignmentRecipient $recipient,
        ?string $note = null,
    ): TeacherAssignmentRecipient {
        TeacherFeatures::abortUnlessEnabled();

        $changed = false;
        $fresh = DB::transaction(function () use ($teacher, $recipient, $note, &$changed) {
            $locked = TeacherAssignmentRecipient::query()
                ->with(['assignment', 'student'])
                ->lockForUpdate()
                ->findOrFail($recipient->id);
            $assignment = $locked->assignment;
            if ($assignment === null
                || (int) $assignment->teacher_id !== (int) $teacher->id
                || ! $teacher->isTeacher()
                || ! $this->access->allows($teacher, $locked->student)) {
                abort(404);
            }

            if ($locked->student_completed_at === null) {
                throw ValidationException::withMessages([
                    'assignment' => 'The student has not submitted this task yet.',
                ]);
            }

            $evidence = is_array($locked->completion_evidence) ? $locked->completion_evidence : [];
            if ($this->lifecycleStatus($locked) === AssignmentStatus::Completed->value) {
                throw ValidationException::withMessages([
                    'assignment' => 'Completed tasks cannot be returned for correction.',
                ]);
            }

            if ($this->reviewState($locked) === 'needs_correction') {
                return $locked->refresh()->load('assignment');
            }

            if ($this->lifecycleStatus($locked) !== AssignmentStatus::AwaitingConfirmation->value) {
                throw ValidationException::withMessages([
                    'assignment' => 'This task is not awaiting teacher review.',
                ]);
            }

            // Keep a persisted baseline. A correction is a new piece of work, not a
            // second click against the original submission's sessions/checks.
            $evidence['correction_activity_baseline'] = (int) $this->progressForRecipient($locked)['activity_count'];
            $evidence['correction_requested_at'] = now()->toIso8601String();
            if ($note !== null && trim($note) !== '') {
                $evidence['correction_note'] = trim($note);
            }

            $locked->forceFill([
                'status' => AssignmentStatus::InProgress->value,
                'completion_evidence' => $evidence,
            ])->save();
            $changed = true;

            return $locked->refresh()->load('assignment');
        });
        TeacherOverviewCache::forget((int) $teacher->id);
        if ($changed) {
            $fresh->loadMissing('student');
            if ($fresh->student instanceof User) {
                $this->notifyLearningEvent(fn () => app(LearningTaskNotifier::class)->assignmentReviewed($fresh->student, $fresh, 'correction'));
            }
        }

        return $fresh;
    }

    public function addLearnerMessage(
        User $student,
        TeacherAssignmentRecipient $recipient,
        string $body,
        ?UploadedFile $audio = null,
        ?int $durationMs = null,
        ?string $clientMessageId = null,
    ): TeacherNote {
        TeacherFeatures::abortUnlessEnabled();

        $recipient->loadMissing('assignment');
        $assignment = $recipient->assignment;
        $teacher = $assignment?->teacher;
        if ($assignment === null
            || (int) $recipient->student_id !== (int) $student->id
            || ! $teacher instanceof User
            || ! $this->access->allows($teacher, $student)) {
            abort(404);
        }

        $note = $this->createAssignmentMessage($assignment, $student, TeacherNoteKind::Note, $body, $audio, $durationMs, $clientMessageId);
        TeacherOverviewCache::forget((int) $teacher->id);

        return $note;
    }

    public function addTeacherMessage(
        User $teacher,
        TeacherAssignmentRecipient $recipient,
        string $body,
        ?UploadedFile $audio = null,
        ?int $durationMs = null,
        ?string $clientMessageId = null,
    ): TeacherNote {
        TeacherFeatures::abortUnlessEnabled();

        $recipient->loadMissing('assignment');
        $assignment = $recipient->assignment;
        if ($assignment === null || (int) $assignment->teacher_id !== (int) $teacher->id || ! $teacher->isTeacher() || ! $this->access->allows($teacher, $recipient->student)) {
            abort(404);
        }

        return $this->createAssignmentMessage($assignment, $recipient->student, TeacherNoteKind::Feedback, $body, $audio, $durationMs, $clientMessageId);
    }

    public function linkedRecipientForActivity(
        User $student,
        mixed $recipientId,
        AssignmentKind $kind,
        int $surah,
        int $ayahStart,
        int $ayahEnd,
    ): ?TeacherAssignmentRecipient {
        $id = is_numeric($recipientId) ? (int) $recipientId : 0;
        if ($id <= 0) {
            return null;
        }

        return DB::transaction(function () use ($id, $student, $kind, $surah, $ayahStart, $ayahEnd) {
            $recipient = TeacherAssignmentRecipient::query()
                ->whereKey($id)
                ->where('student_id', $student->id)
                ->with('assignment')
                ->lockForUpdate()
                ->first();
            $assignment = $recipient?->assignment;

            $rangeMatches = $recipient !== null
                && $assignment !== null
                && $assignment->kind === $kind
                && (int) $assignment->surah_number === $surah
                && (int) $assignment->ayah_start === $ayahStart
                && (int) $assignment->ayah_end === $ayahEnd;

            if (! $rangeMatches) {
                throw ValidationException::withMessages([
                    'teacher_assignment_recipient_id' => 'This task link is no longer valid. Return to Tasks and try again.',
                ]);
            }

            // Personal practice can continue, but it must not attach to a teacher
            // who can no longer review the task.
            if (! $this->studentCanShareAssignment($student, $recipient)) {
                return null;
            }

            $this->assertStudentCanWorkOn($student, $recipient, allowApprovedPractice: true);

            // Approved work may be practised again, but a legacy recipient can
            // legitimately have no started_at value. Never let that missing
            // timestamp move an approved assignment back to in progress.
            if ($this->lifecycleStatus($recipient) === AssignmentStatus::Completed->value) {
                return $recipient->load('assignment');
            }

            return $this->markRecipientInProgress($recipient)->load('assignment');
        });
    }

    private function markRecipientInProgress(TeacherAssignmentRecipient $recipient): TeacherAssignmentRecipient
    {
        if ($recipient->started_at !== null) {
            return $recipient;
        }

        $recipient->forceFill([
            'started_at' => now(),
            'status' => AssignmentStatus::InProgress->value,
        ])->save();
        if ($recipient->assignment !== null) {
            TeacherOverviewCache::forget((int) $recipient->assignment->teacher_id);
        }

        return $recipient->refresh();
    }

    /**
     * Sharing follows the same teacher access rule as assignment messages.
     * When teacher features are off, ownership alone is enough so personal
     * sessions are not rejected by a disabled classroom module.
     */
    private function studentCanShareAssignment(User $student, TeacherAssignmentRecipient $recipient): bool
    {
        $recipient->loadMissing('assignment.teacher');
        $assignment = $recipient->assignment;
        $teacher = $assignment?->teacher;
        if ($assignment === null || (int) $recipient->student_id !== (int) $student->id || ! $teacher instanceof User) {
            return false;
        }

        if (! TeacherFeatures::enabled()) {
            return true;
        }

        return $this->access->allows($teacher, $student);
    }

    /**
     * A recipient is the source of truth for whether linked work may be added.
     * Do not let a stale browser tab attach more activity after submission.
     * Approved work may be practised again, but cannot be resubmitted or
     * moved back into the assignment workflow.
     */
    private function assertStudentCanWorkOn(
        User $student,
        TeacherAssignmentRecipient $recipient,
        bool $allowSubmitted = false,
        bool $allowApprovedPractice = false,
    ): void {
        if (! $this->studentCanShareAssignment($student, $recipient)) {
            abort(404);
        }

        $status = $this->lifecycleStatus($recipient);
        if ($status === AssignmentStatus::Completed->value) {
            if ($allowApprovedPractice) {
                return;
            }
            throw ValidationException::withMessages([
                'assignment' => 'This task has already been approved by the teacher.',
            ]);
        }

        if ($status === AssignmentStatus::Cancelled->value) {
            throw ValidationException::withMessages([
                'assignment' => 'This task was cancelled by the teacher.',
            ]);
        }

        if ($status === AssignmentStatus::AwaitingConfirmation->value && ! $allowSubmitted) {
            throw ValidationException::withMessages([
                'assignment' => 'This task is waiting for teacher review and cannot be changed.',
            ]);
        }

        if (! in_array($status, [
            AssignmentStatus::Pending->value,
            AssignmentStatus::InProgress->value,
            AssignmentStatus::AwaitingConfirmation->value,
        ], true)) {
            throw ValidationException::withMessages([
                'assignment' => 'This task is not available for practice.',
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array{0: ?string, 1: bool, 2: AssignmentKind}
     */
    private function coachingActivity(array $input, AssignmentKind $kind): array
    {
        $activity = isset($input['activity']) && $input['activity'] !== '' ? (string) $input['activity'] : null;
        $allowed = ['nazra', 'hifz', 'tajweed', 'revision'];
        if ($activity !== null && ! in_array($activity, $allowed, true)) {
            throw ValidationException::withMessages([
                'activity' => 'Choose Nazra, Hifz, Tajweed, or Revision.',
            ]);
        }

        $recordingRequired = array_key_exists('recording_required', $input)
            ? filter_var($input['recording_required'], FILTER_VALIDATE_BOOLEAN)
            : in_array($activity, ['hifz', 'tajweed'], true);
        if ($activity === 'tajweed') {
            $recordingRequired = true;
        }
        if ($activity !== null) {
            $kind = $recordingRequired ? AssignmentKind::AiRecite : AssignmentKind::Practice;
        }

        return [$activity, $recordingRequired, $kind];
    }

    public function practiceHref(
        TeacherAssignment $assignment,
        ?int $resumeSessionId = null,
        ?int $recipientId = null,
    ): string {
        $params = [
            'surah' => $assignment->surah_number,
            'from' => $assignment->ayah_start,
            'to' => $assignment->ayah_end,
            'return' => 'dashboard',
            'return_tab' => 'learning',
        ];

        if ($assignment->kind === AssignmentKind::AiRecite) {
            $params['ai_check'] = '1';
        } else {
            $params['review'] = '1';
        }

        if ($resumeSessionId !== null && $resumeSessionId > 0) {
            $params['resume'] = '1';
            $params['session'] = $resumeSessionId;
        }

        if ($recipientId !== null && $recipientId > 0) {
            $params['assignment_recipient'] = $recipientId;
        }

        $settings = is_array($assignment->session_settings) ? $assignment->session_settings : null;
        $params = AssignmentListeningSettings::mergeIntoMemorisationQuery($params, $settings);

        return route('memorisation').'?'.http_build_query($params);
    }

    public function listenHref(
        TeacherAssignment $assignment,
        ?int $recipientId = null,
    ): ?string {
        $settings = is_array($assignment->session_settings) ? $assignment->session_settings : null;
        if (! AssignmentListeningSettings::hasListeningRecommendation($settings)) {
            return null;
        }

        $params = [
            'surah' => $assignment->surah_number,
            'from' => $assignment->ayah_start,
            'to' => $assignment->ayah_end,
            'return' => 'dashboard',
            'return_tab' => 'learning',
            'review' => '1',
            'practice_tool' => 'talqin',
        ];

        if ($recipientId !== null && $recipientId > 0) {
            $params['assignment_recipient'] = $recipientId;
        }

        $merged = array_merge(
            is_array($settings) ? $settings : [],
            ['technique' => $settings['technique'] ?? 'talqin']
        );
        $params = AssignmentListeningSettings::mergeIntoMemorisationQuery($params, $merged);

        return route('memorisation').'?'.http_build_query($params);
    }

    public function resumeSessionId(TeacherAssignmentRecipient $recipient, ?Collection $unfinishedSessions = null): ?int
    {
        $assignment = $recipient->assignment;
        if ($assignment === null || $assignment->kind === AssignmentKind::AiRecite) {
            return null;
        }

        $sessions = $unfinishedSessions ?? UserSession::query()
            ->where('user_id', (int) $recipient->student_id)
            ->where('is_onboarding_example', false)
            ->whereIn('status', UserSessionStatus::unfinishedDatabaseValues())
            ->orderByDesc('last_activity_at')
            ->orderByDesc('id')
            ->get();

        $match = $sessions->first(
            fn (UserSession $session) => (int) $session->teacher_assignment_recipient_id === (int) $recipient->id
        );

        return $match ? (int) $match->id : null;
    }

    /**
     * @return array{completed: int, target: int, activity_count: int, lifetime_activity_count: int, scope: string, attempt_count: int|null, completion_count: int|null, resume_available: bool}
     */
    public function progressForRecipient(
        TeacherAssignmentRecipient $recipient,
        ?Collection $completedSessions = null,
        ?Collection $scoredAttempts = null,
        ?Collection $unfinishedSessions = null,
    ): array {
        $assignment = $recipient->assignment;
        $target = max(1, (int) ($assignment?->repetition_target ?? 1));
        if ($assignment === null) {
            return ['completed' => 0, 'target' => $target, 'activity_count' => 0, 'lifetime_activity_count' => 0, 'scope' => 'assignment', 'attempt_count' => null, 'completion_count' => null, 'resume_available' => false];
        }

        if ($completedSessions === null || $scoredAttempts === null) {
            $studentId = (int) $recipient->student_id;
            $completedSessions = UserSession::query()
                ->where('user_id', $studentId)
                ->where('teacher_assignment_recipient_id', $recipient->id)
                ->where('is_onboarding_example', false)
                ->where('status', UserSessionStatus::Completed->value)
                ->get();
            $scoredAttempts = AiReciteAttempt::query()
                ->validScored()
                ->where('user_id', $studentId)
                ->where('teacher_assignment_recipient_id', $recipient->id)
                ->get();
            $scoredAttempts = $this->dedupeScoredAttempts($scoredAttempts);
        }

        $lifetimeActivityCount = $this->completedRepeats($recipient, $completedSessions, $scoredAttempts);
        $activityCount = $lifetimeActivityCount;
        $scope = 'assignment';
        if ($this->reviewState($recipient) === 'needs_correction') {
            $evidence = is_array($recipient->completion_evidence) ? $recipient->completion_evidence : [];
            $baseline = max(0, (int) ($evidence['correction_activity_baseline'] ?? $lifetimeActivityCount));
            $activityCount = max(0, $lifetimeActivityCount - $baseline);
            $scope = 'correction';
        }
        if ($recipient->student_completed_at !== null && $scope !== 'correction') {
            $evidenceCount = is_array($recipient->completion_evidence)
                ? (int) ($recipient->completion_evidence['activity_count'] ?? $target)
                : $target;
            $activityCount = max($target, $evidenceCount, $activityCount);
        }

        return [
            // Progress is intentionally capped at the task target. The raw count
            // remains available for AI checks as an explicit attempt count, never
            // as an ambiguous fraction such as "2 of 1".
            'completed' => min($activityCount, $target),
            'target' => $target,
            'activity_count' => $activityCount,
            'lifetime_activity_count' => $lifetimeActivityCount,
            'scope' => $scope,
            'attempt_count' => ($assignment->kind instanceof AssignmentKind ? $assignment->kind->value : (string) $assignment->kind) === AssignmentKind::AiRecite->value ? $activityCount : null,
            'completion_count' => ($assignment->kind instanceof AssignmentKind ? $assignment->kind->value : (string) $assignment->kind) === AssignmentKind::AiRecite->value ? null : $activityCount,
            'resume_available' => $this->resumeSessionId($recipient, $unfinishedSessions) !== null,
        ];
    }

    /**
     * Compact Progressive Mushaf Hiding summary for teacher review (practice completion only).
     *
     * @return array<string, mixed>|null
     */
    public function memorisationPracticeSummary(
        TeacherAssignmentRecipient $recipient,
        ?Collection $completedSessions = null,
    ): ?array {
        $assignment = $recipient->assignment;
        if ($assignment === null) {
            return null;
        }
        $settings = is_array($assignment->session_settings) ? $assignment->session_settings : null;
        if (! AssignmentProgressiveHidingSettings::isEnabled($settings)) {
            return null;
        }

        $sessions = $completedSessions ?? UserSession::query()
            ->where('user_id', (int) $recipient->student_id)
            ->where('teacher_assignment_recipient_id', $recipient->id)
            ->where('is_onboarding_example', false)
            ->where('status', UserSessionStatus::Completed->value)
            ->orderBy('completed_at')
            ->get();

        $blurSessions = $sessions->filter(function (UserSession $session) {
            $meta = is_array($session->metadata) ? $session->metadata : [];
            $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
            if (! empty($config['blurModeEnabled']) || ! empty($meta['blurModeEnabled'])) {
                return true;
            }
            $completion = is_array($meta['final_settings'] ?? null) ? $meta['final_settings'] : [];
            if (! empty($completion['blur_enabled'])) {
                return true;
            }

            return false;
        });

        if ($blurSessions->isEmpty()) {
            return [
                'configured' => true,
                'session_count' => 0,
                'practice_complete' => false,
                'ai_assessment' => null,
                'disclaimer' => 'practice_completion',
            ];
        }

        $repetitionTotal = 0;
        foreach ($blurSessions as $session) {
            $meta = is_array($session->metadata) ? $session->metadata : [];
            $repetitionTotal += max(0, (int) ($meta['repetitions_completed'] ?? $meta['successful_repeats'] ?? 0));
        }

        $latestAttempt = AiReciteAttempt::query()
            ->validScored()
            ->where('user_id', (int) $recipient->student_id)
            ->where('teacher_assignment_recipient_id', $recipient->id)
            ->latest('created_at')
            ->latest('id')
            ->first();

        return [
            'configured' => true,
            'session_count' => $blurSessions->count(),
            'repetitions_recorded' => $repetitionTotal,
            'hints' => null,
            'reveals' => null,
            'practice_complete' => $blurSessions->count() > 0,
            'ai_assessment' => $latestAttempt ? [
                'accuracy_percent' => (int) $latestAttempt->accuracy_percent,
                'scored' => true,
            ] : null,
            'teacher_verification' => null,
            'disclaimer' => 'practice_completion',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function comparison(TeacherAssignment $assignment, int $studentId): array
    {
        $attempts = AiReciteAttempt::query()
            ->validScored()
            ->where('user_id', $studentId)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        $before = null;
        $after = null;
        foreach ($attempts as $attempt) {
            if (! $this->exactRange($attempt, $assignment)) {
                continue;
            }
            if ($attempt->created_at !== null && $assignment->created_at !== null && $attempt->created_at->lt($assignment->created_at)) {
                $before = $attempt;
            } elseif ($after === null || ($attempt->created_at && $after->created_at && $attempt->created_at->gte($after->created_at))) {
                $after = $attempt;
            }
        }

        if ($before === null || $after === null) {
            return ['available' => false];
        }

        return [
            'available' => true,
            'before' => $this->attemptSummary($before),
            'after' => $this->attemptSummary($after),
            'accuracy_delta' => (int) $after->accuracy_percent - (int) $before->accuracy_percent,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function presentRecipient(
        TeacherAssignmentRecipient $recipient,
        bool $includeComparison = false,
        ?Collection $completedSessions = null,
        ?Collection $scoredAttempts = null,
        ?Collection $unfinishedSessions = null,
        ?int $viewerId = null,
    ): array {
        $recipient->loadMissing('latestSelfAssessment');
        $assignment = $recipient->assignment;
        $status = $this->displayStatus($recipient, $assignment);

        $payload = [
            'id' => (int) $recipient->id,
            'assignment_id' => (int) $recipient->teacher_assignment_id,
            'student_id' => (int) $recipient->student_id,
            'status' => $status,
            'review_state' => $this->reviewState($recipient),
            'student_submitted_at' => $recipient->student_completed_at?->toIso8601String(),
            'teacher_approved_at' => $status === AssignmentStatus::Completed->value && $recipient->completed_at !== null
                ? $recipient->completed_at->toIso8601String()
                : null,
            'started_at' => $recipient->started_at?->toIso8601String(),
            'completed_at' => $recipient->completed_at?->toIso8601String(),
            'updated_at' => $recipient->updated_at?->toIso8601String(),
            'completion_evidence' => $recipient->completion_evidence,
            'self_assessment' => $recipient->latestSelfAssessment
                ? app(StudentSelfAssessmentService::class)->present($recipient->latestSelfAssessment)
                : null,
        ];

        $stateSnapshot = TeacherTaskState::snapshot(
            $status,
            $payload['review_state'],
            $recipient->started_at,
            $recipient->student_completed_at,
            $assignment?->due_at,
        );
        $payload['task_state'] = $stateSnapshot['base'];
        $payload['task_state_display'] = $stateSnapshot['display'];
        $payload['task_overdue_overlay'] = $stateSnapshot['overdue_overlay'];
        $payload['display_status'] = $this->displayStatusForRecipient($recipient);
        $payload['lifecycle'] = AssignmentRecipientLifecycle::present($recipient);
        $dueUrgency = TeacherTaskState::dueUrgency(
            $assignment?->due_at,
            $stateSnapshot['base'] === TeacherTaskState::DONE,
        );
        $payload['due_urgency'] = [
            'tone' => $dueUrgency['tone'],
            'text' => $dueUrgency['text'],
            'days_remaining' => $dueUrgency['days_remaining'],
        ];

        if ($assignment) {
            $latestAttempt = AiReciteAttempt::query()
                ->where('user_id', $recipient->student_id)
                ->where('teacher_assignment_recipient_id', $recipient->id)
                ->with('assessment:id,recognition_data')
                ->latest('created_at')->latest('id')->first();
            $payload['evidence'] = $latestAttempt
                ? $this->presentLearnerAttemptEvidence($latestAttempt, $assignment)
                : null;
            $resumeSessionId = $this->resumeSessionId($recipient, $unfinishedSessions);
            $payload['assignment'] = $this->presentAssignment($assignment);
            $payload['progress'] = $this->progressForRecipient(
                $recipient,
                $completedSessions,
                $scoredAttempts,
                $unfinishedSessions,
            );
            $payload['memorisation_summary'] = $this->memorisationPracticeSummary($recipient, $completedSessions);
            $payload['assignment_state'] = $this->assignmentWorkflowState($status, $payload['review_state']);
            $payload['workflow_state'] = $this->learnerWorkflowState($recipient, $status, $payload['review_state'], $payload['progress']);
            $payload['ai_practice_state'] = $this->aiPracticeState($assignment, $payload['progress'], $recipient);
            $payload['teacher_review_state'] = $this->teacherReviewWorkflowState($assignment, $recipient);
            $payload['revision_state'] = $this->revisionWorkflowState($assignment, $recipient);
            $canLinkPractice = in_array($this->lifecycleStatus($recipient), [
                AssignmentStatus::Pending->value,
                AssignmentStatus::InProgress->value,
                AssignmentStatus::Completed->value,
            ], true)
                && ! AssignmentRecipientLifecycle::isClosed($recipient);
            $payload['href'] = $this->practiceHref(
                $assignment,
                $resumeSessionId,
                $canLinkPractice ? (int) $recipient->id : null,
            );
            $payload['listen_href'] = $canLinkPractice
                ? $this->listenHref($assignment, (int) $recipient->id)
                : null;
            $payload['messages'] = $this->assignmentMessages(
                $assignment,
                (int) $recipient->student_id,
                $viewerId,
                markRead: false,
            );
            $payload['thread_unread_count'] = count(array_filter(
                $payload['messages'],
                fn (array $message) => ($message['sender'] ?? null) === 'teacher' && ($message['unread'] ?? false),
            ));
            $payload['completion_result'] = $this->presentLearnerCompletionResult(
                $recipient,
                $payload['review_state'],
                $latestAttempt,
                $payload['messages'],
                $assignment,
            );
            $payload['last_attempt'] = $this->presentLearnerLastAttempt(
                $recipient,
                $payload['review_state'] ?? null,
                $latestAttempt,
                $payload['messages'],
                $payload['progress'],
            );
            $attemptHistory = $this->presentLearnerAttemptHistory(
                $recipient,
                $scoredAttempts,
                $payload['messages'] ?? [],
                (int) ($payload['progress']['activity_count'] ?? 0),
                (int) ($payload['progress']['target'] ?? 1),
            );
            $payload['attempts'] = $attemptHistory['attempts'];
            $payload['max_attempts'] = $attemptHistory['max_attempts'];
            $payload['attempts_left'] = $attemptHistory['attempts_left'];
            if ($attemptHistory['data_gaps'] !== []) {
                $payload['attempt_history_gaps'] = $attemptHistory['data_gaps'];
            }
            if ($includeComparison) {
                $payload['comparison'] = $this->comparison($assignment, (int) $recipient->student_id);
            }
        }

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    public function presentAssignment(TeacherAssignment $assignment): array
    {
        return [
            'id' => (int) $assignment->id,
            'kind' => $assignment->kind instanceof AssignmentKind ? $assignment->kind->value : (string) $assignment->kind,
            'hifz_category' => $assignment->hifz_category,
            'activity' => $assignment->activity,
            'recording_required' => (bool) $assignment->recording_required,
            'surah_number' => (int) $assignment->surah_number,
            'surah_name' => QuranMetadata::name((int) $assignment->surah_number),
            'ayah_start' => (int) $assignment->ayah_start,
            'ayah_end' => (int) $assignment->ayah_end,
            'repetition_target' => $assignment->repetition_target,
            'due_at' => $assignment->due_at?->toIso8601String(),
            'priority' => RevisionReminderPriority::normalise($assignment->priority ?? 'normal')->value,
            'feedback' => $assignment->feedback,
            'session_settings' => array_merge(
                AssignmentListeningSettings::present(
                    is_array($assignment->session_settings) ? $assignment->session_settings : null
                ),
                [
                    'progressive_hiding' => AssignmentProgressiveHidingSettings::present(
                        is_array($assignment->session_settings) ? $assignment->session_settings : null
                    ),
                ]
            ),
            'source_attempt_id' => $assignment->source_ai_recite_attempt_id ? (int) $assignment->source_ai_recite_attempt_id : null,
            'learning_group_id' => $assignment->learning_group_id ? (int) $assignment->learning_group_id : null,
            'created_at' => $assignment->created_at?->toIso8601String(),
        ];
    }

    /**
     * @param  Collection<int, int>  $authorized
     * @return Collection<int, int>
     */
    private function individualRecipients(User $teacher, int $studentId, Collection $authorized): Collection
    {
        if (! $authorized->contains($studentId)) {
            throw ValidationException::withMessages([
                'student_id' => 'That student has not authorised practice sharing.',
            ]);
        }

        return collect([$studentId]);
    }

    /**
     * @param  Collection<int, int>  $authorized
     * @return Collection<int, int>
     */
    private function groupRecipients(User $teacher, int $groupId, Collection $authorized): Collection
    {
        $group = LearningGroup::query()->find($groupId);
        if ($group === null || (int) $group->organisation_id !== (int) $teacher->organisation_id) {
            throw ValidationException::withMessages([
                'learning_group_id' => 'Choose a group in your organisation.',
            ]);
        }

        if (! $this->access->teacherGroupIds($teacher)->contains($groupId)) {
            throw ValidationException::withMessages([
                'learning_group_id' => 'Join this group as a teacher before assigning it.',
            ]);
        }

        $members = GroupMembership::query()
            ->where('learning_group_id', $groupId)
            ->where('membership_role', MembershipRole::Student->value)
            ->where('status', MembershipStatus::Approved->value)
            ->whereIn('user_id', $authorized)
            ->pluck('user_id');

        return $members->map(fn ($id) => (int) $id)->unique()->values();
    }

    /**
     * @param  Collection<int, UserSession>  $completedSessions
     * @param  Collection<int, AiReciteAttempt>  $scoredAttempts
     */
    private function completedRepeats(
        TeacherAssignmentRecipient $recipient,
        Collection $completedSessions,
        Collection $scoredAttempts,
    ): int {
        $assignment = $recipient->assignment;
        if ($assignment === null) {
            return 0;
        }

        if ($assignment->kind === AssignmentKind::AiRecite) {
            return $this->dedupeScoredAttempts($scoredAttempts)
                ->filter(fn (AiReciteAttempt $attempt) => (
                    (int) $attempt->teacher_assignment_recipient_id === (int) $recipient->id
                    && (int) $attempt->user_id === (int) $recipient->student_id
                    && $this->exactRange($attempt, $assignment)
                ))
                ->count();
        }

        return $completedSessions
            ->filter(fn (UserSession $session) => (
                (int) $session->teacher_assignment_recipient_id === (int) $recipient->id
                && (int) $session->user_id === (int) $recipient->student_id
            ))
            ->count();
    }

    /** Keep retries of the same scored check from inflating progress. */
    private function dedupeScoredAttempts(Collection $attempts): Collection
    {
        return $attempts
            ->sortByDesc('id')
            ->unique(function (AiReciteAttempt $attempt): string {
                $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];

                return implode('|', [
                    (string) ($attempt->user_id ?: ''),
                    (string) ($attempt->teacher_assignment_recipient_id ?: ''),
                    (string) ($attempt->user_session_id ?: 'no-session'),
                    (string) ($range['surah'] ?? $range['surah_number'] ?? ''),
                    (string) ($range['from'] ?? $range['start'] ?? ''),
                    (string) ($range['to'] ?? $range['end'] ?? ''),
                    (string) ($attempt->attempt_number ?? ''),
                    (string) $attempt->accuracy_percent,
                    (string) $attempt->band,
                ]);
            })
            ->values();
    }

    private function exactRange(AiReciteAttempt $attempt, TeacherAssignment $assignment): bool
    {
        $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
        $surah = (int) ($range['surah'] ?? $range['surah_number'] ?? 0);
        $from = (int) ($range['from'] ?? $range['start'] ?? 0);
        $to = (int) ($range['to'] ?? $range['end'] ?? 0);

        return $surah === (int) $assignment->surah_number
            && $from === (int) $assignment->ayah_start
            && $to === (int) $assignment->ayah_end;
    }

    private function createAssignmentMessage(
        TeacherAssignment $assignment,
        User $student,
        TeacherNoteKind $kind,
        string $body,
        ?UploadedFile $audio = null,
        ?int $durationMs = null,
        ?string $clientMessageId = null,
    ): TeacherNote {
        $body = trim($body);
        if (($body === '' && $audio === null) || mb_strlen($body) > 2000) {
            throw ValidationException::withMessages([
                'body' => 'Enter a message or add a voice note.',
            ]);
        }

        if ($clientMessageId !== null) {
            $existing = TeacherNote::query()
                ->where('teacher_id', $assignment->teacher_id)
                ->where('student_id', $student->id)
                ->where('teacher_assignment_id', $assignment->id)
                ->where('kind', $kind->value)
                ->where('client_message_id', $clientMessageId)
                ->first();
            if ($existing) {
                return $existing;
            }
        }

        $note = new TeacherNote;
        $note->forceFill([
            'teacher_id' => $assignment->teacher_id,
            'student_id' => $student->id,
            'organisation_id' => $assignment->organisation_id,
            'teacher_assignment_id' => $assignment->id,
            'surah_number' => (int) $assignment->surah_number,
            'ayah_start' => (int) $assignment->ayah_start,
            'ayah_end' => (int) $assignment->ayah_end,
            'kind' => $kind->value,
            'body' => $body,
            'client_message_id' => $clientMessageId,
        ])->save();

        if ($audio !== null && ! $this->messageAudio->store($note, $audio, $durationMs)) {
            $note->delete();
            throw ValidationException::withMessages([
                'audio' => 'Use a supported voice recording smaller than 8 MB.',
            ]);
        }

        return $note->refresh();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function learnerAssignmentThread(User $student, TeacherAssignmentRecipient $recipient): array
    {
        abort_unless((int) $recipient->student_id === (int) $student->id, 403);
        $recipient->loadMissing('assignment');
        $assignment = $recipient->assignment;
        abort_if($assignment === null, 404);

        return $this->assignmentMessages(
            $assignment,
            (int) $student->id,
            (int) $student->id,
            markRead: true,
        );
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function assignmentMessages(
        TeacherAssignment $assignment,
        int $studentId,
        ?int $viewerId = null,
        bool $markRead = true,
    ): array {
        $notes = $assignment->relationLoaded('notes')
            ? $assignment->notes
            : $assignment->notes()->with('teacher:id,name')->get();

        $thread = $notes
            ->where('student_id', $studentId)
            ->filter(fn (TeacherNote $note) => $this->studentVisibleAssignmentNote($note))
            ->sortBy(fn (TeacherNote $note) => sprintf('%020d', (int) $note->id))
            ->values();
        if ($viewerId !== null && $markRead) {
            $unreadIds = $thread->filter(fn (TeacherNote $note) => $note->read_at === null && ! $this->assignmentMessageSentBy($note, $viewerId))->pluck('id');
            if ($unreadIds->isNotEmpty()) {
                $readAt = now();
                TeacherNote::query()->whereIn('id', $unreadIds)->whereNull('read_at')->update(['read_at' => $readAt]);
                $thread->each(function (TeacherNote $note) use ($unreadIds, $readAt): void {
                    if ($unreadIds->contains($note->id)) {
                        $note->setAttribute('read_at', $readAt);
                    }
                });
                TeacherOverviewCache::forget((int) $assignment->teacher_id);
            }
        }

        return $thread
            ->map(fn (TeacherNote $note) => $this->presentAssignmentMessage($note, $viewerId))
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function presentAssignmentMessage(TeacherNote $note, ?int $viewerId = null): array
    {
        $kind = $note->kind instanceof TeacherNoteKind ? $note->kind : TeacherNoteKind::tryFrom((string) $note->kind);
        $surah = $note->surah_number ? (int) $note->surah_number : null;
        $from = $note->ayah_start ? (int) $note->ayah_start : null;
        $to = $note->ayah_end ? (int) $note->ayah_end : $from;
        $audio = $this->messageAudio->payload($note);
        $feedbackType = $kind === TeacherNoteKind::Feedback
            ? (($note->audio_path || ($audio['available'] ?? false)) ? 'voice_feedback' : 'written_feedback')
            : 'message';

        return [
            'id' => (int) $note->id,
            'sender' => $kind === TeacherNoteKind::Feedback ? 'teacher' : 'student',
            'sender_name' => $kind === TeacherNoteKind::Feedback ? $note->teacher?->name : null,
            'body' => $note->body,
            'audio' => $audio,
            'message_kind' => $kind?->value,
            'feedback_type' => $feedbackType,
            'passage' => $surah && $from ? [
                'surah_number' => $surah,
                'surah_name' => QuranMetadata::name($surah),
                'ayah_start' => $from,
                'ayah_end' => $to,
            ] : null,
            'related_assignment' => [
                'id' => (int) $note->teacher_assignment_id,
                'recipient_id' => null,
                'title' => $surah && $from
                    ? QuranMetadata::name($surah).' · '.$from.($to && $to !== $from ? '–'.$to : '')
                    : null,
            ],
            'created_at' => $note->created_at?->toIso8601String(),
            'read_at' => $note->read_at?->toIso8601String(),
            'unread' => $viewerId !== null && $note->read_at === null && ! $this->assignmentMessageSentBy($note, $viewerId),
            'delivery_status' => $note->read_at === null ? 'sent' : 'read',
            'can_delete' => $viewerId !== null
                && $kind === TeacherNoteKind::Feedback
                && (int) $note->teacher_id === (int) $viewerId,
        ];
    }

    public function deleteTeacherMessage(User $teacher, TeacherNote $note): void
    {
        TeacherFeatures::abortUnlessEnabled();
        $note->loadMissing(['assignment', 'student']);
        $kind = $note->kind instanceof TeacherNoteKind ? $note->kind : TeacherNoteKind::tryFrom((string) $note->kind);
        abort_unless(
            $kind === TeacherNoteKind::Feedback
            && (int) $note->teacher_id === (int) $teacher->id
            && $note->student !== null
            && $this->access->allows($teacher, $note->student),
            404
        );

        $this->messageAudio->deleteStored($note);
        $note->delete();
    }

    private function studentVisibleAssignmentNote(TeacherNote $note): bool
    {
        if ($note->parent_user_id !== null) {
            return false;
        }
        $kind = $note->kind instanceof TeacherNoteKind ? $note->kind : TeacherNoteKind::tryFrom((string) $note->kind);

        return in_array($kind, [TeacherNoteKind::Feedback, TeacherNoteKind::Note], true);
    }

    /**
     * @param  callable(): void  $notify
     */
    private function notifyLearningEvent(callable $notify): void
    {
        try {
            $notify();
        } catch (\Throwable $error) {
            report($error);
        }
    }

    private function assignmentMessageSentBy(TeacherNote $note, int $viewerId): bool
    {
        $kind = $note->kind instanceof TeacherNoteKind ? $note->kind : TeacherNoteKind::tryFrom((string) $note->kind);

        return $kind === TeacherNoteKind::Feedback
            ? (int) $note->teacher_id === $viewerId
            : (int) $note->student_id === $viewerId;
    }

    /**
     * @return array<string, mixed>
     */
    private function attemptSummary(AiReciteAttempt $attempt): array
    {
        return [
            'id' => (int) $attempt->id,
            'accuracy_percent' => $attempt->accuracy_percent === null ? null : (int) $attempt->accuracy_percent,
            'band' => $attempt->band,
            'created_at' => $attempt->created_at?->toIso8601String(),
        ];
    }

    /**
     * Stored "overdue" is a legacy date stamp. The task status stays pending or in progress.
     */
    public function lifecycleStatus(TeacherAssignmentRecipient $recipient): string
    {
        $status = $recipient->status instanceof AssignmentStatus
            ? $recipient->status->value
            : (string) $recipient->status;

        if ($status === AssignmentStatus::Overdue->value) {
            return $recipient->started_at !== null
                ? AssignmentStatus::InProgress->value
                : AssignmentStatus::Pending->value;
        }

        if ($status === AssignmentStatus::Cancelled->value) {
            return AssignmentStatus::Cancelled->value;
        }

        return $status;
    }

    public function displayStatusForRecipient(TeacherAssignmentRecipient $recipient): string
    {
        return AssignmentDisplayStatus::resolve(
            $recipient,
            $this->reviewState($recipient),
            $recipient->assignment,
        );
    }

    /**
     * Date condition in the application timezone. Completed work is never overdue.
     * A task due today stays open until the end of that day.
     */
    public function isDateOverdue(TeacherAssignmentRecipient $recipient, ?TeacherAssignment $assignment = null): bool
    {
        if ($this->lifecycleStatus($recipient) === AssignmentStatus::Completed->value) {
            return false;
        }

        $due = ($assignment ?? $recipient->assignment)?->due_at;

        return $due !== null && $due->copy()->endOfDay()->isPast();
    }

    private function displayStatus(TeacherAssignmentRecipient $recipient, ?TeacherAssignment $assignment): string
    {
        return $this->lifecycleStatus($recipient);
    }

    public function reviewState(TeacherAssignmentRecipient $recipient): ?string
    {
        $status = $recipient->status instanceof AssignmentStatus
            ? $recipient->status->value
            : (string) $recipient->status;

        if (AssignmentRecipientLifecycle::isClosed($recipient)) {
            return AssignmentRecipientLifecycle::closure($recipient);
        }

        if ($status === AssignmentStatus::Completed->value) {
            return 'approved';
        }

        if ($status === AssignmentStatus::AwaitingConfirmation->value) {
            return 'submitted';
        }

        $evidence = is_array($recipient->completion_evidence) ? $recipient->completion_evidence : [];
        if ($status === AssignmentStatus::InProgress->value
            && $recipient->student_completed_at !== null
            && ! empty($evidence['correction_requested_at'])) {
            return 'needs_correction';
        }

        return null;
    }

    /**
     * Assignment state is intentionally independent of a due-date overlay and AI result.
     */
    private function assignmentWorkflowState(string $status, ?string $reviewState): string
    {
        return match (true) {
            in_array($reviewState, [AssignmentRecipientLifecycle::CLOSURE_CANCELLED, AssignmentRecipientLifecycle::CLOSURE_REASSIGNED], true) => $reviewState,
            $status === AssignmentStatus::Cancelled->value => 'cancelled',
            $reviewState === 'needs_correction' => 'needs_correction',
            $status === AssignmentStatus::Completed->value => 'completed',
            $status === AssignmentStatus::AwaitingConfirmation->value || $reviewState === 'submitted' => 'submitted',
            $status === AssignmentStatus::InProgress->value => 'in_progress',
            default => 'not_started',
        };
    }

    /**
     * The learner-facing workflow deliberately distinguishes practising from
     * submitting and approving. These values are derived from the recipient,
     * its linked activity and its persisted submission history.
     *
     * @param  array{activity_count: int, target: int}  $progress
     */
    private function learnerWorkflowState(
        TeacherAssignmentRecipient $recipient,
        string $status,
        ?string $reviewState,
        array $progress,
    ): string {
        if ($reviewState === 'needs_correction') {
            return 'needs_correction';
        }
        if ($status === AssignmentStatus::Completed->value) {
            return 'completed';
        }
        if ($status === AssignmentStatus::AwaitingConfirmation->value || $reviewState === 'submitted') {
            $evidence = is_array($recipient->completion_evidence) ? $recipient->completion_evidence : [];
            $submissions = is_array($evidence['submissions'] ?? null) ? $evidence['submissions'] : [];
            $last = end($submissions);

            return is_array($last) && ($last['kind'] ?? null) === 'correction'
                ? 'correction_resubmitted'
                : 'submitted_for_review';
        }

        return (int) ($progress['activity_count'] ?? 0) >= (int) ($progress['target'] ?? 1)
            ? 'practice_completed'
            : 'practice_required';
    }

    /**
     * A scored AI check only proves progress against its configured target; it never approves an assignment.
     *
     * @param  array{completed: int, target: int, activity_count: int, attempt_count: int|null, completion_count: int|null, resume_available: bool}  $progress
     */
    private function aiPracticeState(TeacherAssignment $assignment, array $progress, TeacherAssignmentRecipient $recipient): ?string
    {
        if ($assignment->kind !== AssignmentKind::AiRecite) {
            return null;
        }

        if ((int) $progress['activity_count'] >= (int) $progress['target']) {
            return 'target_met';
        }

        if ((int) $progress['activity_count'] > 0 || $recipient->started_at !== null) {
            return 'in_progress';
        }

        return 'not_started';
    }

    /** Teacher review is separate from an assignment submission or approval. */
    private function teacherReviewWorkflowState(TeacherAssignment $assignment, TeacherAssignmentRecipient $recipient): ?string
    {
        if ($assignment->kind !== AssignmentKind::AiRecite) {
            return null;
        }

        $evidence = is_array($recipient->completion_evidence) ? $recipient->completion_evidence : [];
        if (! empty($evidence['teacher_reviewed_at'])) {
            return 'reviewed';
        }

        return $recipient->student_completed_at !== null ? 'awaiting_review' : null;
    }

    /**
     * Revision uses its own timing state while retaining the assignment workflow state above.
     */
    private function revisionWorkflowState(TeacherAssignment $assignment, TeacherAssignmentRecipient $recipient): ?string
    {
        $isRevision = $assignment->activity === 'revision'
            || (in_array($assignment->activity, [null, ''], true)
                && in_array($assignment->hifz_category, ['sabqi', 'manzil'], true));
        if (! $isRevision) {
            return null;
        }

        if ($this->lifecycleStatus($recipient) === AssignmentStatus::Completed->value) {
            return 'completed';
        }

        if ($this->isDateOverdue($recipient, $assignment)) {
            return 'overdue';
        }

        if ($assignment->due_at?->isToday()) {
            return 'due';
        }

        return 'scheduled';
    }

    private function recipientHasPlayableRecording(TeacherAssignmentRecipient $recipient): bool
    {
        $attempts = AiReciteAttempt::query()
            ->where('user_id', $recipient->student_id)
            ->where('teacher_assignment_recipient_id', $recipient->id)
            ->whereNotNull('audio_path')
            ->get();

        return $attempts->contains(fn (AiReciteAttempt $attempt) => $this->attemptAudio->hasPlayableAudio($attempt));
    }

    private function nullableText(mixed $value): ?string
    {
        $text = trim((string) $value);

        return $text === '' ? null : $text;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function presentLearnerCompletionResult(
        TeacherAssignmentRecipient $recipient,
        ?string $reviewState,
        ?AiReciteAttempt $latestAttempt,
        array $messages,
        TeacherAssignment $assignment,
    ): ?array {
        // Keep the exact wording evidence available when a teacher returns a
        // submission. It identifies words to revisit, without presenting the
        // AI result as a Tajweed or pronunciation judgement.
        if (! $this->isLearnerTaskApproved($recipient, $reviewState) && $reviewState !== 'needs_correction') {
            return null;
        }

        $snippet = null;
        foreach (array_reverse($messages) as $message) {
            if (($message['sender'] ?? null) === 'teacher') {
                $body = trim((string) ($message['body'] ?? ''));
                if ($body !== '') {
                    $snippet = mb_strlen($body) > 140 ? mb_substr($body, 0, 137).'…' : $body;
                    break;
                }
            }
        }
        if ($snippet === null) {
            $snippet = $this->nullableText($assignment->feedback);
            if ($snippet !== null && mb_strlen($snippet) > 140) {
                $snippet = mb_substr($snippet, 0, 137).'…';
            }
        }

        $accuracy = $latestAttempt?->accuracy_percent;
        $headlineType = $accuracy !== null ? 'ai_score' : 'teacher_reviewed';
        $words = is_array($latestAttempt?->word_statuses) ? $latestAttempt->word_statuses : [];

        $attemptPayload = $latestAttempt
            ? LearnerCompletionAttempt::present(
                $latestAttempt,
                $this->attemptAudio,
                $this->feedbackSegments->forStudentAttempt($latestAttempt),
            )
            : null;

        return [
            'headline_type' => $headlineType,
            'accuracy_percent' => $accuracy === null ? null : (int) $accuracy,
            'feedback_snippet' => $snippet,
            'has_recitation_review' => $latestAttempt !== null && $words !== [],
            'attempt' => $attemptPayload,
        ];
    }

    private function isLearnerTaskApproved(TeacherAssignmentRecipient $recipient, ?string $reviewState): bool
    {
        if ($reviewState === 'approved') {
            return true;
        }

        $status = $recipient->status instanceof AssignmentStatus
            ? $recipient->status->value
            : (string) $recipient->status;

        return $status === AssignmentStatus::Completed->value && $recipient->student_completed_at === null;
    }

    /**
     * @param  array<int, array<string, mixed>>  $messages
     * @param  array<string, mixed>  $progress
     * @return array<string, mixed>|null
     */
    private function presentLearnerLastAttempt(
        TeacherAssignmentRecipient $recipient,
        ?string $reviewState,
        ?AiReciteAttempt $latestAttempt,
        array $messages,
        array $progress,
    ): ?array {
        if ($this->isLearnerTaskApproved($recipient, $reviewState)) {
            return null;
        }

        $attemptNumber = (int) ($progress['activity_count'] ?? 0);
        if ($attemptNumber < 1) {
            return null;
        }

        $note = null;
        foreach (array_reverse($messages) as $message) {
            if (($message['sender'] ?? null) !== 'teacher') {
                continue;
            }
            $body = trim((string) ($message['body'] ?? ''));
            if ($body !== '') {
                $note = $body;
                break;
            }
        }

        $accuracy = $latestAttempt?->accuracy_percent;
        $missing = [];
        if ($accuracy === null) {
            $missing[] = 'accuracy_percent';
        }

        return [
            'attempt_number' => $attemptNumber,
            'accuracy_percent' => $accuracy === null ? null : (int) $accuracy,
            'teacher_note' => $note,
            'data_gaps' => $missing,
        ];
    }

    /**
     * @param  Collection<int, AiReciteAttempt>|null  $allScoredAttempts
     * @param  array<int, array<string, mixed>>  $messages
     * @return array{
     *     attempts: list<array<string, mixed>>,
     *     max_attempts: int,
     *     attempts_left: int,
     *     data_gaps: list<string>
     * }
     */
    private function presentLearnerAttemptHistory(
        TeacherAssignmentRecipient $recipient,
        ?Collection $allScoredAttempts,
        array $messages,
        int $activityCount,
        int $target,
    ): array {
        $target = max(1, $target);
        $recipientId = (int) $recipient->id;

        $recipientAttempts = ($allScoredAttempts ?? collect())
            ->filter(fn (AiReciteAttempt $attempt) => (int) $attempt->teacher_assignment_recipient_id === $recipientId)
            ->sortBy(fn (AiReciteAttempt $attempt) => [(string) $attempt->created_at, (int) $attempt->id])
            ->values();

        $teacherMessages = collect($messages)
            ->filter(fn (array $message) => ($message['sender'] ?? null) === 'teacher'
                && trim((string) ($message['body'] ?? '')) !== '')
            ->values();

        $attempts = [];
        $gaps = [];
        $n = 0;
        foreach ($recipientAttempts as $attempt) {
            $n++;
            $score = $attempt->accuracy_percent;
            if ($score === null) {
                $gaps[] = 'score';
            }
            $audio = $this->attemptAudio->payload($attempt);
            $attempts[] = [
                'n' => $n,
                'score' => $score === null ? null : (int) $score,
                'completed_at' => $attempt->created_at?->toIso8601String(),
                'teacher_note' => $this->teacherNoteAtOrBefore($teacherMessages, $attempt->created_at),
                'has_recording' => (bool) ($audio['available'] ?? false),
                'recording_url' => ($audio['available'] ?? false) ? ($audio['url'] ?? null) : null,
                'attempt_id' => (int) $attempt->id,
            ];
        }

        if ($attempts === [] && $activityCount > 0) {
            $gaps[] = 'attempts_unavailable';
        }

        return [
            'attempts' => $attempts,
            'max_attempts' => $target,
            'attempts_left' => max(0, $target - $activityCount),
            'data_gaps' => array_values(array_unique($gaps)),
        ];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $teacherMessages
     */
    private function teacherNoteAtOrBefore(Collection $teacherMessages, ?Carbon $at): ?string
    {
        if ($at === null || $teacherMessages->isEmpty()) {
            return null;
        }

        $note = null;
        foreach ($teacherMessages as $message) {
            $created = isset($message['created_at'])
                ? Carbon::parse($message['created_at'])
                : null;
            if ($created !== null && $created->lte($at)) {
                $note = trim((string) ($message['body'] ?? ''));
            }
        }

        return $note !== '' ? $note : null;
    }

    /**
     * @return array<string, mixed>
     */
    private function presentLearnerAttemptEvidence(AiReciteAttempt $attempt, TeacherAssignment $assignment): array
    {
        $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
        $assignedRange = $this->presentAssignmentRange($assignment);
        $assessment = $attempt->assessment;
        $assessmentStatus = $assessment?->status;
        $transcript = $this->attemptTranscript($attempt);
        $words = TeacherRecitationWordEvidence::fromAttempt($attempt);

        return [
            'attempt_id' => (int) $attempt->id,
            'audio' => $this->attemptAudio->payload($attempt),
            'assessment_status' => $assessmentStatus,
            'state' => in_array($assessmentStatus, [MemorisationAssessment::STATUS_PENDING, MemorisationAssessment::STATUS_PROCESSING], true)
                ? 'processing'
                : 'ready',
            'transcript' => $transcript,
            'transcript_state' => $transcript !== null
                ? 'available'
                : (in_array($assessmentStatus, [MemorisationAssessment::STATUS_PENDING, MemorisationAssessment::STATUS_PROCESSING], true)
                    ? 'processing'
                    : 'not_recorded'),
            'range' => [
                'surah' => (int) ($range['surah'] ?? $range['surah_number'] ?? $assessment?->surah_number ?? $assignment->surah_number) ?: null,
                'from' => (int) ($range['from'] ?? $range['start'] ?? $assessment?->start_ayah ?? $assignment->ayah_start) ?: null,
                'to' => (int) ($range['to'] ?? $range['end'] ?? $assessment?->end_ayah ?? $assignment->ayah_end) ?: null,
            ],
            'assigned_range' => $assignedRange,
            'words' => $words,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function presentAssignmentRange(?TeacherAssignment $assignment): ?array
    {
        if ($assignment === null) {
            return null;
        }
        $surah = (int) $assignment->surah_number;
        $from = (int) $assignment->ayah_start;
        $to = (int) ($assignment->ayah_end ?: $from);

        return [
            'surah' => $surah,
            'from' => $from,
            'to' => max($from, $to),
            'surah_name' => QuranMetadata::name($surah),
        ];
    }

    private function syncRevisionRemindersForAssignment(TeacherAssignment $assignment): void
    {
        try {
            $sync = app(RevisionReminderSyncService::class);
            foreach ($assignment->recipients as $recipient) {
                $sync->syncTeacherAssignmentRecipient($recipient);
            }
        } catch (\Throwable $error) {
            report($error);
        }
    }

    private function attemptTranscript(AiReciteAttempt $attempt): ?string
    {
        $recognition = is_array($attempt->assessment?->recognition_data)
            ? $attempt->assessment->recognition_data
            : [];
        foreach ([
            data_get($recognition, 'raw.transcript'),
            data_get($recognition, 'normalised.transcript'),
            $recognition['transcript'] ?? null,
        ] as $candidate) {
            $value = trim((string) $candidate);
            if ($value !== '') {
                return mb_substr($value, 0, 5000);
            }
        }

        $heard = collect(is_array($attempt->word_statuses) ? $attempt->word_statuses : [])
            ->map(fn ($word) => is_array($word)
                ? ($word['detected_token'] ?? $word['detected'] ?? $word['actual'] ?? $word['recognised'] ?? $word['recognized'] ?? $word['heard'] ?? null)
                : null)
            ->filter(fn ($word) => is_string($word) && trim($word) !== '')
            ->map(fn (string $word) => trim($word))
            ->values();

        return $heard->isEmpty() ? null : mb_substr($heard->implode(' '), 0, 5000);
    }
}

<?php

namespace App\Services\Teacher;

use App\Enums\AssignmentKind;
use App\Enums\AssignmentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\TeacherNoteKind;
use App\Enums\UserSessionStatus;
use App\Models\AiReciteAttempt;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherNote;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Services\Learning\AiReciteAttemptAudioService;
use App\Support\QuranMetadata;
use App\Support\TeacherFeatures;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TeacherAssignmentService
{
    public function __construct(
        private readonly StudentAccessAuthorizer $access,
        private readonly TeacherAssignmentMessageAudioService $messageAudio,
        private readonly AiReciteAttemptAudioService $attemptAudio,
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

        $duplicateExists = TeacherAssignmentRecipient::query()
            ->whereIn('student_id', $recipients)
            ->where('status', '!=', AssignmentStatus::Completed->value)
            ->whereHas('assignment', function ($query) use ($teacher, $kind, $input, $surah, $start, $end) {
                $query->where('teacher_id', $teacher->id)
                    ->where('kind', $kind->value)
                    ->where('hifz_category', (string) $input['hifz_category'])
                    ->where('surah_number', $surah)
                    ->where('ayah_start', $start)
                    ->where('ayah_end', $end);
            })
            ->exists();
        if ($duplicateExists) {
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

        return DB::transaction(function () use ($teacher, $kind, $surah, $start, $end, $target, $input, $groupId, $recipients) {
            $assignment = new TeacherAssignment;
            $assignment->forceFill([
                'teacher_id' => $teacher->id,
                'organisation_id' => $teacher->organisation_id,
                'learning_group_id' => $groupId,
                'kind' => $kind->value,
                'hifz_category' => $input['hifz_category'],
                'surah_number' => $surah,
                'ayah_start' => $start,
                'ayah_end' => $end,
                'repetition_target' => $target,
                'due_at' => $input['due_at'] ?? null,
                'feedback' => $this->nullableText($input['feedback'] ?? null),
            ])->save();

            foreach ($recipients as $studentId) {
                $recipient = new TeacherAssignmentRecipient;
                $recipient->forceFill([
                    'teacher_assignment_id' => $assignment->id,
                    'student_id' => $studentId,
                    'status' => AssignmentStatus::Pending->value,
                ])->save();
            }

            return $assignment->load('recipients');
        });
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

        return DB::transaction(function () use ($teacher, $assignment, $input, $surah, $start, $end) {
            $locked = TeacherAssignment::query()->whereKey($assignment->id)->lockForUpdate()->firstOrFail();
            $this->assertManageable($teacher, $locked, true);
            $locked->forceFill([
                'kind' => $input['kind'],
                'hifz_category' => $input['hifz_category'],
                'surah_number' => $surah,
                'ayah_start' => $start,
                'ayah_end' => $end,
                'repetition_target' => $input['repetition_target'] ?? null,
                'due_at' => $input['due_at'] ?? null,
                'feedback' => $this->nullableText($input['feedback'] ?? null),
            ])->save();

            return $locked->refresh()->load('recipients');
        });
    }

    public function remove(User $teacher, TeacherAssignment $assignment): void
    {
        DB::transaction(function () use ($teacher, $assignment) {
            $locked = TeacherAssignment::query()->whereKey($assignment->id)->lockForUpdate()->firstOrFail();
            $this->assertManageable($teacher, $locked, true);
            $locked->delete();
        });
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

            if ($recipient->student_completed_at !== null) {
                if ($recipient->status !== AssignmentStatus::Completed) {
                    $recipient->forceFill([
                        'status' => AssignmentStatus::Completed->value,
                        'completed_at' => $recipient->completed_at ?? $recipient->student_completed_at,
                    ])->save();
                }

                continue;
            }

            $matches = $this->completedRepeats($recipient, $sessions, $attempts);

            $status = AssignmentStatus::Pending;
            if ($matches > 0 || $recipient->started_at !== null) {
                $status = AssignmentStatus::InProgress;
            }
            if ($assignment->due_at !== null && $assignment->due_at->copy()->endOfDay()->isPast()) {
                $status = AssignmentStatus::Overdue;
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

        $assignment = $recipient->assignment;
        if ($assignment === null || (int) $recipient->student_id !== (int) $student->id) {
            abort(404);
        }

        $current = $recipient->status instanceof AssignmentStatus
            ? $recipient->status
            : AssignmentStatus::tryFrom((string) $recipient->status);

        if ($current === AssignmentStatus::Completed) {
            return $recipient->refresh();
        }

        if ($recipient->started_at === null) {
            $recipient->forceFill([
                'started_at' => now(),
                'status' => AssignmentStatus::InProgress->value,
            ])->save();
        }

        return $recipient->refresh();
    }

    public function completeByStudent(User $student, TeacherAssignmentRecipient $recipient): TeacherAssignmentRecipient
    {
        TeacherFeatures::abortUnlessEnabled();

        $recipient->loadMissing('assignment');
        if ($recipient->assignment === null || (int) $recipient->student_id !== (int) $student->id) {
            abort(404);
        }

        if ($recipient->student_completed_at === null) {
            $progress = $this->progressForRecipient($recipient);
            if ((int) $progress['activity_count'] < (int) $progress['target']) {
                throw ValidationException::withMessages([
                    'assignment' => 'Complete the required linked activity before marking this task complete.',
                ]);
            }
            $completedAt = now();
            $recipient->forceFill([
                'status' => AssignmentStatus::Completed->value,
                'completed_at' => $recipient->completed_at ?? $completedAt,
                'student_completed_at' => $completedAt,
                'completion_evidence' => [
                    'activity_count' => (int) $progress['activity_count'],
                    'target' => (int) $progress['target'],
                    'confirmed_at' => $completedAt->toIso8601String(),
                ],
            ])->save();
        }

        return $recipient->refresh();
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
        if ($assignment === null || (int) $recipient->student_id !== (int) $student->id) {
            abort(404);
        }

        return $this->createAssignmentMessage($assignment, $student, TeacherNoteKind::Note, $body, $audio, $durationMs, $clientMessageId);
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

        $recipient = TeacherAssignmentRecipient::query()
            ->whereKey($id)
            ->where('student_id', $student->id)
            ->with('assignment')
            ->first();
        $assignment = $recipient?->assignment;

        $matches = $recipient !== null
            && $recipient->started_at !== null
            && $assignment !== null
            && $assignment->kind === $kind
            && (int) $assignment->surah_number === $surah
            && (int) $assignment->ayah_start === $ayahStart
            && (int) $assignment->ayah_end === $ayahEnd;

        if (! $matches) {
            throw ValidationException::withMessages([
                'teacher_assignment_recipient_id' => 'This task link is no longer valid. Return to Tasks and try again.',
            ]);
        }

        return $recipient;
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
     * @return array{completed: int, target: int, activity_count: int, attempt_count: int|null, completion_count: int|null, resume_available: bool}
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
            return ['completed' => 0, 'target' => $target, 'activity_count' => 0, 'attempt_count' => null, 'completion_count' => null, 'resume_available' => false];
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

        $activityCount = $this->completedRepeats($recipient, $completedSessions, $scoredAttempts);
        if ($recipient->student_completed_at !== null) {
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
            'attempt_count' => ($assignment->kind instanceof AssignmentKind ? $assignment->kind->value : (string) $assignment->kind) === AssignmentKind::AiRecite->value ? $activityCount : null,
            'completion_count' => ($assignment->kind instanceof AssignmentKind ? $assignment->kind->value : (string) $assignment->kind) === AssignmentKind::AiRecite->value ? null : $activityCount,
            'resume_available' => $this->resumeSessionId($recipient, $unfinishedSessions) !== null,
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
        $assignment = $recipient->assignment;
        $status = $this->displayStatus($recipient, $assignment);

        $payload = [
            'id' => (int) $recipient->id,
            'assignment_id' => (int) $recipient->teacher_assignment_id,
            'student_id' => (int) $recipient->student_id,
            'status' => $status,
            'started_at' => $recipient->started_at?->toIso8601String(),
            'completed_at' => $recipient->completed_at?->toIso8601String(),
            'updated_at' => $recipient->updated_at?->toIso8601String(),
            'completion_evidence' => $recipient->completion_evidence,
        ];

        if ($assignment) {
            $latestAttempt = AiReciteAttempt::query()
                ->where('user_id', $recipient->student_id)
                ->where('teacher_assignment_recipient_id', $recipient->id)
                ->with('assessment:id,recognition_data')
                ->latest('created_at')->latest('id')->first();
            $recognition = $latestAttempt?->assessment?->recognition_data;
            $transcript = is_array($recognition)
                ? (data_get($recognition, 'raw.transcript') ?: data_get($recognition, 'normalised.transcript') ?: ($recognition['transcript'] ?? null))
                : null;
            if (! $transcript && $latestAttempt) {
                $heard = collect(is_array($latestAttempt->word_statuses) ? $latestAttempt->word_statuses : [])
                    ->map(fn ($word) => is_array($word) ? ($word['detected_token'] ?? $word['actual'] ?? $word['recognised'] ?? $word['recognized'] ?? $word['heard'] ?? null) : null)
                    ->filter(fn ($word) => is_string($word) && trim($word) !== '')
                    ->values();
                $transcript = $heard->isEmpty() ? null : $heard->implode(' ');
            }
            $payload['evidence'] = $latestAttempt ? [
                'attempt_id' => (int) $latestAttempt->id,
                'audio' => $this->attemptAudio->payload($latestAttempt),
                'transcript' => $transcript ? mb_substr(trim((string) $transcript), 0, 5000) : null,
            ] : null;
            $resumeSessionId = $this->resumeSessionId($recipient, $unfinishedSessions);
            $payload['assignment'] = $this->presentAssignment($assignment);
            $payload['progress'] = $this->progressForRecipient(
                $recipient,
                $completedSessions,
                $scoredAttempts,
                $unfinishedSessions,
            );
            $payload['href'] = $this->practiceHref($assignment, $resumeSessionId, (int) $recipient->id);
            $payload['messages'] = $this->assignmentMessages($assignment, (int) $recipient->student_id, $viewerId);
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
            'surah_number' => (int) $assignment->surah_number,
            'surah_name' => QuranMetadata::name((int) $assignment->surah_number),
            'ayah_start' => (int) $assignment->ayah_start,
            'ayah_end' => (int) $assignment->ayah_end,
            'repetition_target' => $assignment->repetition_target,
            'due_at' => $assignment->due_at?->toIso8601String(),
            'feedback' => $assignment->feedback,
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
    private function assignmentMessages(TeacherAssignment $assignment, int $studentId, ?int $viewerId = null): array
    {
        $notes = $assignment->relationLoaded('notes')
            ? $assignment->notes
            : $assignment->notes()->with('teacher:id,name')->get();

        $thread = $notes
            ->where('student_id', $studentId)
            ->sortBy(fn (TeacherNote $note) => sprintf('%020d', (int) $note->id))
            ->values();
        $presented = $thread
            ->map(fn (TeacherNote $note) => $this->presentAssignmentMessage($note, $viewerId))
            ->values()
            ->all();
        if ($viewerId !== null) {
            $unreadIds = $thread->filter(fn (TeacherNote $note) => $note->read_at === null && ! $this->assignmentMessageSentBy($note, $viewerId))->pluck('id');
            if ($unreadIds->isNotEmpty()) {
                TeacherNote::query()->whereIn('id', $unreadIds)->whereNull('read_at')->update(['read_at' => now()]);
            }
        }

        return $presented;
    }

    /**
     * @return array<string, mixed>
     */
    public function presentAssignmentMessage(TeacherNote $note, ?int $viewerId = null): array
    {
        $kind = $note->kind instanceof TeacherNoteKind ? $note->kind : TeacherNoteKind::tryFrom((string) $note->kind);

        return [
            'id' => (int) $note->id,
            'sender' => $kind === TeacherNoteKind::Feedback ? 'teacher' : 'student',
            'sender_name' => $kind === TeacherNoteKind::Feedback ? $note->teacher?->name : null,
            'body' => $note->body,
            'audio' => $this->messageAudio->payload($note),
            'created_at' => $note->created_at?->toIso8601String(),
            'read_at' => $note->read_at?->toIso8601String(),
            'unread' => $viewerId !== null && $note->read_at === null && ! $this->assignmentMessageSentBy($note, $viewerId),
            'delivery_status' => $note->read_at === null ? 'sent' : 'read',
        ];
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

    private function displayStatus(TeacherAssignmentRecipient $recipient, ?TeacherAssignment $assignment): string
    {
        $status = $recipient->status instanceof AssignmentStatus
            ? $recipient->status->value
            : (string) $recipient->status;

        return $status === AssignmentStatus::AwaitingConfirmation->value
            ? AssignmentStatus::InProgress->value
            : $status;
    }

    private function nullableText(mixed $value): ?string
    {
        $text = trim((string) $value);

        return $text === '' ? null : $text;
    }
}

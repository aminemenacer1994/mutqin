<?php

namespace App\Services\Teacher;

use App\Enums\AssignmentKind;
use App\Enums\AssignmentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\UserSessionStatus;
use App\Models\AiReciteAttempt;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Support\QuranMetadata;
use App\Support\TeacherFeatures;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TeacherAssignmentService
{
    public function __construct(private readonly StudentAccessAuthorizer $access) {}

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

        $sessions = UserSession::query()
            ->whereIn('user_id', $studentIds)
            ->where('is_onboarding_example', false)
            ->where('status', UserSessionStatus::Completed->value)
            ->get();

        $attempts = AiReciteAttempt::query()
            ->validScored()
            ->whereIn('user_id', $studentIds)
            ->get();

        foreach ($recipients as $recipient) {
            $assignment = $recipient->assignment;
            if ($assignment === null) {
                continue;
            }

            $matches = $this->completedRepeats($recipient, $sessions, $attempts);

            $target = max(1, (int) ($assignment->repetition_target ?? 1));
            $status = AssignmentStatus::Pending;
            if ($matches >= $target) {
                $status = AssignmentStatus::Completed;
            } elseif ($matches > 0 || $recipient->started_at !== null) {
                $status = AssignmentStatus::InProgress;
            }

            $completedAt = $recipient->completed_at;
            if ($status === AssignmentStatus::Completed) {
                $completedAt = $completedAt ?? now();
            } else {
                $completedAt = null;
            }

            if ($recipient->status !== $status || $recipient->completed_at?->eq($completedAt) === false) {
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

        if ($recipient->status !== AssignmentStatus::Completed && $recipient->started_at === null) {
            $recipient->forceFill([
                'started_at' => now(),
                'status' => AssignmentStatus::InProgress->value,
            ])->save();
        }

        return $recipient->refresh();
    }

    public function practiceHref(TeacherAssignment $assignment, ?int $resumeSessionId = null): string
    {
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
            fn (UserSession $session) => $this->sessionMatches($session, $assignment, (int) $recipient->student_id)
        );

        return $match ? (int) $match->id : null;
    }

    /**
     * @return array{completed: int, target: int, resume_available: bool}
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
            return ['completed' => 0, 'target' => $target, 'resume_available' => false];
        }

        if ($completedSessions === null || $scoredAttempts === null) {
            $studentId = (int) $recipient->student_id;
            $completedSessions = UserSession::query()
                ->where('user_id', $studentId)
                ->where('is_onboarding_example', false)
                ->where('status', UserSessionStatus::Completed->value)
                ->get();
            $scoredAttempts = AiReciteAttempt::query()
                ->validScored()
                ->where('user_id', $studentId)
                ->get();
        }

        $completed = $this->completedRepeats($recipient, $completedSessions, $scoredAttempts);

        return [
            'completed' => $completed,
            'target' => $target,
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
        ];

        if ($assignment) {
            $resumeSessionId = $this->resumeSessionId($recipient, $unfinishedSessions);
            $payload['assignment'] = $this->presentAssignment($assignment);
            $payload['progress'] = $this->progressForRecipient(
                $recipient,
                $completedSessions,
                $scoredAttempts,
                $unfinishedSessions,
            );
            $payload['href'] = $this->practiceHref($assignment, $resumeSessionId);
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
            return $scoredAttempts
                ->filter(fn (AiReciteAttempt $attempt) => $this->attemptMatches($attempt, $assignment, (int) $recipient->student_id))
                ->count();
        }

        return $completedSessions
            ->filter(fn (UserSession $session) => $this->sessionMatches($session, $assignment, (int) $recipient->student_id))
            ->count();
    }

    private function sessionMatches(UserSession $session, TeacherAssignment $assignment, int $studentId): bool
    {
        if ((int) $session->user_id !== $studentId || (int) $session->surah_number !== (int) $assignment->surah_number) {
            return false;
        }
        if ($session->ended_at !== null && $assignment->created_at !== null && $session->ended_at->lt($assignment->created_at)) {
            return false;
        }
        if ($session->ended_at === null && $session->last_activity_at !== null && $assignment->created_at !== null && $session->last_activity_at->lt($assignment->created_at)) {
            return false;
        }

        $meta = is_array($session->metadata) ? $session->metadata : [];
        $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
        $start = (int) ($config['rangeStart'] ?? $meta['range_start'] ?? 0);
        $end = (int) ($config['rangeEnd'] ?? $meta['range_end'] ?? 0);

        return $start > 0 && $end >= $start
            && $start <= (int) $assignment->ayah_start
            && $end >= (int) $assignment->ayah_end;
    }

    private function attemptMatches(AiReciteAttempt $attempt, TeacherAssignment $assignment, int $studentId): bool
    {
        if ((int) $attempt->user_id !== $studentId || ! $this->exactRange($attempt, $assignment)) {
            return false;
        }

        return $attempt->created_at === null
            || $assignment->created_at === null
            || $attempt->created_at->gte($assignment->created_at);
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

        if ($status !== AssignmentStatus::Completed->value && $assignment?->due_at !== null && $assignment->due_at->isPast()) {
            return AssignmentStatus::Overdue->value;
        }

        return $status;
    }

    private function nullableText(mixed $value): ?string
    {
        $text = trim((string) $value);

        return $text === '' ? null : $text;
    }
}

<?php

namespace App\Services\Parent;

use App\Enums\AssignmentStatus;
use App\Enums\LearningPlanStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\ParentGuardianPermission;
use App\Enums\ParentLinkStatus;
use App\Enums\TeacherNoteKind;
use App\Models\GroupMembership;
use App\Models\LearningPlan;
use App\Models\MemorisationProgress;
use App\Models\ParentStudentLink;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherAttendanceRecord;
use App\Models\TeacherNote;
use App\Models\User;
use App\Support\PlatformContextResolver;
use App\Support\QuranMetadata;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Family dashboard for an approved guardian. Counts and lists come from the
 * children's real records, and each section is omitted when that link does
 * not grant the matching permission.
 */
class ParentFamilyDashboardService
{
    public const RECENT_DAYS = 30;

    public function __construct(
        private readonly ParentAccessAuthorizer $access,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function present(User $parent): array
    {
        $studentIds = $this->access->authorizedStudentIds($parent)->all();
        $children = $studentIds === []
            ? collect()
            : User::query()->whereIn('id', $studentIds)->orderBy('name')->get(['id', 'name']);

        $links = $studentIds === []
            ? collect()
            : ParentStudentLink::query()
                ->where('parent_user_id', $parent->id)
                ->whereIn('student_user_id', $studentIds)
                ->where('status', ParentLinkStatus::Approved->value)
                ->get()
                ->keyBy(fn (ParentStudentLink $link) => (int) $link->student_user_id);

        $assignmentIds = $this->idsAllowing($links, ParentGuardianPermission::ViewAssignments);
        $progressIds = $this->idsAllowing($links, ParentGuardianPermission::ViewProgress);
        $messageIds = $this->idsAllowing($links, ParentGuardianPermission::ViewMessages);
        $attendanceIds = $this->idsAllowing($links, ParentGuardianPermission::ViewAttendance);
        $studentIdsList = $children->pluck('id')->all();
        $teachers = $this->teachersFor($studentIdsList);
        $groups = $this->groupsFor($studentIdsList);
        $recipients = $this->recipientsFor($assignmentIds);
        $plans = $this->plansFor($progressIds);
        $progress = $this->progressFor($progressIds);
        $feedback = $this->feedbackFor($messageIds);

        $presentedChildren = $children->map(function (User $child) use ($links, $teachers, $groups, $recipients, $plans, $progress) {
            $id = (int) $child->id;
            $link = $links->get($id);
            $canAssignments = $link instanceof ParentStudentLink && $link->allowsPermission(ParentGuardianPermission::ViewAssignments->value);
            $canProgress = $link instanceof ParentStudentLink && $link->allowsPermission(ParentGuardianPermission::ViewProgress->value);
            $canAttendance = $link instanceof ParentStudentLink && $link->allowsPermission(ParentGuardianPermission::ViewAttendance->value);
            $childRecipients = $recipients->get($id, collect());

            return [
                'id' => $id,
                'name' => $child->name,
                'group_name' => $groups->get($id),
                'teachers' => $teachers->get($id, collect())->values()->all(),
                'permissions' => [
                    'assignments' => $canAssignments,
                    'progress' => $canProgress,
                    'messages' => $link instanceof ParentStudentLink && $link->allowsPermission(ParentGuardianPermission::ViewMessages->value),
                    'attendance' => $canAttendance,
                ],
                'learning' => $canProgress ? $this->learningArea($plans->get($id), $childRecipients) : null,
                'progress' => $canProgress ? ($progress->get($id) ?? [
                    'recent_ayahs' => 0,
                    'last_activity_at' => null,
                ]) : null,
                'assignments' => $canAssignments ? $this->assignmentCounts($childRecipients) : null,
                'weekly' => $this->weeklyProgressSnapshot(
                    $childRecipients,
                    $canProgress ? (int) (($progress->get($id) ?? [])['practice_ayahs_week'] ?? 0) : 0,
                    $canAssignments,
                    $canProgress,
                ),
            ];
        })->values();

        $homework = $presentedChildren
            ->filter(fn (array $child) => $child['permissions']['assignments'])
            ->flatMap(fn (array $child) => $this->homeworkRows($child, $recipients->get($child['id'], collect())))
            ->sortBy([
                ['overdue', 'desc'],
                ['due_at', 'asc'],
            ])
            ->take(8)
            ->values();

        $activity = $this->activityRows($presentedChildren, $recipients);

        $active = (int) $presentedChildren->sum(fn (array $child) => (int) ($child['assignments']['active'] ?? 0));
        $completed = (int) $presentedChildren->sum(fn (array $child) => (int) ($child['assignments']['completed'] ?? 0));
        $attention = (int) $presentedChildren->sum(fn (array $child) => (int) ($child['assignments']['needs_attention'] ?? 0));

        return [
            'parent' => [
                'id' => (int) $parent->id,
                'name' => $parent->name,
                'email' => $parent->email,
            ],
            'children_count' => $presentedChildren->count(),
            'children' => $presentedChildren->all(),
            'connection_links' => ParentStudentLink::query()
                ->where('parent_user_id', $parent->id)
                ->with('student:id,name')
                ->orderByDesc('id')
                ->get()
                ->map(fn (ParentStudentLink $link) => [
                    'id' => (int) $link->id,
                    'status' => $link->status?->value ?? (string) $link->status,
                    'relationship' => $link->relationship,
                    'child' => $link->student?->only(['id', 'name']),
                ])
                ->values()
                ->all(),
            'summary' => [
                'children' => $presentedChildren->count(),
                'active_assignments' => $active,
                'completed_assignments' => $completed,
                'needs_attention' => $attention,
                'assignments_shared' => $assignmentIds !== [],
                'progress_shared' => $progressIds !== [],
                'messages_shared' => $messageIds !== [],
                'message_unread' => $this->unreadMessages($parent, $messageIds),
            ],
            'homework' => $homework->all(),
            'activity' => $activity,
            'feedback' => $feedback->all(),
            'attendance_alerts' => $this->attendanceAlerts($attendanceIds, $children),
            'platforms' => PlatformContextResolver::routeUrls($parent),
            'phase' => 'learning',
        ];
    }

    /**
     * @param  Collection<int, ParentStudentLink>  $links
     * @return list<int>
     */
    private function idsAllowing(Collection $links, ParentGuardianPermission $permission): array
    {
        return $links
            ->filter(fn (ParentStudentLink $link) => $link->allowsPermission($permission->value))
            ->map(fn (ParentStudentLink $link) => (int) $link->student_user_id)
            ->values()
            ->all();
    }

    /**
     * @param  list<int>  $studentIds
     * @return Collection<int, string>
     */
    private function groupsFor(array $studentIds): Collection
    {
        if ($studentIds === []) {
            return collect();
        }

        return GroupMembership::query()
            ->whereIn('user_id', $studentIds)
            ->where('membership_role', MembershipRole::Student->value)
            ->where('status', MembershipStatus::Approved->value)
            ->with('learningGroup:id,name')
            ->orderBy('id')
            ->get()
            ->groupBy(fn (GroupMembership $membership) => (int) $membership->user_id)
            ->map(fn (Collection $rows) => $rows->first()?->learningGroup?->name)
            ->filter();
    }

    /**
     * @param  list<int>  $studentIds
     * @return Collection<int, Collection<int, array{id: int, name: string}>>
     */
    private function teachersFor(array $studentIds): Collection
    {
        if ($studentIds === []) {
            return collect();
        }

        $memberships = GroupMembership::query()
            ->whereIn('user_id', $studentIds)
            ->where('membership_role', MembershipRole::Student->value)
            ->where('status', MembershipStatus::Approved->value)
            ->get(['user_id', 'learning_group_id']);

        $groupIds = $memberships->pluck('learning_group_id')->unique()->values();
        if ($groupIds->isEmpty()) {
            return collect();
        }

        $teachers = GroupMembership::query()
            ->whereIn('learning_group_id', $groupIds)
            ->where('membership_role', MembershipRole::Teacher->value)
            ->where('status', MembershipStatus::Approved->value)
            ->with('user:id,name')
            ->get()
            ->groupBy('learning_group_id');

        return $memberships->groupBy(fn (GroupMembership $membership) => (int) $membership->user_id)
            ->map(function (Collection $rows) use ($teachers) {
                return $rows->flatMap(function (GroupMembership $membership) use ($teachers) {
                    return $teachers->get($membership->learning_group_id, collect())
                        ->map(fn (GroupMembership $teacher) => $teacher->user)
                        ->filter();
                })
                    ->unique('id')
                    ->reject(fn (User $teacher) => $rows->contains(fn (GroupMembership $membership) => (int) $membership->user_id === (int) $teacher->id))
                    ->map(fn (User $teacher) => [
                        'id' => (int) $teacher->id,
                        'name' => $teacher->name,
                    ])
                    ->values();
            });
    }

    /**
     * @param  list<int>  $studentIds
     * @return Collection<int, Collection<int, TeacherAssignmentRecipient>>
     */
    private function recipientsFor(array $studentIds): Collection
    {
        if ($studentIds === []) {
            return collect();
        }

        return TeacherAssignmentRecipient::query()
            ->whereIn('student_id', $studentIds)
            ->with('assignment.teacher:id,name')
            ->get()
            ->groupBy(fn (TeacherAssignmentRecipient $recipient) => (int) $recipient->student_id);
    }

    /**
     * @param  list<int>  $studentIds
     * @return Collection<int, LearningPlan>
     */
    private function plansFor(array $studentIds): Collection
    {
        if ($studentIds === []) {
            return collect();
        }

        return LearningPlan::query()
            ->whereIn('student_id', $studentIds)
            ->where('status', LearningPlanStatus::Active->value)
            ->orderByDesc('id')
            ->get()
            ->unique(fn (LearningPlan $plan) => (int) $plan->student_id)
            ->keyBy(fn (LearningPlan $plan) => (int) $plan->student_id);
    }

    /**
     * @param  list<int>  $studentIds
     * @return Collection<int, array{recent_ayahs: int, last_activity_at: ?string}>
     */
    private function progressFor(array $studentIds): Collection
    {
        if ($studentIds === []) {
            return collect();
        }

        $since = now()->subDays(self::RECENT_DAYS);

        $weekStart = now()->startOfWeek();

        return MemorisationProgress::query()
            ->whereIn('user_id', $studentIds)
            ->groupBy('user_id')
            ->selectRaw(
                'user_id, MAX(created_at) as last_activity_at, '
                .'SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as recent_ayahs, '
                .'SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as practice_ayahs_week',
                [$since, $weekStart],
            )
            ->get()
            ->mapWithKeys(function (MemorisationProgress $row) {
                $latest = $row->getAttribute('last_activity_at');

                return [(int) $row->user_id => [
                    'recent_ayahs' => (int) $row->getAttribute('recent_ayahs'),
                    'practice_ayahs_week' => (int) $row->getAttribute('practice_ayahs_week'),
                    'last_activity_at' => $latest ? Carbon::parse($latest)->toIso8601String() : null,
                ]];
            });
    }

    /**
     * @param  list<int>  $studentIds
     */
    private function unreadMessages(User $parent, array $studentIds): int
    {
        if ($studentIds === []) {
            return 0;
        }

        return TeacherNote::query()
            ->where('parent_user_id', $parent->id)
            ->whereIn('student_id', $studentIds)
            ->where('kind', TeacherNoteKind::TeacherMessage->value)
            ->whereNotNull('parent_user_id')
            ->whereNull('read_at')
            ->count();
    }

    /**
     * @param  list<int>  $studentIds
     * @return Collection<int, array<string, mixed>>
     */
    private function feedbackFor(array $studentIds): Collection
    {
        if ($studentIds === []) {
            return collect();
        }

        return TeacherNote::query()
            ->whereIn('student_id', $studentIds)
            ->where('kind', TeacherNoteKind::Feedback->value)
            ->whereNotNull('body')
            ->with(['teacher:id,name', 'student:id,name'])
            ->latest('id')
            ->limit(8)
            ->get()
            ->map(function (TeacherNote $note) {
                $body = trim((string) $note->body);

                return [
                    'id' => (int) $note->id,
                    'child_id' => (int) $note->student_id,
                    'child_name' => $note->student?->name,
                    'teacher_id' => (int) $note->teacher_id,
                    'teacher_name' => $note->teacher?->name,
                    'excerpt' => mb_substr($body, 0, 180),
                    'unread' => $note->read_at === null,
                    'at' => $note->created_at?->toIso8601String(),
                ];
            })
            ->filter(fn (array $row) => $row['excerpt'] !== '' && $row['child_name'] !== null)
            ->values();
    }

    /**
     * @param  Collection<int, TeacherAssignmentRecipient>  $recipients
     * @return array{active: int, completed: int, needs_attention: int}
     */
    private function assignmentCounts(Collection $recipients): array
    {
        $active = 0;
        $completed = 0;
        $attention = 0;
        foreach ($recipients as $recipient) {
            if ($recipient->status === AssignmentStatus::Completed) {
                $completed++;

                continue;
            }
            $active++;
            if ($this->isOverdue($recipient)) {
                $attention++;
            }
        }

        return [
            'active' => $active,
            'completed' => $completed,
            'needs_attention' => $attention,
        ];
    }

    /**
     * @param  Collection<int, TeacherAssignmentRecipient>  $recipients
     * @return array<string, mixed>|null
     */
    private function learningArea(?LearningPlan $plan, Collection $recipients): ?array
    {
        $open = $recipients->first(fn (TeacherAssignmentRecipient $recipient) => $recipient->status !== AssignmentStatus::Completed);
        $assignment = $open?->assignment ?? $recipients->first()?->assignment;
        if ($plan === null && $assignment === null) {
            return null;
        }

        return [
            'plan_title' => $plan?->title,
            'activity' => $assignment?->activity,
            'surah_name' => $assignment ? QuranMetadata::name((int) $assignment->surah_number) : null,
            'ayah_start' => $assignment ? (int) $assignment->ayah_start : null,
            'ayah_end' => $assignment ? (int) $assignment->ayah_end : null,
        ];
    }

    /**
     * @param  array<string, mixed>  $child
     * @param  Collection<int, TeacherAssignmentRecipient>  $recipients
     * @return Collection<int, array<string, mixed>>
     */
    private function homeworkRows(array $child, Collection $recipients): Collection
    {
        return $recipients
            ->filter(fn (TeacherAssignmentRecipient $recipient) => $recipient->status !== AssignmentStatus::Completed && $recipient->assignment !== null)
            ->map(function (TeacherAssignmentRecipient $recipient) use ($child) {
                $assignment = $recipient->assignment;
                $overdue = $this->isOverdue($recipient);
                $dueAt = $assignment->due_at;

                return [
                    'id' => (int) $recipient->id,
                    'child_id' => (int) $child['id'],
                    'child_name' => $child['name'],
                    'teacher_name' => $assignment->teacher?->name,
                    'activity' => $assignment->activity,
                    'surah_name' => QuranMetadata::name((int) $assignment->surah_number),
                    'ayah_start' => (int) $assignment->ayah_start,
                    'ayah_end' => (int) $assignment->ayah_end,
                    'status' => $overdue ? 'overdue' : $recipient->status?->value,
                    'overdue' => $overdue,
                    'due_soon' => ! $overdue && $dueAt !== null && $dueAt->isFuture() && $dueAt->lte(now()->addHours(48)),
                    'due_at' => $dueAt?->toIso8601String(),
                    'feedback' => $assignment->feedback ? mb_substr(trim((string) $assignment->feedback), 0, 180) : null,
                ];
            });
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $children
     * @param  Collection<int, Collection<int, TeacherAssignmentRecipient>>  $recipients
     * @return list<array<string, mixed>>
     */
    private function activityRows(Collection $children, Collection $recipients): array
    {
        $rows = collect();
        foreach ($children as $child) {
            if ($child['permissions']['progress'] && ! empty($child['progress']['last_activity_at'])) {
                $rows->push([
                    'id' => 'progress-'.$child['id'],
                    'child_id' => $child['id'],
                    'child_name' => $child['name'],
                    'kind' => 'practice',
                    'at' => $child['progress']['last_activity_at'],
                    'recent_ayahs' => (int) $child['progress']['recent_ayahs'],
                    'activity' => $child['learning']['activity'] ?? null,
                    'surah_name' => $child['learning']['surah_name'] ?? null,
                ]);
            }
            if (! $child['permissions']['assignments']) {
                continue;
            }
            $done = $recipients->get($child['id'], collect())
                ->filter(fn (TeacherAssignmentRecipient $recipient) => $recipient->status === AssignmentStatus::Completed)
                ->sortByDesc(fn (TeacherAssignmentRecipient $recipient) => $recipient->completed_at?->getTimestamp() ?? 0)
                ->first();
            if ($done instanceof TeacherAssignmentRecipient && $done->assignment !== null) {
                $rows->push([
                    'id' => 'completed-'.$done->id,
                    'child_id' => $child['id'],
                    'child_name' => $child['name'],
                    'kind' => 'completed',
                    'at' => ($done->completed_at ?? $done->updated_at)?->toIso8601String(),
                    'activity' => $done->assignment->activity,
                    'surah_name' => QuranMetadata::name((int) $done->assignment->surah_number),
                    'ayah_start' => (int) $done->assignment->ayah_start,
                    'ayah_end' => (int) $done->assignment->ayah_end,
                ]);
            }
        }

        return $rows->sortByDesc('at')->take(8)->values()->all();
    }

    private function isOverdue(TeacherAssignmentRecipient $recipient): bool
    {
        $due = $recipient->assignment?->due_at;
        if ($due === null || ! $due->isPast()) {
            return false;
        }

        return in_array($recipient->status, [AssignmentStatus::Pending, AssignmentStatus::InProgress], true);
    }

    /**
     * @param  Collection<int, TeacherAssignmentRecipient>  $recipients
     * @return array{completed: int, due: int, practice_ayahs: int}|null
     */
    private function weeklyProgressSnapshot(
        Collection $recipients,
        int $practiceAyahsWeek,
        bool $canAssignments,
        bool $canProgress,
    ): ?array {
        if (! $canAssignments && ! $canProgress) {
            return null;
        }

        $completed = 0;
        $due = 0;
        if ($canAssignments) {
            $start = now()->startOfWeek();
            $end = now()->endOfWeek();
            foreach ($recipients as $recipient) {
                $assignment = $recipient->assignment;
                if ($assignment === null) {
                    continue;
                }
                $dueAt = $assignment->due_at;
                if ($recipient->status === AssignmentStatus::Completed) {
                    $finished = $recipient->completed_at ?? $recipient->updated_at;
                    if ($finished !== null && $finished->between($start, $end)) {
                        $completed++;
                    }

                    continue;
                }
                if ($dueAt !== null && $dueAt->between($start, $end)) {
                    $due++;
                }
            }
        }

        return [
            'completed' => $completed,
            'due' => $due,
            'practice_ayahs' => $canProgress ? $practiceAyahsWeek : 0,
        ];
    }

    /**
     * @param  list<int>  $studentIds
     * @param  Collection<int, User>  $children
     * @return list<array{child_id: int, child_name: string, date: string, status: string}>
     */
    private function attendanceAlerts(array $studentIds, Collection $children): array
    {
        if ($studentIds === []) {
            return [];
        }

        $names = $children->mapWithKeys(fn (User $child) => [(int) $child->id => $child->name]);

        return TeacherAttendanceRecord::query()
            ->whereIn('student_id', $studentIds)
            ->whereIn('status', ['absent', 'late'])
            ->whereDate('attendance_date', '>=', now()->subDays(14)->toDateString())
            ->orderByDesc('attendance_date')
            ->limit(6)
            ->get(['student_id', 'attendance_date', 'status'])
            ->map(fn (TeacherAttendanceRecord $record) => [
                'child_id' => (int) $record->student_id,
                'child_name' => (string) ($names->get((int) $record->student_id) ?? ''),
                'date' => $record->attendance_date->toDateString(),
                'status' => (string) $record->status,
            ])
            ->filter(fn (array $row) => $row['child_name'] !== '')
            ->values()
            ->all();
    }
}

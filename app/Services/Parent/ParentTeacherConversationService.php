<?php

namespace App\Services\Parent;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\ParentGuardianPermission;
use App\Enums\ParentLinkStatus;
use App\Enums\TeacherNoteKind;
use App\Models\GroupMembership;
use App\Models\ParentStudentLink;
use App\Models\ParentStudentLinkEvent;
use App\Models\TeacherNote;
use App\Models\User;
use App\Services\Organisations\StudentAccessAuthorizer;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Parent–teacher threads live on teacher_notes, keyed by parent_user_id,
 * so they never join the student conversation.
 */
final class ParentTeacherConversationService
{
    private const PAGE_SIZE = 40;

    public function __construct(
        private readonly ParentAccessAuthorizer $parents,
        private readonly StudentAccessAuthorizer $teachers,
        private readonly ParentNoticeService $notices,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function inbox(User $parent): array
    {
        $students = $this->linkedStudents($parent);
        $teachersByStudent = $this->teachersForStudents($students);
        $studentIds = $students->map(fn (User $student) => (int) $student->id)->all();
        $notes = $studentIds === []
            ? collect()
            : TeacherNote::query()
                ->where('parent_user_id', $parent->id)
                ->whereIn('student_id', $studentIds)
                ->whereIn('kind', [TeacherNoteKind::ParentMessage->value, TeacherNoteKind::TeacherMessage->value])
                ->orderByDesc('id')
                ->get(['id', 'teacher_id', 'student_id', 'parent_user_id', 'kind', 'body', 'read_at', 'created_at'])
                ->groupBy(fn (TeacherNote $note) => (int) $note->teacher_id.'-'.(int) $note->student_id);

        $conversations = [];
        foreach ($students as $student) {
            foreach ($teachersByStudent->get((int) $student->id, collect()) as $teacher) {
                $thread = $notes->get((int) $teacher->id.'-'.(int) $student->id, collect());
                $last = $thread->first();
                $conversations[] = [
                    'teacher_id' => (int) $teacher->id,
                    'teacher_name' => $teacher->name,
                    'child_id' => (int) $student->id,
                    'child_name' => $student->name,
                    'unread' => $thread->filter(fn (TeacherNote $note) => $note->kind === TeacherNoteKind::TeacherMessage && $note->read_at === null)->count(),
                    'preview' => $last ? mb_substr(trim((string) $last->body), 0, 140) : null,
                    'last_at' => $last?->created_at?->toIso8601String(),
                    'state' => $last === null ? null : ($last->read_at ? 'read' : 'sent'),
                ];
            }
        }

        usort($conversations, function (array $left, array $right) {
            return strcmp((string) ($right['last_at'] ?? ''), (string) ($left['last_at'] ?? ''));
        });

        return $conversations;
    }

    /**
     * @return list<array<string, mixed>>
     */
    /**
     * @return array{messages: list<array<string, mixed>>, has_earlier: bool}
     */
    public function thread(User $parent, User $teacher, User $student, ?int $before = null): array
    {
        $this->authorise($parent, $teacher, $student);
        if ($before === null) {
            $this->markRead($parent, $parent, $teacher, $student);
        }

        return $this->presentThread($parent, $teacher, $student, $parent, $before);
    }

    public function send(User $parent, User $teacher, User $student, string $body, ?string $clientMessageId, ?Request $request): TeacherNote
    {
        $this->authorise($parent, $teacher, $student);
        $body = $this->body($body);
        if ($clientMessageId !== null) {
            $existing = TeacherNote::query()
                ->where('teacher_id', $teacher->id)
                ->where('student_id', $student->id)
                ->where('client_message_id', $clientMessageId)
                ->first();
            if ($existing instanceof TeacherNote && (int) $existing->parent_user_id === (int) $parent->id) {
                return $existing;
            }
            if ($existing instanceof TeacherNote) {
                $clientMessageId = null;
            }
        }

        $note = $this->store($parent, $teacher, $student, TeacherNoteKind::ParentMessage, $body, $clientMessageId);
        $this->audit($parent, $student, $parent, 'message_sent', [
            'teacher_note_id' => (int) $note->id,
            'teacher_id' => (int) $teacher->id,
        ], $request);
        $this->notices->teacherMessage($teacher, $note);

        return $note;
    }

    public function report(User $parent, TeacherNote $note, string $reason, ?Request $request): TeacherNote
    {
        $note->loadMissing(['teacher', 'student', 'parent']);
        $teacher = $note->teacher;
        $student = $note->student;
        abort_unless(
            $teacher instanceof User
            && $student instanceof User
            && (int) $note->parent_user_id === (int) $parent->id,
            404,
        );
        $this->authorise($parent, $teacher, $student);
        $reason = trim($reason);
        if ($reason === '' || mb_strlen($reason) > 500) {
            throw ValidationException::withMessages(['reason' => 'Describe the problem in 500 characters or fewer.']);
        }
        if ($note->reported_at !== null) {
            return $note;
        }

        $note->forceFill([
            'reported_at' => now(),
            'report_reason' => $reason,
        ])->save();
        $this->audit($parent, $student, $parent, 'message_reported', [
            'teacher_note_id' => (int) $note->id,
            'teacher_id' => (int) $teacher->id,
            'reason' => $reason,
        ], $request);
        $this->notices->teacherReport($teacher, $note);

        return $note->refresh();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function threadsForTeacher(User $teacher, User $student): array
    {
        abort_unless($this->teachers->allows($teacher, $student), 404);

        $threads = [];
        foreach ($this->parentsFor($student) as $parent) {
            if (! $this->teachers->allows($teacher, $student)) {
                continue;
            }
            $last = $this->notes($parent, $teacher, $student)->latest('id')->first();
            $unread = $this->notes($parent, $teacher, $student)
                ->where('kind', TeacherNoteKind::ParentMessage->value)
                ->whereNull('read_at')
                ->count();
            $threads[] = [
                'parent_id' => (int) $parent->id,
                'parent_name' => $parent->name,
                'student_id' => (int) $student->id,
                'student_name' => $student->name,
                'unread' => $unread,
                'preview' => $last ? mb_substr(trim((string) $last->body), 0, 140) : null,
                'last_at' => $last?->created_at?->toIso8601String(),
            ];
        }

        return $threads;
    }

    /**
     * @return array{messages: list<array<string, mixed>>, has_earlier: bool}
     */
    public function threadForTeacher(User $teacher, User $parent, User $student, ?int $before = null): array
    {
        $this->authorise($parent, $teacher, $student);
        if ($before === null) {
            $this->markRead($teacher, $parent, $teacher, $student);
        }

        return $this->presentThread($parent, $teacher, $student, $teacher, $before);
    }

    public function reply(User $teacher, User $parent, User $student, string $body, ?Request $request): TeacherNote
    {
        $this->authorise($parent, $teacher, $student);
        $this->markRead($teacher, $parent, $teacher, $student);
        $note = $this->store($parent, $teacher, $student, TeacherNoteKind::TeacherMessage, $this->body($body), null);
        $this->audit($parent, $student, $teacher, 'message_sent', [
            'teacher_note_id' => (int) $note->id,
            'teacher_id' => (int) $teacher->id,
        ], $request);
        $this->notices->reply($parent, $student, $note);

        return $note;
    }

    /**
     * @return array<string, mixed>
     */
    public function present(TeacherNote $note, User $viewer): array
    {
        $note->loadMissing(['teacher:id,name', 'student:id,name', 'parent:id,name']);
        $fromParent = $note->kind === TeacherNoteKind::ParentMessage;
        $own = $fromParent
            ? (int) $viewer->id === (int) $note->parent_user_id
            : (int) $viewer->id === (int) $note->teacher_id;
        $payload = [
            'id' => (int) $note->id,
            'sender' => $fromParent ? 'parent' : 'teacher',
            'sender_name' => $fromParent ? $note->parent?->name : $note->teacher?->name,
            'parent_id' => (int) $note->parent_user_id,
            'parent_name' => $note->parent?->name,
            'teacher_id' => (int) $note->teacher_id,
            'teacher_name' => $note->teacher?->name,
            'child_id' => (int) $note->student_id,
            'child_name' => $note->student?->name,
            'body' => $note->body,
            'state' => $note->read_at ? 'read' : 'sent',
            'unread' => $note->read_at === null && ! $own,
            'reported' => $note->reported_at !== null,
            'created_at' => $note->created_at?->toIso8601String(),
        ];
        if ((int) $viewer->id === (int) $note->teacher_id && $note->report_reason) {
            $payload['report_reason'] = $note->report_reason;
        }

        return $payload;
    }

    private function authorise(User $parent, User $teacher, User $student): void
    {
        abort_unless(
            $this->parents->allows($parent, $student, ParentGuardianPermission::ViewMessages->value)
            && $this->teachers->allows($teacher, $student),
            404,
        );
    }

    private function body(string $body): string
    {
        $body = trim($body);
        if ($body === '' || mb_strlen($body) > 2000) {
            throw ValidationException::withMessages([
                'body' => 'Write a message of up to 2,000 characters.',
            ]);
        }

        return $body;
    }

    private function store(User $parent, User $teacher, User $student, TeacherNoteKind $kind, string $body, ?string $clientMessageId): TeacherNote
    {
        $note = new TeacherNote;
        $note->forceFill([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'parent_user_id' => $parent->id,
            'organisation_id' => $teacher->organisation_id,
            'teacher_assignment_id' => null,
            'kind' => $kind->value,
            'body' => $body,
            'client_message_id' => $clientMessageId,
        ])->save();

        return $note->refresh();
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    private function audit(User $parent, User $student, User $actor, string $event, array $metadata, ?Request $request): void
    {
        $link = ParentStudentLink::query()
            ->where('parent_user_id', $parent->id)
            ->where('student_user_id', $student->id)
            ->where('status', ParentLinkStatus::Approved->value)
            ->first();
        if (! $link instanceof ParentStudentLink) {
            return;
        }

        ParentStudentLinkEvent::query()->create([
            'parent_student_link_id' => $link->id,
            'actor_user_id' => $actor->id,
            'event' => $event,
            'metadata' => $metadata,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'created_at' => now(),
        ]);
    }

    private function markRead(User $viewer, User $parent, User $teacher, User $student): void
    {
        $query = $this->notes($parent, $teacher, $student)->whereNull('read_at');
        if ((int) $viewer->id === (int) $parent->id) {
            $query->where('kind', TeacherNoteKind::TeacherMessage->value);
        } else {
            $query->where('kind', TeacherNoteKind::ParentMessage->value);
        }
        $query->update(['read_at' => now()]);
    }

    /**
     * @return array{messages: list<array<string, mixed>>, has_earlier: bool}
     */
    private function presentThread(User $parent, User $teacher, User $student, User $viewer, ?int $before = null): array
    {
        $query = $this->notes($parent, $teacher, $student)
            ->with(['teacher:id,name', 'student:id,name', 'parent:id,name'])
            ->orderByDesc('id');
        if ($before !== null) {
            $query->where('id', '<', $before);
        }

        $rows = $query->limit(self::PAGE_SIZE + 1)->get();
        $hasEarlier = $rows->count() > self::PAGE_SIZE;

        return [
            'messages' => $rows->take(self::PAGE_SIZE)
                ->sortBy('id')
                ->values()
                ->map(fn (TeacherNote $note) => $this->present($note, $viewer))
                ->all(),
            'has_earlier' => $hasEarlier,
        ];
    }

    private function notes(User $parent, User $teacher, User $student)
    {
        return TeacherNote::query()
            ->where('parent_user_id', $parent->id)
            ->where('teacher_id', $teacher->id)
            ->where('student_id', $student->id)
            ->whereIn('kind', [TeacherNoteKind::ParentMessage->value, TeacherNoteKind::TeacherMessage->value]);
    }

    /**
     * @return Collection<int, User>
     */
    private function linkedStudents(User $parent): Collection
    {
        return ParentStudentLink::query()
            ->where('parent_user_id', $parent->id)
            ->where('status', ParentLinkStatus::Approved->value)
            ->with('student')
            ->get()
            ->map(fn (ParentStudentLink $link) => $link->student)
            ->filter(function ($student) use ($parent) {
                return $student instanceof User
                    && $this->parents->allows($parent, $student, ParentGuardianPermission::ViewMessages->value);
            })
            ->values();
    }

    /**
     * Teachers currently allowed to see each student, loaded in a few queries.
     *
     * @param  Collection<int, User>  $students
     * @return Collection<int, Collection<int, User>>
     */
    private function teachersForStudents(Collection $students): Collection
    {
        if ($students->isEmpty()) {
            return collect();
        }

        $studentIds = $students->map(fn (User $student) => (int) $student->id)->all();
        $memberships = GroupMembership::query()
            ->whereIn('user_id', $studentIds)
            ->where('membership_role', MembershipRole::Student->value)
            ->where('status', MembershipStatus::Approved->value)
            ->get(['user_id', 'learning_group_id']);
        $groupIds = $memberships->pluck('learning_group_id')->unique()->values();
        if ($groupIds->isEmpty()) {
            return collect();
        }

        $teacherMemberships = GroupMembership::query()
            ->whereIn('learning_group_id', $groupIds)
            ->where('membership_role', MembershipRole::Teacher->value)
            ->where('status', MembershipStatus::Approved->value)
            ->with('user:id,name,account_role,organisation_id,deleted_at')
            ->get()
            ->groupBy('learning_group_id');

        $authorized = [];
        foreach ($teacherMemberships->flatten(1) as $membership) {
            $teacher = $membership->user;
            if (! $teacher instanceof User || isset($authorized[(int) $teacher->id])) {
                continue;
            }
            $authorized[(int) $teacher->id] = $this->teachers->authorizedStudentIds($teacher)->all();
        }

        return $memberships
            ->groupBy(fn (GroupMembership $membership) => (int) $membership->user_id)
            ->map(function (Collection $rows) use ($teacherMemberships, $authorized) {
                return $rows->flatMap(function (GroupMembership $membership) use ($teacherMemberships) {
                    return $teacherMemberships->get($membership->learning_group_id, collect())
                        ->map(fn (GroupMembership $teacherMembership) => $teacherMembership->user)
                        ->filter();
                })
                    ->unique('id')
                    ->filter(function (User $teacher) use ($rows, $authorized) {
                        $studentId = (int) $rows->first()?->user_id;

                        return $studentId !== (int) $teacher->id
                            && in_array($studentId, $authorized[(int) $teacher->id] ?? [], true);
                    })
                    ->values();
            });
    }

    /**
     * @return Collection<int, User>
     */
    private function parentsFor(User $student): Collection
    {
        return ParentStudentLink::query()
            ->where('student_user_id', $student->id)
            ->where('status', ParentLinkStatus::Approved->value)
            ->with('parent')
            ->get()
            ->map(fn (ParentStudentLink $link) => $link->parent)
            ->filter(function ($parent) use ($student) {
                return $parent instanceof User
                    && $this->parents->allows($parent, $student, ParentGuardianPermission::ViewMessages->value);
            })
            ->values();
    }
}

<?php

namespace App\Services\Teacher;

use App\Enums\TeacherNoteKind;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\GroupMembership;
use App\Models\TeacherNote;
use App\Models\User;
use App\Services\Organisations\StudentAccessAuthorizer;
use Illuminate\Validation\ValidationException;

class TeacherDirectMessageService
{
    public function __construct(private readonly StudentAccessAuthorizer $access) {}

    /** @return list<array<string, mixed>> */
    public function thread(User $teacher, User $student): array
    {
        abort_unless($this->access->allows($teacher, $student), 404);

        return TeacherNote::query()
            ->where('teacher_id', $teacher->id)
            ->where('student_id', $student->id)
            ->whereNull('teacher_assignment_id')
            ->whereIn('kind', [TeacherNoteKind::TeacherMessage->value, TeacherNoteKind::StudentMessage->value])
            ->orderBy('created_at')
            ->orderBy('id')
            ->limit(100)
            ->get()
            ->map(fn (TeacherNote $note) => $this->present($note))->all();
    }

    /** @return list<array<string, mixed>> */
    public function threadsForStudent(User $student): array
    {
        $groupIds = GroupMembership::query()
            ->where('user_id', $student->id)
            ->where('membership_role', MembershipRole::Student->value)
            ->where('status', MembershipStatus::Approved->value)
            ->pluck('learning_group_id');

        return User::query()->whereIn('id', GroupMembership::query()
            ->whereIn('learning_group_id', $groupIds)
            ->where('membership_role', MembershipRole::Teacher->value)
            ->where('status', MembershipStatus::Approved->value)
            ->pluck('user_id'))
            ->get(['id', 'name', 'account_role', 'organisation_id'])
            ->filter(fn (User $teacher) => $this->access->allows($teacher, $student))
            ->map(fn (User $teacher) => [
                'teacher_id' => (int) $teacher->id,
                'teacher_name' => $teacher->name,
                'messages' => $this->thread($teacher, $student),
            ])->values()->all();
    }

    public function send(User $sender, User $teacher, User $student, string $body): TeacherNote
    {
        abort_unless($this->access->allows($teacher, $student)
            && in_array((int) $sender->id, [(int) $teacher->id, (int) $student->id], true), 404);
        $body = trim($body);
        if ($body === '' || mb_strlen($body) > 2000) {
            throw ValidationException::withMessages(['body' => 'Write a message of up to 2,000 characters.']);
        }

        $note = new TeacherNote;
        $note->forceFill([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'organisation_id' => $teacher->organisation_id,
            'teacher_assignment_id' => null,
            'kind' => (int) $sender->id === (int) $teacher->id
                ? TeacherNoteKind::TeacherMessage->value
                : TeacherNoteKind::StudentMessage->value,
            'body' => $body,
        ])->save();

        return $note;
    }

    /** @return array<string, mixed> */
    public function present(TeacherNote $note): array
    {
        return [
            'id' => (int) $note->id,
            'sender' => $note->kind === TeacherNoteKind::TeacherMessage ? 'teacher' : 'student',
            'body' => $note->body,
            'created_at' => $note->created_at?->toIso8601String(),
        ];
    }
}

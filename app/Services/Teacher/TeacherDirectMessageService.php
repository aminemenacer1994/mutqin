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
    public function thread(User $teacher, User $student, ?User $viewer = null): array
    {
        abort_unless($this->access->allows($teacher, $student), 404);

        $viewer ??= $teacher;
        abort_unless(in_array((int) $viewer->id, [(int) $teacher->id, (int) $student->id], true), 404);

        $notes = TeacherNote::query()
            ->where('teacher_id', $teacher->id)
            ->where('student_id', $student->id)
            ->whereNull('teacher_assignment_id')
            ->whereIn('kind', [TeacherNoteKind::TeacherMessage->value, TeacherNoteKind::StudentMessage->value])
            ->with(['teacher:id,name', 'student:id,name'])
            ->orderBy('created_at')
            ->orderBy('id')
            ->limit(100)
            ->get();

        $presented = $notes->map(fn (TeacherNote $note) => $this->present($note, $viewer))->all();
        $unreadIds = $notes
            ->filter(fn (TeacherNote $note) => $note->read_at === null && ! $this->sentBy($note, $viewer))
            ->pluck('id');
        if ($unreadIds->isNotEmpty()) {
            TeacherNote::query()->whereIn('id', $unreadIds)->whereNull('read_at')->update(['read_at' => now()]);
        }

        return $presented;
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
                'messages' => $this->thread($teacher, $student, $student),
            ])->values()->all();
    }

    public function send(User $sender, User $teacher, User $student, string $body, ?string $clientMessageId = null): TeacherNote
    {
        abort_unless($this->access->allows($teacher, $student)
            && in_array((int) $sender->id, [(int) $teacher->id, (int) $student->id], true), 404);
        $body = trim($body);
        if ($body === '' || mb_strlen($body) > 2000) {
            throw ValidationException::withMessages(['body' => 'Write a message of up to 2,000 characters.']);
        }

        if ($clientMessageId !== null) {
            $existing = TeacherNote::query()
                ->where('teacher_id', $teacher->id)
                ->where('student_id', $student->id)
                ->where('client_message_id', $clientMessageId)
                ->where('kind', (int) $sender->id === (int) $teacher->id
                    ? TeacherNoteKind::TeacherMessage->value
                    : TeacherNoteKind::StudentMessage->value)
                ->first();
            if ($existing) {
                return $existing;
            }
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
            'client_message_id' => $clientMessageId,
        ])->save();

        return $note;
    }

    /** @return array<string, mixed> */
    public function present(TeacherNote $note, ?User $viewer = null): array
    {
        $sender = $note->kind === TeacherNoteKind::TeacherMessage ? 'teacher' : 'student';

        return [
            'id' => (int) $note->id,
            'sender' => $sender,
            'sender_name' => $sender === 'teacher' ? $note->teacher?->name : $note->student?->name,
            'body' => $note->body,
            'created_at' => $note->created_at?->toIso8601String(),
            'read_at' => $note->read_at?->toIso8601String(),
            'unread' => $viewer !== null && $note->read_at === null && ! $this->sentBy($note, $viewer),
            'delivery_status' => $note->read_at === null ? 'sent' : 'read',
        ];
    }

    private function sentBy(TeacherNote $note, User $viewer): bool
    {
        $teacherMessage = $note->kind === TeacherNoteKind::TeacherMessage;

        return $teacherMessage
            ? (int) $note->teacher_id === (int) $viewer->id
            : (int) $note->student_id === (int) $viewer->id;
    }
}

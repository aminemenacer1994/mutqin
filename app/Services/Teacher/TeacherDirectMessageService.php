<?php

namespace App\Services\Teacher;

use App\Enums\TeacherNoteKind;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\GroupMembership;
use App\Models\TeacherNote;
use App\Models\User;
use App\Services\Organisations\StudentAccessAuthorizer;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

class TeacherDirectMessageService
{
    public function __construct(
        private readonly StudentAccessAuthorizer $access,
        private readonly TeacherAssignmentMessageAudioService $messageAudio,
    ) {}

    /** @return list<array<string, mixed>> */
    public function thread(User $teacher, User $student, ?User $viewer = null): array
    {
        abort_unless($this->access->allows($teacher, $student), 404);

        $viewer ??= $teacher;
        abort_unless(in_array((int) $viewer->id, [(int) $teacher->id, (int) $student->id], true), 404);

        $notes = TeacherNote::query()
            ->where('teacher_id', $teacher->id)
            ->where('student_id', $student->id)
            ->where(function ($query) {
                $query->where(function ($direct) {
                    $direct->whereNull('teacher_assignment_id')
                        ->whereIn('kind', [TeacherNoteKind::TeacherMessage->value, TeacherNoteKind::StudentMessage->value]);
                })->orWhere(function ($task) {
                    $task->whereNotNull('teacher_assignment_id')
                        ->whereIn('kind', [TeacherNoteKind::Feedback->value, TeacherNoteKind::Note->value]);
                });
            })
            ->with(['teacher:id,name', 'student:id,name', 'assignment:id,surah_number,ayah_start,ayah_end'])
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

    public function send(
        User $sender,
        User $teacher,
        User $student,
        string $body,
        ?string $clientMessageId = null,
        ?UploadedFile $audio = null,
        ?int $durationMs = null,
    ): TeacherNote {
        abort_unless($this->access->allows($teacher, $student)
            && in_array((int) $sender->id, [(int) $teacher->id, (int) $student->id], true), 404);
        $body = trim($body);
        if (($body === '' && $audio === null) || mb_strlen($body) > 2000) {
            throw ValidationException::withMessages(['body' => 'Write a message or add a voice note of up to 2,000 characters.']);
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

        if ($audio !== null && ! $this->messageAudio->store($note, $audio, $durationMs)) {
            $note->delete();
            throw ValidationException::withMessages([
                'audio' => 'Use a supported voice recording smaller than 8 MB.',
            ]);
        }

        return $note->refresh();
    }

    public function delete(User $teacher, User $student, int $noteId): void
    {
        abort_unless($this->access->allows($teacher, $student), 404);
        $note = TeacherNote::query()
            ->where('teacher_id', $teacher->id)
            ->where('student_id', $student->id)
            ->whereKey($noteId)
            ->firstOrFail();
        $kind = $note->kind instanceof TeacherNoteKind ? $note->kind : TeacherNoteKind::tryFrom((string) $note->kind);
        abort_unless(in_array($kind, [TeacherNoteKind::TeacherMessage, TeacherNoteKind::StudentMessage], true)
            && $note->teacher_assignment_id === null, 404);
        abort_unless($kind === TeacherNoteKind::TeacherMessage, 403);
        $note->delete();
    }

    /** @return array<string, mixed> */
    public function present(TeacherNote $note, ?User $viewer = null): array
    {
        $kind = $note->kind instanceof TeacherNoteKind ? $note->kind : TeacherNoteKind::tryFrom((string) $note->kind);
        $sender = in_array($kind, [TeacherNoteKind::TeacherMessage, TeacherNoteKind::Feedback], true)
            ? 'teacher'
            : 'student';
        $assignment = $note->assignment;

        return [
            'id' => (int) $note->id,
            'sender' => $sender,
            'sender_name' => $sender === 'teacher' ? $note->teacher?->name : $note->student?->name,
            'body' => $note->body,
            'audio' => $this->messageAudio->payload($note),
            'task' => $assignment ? [
                'id' => (int) $assignment->id,
                'surah_number' => (int) $assignment->surah_number,
                'surah_name' => \App\Support\QuranMetadata::name((int) $assignment->surah_number),
                'ayah_start' => (int) $assignment->ayah_start,
                'ayah_end' => (int) $assignment->ayah_end,
            ] : null,
            'created_at' => $note->created_at?->toIso8601String(),
            'read_at' => $note->read_at?->toIso8601String(),
            'unread' => $viewer !== null && $note->read_at === null && ! $this->sentBy($note, $viewer),
            'delivery_status' => $note->read_at === null ? 'sent' : 'read',
        ];
    }

    private function sentBy(TeacherNote $note, User $viewer): bool
    {
        $kind = $note->kind instanceof TeacherNoteKind ? $note->kind : TeacherNoteKind::tryFrom((string) $note->kind);
        $teacherMessage = in_array($kind, [TeacherNoteKind::TeacherMessage, TeacherNoteKind::Feedback], true);

        return $teacherMessage
            ? (int) $note->teacher_id === (int) $viewer->id
            : (int) $note->student_id === (int) $viewer->id;
    }
}

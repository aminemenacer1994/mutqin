<?php

namespace App\Services\Teacher;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\TeacherNoteKind;
use App\Models\GroupMembership;
use App\Models\TeacherNote;
use App\Models\User;
use App\Services\Learning\StudentMessagingPolicy;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Support\QuranMetadata;
use App\Support\TeacherOverviewCache;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

class TeacherDirectMessageService
{
    public function __construct(
        private readonly StudentAccessAuthorizer $access,
        private readonly TeacherAssignmentMessageAudioService $messageAudio,
        private readonly StudentMessagingPolicy $messaging,
    ) {}

    /** @return list<array<string, mixed>> */
    public function thread(User $teacher, User $student, ?User $viewer = null, bool $markRead = true, ?int $before = null, ?int $limit = null): array
    {
        abort_unless($this->access->allows($teacher, $student), 404);

        $viewer ??= $teacher;
        abort_unless(in_array((int) $viewer->id, [(int) $teacher->id, (int) $student->id], true), 404);

        $query = $this->threadQuery($teacher, $student);
        if ($before !== null) {
            $cursor = (clone $query)->whereKey($before)->first();
            abort_unless($cursor, 404);
            $query->where(function ($older) use ($cursor) {
                $older->where('created_at', '<', $cursor->created_at)
                    ->orWhere(fn ($same) => $same->where('created_at', $cursor->created_at)->where('id', '<', $cursor->id));
            });
        }
        $notes = $limit === null
            ? $query->orderBy('created_at')->orderBy('id')->limit(100)->get()
            : $query->orderByDesc('created_at')->orderByDesc('id')->limit($limit)->get()->reverse()->values();

        if ($markRead) {
            $unreadIds = $notes
                ->filter(fn (TeacherNote $note) => $note->read_at === null && ! $this->sentBy($note, $viewer))
                ->pluck('id');
            if ($unreadIds->isNotEmpty()) {
                $readAt = now();
                TeacherNote::query()->whereIn('id', $unreadIds)->whereNull('read_at')->update(['read_at' => $readAt]);
                $notes->each(function (TeacherNote $note) use ($unreadIds, $readAt): void {
                    if ($unreadIds->contains($note->id)) {
                        $note->setAttribute('read_at', $readAt);
                    }
                });
                TeacherOverviewCache::forget((int) $teacher->id);
            }
        }

        return $notes->map(fn (TeacherNote $note) => $this->present($note, $viewer))->all();
    }

    private function threadQuery(User $teacher, User $student): \Illuminate\Database\Eloquent\Builder
    {
        return TeacherNote::query()
            ->where('teacher_id', $teacher->id)
            ->where('student_id', $student->id)
            ->whereNull('parent_user_id')
            ->where('kind', '!=', TeacherNoteKind::ParentMessage->value)
            ->where(function ($query) {
                $query->where(function ($direct) {
                    $direct->whereNull('teacher_assignment_id')
                        ->whereIn('kind', [TeacherNoteKind::TeacherMessage->value, TeacherNoteKind::StudentMessage->value]);
                })->orWhere('kind', TeacherNoteKind::Feedback->value)
                    ->orWhere(function ($taskReply) {
                        $taskReply->whereNotNull('teacher_assignment_id')
                            ->where('kind', TeacherNoteKind::Note->value);
                    });
            })
            ->with(['teacher:id,name', 'student:id,name', 'assignment:id,surah_number,ayah_start,ayah_end',
                'assignment.recipients' => fn ($query) => $query->where('student_id', $student->id),
            ])
            ;
    }

    public function unreadForStudent(User $teacher, User $student): int
    {
        abort_unless($this->access->allows($teacher, $student), 404);
        return $this->threadQuery($teacher, $student)->whereNull('read_at')
            ->whereIn('kind', [TeacherNoteKind::TeacherMessage->value, TeacherNoteKind::Feedback->value])->count();
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
            ->map(function (User $teacher) use ($student) {
                $decision = $this->messaging->decision($student, $teacher);

                return [
                    'teacher_id' => (int) $teacher->id,
                    'teacher_name' => $teacher->name,
                    'can_message' => $decision['allowed'],
                    'messaging_reason' => $decision['reason'],
                    // Loading the learning page is not the same as opening a
                    // conversation. Keep unread state until the student chooses it.
                    'unread_count' => $this->unreadForStudent($teacher, $student),
                    'messages' => $this->thread($teacher, $student, $student, markRead: false, limit: 1),
                ];
            })->values()->all();
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
        if ((int) $sender->id === (int) $student->id) {
            $this->messaging->assertStudentMayMessage($student, $teacher);
        }
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

        if ((int) $sender->id === (int) $student->id) {
            TeacherOverviewCache::forget((int) $teacher->id);
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
        $this->messageAudio->deleteStored($note);
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
        $audio = $this->messageAudio->payload($note);
        $feedbackType = $kind === TeacherNoteKind::Feedback
            ? (($note->audio_path || ($audio['available'] ?? false)) ? 'voice_feedback' : 'written_feedback')
            : 'message';

        return [
            'id' => (int) $note->id,
            'sender' => $sender,
            'sender_name' => $sender === 'teacher' ? $note->teacher?->name : $note->student?->name,
            'body' => $note->body,
            'audio' => $audio,
            'message_kind' => $kind?->value,
            'feedback_type' => $feedbackType,
            'task' => $assignment ? [
                'id' => (int) $assignment->id,
                'recipient_id' => $assignment->relationLoaded('recipients') ? $assignment->recipients->first()?->id : null,
                'surah_number' => (int) $assignment->surah_number,
                'surah_name' => QuranMetadata::name((int) $assignment->surah_number),
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

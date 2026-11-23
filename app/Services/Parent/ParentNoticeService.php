<?php

namespace App\Services\Parent;

use App\Enums\AssignmentStatus;
use App\Enums\ParentGuardianPermission;
use App\Enums\ParentLinkStatus;
use App\Models\MemorisationProgress;
use App\Models\ParentStudentLink;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherNote;
use App\Models\User;
use App\Notifications\LearningTaskNotification;
use App\Support\ParentFeatures;

/**
 * In-app notices for guardians. Titles and bodies stay generic so a
 * lock-screen preview does not name the child or the passage.
 */
final class ParentNoticeService
{
    public function __construct(
        private readonly ParentAccessAuthorizer $access,
        private readonly ParentNoticePreferences $preferences,
    ) {}

    public function homework(User $student, int $recipientId): void
    {
        $this->fanout($student, ParentGuardianPermission::ViewAssignments, 'homework', 'parent-homework:'.$recipientId, [
            'type' => 'parent_homework',
            'title' => 'New homework',
            'body' => 'A teacher set new homework.',
            'href' => '/parent?view=learning&child='.$student->id,
        ]);
    }

    public function deadline(User $student, string $sourceKey): void
    {
        $this->fanout($student, ParentGuardianPermission::ViewAssignments, 'deadlines', $sourceKey, [
            'type' => 'parent_deadline',
            'title' => 'Homework deadline',
            'body' => 'A homework deadline needs attention.',
            'href' => '/parent?view=learning&child='.$student->id,
        ]);
    }

    public function feedback(User $student, TeacherNote $note): void
    {
        $this->fanout($student, ParentGuardianPermission::ViewMessages, 'feedback', 'parent-feedback:'.$note->id, [
            'type' => 'parent_feedback',
            'title' => 'Teacher feedback',
            'body' => 'A teacher shared feedback.',
            'href' => '/parent?view=messages&child='.$student->id,
            'teacher_note_id' => (int) $note->id,
        ]);
    }

    public function submitted(User $student, int $recipientId, int $stamp): void
    {
        $this->fanout($student, ParentGuardianPermission::ViewAssignments, 'updates', 'parent-submission:'.$recipientId.':'.$stamp, [
            'type' => 'parent_learning_update',
            'title' => 'Homework submitted',
            'body' => 'Homework was submitted for review.',
            'href' => '/parent?view=learning&child='.$student->id,
            'teacher_assignment_recipient_id' => $recipientId,
        ]);
    }

    public function reviewed(User $student, int $recipientId, int $stamp, bool $approved): void
    {
        $this->fanout($student, ParentGuardianPermission::ViewAssignments, 'updates', 'parent-review:'.$recipientId.':'.$stamp, [
            'type' => 'parent_learning_update',
            'title' => $approved ? 'Homework reviewed' : 'Correction requested',
            'body' => $approved ? 'A teacher reviewed submitted homework.' : 'A teacher asked for a correction.',
            'href' => '/parent?view=learning&child='.$student->id,
            'teacher_assignment_recipient_id' => $recipientId,
        ]);
    }

    public function learningUpdate(User $student, string $sourceKey): void
    {
        $this->fanout($student, ParentGuardianPermission::ViewAssignments, 'updates', $sourceKey, [
            'type' => 'parent_learning_update',
            'title' => 'Learning update',
            'body' => 'A teacher shared a learning update.',
            'href' => '/parent?view=learning&child='.$student->id,
        ]);
    }

    public function reply(User $parent, User $student, TeacherNote $note): void
    {
        if (! $this->access->allows($parent, $student, ParentGuardianPermission::ViewMessages->value)) {
            return;
        }
        if (! $this->preferences->allows($parent, 'messages')) {
            return;
        }

        $this->once($parent, 'parent-reply:'.$note->id, [
            'type' => 'parent_message',
            'title' => 'New teacher message',
            'body' => 'Open messages to read it.',
            'href' => '/parent?view=messages&child='.$student->id,
            'teacher_note_id' => (int) $note->id,
        ]);
    }

    public function teacherMessage(User $teacher, TeacherNote $note): void
    {
        $this->once($teacher, 'parent-message:'.$note->id, [
            'type' => 'parent_message',
            'title' => 'New parent message',
            'body' => 'Open messages to read it.',
            'href' => '/teacher',
            'teacher_note_id' => (int) $note->id,
        ]);
    }

    public function teacherReport(User $teacher, TeacherNote $note): void
    {
        $this->once($teacher, 'parent-report:'.$note->id, [
            'type' => 'parent_message_report',
            'title' => 'Message reported',
            'body' => 'A parent reported a message for review.',
            'href' => '/teacher',
            'teacher_note_id' => (int) $note->id,
        ]);
    }

    public function approachingDeadlines(int $limit = 200): int
    {
        if (! ParentFeatures::enabled()) {
            return 0;
        }

        $recipients = TeacherAssignmentRecipient::query()
            ->whereIn('status', [AssignmentStatus::Pending->value, AssignmentStatus::InProgress->value])
            ->whereHas('assignment', function ($query) {
                $query->whereBetween('due_at', [now(), now()->addHours(48)]);
            })
            ->with('assignment')
            ->limit($limit)
            ->get();

        $sent = 0;
        foreach ($recipients as $recipient) {
            $student = User::query()->find($recipient->student_id);
            $assignment = $recipient->assignment;
            if (! $student instanceof User || ! $assignment instanceof TeacherAssignment || $assignment->due_at === null) {
                continue;
            }
            $sent += $this->deadlineCount(
                $student,
                'parent-soon:'.$recipient->id.':'.$assignment->due_at->toDateString(),
            );
        }

        return $sent;
    }

    public function weeklySummaries(int $limit = 200): int
    {
        if (! ParentFeatures::enabled()) {
            return 0;
        }

        $links = ParentStudentLink::query()
            ->where('status', ParentLinkStatus::Approved->value)
            ->with(['parent', 'student'])
            ->limit($limit)
            ->get();

        $week = now()->format('o-\WW');
        $sent = 0;
        foreach ($links as $link) {
            $parent = $link->parent;
            $student = $link->student;
            if (! $parent instanceof User || ! $student instanceof User) {
                continue;
            }
            if (! $this->access->allows($parent, $student, ParentGuardianPermission::ViewProgress->value)) {
                continue;
            }
            if (! $this->preferences->allows($parent, 'weekly_summary')) {
                continue;
            }
            if (! $this->hadRecentProgress($student)) {
                continue;
            }
            if ($this->once($parent, 'parent-weekly:'.$student->id.':'.$week, [
                'type' => 'parent_weekly_summary',
                'title' => 'Weekly progress summary',
                'body' => 'A weekly learning summary is ready.',
                'href' => '/parent?view=progress&child='.$student->id,
            ])) {
                $sent++;
            }
        }

        return $sent;
    }

    public function reportAvailable(User $student, int $reportId): void
    {
        if (! ParentFeatures::enabled()) {
            return;
        }

        $links = ParentStudentLink::query()
            ->where('student_user_id', $student->id)
            ->where('status', ParentLinkStatus::Approved->value)
            ->with('parent')
            ->get();

        foreach ($links as $link) {
            $parent = $link->parent;
            if (! $parent instanceof User || ! $this->preferences->allows($parent, 'reports')) {
                continue;
            }
            $allowed = $this->access->allows($parent, $student, ParentGuardianPermission::ViewAssignments->value)
                || $this->access->allows($parent, $student, ParentGuardianPermission::ViewProgress->value)
                || $this->access->allows($parent, $student, ParentGuardianPermission::ViewMessages->value);
            if (! $allowed) {
                continue;
            }
            $this->once($parent, 'parent-learning-report:'.$reportId, [
                'type' => 'parent_learning_report',
                'title' => 'Learning report',
                'body' => 'A learning report is ready.',
                'href' => '/parent?view=reports&child='.$student->id,
            ]);
        }
    }

    private function hadRecentProgress(User $student): bool
    {
        $since = now()->subDays(7);

        return TeacherAssignmentRecipient::query()
            ->where('student_id', $student->id)
            ->where('updated_at', '>=', $since)
            ->exists()
            || MemorisationProgress::query()
                ->where('user_id', $student->id)
                ->where('created_at', '>=', $since)
                ->exists();
    }

    private function deadlineCount(User $student, string $sourceKey): int
    {
        if (! ParentFeatures::enabled()) {
            return 0;
        }

        $sent = 0;
        foreach ($this->guardians($student, ParentGuardianPermission::ViewAssignments, 'deadlines') as $parent) {
            if ($this->once($parent, $sourceKey, [
                'type' => 'parent_deadline',
                'title' => 'Homework deadline',
                'body' => 'A homework deadline is coming up.',
                'href' => '/parent?view=learning&child='.$student->id,
            ])) {
                $sent++;
            }
        }

        return $sent;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function fanout(User $student, ParentGuardianPermission $permission, string $preference, string $sourceKey, array $payload): void
    {
        foreach ($this->guardians($student, $permission, $preference) as $parent) {
            $this->once($parent, $sourceKey, $payload);
        }
    }

    /**
     * @return list<User>
     */
    private function guardians(User $student, ParentGuardianPermission $permission, string $preference): array
    {
        if (! ParentFeatures::enabled()) {
            return [];
        }

        return ParentStudentLink::query()
            ->where('student_user_id', $student->id)
            ->where('status', ParentLinkStatus::Approved->value)
            ->with('parent')
            ->get()
            ->map(fn (ParentStudentLink $link) => $link->parent)
            ->filter(function ($parent) use ($student, $permission, $preference) {
                return $parent instanceof User
                    && $this->access->allows($parent, $student, $permission->value)
                    && $this->preferences->allows($parent, $preference);
            })
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function once(User $user, string $sourceKey, array $payload): bool
    {
        $exists = $user->notifications()
            ->where('type', LearningTaskNotification::class)
            ->where('data->source_key', $sourceKey)
            ->exists();
        if ($exists) {
            return false;
        }

        $user->notify(new LearningTaskNotification($sourceKey, $payload));

        return true;
    }
}

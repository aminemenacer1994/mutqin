<?php

namespace App\Services\Learning;

use App\Enums\AssignmentKind;
use App\Models\TeacherAssignment;
use App\Models\TeacherLesson;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherNote;
use App\Models\User;
use App\Notifications\LearningTaskNotification;
use App\Services\Achievements\PracticePreferences;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Services\Parent\ParentNoticeService;
use App\Services\RevisionReminders\RevisionReminderHrefBuilder;
use App\Support\QuranMetadata;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * In-app notices for lessons, revision, deadlines and published feedback.
 * Due/overdue pings still go through the existing revision reminder dispatcher.
 */
final class LearningTaskNotifier
{
    public function __construct(
        private readonly PracticePreferences $preferences,
        private readonly RevisionReminderHrefBuilder $hrefs,
        private readonly ParentNoticeService $parents,
    ) {}

    public function assignmentPublished(TeacherAssignment $assignment): void
    {
        $assignment->loadMissing('recipients');
        $activity = (string) ($assignment->activity ?? '');
        $category = (string) $assignment->hifz_category;
        $kind = $assignment->kind instanceof AssignmentKind ? $assignment->kind->value : (string) $assignment->kind;
        $isRevision = $activity === 'revision'
            || ($activity === '' && $kind !== AssignmentKind::AiRecite->value && in_array($category, ['sabqi', 'manzil'], true));

        $students = $this->studentsById($assignment->recipients->pluck('student_id'));

        foreach ($assignment->recipients as $recipient) {
            $student = $students->get((int) $recipient->student_id);
            if (! $student instanceof User) {
                continue;
            }
            if ($isRevision) {
                $this->once($student, 'revision:'.$recipient->id, [
                    'type' => 'revision',
                    'title' => 'Revision assigned',
                    'body' => $this->noticeBody($assignment),
                    'href' => $this->hrefs->memorisationHref([
                        'surah' => (int) $assignment->surah_number,
                        'from' => (int) $assignment->ayah_start,
                        'to' => (int) $assignment->ayah_end,
                        'review' => 1,
                        'return' => 'dashboard',
                        'assignment_recipient' => (int) $recipient->id,
                    ]),
                    'surah_number' => (int) $assignment->surah_number,
                    'ayah_start' => (int) $assignment->ayah_start,
                    'ayah_end' => (int) $assignment->ayah_end,
                    'due_on' => $assignment->due_at?->toDateString(),
                    'teacher_assignment_recipient_id' => (int) $recipient->id,
                ]);
            }
            if ($assignment->due_at !== null) {
                $due = $assignment->due_at->toDateString();
                $this->once($student, 'deadline:'.$recipient->id.':'.$due, [
                    'type' => 'deadline',
                    'title' => 'Task deadline',
                    'body' => $this->noticeBody($assignment),
                    'href' => $this->dashboardHref([
                        'tab' => 'learning',
                        'assignment_recipient' => (int) $recipient->id,
                    ]),
                    'surah_number' => (int) $assignment->surah_number,
                    'ayah_start' => (int) $assignment->ayah_start,
                    'ayah_end' => (int) $assignment->ayah_end,
                    'due_on' => $due,
                    'teacher_assignment_recipient_id' => (int) $recipient->id,
                ]);
            }
            $this->parents->homework($student, (int) $recipient->id);
            if ($assignment->due_at !== null) {
                $this->parents->deadline($student, 'parent-deadline:'.$recipient->id.':'.$assignment->due_at->toDateString());
            }
        }
    }

    public function deadlineMoved(TeacherAssignment $assignment): void
    {
        if ($assignment->due_at === null) {
            return;
        }
        $assignment->loadMissing('recipients');
        $due = $assignment->due_at->toDateString();
        $students = $this->studentsById($assignment->recipients->pluck('student_id'));

        foreach ($assignment->recipients as $recipient) {
            $student = $students->get((int) $recipient->student_id);
            if (! $student instanceof User) {
                continue;
            }
            $this->once($student, 'deadline:'.$recipient->id.':'.$due, [
                'type' => 'deadline',
                'title' => 'Deadline updated',
                'body' => $this->noticeBody($assignment),
                'href' => $this->dashboardHref([
                    'tab' => 'learning',
                    'assignment_recipient' => (int) $recipient->id,
                ]),
                'due_on' => $due,
                'surah_number' => (int) $assignment->surah_number,
                'ayah_start' => (int) $assignment->ayah_start,
                'ayah_end' => (int) $assignment->ayah_end,
                'teacher_assignment_recipient_id' => (int) $recipient->id,
            ]);
            if ($assignment->due_at !== null) {
                $this->parents->deadline($student, 'parent-deadline:'.$recipient->id.':'.$due);
            }
        }
    }

    /**
     * @param  iterable<int, int>  $studentIds
     */
    public function lessonScheduled(TeacherLesson $lesson, iterable $studentIds): void
    {
        $date = $lesson->lesson_date instanceof Carbon
            ? $lesson->lesson_date->copy()
            : Carbon::parse((string) $lesson->lesson_date);
        if ($date->copy()->endOfDay()->isPast()) {
            return;
        }

        $title = trim((string) ($lesson->title ?? ''));
        $students = $this->studentsById($studentIds);

        foreach ($students as $student) {
            if (! $student instanceof User) {
                continue;
            }
            $localDate = $this->preferences->localDate($date->copy()->startOfDay(), $student);
            $this->once($student, 'lesson:'.$lesson->id, [
                'type' => 'lesson',
                'title' => $title !== '' ? $title : 'Lesson',
                'body' => $localDate,
                'href' => route('dashboard'),
                'due_on' => $date->toDateString(),
                'teacher_lesson_id' => (int) $lesson->id,
            ]);
            $this->parents->learningUpdate($student, 'parent-lesson:'.$lesson->id.':'.$student->id);
        }
    }

    public function publishedFeedback(TeacherNote $note): void
    {
        $student = User::query()->find($note->student_id);
        if (! $student) {
            return;
        }
        $body = trim((string) $note->body);
        $this->once($student, 'feedback:'.$note->id, [
            'type' => 'teacher_feedback',
            'title' => 'Teacher feedback',
            'body' => $body === '' ? null : mb_substr($body, 0, 180),
            'href' => $this->dashboardHref([
                'tab' => 'learning',
                'feedback' => (int) $note->id,
            ]),
            'surah_number' => $note->surah_number ? (int) $note->surah_number : null,
            'ayah_start' => $note->ayah_start ? (int) $note->ayah_start : null,
            'ayah_end' => $note->ayah_end ? (int) $note->ayah_end : null,
            'teacher_note_id' => (int) $note->id,
        ]);
        $this->parents->feedback($student, $note);
    }

    public function studentSubmitted(User $student, TeacherAssignmentRecipient $recipient): void
    {
        $recipient->loadMissing('assignment.teacher');
        $teacher = $recipient->assignment?->teacher;
        $stamp = $recipient->student_completed_at?->getTimestamp() ?? $recipient->updated_at?->getTimestamp() ?? now()->getTimestamp();
        if ($teacher instanceof User && app(StudentAccessAuthorizer::class)->allows($teacher, $student)) {
            $this->notifyUser($teacher, 'student-submission:'.$recipient->id.':'.$stamp, [
                'type' => 'student_submission',
                'title' => 'Task submitted',
                'body' => 'A student submitted work for review.',
                'href' => '/teacher',
                'teacher_assignment_recipient_id' => (int) $recipient->id,
            ]);
        }
        $this->parents->submitted($student, (int) $recipient->id, $stamp);
    }

    public function assignmentReviewed(User $student, TeacherAssignmentRecipient $recipient, string $decision): void
    {
        $stamp = $recipient->updated_at?->getTimestamp() ?? now()->getTimestamp();
        $approved = $decision === 'approved';
        $this->once($student, 'assignment-review:'.$recipient->id.':'.$stamp, [
            'type' => $approved ? 'assignment_approved' : 'assignment_correction',
            'title' => $approved ? 'Task reviewed' : 'Correction requested',
            'body' => $approved ? 'A teacher reviewed submitted work.' : 'A teacher asked for a correction.',
            'href' => $this->dashboardHref([
                'tab' => 'learning',
                'assignment_recipient' => (int) $recipient->id,
            ]),
            'teacher_assignment_recipient_id' => (int) $recipient->id,
        ]);
        $this->parents->reviewed($student, (int) $recipient->id, $stamp, $approved);
    }

    /**
     * @param  iterable<int, int|string|null>  $studentIds
     * @return Collection<int, User>
     */
    private function studentsById(iterable $studentIds): Collection
    {
        $ids = collect($studentIds)
            ->map(static fn (mixed $id): int => (int) $id)
            ->filter(static fn (int $id): bool => $id > 0)
            ->unique()
            ->values();

        if ($ids->isEmpty()) {
            return collect();
        }

        return User::query()
            ->whereIn('id', $ids->all())
            ->get()
            ->keyBy('id');
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function once(User $student, string $sourceKey, array $payload): void
    {
        if (! $this->preferences->revisionReminders($student)['in_app']) {
            return;
        }

        $this->notifyUser($student, $sourceKey, $payload);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function notifyUser(User $user, string $sourceKey, array $payload): void
    {
        $exists = $user->notifications()
            ->where('type', LearningTaskNotification::class)
            ->where('data->source_key', $sourceKey)
            ->exists();
        if ($exists) {
            return;
        }

        $user->notify(new LearningTaskNotification($sourceKey, $payload));
    }

    private function noticeBody(TeacherAssignment $assignment): string
    {
        return $this->passageLabel($assignment->surah_number, $assignment->ayah_start, $assignment->ayah_end)
            .' · '.$this->requirementPhrase($assignment);
    }

    private function requirementPhrase(TeacherAssignment $assignment): string
    {
        $target = max(1, (int) ($assignment->repetition_target ?? 1));
        $kind = $assignment->kind instanceof AssignmentKind ? $assignment->kind->value : (string) $assignment->kind;
        if ($kind === AssignmentKind::AiRecite->value) {
            $label = $target === 1 ? '1 required AI wording check' : "{$target} required AI wording checks";

            return $label.'. Only a scored check on this passage counts.';
        }

        $label = $target === 1 ? '1 required practice attempt' : "{$target} required practice attempts";

        return $label.'. One completed practice session counts.';
    }

    private function passageLabel(int $surah, int $start, int $end): string
    {
        $name = QuranMetadata::name($surah) ?? 'Surah '.$surah;

        return $start === $end ? $name.' · '.$start : $name.' · '.$start.'–'.$end;
    }

    /**
     * @param  array<string, scalar|null>  $query
     */
    private function dashboardHref(array $query = []): string
    {
        $base = route('dashboard');
        $clean = [];
        foreach ($query as $key => $value) {
            if ($value === null || $value === '') {
                continue;
            }
            $clean[$key] = $value;
        }

        return $clean === [] ? $base : $base.'?'.http_build_query($clean);
    }
}

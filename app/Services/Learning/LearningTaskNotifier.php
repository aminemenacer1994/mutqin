<?php

namespace App\Services\Learning;

use App\Models\TeacherAssignment;
use App\Models\TeacherLesson;
use App\Models\TeacherNote;
use App\Models\User;
use App\Notifications\LearningTaskNotification;
use App\Services\Achievements\PracticePreferences;
use App\Services\RevisionReminders\RevisionReminderHrefBuilder;
use App\Support\QuranMetadata;
use Illuminate\Support\Carbon;

/**
 * In-app notices for lessons, revision, deadlines and published feedback.
 * Due/overdue pings still go through the existing revision reminder dispatcher.
 */
final class LearningTaskNotifier
{
    public function __construct(
        private readonly PracticePreferences $preferences,
        private readonly RevisionReminderHrefBuilder $hrefs,
    ) {}

    public function assignmentPublished(TeacherAssignment $assignment): void
    {
        $assignment->loadMissing('recipients');
        $activity = (string) ($assignment->activity ?? '');
        $category = (string) $assignment->hifz_category;
        $isRevision = $activity === 'revision'
            || ($activity === '' && in_array($category, ['sabqi', 'manzil'], true));

        foreach ($assignment->recipients as $recipient) {
            $student = User::query()->find($recipient->student_id);
            if (! $student) {
                continue;
            }
            if ($isRevision) {
                $this->once($student, 'revision:'.$recipient->id, [
                    'type' => 'revision',
                    'title' => 'Revision assigned',
                    'body' => $this->passageLabel($assignment->surah_number, $assignment->ayah_start, $assignment->ayah_end),
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
                    'body' => $this->passageLabel($assignment->surah_number, $assignment->ayah_start, $assignment->ayah_end),
                    'href' => route('dashboard'),
                    'surah_number' => (int) $assignment->surah_number,
                    'ayah_start' => (int) $assignment->ayah_start,
                    'ayah_end' => (int) $assignment->ayah_end,
                    'due_on' => $due,
                    'teacher_assignment_recipient_id' => (int) $recipient->id,
                ]);
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
        foreach ($assignment->recipients as $recipient) {
            $student = User::query()->find($recipient->student_id);
            if (! $student) {
                continue;
            }
            $this->once($student, 'deadline:'.$recipient->id.':'.$due, [
                'type' => 'deadline',
                'title' => 'Deadline updated',
                'body' => $this->passageLabel($assignment->surah_number, $assignment->ayah_start, $assignment->ayah_end),
                'href' => route('dashboard'),
                'due_on' => $due,
                'surah_number' => (int) $assignment->surah_number,
                'ayah_start' => (int) $assignment->ayah_start,
                'ayah_end' => (int) $assignment->ayah_end,
                'teacher_assignment_recipient_id' => (int) $recipient->id,
            ]);
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
        foreach ($studentIds as $studentId) {
            $student = User::query()->find((int) $studentId);
            if (! $student) {
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
            'href' => route('dashboard'),
            'surah_number' => $note->surah_number ? (int) $note->surah_number : null,
            'ayah_start' => $note->ayah_start ? (int) $note->ayah_start : null,
            'ayah_end' => $note->ayah_end ? (int) $note->ayah_end : null,
            'teacher_note_id' => (int) $note->id,
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function once(User $student, string $sourceKey, array $payload): void
    {
        if (! $this->preferences->revisionReminders($student)['in_app']) {
            return;
        }

        $exists = $student->notifications()
            ->where('type', LearningTaskNotification::class)
            ->where('data->source_key', $sourceKey)
            ->exists();
        if ($exists) {
            return;
        }

        $student->notify(new LearningTaskNotification($sourceKey, $payload));
    }

    private function passageLabel(int $surah, int $start, int $end): string
    {
        $name = QuranMetadata::name($surah) ?? 'Surah '.$surah;

        return $start === $end ? $name.' · '.$start : $name.' · '.$start.'–'.$end;
    }
}

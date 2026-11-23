<?php

namespace App\Services\Teacher;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\GroupMembership;
use App\Models\StudentSelfAssessment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherLesson;
use App\Models\User;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Support\QuranMetadata;
use App\Support\TeacherFeatures;
use Illuminate\Validation\ValidationException;

class StudentSelfAssessmentService
{
    public function __construct(
        private readonly StudentAccessAuthorizer $access,
    ) {}

    /**
     * Optional reflection after a lesson. Never stored as a verified mistake.
     *
     * @param  array<string, mixed>  $input
     */
    public function record(User $student, array $input): StudentSelfAssessment
    {
        $feeling = (string) ($input['feeling'] ?? '');
        if (! in_array($feeling, ['easy', 'manageable', 'difficult', 'need_help'], true)) {
            throw ValidationException::withMessages([
                'feeling' => 'Choose easy, manageable, difficult, or need teacher help.',
            ]);
        }

        $recipient = null;
        if (! empty($input['teacher_assignment_recipient_id'])) {
            $recipient = TeacherAssignmentRecipient::query()
                ->with('assignment')
                ->find((int) $input['teacher_assignment_recipient_id']);
            if ($recipient === null || (int) $recipient->student_id !== (int) $student->id) {
                throw ValidationException::withMessages([
                    'teacher_assignment_recipient_id' => 'Choose one of your tasks.',
                ]);
            }
            $teacher = $recipient->assignment?->teacher;
            if (TeacherFeatures::enabled() && (! $teacher instanceof User || ! $this->access->allows($teacher, $student))) {
                throw ValidationException::withMessages([
                    'teacher_assignment_recipient_id' => 'This task is no longer shared with your teacher.',
                ]);
            }
        }

        $lesson = null;
        if (! empty($input['teacher_lesson_id'])) {
            $lesson = TeacherLesson::query()->find((int) $input['teacher_lesson_id']);
            if ($lesson === null || ! $this->studentInLesson($student, $lesson)) {
                throw ValidationException::withMessages([
                    'teacher_lesson_id' => 'Choose one of your lessons.',
                ]);
            }
        }

        [$surah, $start, $end] = $this->range($input, $recipient);

        $help = trim((string) ($input['help_request'] ?? ''));
        $note = trim((string) ($input['note'] ?? ''));
        $difficult = trim((string) ($input['difficult_ayahs'] ?? ''));
        $confidence = (string) ($input['confidence'] ?? '');
        $attributes = [
            'teacher_id' => $recipient?->assignment?->teacher_id ?: ($lesson?->teacher_id),
            'teacher_lesson_id' => $lesson?->id,
            'feeling' => $feeling,
            'confidence' => in_array($confidence, ['low', 'steady', 'confident'], true) ? $confidence : null,
            'help_request' => $help === '' ? null : mb_substr($help, 0, 1000),
            'difficult_ayahs' => $difficult === '' ? null : mb_substr($difficult, 0, 120),
            'wants_revision' => array_key_exists('wants_revision', $input) && $input['wants_revision'] !== null
                ? (bool) $input['wants_revision']
                : null,
            'note' => $note === '' ? null : mb_substr($note, 0, 1000),
            'surah_number' => $surah,
            'ayah_start' => $start,
            'ayah_end' => $end,
        ];

        if ($recipient) {
            $existing = StudentSelfAssessment::query()
                ->where('student_id', $student->id)
                ->where('teacher_assignment_recipient_id', $recipient->id)
                ->latest('id')
                ->first();
            if ($existing) {
                $existing->forceFill($attributes)->save();

                return $existing->fresh() ?? $existing;
            }
            $attributes['teacher_assignment_recipient_id'] = $recipient->id;
        }

        $row = new StudentSelfAssessment;
        $row->forceFill(array_merge($attributes, [
            'student_id' => $student->id,
            'teacher_assignment_recipient_id' => $recipient?->id,
        ]))->save();

        return $row;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function forTeacher(User $teacher, User $student): array
    {
        abort_unless($teacher->isTeacher() && $this->access->allows($teacher, $student), 404);

        return StudentSelfAssessment::query()
            ->where('student_id', $student->id)
            ->where(function ($query) use ($teacher) {
                $query->whereNull('teacher_id')->orWhere('teacher_id', $teacher->id);
            })
            ->latest('id')
            ->limit(20)
            ->get()
            ->map(fn (StudentSelfAssessment $row) => $this->present($row))
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function present(StudentSelfAssessment $row): array
    {
        $surah = $row->surah_number ? (int) $row->surah_number : null;

        return [
            'id' => (int) $row->id,
            'feeling' => $row->feeling,
            'confidence' => $row->confidence,
            'help_request' => $row->help_request,
            'difficult_ayahs' => $row->difficult_ayahs,
            'wants_revision' => $row->wants_revision,
            'note' => $row->note,
            'surah_number' => $surah,
            'surah_name' => $surah ? QuranMetadata::name($surah) : null,
            'ayah_start' => $row->ayah_start ? (int) $row->ayah_start : null,
            'ayah_end' => $row->ayah_end ? (int) $row->ayah_end : null,
            'teacher_assignment_recipient_id' => $row->teacher_assignment_recipient_id
                ? (int) $row->teacher_assignment_recipient_id
                : null,
            'teacher_lesson_id' => $row->teacher_lesson_id ? (int) $row->teacher_lesson_id : null,
            'created_at' => $row->created_at?->toIso8601String(),
            'updated_at' => $row->updated_at?->toIso8601String(),
            'source' => 'student_reflection',
            'verified_mistake' => false,
            'affects_ai_score' => false,
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array{0: ?int, 1: ?int, 2: ?int}
     */
    private function range(array $input, ?TeacherAssignmentRecipient $recipient): array
    {
        $surah = isset($input['surah_number']) && $input['surah_number'] !== ''
            ? (int) $input['surah_number']
            : null;
        $start = isset($input['ayah_start']) && $input['ayah_start'] !== ''
            ? (int) $input['ayah_start']
            : null;
        $end = isset($input['ayah_end']) && $input['ayah_end'] !== ''
            ? (int) $input['ayah_end']
            : $start;

        if ($surah === null && $start === null) {
            $assignment = $recipient?->assignment;
            if ($assignment) {
                return [
                    (int) $assignment->surah_number,
                    (int) $assignment->ayah_start,
                    (int) $assignment->ayah_end,
                ];
            }

            return [null, null, null];
        }

        $count = $surah ? QuranMetadata::ayahCount($surah) : null;
        if ($count === null || $start === null || $start < 1 || $end === null || $end < $start || $end > $count) {
            throw ValidationException::withMessages([
                'ayah_end' => 'Choose a valid surah and ayah range.',
            ]);
        }

        return [$surah, $start, $end];
    }

    private function studentInLesson(User $student, TeacherLesson $lesson): bool
    {
        return GroupMembership::query()
            ->where('learning_group_id', $lesson->learning_group_id)
            ->where('user_id', $student->id)
            ->where('membership_role', MembershipRole::Student->value)
            ->where('status', MembershipStatus::Approved->value)
            ->exists();
    }
}

<?php

namespace App\Services\Teacher;

use App\Models\AiReciteAttempt;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherAttendanceRecord;
use App\Models\TeacherRecitationAssessment;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Organisations\StudentAccessAuthorizer;
use Illuminate\Database\Eloquent\Builder;

class TeacherReportService
{
    public function __construct(private readonly StudentAccessAuthorizer $access) {}

    /** @return array<string, mixed> */
    public function summary(User $teacher, User $student, ?string $from, ?string $to): array
    {
        abort_unless($this->access->allows($teacher, $student), 404);

        $attempts = AiReciteAttempt::query()->validScored()
            ->where('user_id', $student->id)
            ->when($from, fn (Builder $query) => $query->whereDate('created_at', '>=', $from))
            ->when($to, fn (Builder $query) => $query->whereDate('created_at', '<=', $to))
            ->get()
            ->sortByDesc('id')
            ->unique(function (AiReciteAttempt $attempt): string {
                $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
                $event = $attempt->user_session_id ? 'session:'.$attempt->user_session_id
                    : ($attempt->memorisation_assessment_id ? 'assessment:'.$attempt->memorisation_assessment_id
                        : ($attempt->teacher_assignment_recipient_id ? 'assignment:'.$attempt->teacher_assignment_recipient_id
                            : 'row:'.$attempt->id));

                return implode('|', [$event, $range['surah'] ?? '', $range['from'] ?? '', $range['to'] ?? '', $attempt->attempt_number ?? '', $attempt->accuracy_percent ?? '']);
            });

        $sessions = UserSession::query()->where('user_id', $student->id)
            ->where('is_onboarding_example', false)
            ->when($from, fn (Builder $query) => $query->whereDate('last_activity_at', '>=', $from))
            ->when($to, fn (Builder $query) => $query->whereDate('last_activity_at', '<=', $to))
            ->count();

        $tasks = TeacherAssignmentRecipient::query()->where('student_id', $student->id)
            ->whereHas('assignment', function (Builder $query) use ($teacher, $from, $to) {
                $query->where('teacher_id', $teacher->id)
                    ->when($from, fn (Builder $query) => $query->whereDate('created_at', '>=', $from))
                    ->when($to, fn (Builder $query) => $query->whereDate('created_at', '<=', $to));
            })->count();

        $assessmentAttemptIds = AiReciteAttempt::query()->where('user_id', $student->id)
            ->when($from, fn (Builder $query) => $query->whereDate('created_at', '>=', $from))
            ->when($to, fn (Builder $query) => $query->whereDate('created_at', '<=', $to))
            ->pluck('id');
        $teacherScores = TeacherRecitationAssessment::query()
            ->where('teacher_id', $teacher->id)->where('student_id', $student->id)
            ->whereIn('ai_recite_attempt_id', $assessmentAttemptIds)->pluck('tajweed_score');

        $attendance = TeacherAttendanceRecord::query()->where('teacher_id', $teacher->id)
            ->where('student_id', $student->id)
            ->whereIn('learning_group_id', $this->access->teacherGroupIds($teacher))
            ->when($from, fn (Builder $query) => $query->whereDate('attendance_date', '>=', $from))
            ->when($to, fn (Builder $query) => $query->whereDate('attendance_date', '<=', $to))
            ->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

        return [
            'from' => $from,
            'to' => $to,
            'sessions_recorded' => $sessions,
            'scored_checks' => $attempts->count(),
            'ai_word_match_average' => $attempts->isEmpty() ? null : round((float) $attempts->avg('accuracy_percent'), 1),
            'teacher_tajweed_average' => $teacherScores->isEmpty() ? null : round((float) $teacherScores->avg(), 1),
            'tasks_assigned' => $tasks,
            'attendance' => $attendance->map(fn ($count) => (int) $count)->all(),
        ];
    }
}

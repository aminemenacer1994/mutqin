<?php

namespace App\Services\Teacher;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\TeacherAttendanceRecord;
use App\Models\TeacherLesson;
use App\Models\User;
use App\Services\Organisations\StudentAccessAuthorizer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

class TeacherAttendanceService
{
    public const STATUSES = ['present', 'absent', 'late', 'excused'];

    public const NOTES_MAX = 500;

    public function __construct(private readonly StudentAccessAuthorizer $access) {}

    /** @return array<string, mixed> */
    public function week(User $teacher, ?int $groupId, ?string $weekStart, ?int $studentId = null): array
    {
        $start = $weekStart ? Carbon::parse($weekStart)->startOfWeek(Carbon::MONDAY) : now()->startOfWeek(Carbon::MONDAY);
        $end = $start->copy()->addDays(6);

        return $this->register($teacher, $groupId, $start, $end, $start->toDateString(), $studentId);
    }

    /** @return array<string, mixed> */
    public function month(User $teacher, ?int $groupId, ?string $month, ?int $studentId = null): array
    {
        $start = $month ? Carbon::parse($month.'-01')->startOfMonth() : now()->startOfMonth();
        $end = $start->copy()->endOfMonth();

        return $this->register($teacher, $groupId, $start, $end, $start->toDateString(), $studentId);
    }

    /** @return array<string, mixed> */
    private function register(User $teacher, ?int $groupId, Carbon $start, Carbon $end, string $rangeStart, ?int $studentId = null): array
    {
        $groups = LearningGroup::query()
            ->whereIn('id', $this->access->teacherGroupIds($teacher))
            ->orderBy('name')
            ->get(['id', 'name']);
        $group = $groupId === null ? $groups->first() : $groups->firstWhere('id', $groupId);
        if ($groupId !== null) {
            abort_unless($group, 404);
        }
        $days = [];
        for ($cursor = $start->copy(); $cursor->lte($end); $cursor->addDay()) {
            $days[] = $cursor->toDateString();
        }

        if (! $group) {
            return ['groups' => [], 'group_id' => null, 'week_start' => $rangeStart, 'month' => $start->format('Y-m'), 'days' => $days, 'source' => 'teacher_recorded', 'students' => [], 'student_id' => $studentId, 'lessons' => []];
        }

        $authorized = $this->access->authorizedStudentIds($teacher);
        $studentIds = GroupMembership::query()
            ->where('learning_group_id', $group->id)
            ->where('membership_role', MembershipRole::Student->value)
            ->where('status', MembershipStatus::Approved->value)
            ->whereIn('user_id', $authorized)
            ->when($studentId !== null, fn (Builder $query) => $query->where('user_id', $studentId))
            ->pluck('user_id');

        if ($studentId !== null && $studentIds->isEmpty()) {
            abort(404);
        }

        $records = TeacherAttendanceRecord::query()
            ->where('teacher_id', $teacher->id)
            ->where('learning_group_id', $group->id)
            ->whereIn('student_id', $studentIds)
            ->whereDate('attendance_date', '>=', $start->toDateString())
            ->whereDate('attendance_date', '<=', $end->toDateString())
            ->get()
            ->groupBy('student_id');

        return [
            'groups' => $groups->map(fn (LearningGroup $row) => ['id' => (int) $row->id, 'name' => $row->name])->all(),
            'group_id' => (int) $group->id,
            'week_start' => $rangeStart,
            'month' => $start->format('Y-m'),
            'days' => $days,
            'source' => 'teacher_recorded',
            'student_id' => $studentId,
            'lessons' => $this->lessonsBetween($teacher, (int) $group->id, $start, $end),
            'students' => User::query()->whereIn('id', $studentIds)->orderBy('name')->get(['id', 'name'])
                ->map(fn (User $student) => [
                    'id' => (int) $student->id,
                    'name' => $student->name,
                    'attendance_source' => 'teacher_recorded',
                    'attendance' => ($records->get($student->id) ?: collect())->mapWithKeys(
                        fn (TeacherAttendanceRecord $record) => [$record->attendance_date->toDateString() => $record->status]
                    )->all(),
                    'notes' => ($records->get($student->id) ?: collect())->mapWithKeys(
                        fn (TeacherAttendanceRecord $record) => [$record->attendance_date->toDateString() => $record->notes]
                    )->filter(fn ($note) => filled($note))->all(),
                ])->all(),
        ];
    }

    public function schedule(User $teacher, LearningGroup $group, string $date, ?string $title = null): TeacherLesson
    {
        abort_unless($this->access->teacherGroupIds($teacher)->contains((int) $group->id), 404);

        $existing = TeacherLesson::query()
            ->where('teacher_id', $teacher->id)
            ->where('learning_group_id', $group->id)
            ->whereDate('lesson_date', $date)
            ->first();
        $lesson = $existing ?: new TeacherLesson;
        $trimmed = trim((string) $title);
        $lesson->forceFill([
            'teacher_id' => $teacher->id,
            'learning_group_id' => $group->id,
            'lesson_date' => $date,
            'title' => $trimmed === '' ? ($existing?->title) : mb_substr($trimmed, 0, 120),
        ])->save();

        return $lesson->fresh();
    }

    /**
     * @return list<array{id: int, date: string, title: string|null, group_id: int}>
     */
    private function lessonsBetween(User $teacher, int $groupId, Carbon $start, Carbon $end): array
    {
        return TeacherLesson::query()
            ->where('teacher_id', $teacher->id)
            ->where('learning_group_id', $groupId)
            ->whereDate('lesson_date', '>=', $start->toDateString())
            ->whereDate('lesson_date', '<=', $end->toDateString())
            ->orderBy('lesson_date')
            ->get()
            ->map(fn (TeacherLesson $lesson) => [
                'id' => (int) $lesson->id,
                'date' => $lesson->lesson_date->toDateString(),
                'title' => $lesson->title,
                'group_id' => (int) $lesson->learning_group_id,
            ])->all();
    }

    public function setStatus(User $teacher, LearningGroup $group, User $student, string $date, string $status, ?string $notes = null): ?TeacherAttendanceRecord
    {
        abort_unless($this->access->teacherGroupIds($teacher)->contains((int) $group->id)
            && $this->access->allows($teacher, $student)
            && GroupMembership::query()->where('learning_group_id', $group->id)
                ->where('user_id', $student->id)
                ->where('membership_role', MembershipRole::Student->value)
                ->where('status', MembershipStatus::Approved->value)->exists(), 404);

        $key = [
            'teacher_id' => $teacher->id,
            'learning_group_id' => $group->id,
            'student_id' => $student->id,
            'attendance_date' => $date,
        ];
        $existing = TeacherAttendanceRecord::query()
            ->where('teacher_id', $teacher->id)
            ->where('learning_group_id', $group->id)
            ->where('student_id', $student->id)
            ->whereDate('attendance_date', $date);

        if ($status === 'clear') {
            $existing->delete();
            foreach ([7, 30, 90] as $days) {
                Cache::forget(sprintf('teacher.overview.%d.%d', $teacher->id, $days));
            }

            return null;
        }

        $record = $existing->first() ?: new TeacherAttendanceRecord;
        $payload = $key + ['status' => $status];
        if ($notes !== null) {
            $trimmed = trim($notes);
            $payload['notes'] = $trimmed === '' ? null : mb_substr($trimmed, 0, self::NOTES_MAX);
        }
        $record->forceFill($payload)->save();

        foreach ([7, 30, 90] as $days) {
            Cache::forget(sprintf('teacher.overview.%d.%d', $teacher->id, $days));
        }

        return $record->fresh();
    }

    /**
     * @return array{
     *   counts: array{present: int, absent: int, late: int, excused: int},
     *   total: int,
     *   rate_percent: int|null,
     *   history: list<array{date: string, status: string, group: string, notes: string|null, source: string}>,
     *   source: string
     * }
     */
    public function summaryForStudent(User $teacher, User $student, ?string $from = null, ?string $to = null, ?int $groupId = null): array
    {
        abort_unless($this->access->allows($teacher, $student), 404);

        $groupIds = $this->access->teacherGroupIds($teacher);
        if ($groupId !== null) {
            abort_unless($groupIds->contains($groupId), 404);
            $groupIds = collect([$groupId]);
        }

        $query = TeacherAttendanceRecord::query()
            ->where('teacher_id', $teacher->id)
            ->where('student_id', $student->id)
            ->whereIn('learning_group_id', $groupIds)
            ->when($from, fn (Builder $builder) => $builder->whereDate('attendance_date', '>=', $from))
            ->when($to, fn (Builder $builder) => $builder->whereDate('attendance_date', '<=', $to));

        $counts = (clone $query)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $present = (int) ($counts['present'] ?? 0);
        $absent = (int) ($counts['absent'] ?? 0);
        $late = (int) ($counts['late'] ?? 0);
        $excused = (int) ($counts['excused'] ?? 0);
        $total = $present + $absent + $late + $excused;

        $history = (clone $query)
            ->with('learningGroup:id,name')
            ->orderByDesc('attendance_date')
            ->limit(14)
            ->get()
            ->map(fn (TeacherAttendanceRecord $record) => $this->presentHistoryRow($record))
            ->all();

        return [
            'counts' => [
                'present' => $present,
                'absent' => $absent,
                'late' => $late,
                'excused' => $excused,
            ],
            'total' => $total,
            'rate_percent' => $this->ratePercent($present, $late, $total),
            'history' => $history,
            'source' => 'teacher_recorded',
        ];
    }

    /**
     * Compact learner-facing summary across teachers who recorded attendance for this student.
     * Returns null when no recorded rows exist so unused attendance stays hidden.
     *
     * @return array<string, mixed>|null
     */
    public function learnerSummary(User $student): ?array
    {
        $records = TeacherAttendanceRecord::query()
            ->where('student_id', $student->id)
            ->with('learningGroup:id,name')
            ->orderByDesc('attendance_date')
            ->get();

        if ($records->isEmpty()) {
            return null;
        }

        $counts = [
            'present' => 0,
            'absent' => 0,
            'late' => 0,
            'excused' => 0,
        ];
        foreach ($records as $record) {
            if (isset($counts[$record->status])) {
                $counts[$record->status]++;
            }
        }
        $total = array_sum($counts);

        return [
            'counts' => $counts,
            'total' => $total,
            'rate_percent' => $this->ratePercent($counts['present'], $counts['late'], $total),
            'recent' => $records->take(5)->map(fn (TeacherAttendanceRecord $record) => $this->presentHistoryRow($record))->values()->all(),
            'source' => 'teacher_recorded',
        ];
    }

    /**
     * @return list<array{date: string, status: string, group: string, notes: string|null, source: string}>
     */
    public function recentForStudent(User $teacher, User $student): array
    {
        return TeacherAttendanceRecord::query()
            ->where('teacher_id', $teacher->id)
            ->where('student_id', $student->id)
            ->whereIn('learning_group_id', $this->access->teacherGroupIds($teacher))
            ->with('learningGroup:id,name')
            ->orderByDesc('attendance_date')
            ->limit(14)
            ->get()
            ->map(fn (TeacherAttendanceRecord $record) => $this->presentHistoryRow($record))
            ->all();
    }

    /**
     * Profile overview payload: recent history + overall rate from all recorded lessons.
     *
     * @return array{history: list<array{date: string, status: string, group: string, notes: string|null, source: string}>, rate_percent: int|null, total: int, counts: array{present: int, absent: int, late: int, excused: int}, source: string}
     */
    public function profileForStudent(User $teacher, User $student): array
    {
        $summary = $this->summaryForStudent($teacher, $student);

        return [
            'history' => $summary['history'],
            'rate_percent' => $summary['rate_percent'],
            'total' => $summary['total'],
            'counts' => $summary['counts'],
            'source' => 'teacher_recorded',
        ];
    }

    /**
     * @return array{date: string, status: string, group: string, notes: string|null, source: string}
     */
    private function presentHistoryRow(TeacherAttendanceRecord $record): array
    {
        return [
            'date' => $record->attendance_date->toDateString(),
            'status' => $record->status,
            'group' => $record->learningGroup?->name ?: '',
            'notes' => $record->notes,
            'source' => 'teacher_recorded',
        ];
    }

    private function ratePercent(int $present, int $late, int $total): ?int
    {
        if ($total <= 0) {
            return null;
        }

        return (int) round(100 * ($present + $late) / $total);
    }

    /**
     * @param  array<string, int|string>  $countsByStatus
     * @return array{present: int, absent: int, late: int, excused: int, total: int, rate_percent: int|null}
     */
    public function presentCounts(array $countsByStatus): array
    {
        $present = (int) ($countsByStatus['present'] ?? 0);
        $absent = (int) ($countsByStatus['absent'] ?? 0);
        $late = (int) ($countsByStatus['late'] ?? 0);
        $excused = (int) ($countsByStatus['excused'] ?? 0);
        $total = $present + $absent + $late + $excused;

        return [
            'present' => $present,
            'absent' => $absent,
            'late' => $late,
            'excused' => $excused,
            'total' => $total,
            'rate_percent' => $this->ratePercent($present, $late, $total),
        ];
    }
}

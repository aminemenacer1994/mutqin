<?php

namespace App\Services\Teacher;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\TeacherAttendanceRecord;
use App\Models\User;
use App\Services\Organisations\StudentAccessAuthorizer;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

class TeacherAttendanceService
{
    public const STATUSES = ['present', 'absent', 'late', 'excused'];

    public function __construct(private readonly StudentAccessAuthorizer $access) {}

    /** @return array<string, mixed> */
    public function week(User $teacher, ?int $groupId, ?string $weekStart): array
    {
        $groups = LearningGroup::query()
            ->whereIn('id', $this->access->teacherGroupIds($teacher))
            ->orderBy('name')
            ->get(['id', 'name']);
        $group = $groupId === null ? $groups->first() : $groups->firstWhere('id', $groupId);
        if ($groupId !== null) abort_unless($group, 404);
        $start = $weekStart ? Carbon::parse($weekStart)->startOfWeek(Carbon::MONDAY) : now()->startOfWeek(Carbon::MONDAY);
        $end = $start->copy()->addDays(6);
        $days = collect(range(0, 6))->map(fn (int $offset) => $start->copy()->addDays($offset)->toDateString())->all();

        if (! $group) {
            return ['groups' => [], 'group_id' => null, 'week_start' => $start->toDateString(), 'days' => $days, 'source' => 'teacher_recorded', 'students' => []];
        }

        $authorized = $this->access->authorizedStudentIds($teacher);
        $studentIds = GroupMembership::query()
            ->where('learning_group_id', $group->id)
            ->where('membership_role', MembershipRole::Student->value)
            ->where('status', MembershipStatus::Approved->value)
            ->whereIn('user_id', $authorized)
            ->pluck('user_id');
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
            'week_start' => $start->toDateString(),
            'days' => $days,
            'source' => 'teacher_recorded',
            'students' => User::query()->whereIn('id', $studentIds)->orderBy('name')->get(['id', 'name'])
                ->map(fn (User $student) => [
                    'id' => (int) $student->id,
                    'name' => $student->name,
                    'attendance_source' => 'teacher_recorded',
                    'attendance' => ($records->get($student->id) ?: collect())->mapWithKeys(
                        fn (TeacherAttendanceRecord $record) => [$record->attendance_date->toDateString() => $record->status]
                    )->all(),
                ])->all(),
        ];
    }

    public function setStatus(User $teacher, LearningGroup $group, User $student, string $date, string $status): void
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
        } else {
            $record = $existing->first() ?: new TeacherAttendanceRecord;
            $record->forceFill($key + ['status' => $status])->save();
        }

        foreach ([7, 30, 90] as $days) Cache::forget(sprintf('teacher.overview.%d.%d', $teacher->id, $days));
    }

    /** @return list<array{date: string, status: string, group: string}> */
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
            ->map(fn (TeacherAttendanceRecord $record) => [
                'date' => $record->attendance_date->toDateString(),
                'status' => $record->status,
                'group' => $record->learningGroup?->name ?: '',
                'source' => 'teacher_recorded',
            ])->all();
    }
}

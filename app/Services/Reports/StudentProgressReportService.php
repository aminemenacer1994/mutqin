<?php

namespace App\Services\Reports;

use App\Enums\StudentProgressReportStatus;
use App\Models\StudentProgressReport;
use App\Models\User;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Services\Parent\ParentLearningReportPeriods;
use App\Services\Parent\ParentNoticeService;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class StudentProgressReportService
{
    public function __construct(
        private readonly StudentAccessAuthorizer $access,
        private readonly StudentProgressReportCollector $collector,
        private readonly ParentLearningReportPeriods $periods,
        private readonly ParentNoticeService $notices,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function index(User $teacher, User $student): array
    {
        $this->authorize($teacher, $student);

        return StudentProgressReport::query()
            ->where('student_user_id', $student->id)
            ->where('teacher_user_id', $teacher->id)
            ->orderByDesc('period_start')
            ->orderByDesc('id')
            ->limit(24)
            ->get()
            ->map(fn (StudentProgressReport $report) => $this->presentList($report))
            ->all();
    }

    /**
     * @param  array{period_type?: string, from?: ?string, to?: ?string, cadence?: ?string}  $input
     */
    public function createOrRefreshDraft(User $teacher, User $student, array $input): StudentProgressReport
    {
        $this->authorize($teacher, $student);
        [$periodType, $from, $to] = $this->resolvePeriod($input);
        $payload = $this->collector->collect($teacher, $student, $periodType, $from, $to);

        $key = [
            'student_user_id' => $student->id,
            'teacher_user_id' => $teacher->id,
            'period_start' => $from->toDateString(),
            'period_end' => $to->toDateString(),
            'status' => StudentProgressReportStatus::Draft->value,
        ];

        $existing = StudentProgressReport::query()->where($key)->first();
        if ($existing instanceof StudentProgressReport) {
            $existing->forceFill([
                'period_type' => $periodType,
                'payload' => $payload,
                'payload_version' => StudentProgressReportCollector::PAYLOAD_VERSION,
                'generated_at' => now(),
            ])->save();

            return $existing->fresh();
        }

        return StudentProgressReport::query()->create([
            ...$key,
            'period_type' => $periodType,
            'payload' => $payload,
            'payload_version' => StudentProgressReportCollector::PAYLOAD_VERSION,
            'generated_at' => now(),
        ]);
    }

    public function updateDraftNotes(User $teacher, StudentProgressReport $report, ?string $notes): StudentProgressReport
    {
        $this->authorize($teacher, $report->student);
        abort_unless($report->teacher_user_id === $teacher->id, 404);
        abort_unless($report->isDraft(), 422, 'Only draft reports can be edited.');

        $report->forceFill(['teacher_notes' => $notes !== null && trim($notes) !== '' ? trim($notes) : null])->save();

        return $report->fresh();
    }

    public function refreshDraft(User $teacher, StudentProgressReport $report): StudentProgressReport
    {
        $this->authorize($teacher, $report->student);
        abort_unless($report->teacher_user_id === $teacher->id, 404);
        abort_unless($report->isDraft(), 422, 'Approved reports are frozen.');

        $from = $report->period_start->copy()->startOfDay();
        $to = $report->period_end->copy()->endOfDay();
        $payload = $this->collector->collect($teacher, $report->student, (string) $report->period_type, $from, $to);
        $report->forceFill([
            'payload' => $payload,
            'payload_version' => StudentProgressReportCollector::PAYLOAD_VERSION,
            'generated_at' => now(),
        ])->save();

        return $report->fresh();
    }

    public function approve(User $teacher, StudentProgressReport $report, bool $shareWithParents): StudentProgressReport
    {
        $student = $report->student;
        abort_unless($student instanceof User, 404);
        $this->authorize($teacher, $student);
        abort_unless($report->teacher_user_id === $teacher->id, 404);
        abort_unless($report->isDraft(), 422, 'This report is already approved.');

        $from = $report->period_start->copy()->startOfDay();
        $to = $report->period_end->copy()->endOfDay();
        $payload = $this->collector->collect($teacher, $student, (string) $report->period_type, $from, $to);

        $approvedKey = [
            'student_user_id' => $student->id,
            'teacher_user_id' => $teacher->id,
            'period_start' => $from->toDateString(),
            'period_end' => $to->toDateString(),
            'status' => StudentProgressReportStatus::Approved->value,
        ];
        if (StudentProgressReport::query()->where($approvedKey)->exists()) {
            throw ValidationException::withMessages([
                'period' => ['An approved report already exists for this period.'],
            ]);
        }

        $approved = StudentProgressReport::query()->create([
            ...$approvedKey,
            'period_type' => $report->period_type,
            'teacher_notes' => $report->teacher_notes,
            'payload' => $payload,
            'payload_version' => StudentProgressReportCollector::PAYLOAD_VERSION,
            'generated_at' => now(),
            'approved_at' => now(),
            'approved_by_user_id' => $teacher->id,
            'shared_with_parents' => $shareWithParents,
        ]);

        $report->delete();

        if ($shareWithParents) {
            $this->notices->approvedStudentProgressReport($student, (int) $approved->id);
        }

        return $approved;
    }

  /**
     * @return array<string, mixed>
     */
    public function show(User $teacher, StudentProgressReport $report): array
    {
        $student = $report->student;
        abort_unless($student instanceof User, 404);
        $this->authorize($teacher, $student);
        abort_unless($report->teacher_user_id === $teacher->id, 404);

        return $this->presentFull($report);
    }

    /**
     * @return array<string, mixed>
     */
    public function presentForParent(User $parent, StudentProgressReport $report): array
    {
        abort_unless($report->isApproved() && $report->shared_with_parents, 404);
        $student = $report->student;
        abort_unless($student instanceof User, 404);
        abort_unless(app(\App\Services\Parent\ParentAccessAuthorizer::class)->allows($parent, $student), 404);

        return $this->presentFull($report, includePrivateTeacherNotes: false);
    }

    private function authorize(User $teacher, User $student): void
    {
        abort_unless($this->access->allows($teacher, $student), 404);
    }

    /**
     * @param  array{period_type?: string, from?: ?string, to?: ?string, cadence?: ?string}  $input
     * @return array{0: string, 1: Carbon, 2: Carbon}
     */
    private function resolvePeriod(array $input): array
    {
        $periodType = (string) ($input['period_type'] ?? 'week');
        if (! in_array($periodType, ['week', 'month', 'custom'], true)) {
            $periodType = 'week';
        }

        if (! empty($input['from']) && ! empty($input['to'])) {
            $from = Carbon::parse((string) $input['from'])->startOfDay();
            $to = Carbon::parse((string) $input['to'])->endOfDay();
            if ($to->lt($from)) {
                throw ValidationException::withMessages(['to' => ['The end date must be on or after the start date.']]);
            }

            return ['custom', $from, $to];
        }

        if ($periodType === 'month') {
            $anchor = ! empty($input['cadence']) ? Carbon::parse((string) $input['cadence'])->utc() : now();
            [$from, $to] = ! empty($input['cadence'])
                ? $this->periods->containing('month', $anchor)
                : $this->periods->closed('month', $anchor);

            return ['month', $from, $to];
        }

        if ($periodType === 'week') {
            $anchor = ! empty($input['cadence']) ? Carbon::parse((string) $input['cadence'])->utc() : now();
            [$from, $to] = ! empty($input['cadence'])
                ? $this->periods->containing('week', $anchor)
                : $this->periods->closed('week', $anchor);

            return ['week', $from, $to];
        }

        $from = now()->subDays(6)->startOfDay();
        $to = now()->endOfDay();

        return ['custom', $from, $to];
    }

    /**
     * @return array<string, mixed>
     */
    private function presentList(StudentProgressReport $report): array
    {
        return [
            'id' => (int) $report->id,
            'status' => $report->status->value,
            'period_type' => (string) $report->period_type,
            'period_start' => $report->period_start->toDateString(),
            'period_end' => $report->period_end->toDateString(),
            'period_label' => $report->period_start->format('j M').' – '.$report->period_end->format('j M Y'),
            'shared_with_parents' => (bool) $report->shared_with_parents,
            'approved_at' => $report->approved_at?->toIso8601String(),
            'generated_at' => $report->generated_at?->toIso8601String(),
            'insufficient' => (bool) (is_array($report->payload) ? ($report->payload['insufficient'] ?? false) : false),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function presentFull(StudentProgressReport $report, bool $includePrivateTeacherNotes = true): array
    {
        $payload = is_array($report->payload) ? $report->payload : [];

        return [
            'id' => (int) $report->id,
            'status' => $report->status->value,
            'period_type' => (string) $report->period_type,
            'period_start' => $report->period_start->toDateString(),
            'period_end' => $report->period_end->toDateString(),
            'period_label' => $report->period_start->format('j M').' – '.$report->period_end->format('j M Y'),
            'shared_with_parents' => (bool) $report->shared_with_parents,
            'approved_at' => $report->approved_at?->toIso8601String(),
            'generated_at' => $report->generated_at?->toIso8601String(),
            'teacher_notes' => $includePrivateTeacherNotes ? $report->teacher_notes : null,
            'payload' => $payload,
            'immutable' => $report->isApproved(),
        ];
    }
}
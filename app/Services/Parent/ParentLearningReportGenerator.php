<?php

namespace App\Services\Parent;

use App\Models\ParentLearningReport;
use App\Models\User;
use App\Support\ParentFeatures;
use Illuminate\Support\Carbon;

class ParentLearningReportGenerator
{
    public function __construct(
        private readonly ParentLearningReportPeriods $periods,
        private readonly ParentLearningReportCollector $collector,
        private readonly ParentNoticeService $notices,
    ) {}

    public function generate(int $studentId, string $cadence, ?Carbon $start = null): ?ParentLearningReport
    {
        if (! ParentFeatures::enabled()) {
            return null;
        }

        $student = User::query()->find($studentId);
        if (! $student instanceof User) {
            return null;
        }

        $cadence = $cadence === 'month' ? 'month' : 'week';
        [$from, $to] = $start instanceof Carbon
            ? $this->periods->containing($cadence, $start)
            : $this->periods->closed($cadence, now());

        $payload = $this->collector->collect($student, $cadence, $from, $to);
        $key = [
            'student_user_id' => $student->id,
            'cadence' => $cadence,
            'period_start' => $from->toDateString(),
        ];
        $existed = ParentLearningReport::query()->where($key)->exists();
        $report = ParentLearningReport::query()->updateOrCreate($key, [
            'period_end' => $to->toDateString(),
            'generated_at' => now(),
            'payload' => $payload,
        ]);

        if (! $existed) {
            $this->notices->reportAvailable($student, (int) $report->id);
        }

        return $report;
    }
}

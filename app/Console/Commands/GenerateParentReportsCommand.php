<?php

namespace App\Console\Commands;

use App\Enums\ParentLinkStatus;
use App\Jobs\GenerateParentLearningReportJob;
use App\Models\ParentStudentLink;
use App\Services\Parent\ParentLearningReportGenerator;
use App\Services\Parent\ParentLearningReportPeriods;
use App\Support\ParentFeatures;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Throwable;

class GenerateParentReportsCommand extends Command
{
    protected $signature = 'mutqin:generate-parent-reports {--cadence=week : week or month} {--limit=200 : Maximum linked children} {--start= : A date inside the period to rebuild} {--sync : Generate in this process instead of the queue}';

    protected $description = 'Prepare idempotent weekly or monthly learning reports for linked children.';

    public function handle(ParentLearningReportGenerator $generator, ParentLearningReportPeriods $periods): int
    {
        if (! ParentFeatures::enabled()) {
            $this->line('Parent reports skipped=features-off.');

            return self::SUCCESS;
        }

        $cadence = $this->option('cadence') === 'month' ? 'month' : 'week';
        $start = is_string($this->option('start')) && $this->option('start') !== ''
            ? Carbon::parse((string) $this->option('start'))
            : null;
        $periodStart = ($start instanceof Carbon ? $periods->containing($cadence, $start)[0] : $periods->closed($cadence, now())[0])->toDateString();
        $ids = ParentStudentLink::query()
            ->where('status', ParentLinkStatus::Approved->value)
            ->distinct()
            ->limit(max(1, (int) $this->option('limit')))
            ->pluck('student_user_id');

        $failed = 0;
        foreach ($ids as $id) {
            try {
                if ($this->option('sync')) {
                    $generator->generate((int) $id, $cadence, $start);
                } else {
                    GenerateParentLearningReportJob::dispatch((int) $id, $cadence, $periodStart);
                }
            } catch (Throwable $e) {
                report($e);
                $failed++;
            }
        }

        $this->line('Parent reports considered='.$ids->count().' failed='.$failed.'.');

        return self::SUCCESS;
    }
}

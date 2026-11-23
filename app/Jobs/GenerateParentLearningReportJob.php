<?php

namespace App\Jobs;

use App\Services\Parent\ParentLearningReportGenerator;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Carbon;

class GenerateParentLearningReportJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 90;

    public function __construct(
        public int $studentId,
        public string $cadence,
        public string $periodStart,
    ) {}

    public function handle(ParentLearningReportGenerator $generator): void
    {
        $generator->generate($this->studentId, $this->cadence, Carbon::parse($this->periodStart));
    }
}

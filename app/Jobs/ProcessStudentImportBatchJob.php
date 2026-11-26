<?php

namespace App\Jobs;

use App\Services\Organisations\StudentImportProcessingService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

final class ProcessStudentImportBatchJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public int $timeout = 300;

    public function __construct(
        public int $batchId,
    ) {}

    public function handle(StudentImportProcessingService $processing): void
    {
        $processing->process($this->batchId);
    }
}
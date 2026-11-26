<?php

namespace App\Jobs;

use App\Models\StudentImportBatch;
use App\Models\User;
use App\Services\Organisations\StudentImportCommitService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

final class CommitStudentImportBatchJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public int $timeout = 600;

    public function __construct(
        public int $batchId,
        public int $teacherUserId,
    ) {}

    public function handle(StudentImportCommitService $commit): void
    {
        $batch = StudentImportBatch::query()->findOrFail($this->batchId);
        $teacher = User::query()->findOrFail($this->teacherUserId);
        $commit->commit($teacher, $batch);
    }
}
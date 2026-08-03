<?php

namespace App\Console\Commands;

use App\Services\Memorisation\LearningHistoryRetentionService;
use Illuminate\Console\Command;

class PurgeLearningHistoryCommand extends Command
{
    protected $signature = 'mutqin:purge-learning-history
                            {--soft-delete-assessments : Soft-delete assessments older than configured retention}
                            {--days= : Override assessment soft-delete retention days}';

    protected $description = 'Apply Mutqin learning-history retention rules (never logs notes or recordings).';

    public function handle(LearningHistoryRetentionService $retention): int
    {
        if ($this->option('soft-delete-assessments')) {
            $days = $this->option('days') !== null ? (int) $this->option('days') : null;
            $count = $retention->softDeleteExpiredAssessments($days);
            $this->info("Soft-deleted {$count} expired assessment(s).");
        } else {
            $this->comment('Nothing to do. Pass --soft-delete-assessments to apply assessment retention.');
        }

        return self::SUCCESS;
    }
}

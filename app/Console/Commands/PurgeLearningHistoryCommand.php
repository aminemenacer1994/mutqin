<?php

namespace App\Console\Commands;

use App\Services\Memorisation\LearningHistoryRetentionService;
use App\Support\AudioPrivacy;
use Illuminate\Console\Command;

class PurgeLearningHistoryCommand extends Command
{
    protected $signature = 'mutqin:purge-learning-history
                            {--soft-delete-assessments : Soft-delete assessments older than configured retention}
                            {--purge-temp-audio : Delete expired temporary learner audio files}
                            {--strip-sync-audio : Scrub raw audio fields from sync-state JSON when retention is not retain}
                            {--days= : Override assessment soft-delete retention days}
                            {--ttl-hours= : Override temporary audio TTL hours}';

    protected $description = 'Apply Mutqin learning-history retention rules (never logs notes or recordings).';

    public function handle(LearningHistoryRetentionService $retention): int
    {
        $didWork = false;

        if ($this->option('soft-delete-assessments')) {
            $days = $this->option('days') !== null ? (int) $this->option('days') : null;
            $count = $retention->softDeleteExpiredAssessments($days);
            $this->info("Soft-deleted {$count} expired assessment(s).");
            $didWork = true;
        }

        if ($this->option('purge-temp-audio')) {
            $retention->ensureTemporaryAudioDirectory();
            $ttl = $this->option('ttl-hours') !== null ? (int) $this->option('ttl-hours') : null;
            $deleted = $retention->purgeExpiredTemporaryAudioFiles($ttl);
            $this->info("Deleted {$deleted} temporary learner audio file(s) (retention=".AudioPrivacy::rawRecordingRetention().').');
            $didWork = true;
        }

        if ($this->option('strip-sync-audio')) {
            $scrubbed = $retention->stripRawAudioFromAllSyncStates();
            $this->info("Scrubbed raw audio from {$scrubbed} sync-state record(s).");
            $didWork = true;
        }

        if (! $didWork) {
            $this->comment('Nothing to do. Pass --soft-delete-assessments, --purge-temp-audio, and/or --strip-sync-audio.');
        }

        return self::SUCCESS;
    }
}

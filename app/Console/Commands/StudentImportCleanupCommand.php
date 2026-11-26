<?php

namespace App\Console\Commands;

use App\Enums\StudentImportBatchStatus;
use App\Models\StudentImportBatch;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class StudentImportCleanupCommand extends Command
{
    protected $signature = 'mutqin:student-import-cleanup {--dry-run : List batches that would be removed}';

    protected $description = 'Remove expired student import uploads and staging rows';

    public function handle(): int
    {
        $disk = (string) config('mutqin.student_import.disk', 'student_imports');
        $dry = (bool) $this->option('dry-run');

        $expired = StudentImportBatch::query()
            ->with('files')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->whereIn('status', [
                StudentImportBatchStatus::Completed->value,
                StudentImportBatchStatus::Failed->value,
                StudentImportBatchStatus::Ready->value,
                StudentImportBatchStatus::ReviewRequired->value,
            ])
            ->get();

        $count = 0;
        foreach ($expired as $batch) {
            $count++;
            $this->line("Batch #{$batch->id} (org {$batch->organisation_id})");
            if ($dry) {
                continue;
            }

            Storage::disk($disk)->deleteDirectory('batches/'.$batch->id);
            $batch->rows()->delete();
            $batch->files()->delete();
            $batch->delete();
        }

        $this->info($dry
            ? "Would clean {$count} expired import batch(es)."
            : "Cleaned {$count} expired import batch(es).");

        return self::SUCCESS;
    }
}
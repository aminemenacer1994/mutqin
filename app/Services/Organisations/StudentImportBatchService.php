<?php

namespace App\Services\Organisations;

use App\Enums\StudentImportBatchStatus;
use App\Enums\StudentImportFileStatus;
use App\Jobs\ProcessStudentImportBatchJob;
use App\Models\LearningGroup;
use App\Models\StudentImportBatch;
use App\Models\StudentImportFile;
use App\Models\User;
use App\Support\Imports\Parsers\PastedTextStudentImportParser;
use App\Support\Imports\StudentImportFileSecurity;
use App\Support\TeacherFeatures;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class StudentImportBatchService
{
    public function __construct(
        private readonly StudentImportFileSecurity $security,
    ) {}

    /**
     * @param  list<UploadedFile>|null  $files
     */
    public function create(
        User $teacher,
        LearningGroup $group,
        ?array $files = null,
        ?string $pastedText = null,
    ): StudentImportBatch {
        TeacherFeatures::abortUnlessEnabled();
        Gate::forUser($teacher)->authorize('manage', $group);

        if ($teacher->organisation_id === null || (int) $teacher->organisation_id !== (int) $group->organisation_id) {
            throw ValidationException::withMessages(['group' => 'Group is outside your institution.']);
        }

        $files = $files ?? [];
        $hasFiles = $files !== [];
        $hasPaste = is_string($pastedText) && trim($pastedText) !== '';

        if (! $hasFiles && ! $hasPaste) {
            throw ValidationException::withMessages([
                'files' => 'Upload at least one file or provide pasted text.',
            ]);
        }

        if ($hasFiles && count($files) > $this->security->maxFilesPerBatch()) {
            throw ValidationException::withMessages([
                'files' => 'Too many files in one batch (maximum '.$this->security->maxFilesPerBatch().').',
            ]);
        }

        $retentionHours = max(1, (int) config('mutqin.student_import.retention_hours', 72));
        $disk = (string) config('mutqin.student_import.disk', 'student_imports');

        $batch = DB::transaction(function () use ($teacher, $group, $files, $pastedText, $hasPaste, $retentionHours, $disk): StudentImportBatch {
            $batch = StudentImportBatch::query()->create([
                'organisation_id' => $group->organisation_id,
                'learning_group_id' => $group->id,
                'initiated_by_user_id' => $teacher->id,
                'status' => StudentImportBatchStatus::Uploaded,
                'expires_at' => now()->addHours($retentionHours),
                'metadata' => [
                    'has_pasted_text' => $hasPaste,
                ],
            ]);

            foreach ($files as $file) {
                if (! $file instanceof UploadedFile) {
                    continue;
                }
                $verified = $this->security->validateUpload($file);
                $storedName = Str::uuid()->toString().'.'.$verified['extension'];
                $directory = 'batches/'.$batch->id;
                $storedPath = $file->storeAs($directory, $storedName, $disk);
                if ($storedPath === false) {
                    throw ValidationException::withMessages(['files' => 'Upload storage failed.']);
                }

                StudentImportFile::query()->create([
                    'student_import_batch_id' => $batch->id,
                    'original_filename' => $file->getClientOriginalName(),
                    'stored_path' => $storedPath,
                    'mime_type' => $verified['mime'],
                    'extension' => $verified['extension'],
                    'size_bytes' => (int) $file->getSize(),
                    'sha256' => $verified['sha256'],
                    'status' => StudentImportFileStatus::Pending,
                    'provenance' => [
                        'uploaded_by' => $teacher->id,
                    ],
                ]);
            }

            if ($hasPaste && is_string($pastedText)) {
                $pasteMax = max(1024, (int) config('mutqin.student_import.max_pasted_text_bytes', 512 * 1024));
                if (strlen($pastedText) > $pasteMax) {
                    throw ValidationException::withMessages([
                        'pasted_text' => 'Pasted text exceeds the maximum size.',
                    ]);
                }

                $storedName = Str::uuid()->toString().'.txt';
                $directory = 'batches/'.$batch->id;
                $storedPath = $directory.'/'.$storedName;
                Storage::disk($disk)->put($storedPath, $pastedText);
                $sha256 = hash('sha256', $pastedText);

                StudentImportFile::query()->create([
                    'student_import_batch_id' => $batch->id,
                    'original_filename' => 'pasted.txt',
                    'stored_path' => $storedPath,
                    'mime_type' => 'text/plain',
                    'extension' => 'txt',
                    'size_bytes' => strlen($pastedText),
                    'sha256' => $sha256,
                    'status' => StudentImportFileStatus::Pending,
                    'parser_key' => (new PastedTextStudentImportParser)->key(),
                    'provenance' => [
                        'uploaded_by' => $teacher->id,
                        'pasted' => true,
                    ],
                ]);
            }

            return $batch->refresh()->load('files');
        });

        $this->processImportBatch($batch->id);

        return $batch->fresh()->load('files');
    }

    public function processImportBatch(int $batchId): void
    {
        if (config('mutqin.student_import.queue_processing', false)) {
            ProcessStudentImportBatchJob::dispatch($batchId);

            return;
        }

        app(StudentImportProcessingService::class)->process($batchId);
    }

    public function markProcessing(StudentImportBatch $batch): void
    {
        $batch->forceFill([
            'status' => StudentImportBatchStatus::Processing,
            'processing_started_at' => now(),
            'progress_percent' => 5,
        ])->save();
    }

    public function refreshRowCounts(StudentImportBatch $batch): StudentImportBatch
    {
        $total = $batch->rows()->count();
        $valid = $batch->rows()->where('status', 'valid')->count();
        $invalid = $batch->rows()->where('status', 'invalid')->count();

        $status = $total === 0
            ? StudentImportBatchStatus::Failed
            : ($invalid > 0 && $valid === 0
                ? StudentImportBatchStatus::ReviewRequired
                : ($invalid > 0
                    ? StudentImportBatchStatus::ReviewRequired
                    : StudentImportBatchStatus::Ready));

        $batch->forceFill([
            'rows_total' => $total,
            'rows_valid' => $valid,
            'rows_invalid' => $invalid,
            'status' => $status,
            'progress_percent' => 100,
            'ready_at' => $status === StudentImportBatchStatus::Ready ? now() : $batch->ready_at,
        ])->save();

        return $batch->refresh();
    }
}
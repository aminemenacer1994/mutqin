<?php

namespace App\Services\Organisations;

use App\Enums\StudentImportBatchStatus;
use App\Enums\StudentImportFileStatus;
use App\Enums\StudentImportRowStatus;
use App\Models\StudentImportBatch;
use App\Models\StudentImportFile;
use App\Models\StudentImportRow;
use App\Models\User;
use App\Support\Imports\Parsers\PastedTextStudentImportParser;
use App\Support\Imports\StudentImportParserRegistry;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class StudentImportProcessingService
{
    public function __construct(
        private readonly StudentImportParserRegistry $parsers,
        private readonly StudentImportRowValidator $validator,
        private readonly StudentImportBatchService $batches,
    ) {}

    public function process(int $batchId): void
    {
        $batch = StudentImportBatch::query()->with('files')->findOrFail($batchId);
        if ($batch->status->isTerminal()) {
            return;
        }

        if ($batch->rows()->exists()) {
            return;
        }

        $this->batches->markProcessing($batch);
        $disk = (string) config('mutqin.student_import.disk', 'student_imports');

        $fileCount = max(1, $batch->files->count());
        $fileIndex = 0;

        foreach ($batch->files as $file) {
            $fileIndex++;
            $this->processFile($batch, $file, $disk);
            $batch->forceFill([
                'progress_percent' => (int) min(95, round(($fileIndex / $fileCount) * 90)),
            ])->save();
        }

        $batch = $this->batches->refreshRowCounts($batch);

        if ($batch->status === StudentImportBatchStatus::Failed) {
            $batch->forceFill([
                'failed_at' => now(),
                'error_summary' => 'No student rows could be extracted from the uploaded files.',
            ])->save();
        }
    }

    private function processFile(StudentImportBatch $batch, StudentImportFile $file, string $disk): void
    {
        $absolutePath = Storage::disk($disk)->path($file->stored_path);
        if (! is_file($absolutePath)) {
            $file->forceFill([
                'status' => StudentImportFileStatus::Failed,
                'error_message' => 'Stored upload is missing.',
            ])->save();

            return;
        }

        try {
            $result = ($file->provenance['pasted'] ?? false) === true
                ? (new PastedTextStudentImportParser)->parse((string) Storage::disk($disk)->get($file->stored_path))
                : $this->parsers->parseFile($absolutePath, $file->original_filename);

            if ($result->isUnsupported()) {
                $file->forceFill([
                    'status' => StudentImportFileStatus::Unsupported,
                    'error_message' => $result->unsupportedReason,
                ])->save();

                return;
            }

            DB::transaction(function () use ($batch, $file, $result) {
                foreach ($result->rows as $payload) {
                    $validation = $this->validator->validate($payload['fields']);
                    $matchedUserId = null;
                    $email = strtolower(trim((string) ($validation['normalized']['email'] ?? '')));
                    if ($email !== '') {
                        $matched = User::query()->whereRaw('LOWER(email) = ?', [$email])->value('id');
                        $matchedUserId = $matched ? (int) $matched : null;
                    }

                    StudentImportRow::query()->create([
                        'student_import_batch_id' => $batch->id,
                        'student_import_file_id' => $file->id,
                        'row_index' => (int) $payload['row_index'],
                        'status' => $validation['valid']
                            ? StudentImportRowStatus::Valid
                            : StudentImportRowStatus::Invalid,
                        'normalized' => $validation['normalized'],
                        'errors' => $validation['errors'],
                        'matched_user_id' => $matchedUserId,
                        'source' => array_merge($payload['source'] ?? [], [
                            'raw_fields' => $payload['fields'],
                            'headings' => $result->headings,
                        ]),
                    ]);
                }
            });

            $file->forceFill([
                'status' => StudentImportFileStatus::Parsed,
                'parser_key' => $result->provenance['parser'] ?? null,
                'provenance' => array_merge($file->provenance ?? [], $result->provenance),
            ])->save();
        } catch (\Throwable $e) {
            report($e);
            $file->forceFill([
                'status' => StudentImportFileStatus::Failed,
                'error_message' => $e->getMessage(),
            ])->save();
        }
    }
}
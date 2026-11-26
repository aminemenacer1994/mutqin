<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Jobs\CommitStudentImportBatchJob;
use App\Models\LearningGroup;
use App\Enums\StudentImportRowStatus;
use App\Models\StudentImportBatch;
use App\Models\StudentImportRow;
use App\Models\User;
use App\Services\Organisations\StudentImportBatchService;
use App\Services\Organisations\StudentImportCommitService;
use App\Services\Organisations\StudentImportRowValidator;
use App\Support\Imports\StudentImportParserRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class TeacherStudentImportController extends Controller
{
    public function supportedFormats(StudentImportParserRegistry $registry): JsonResponse
    {
        return response()->json([
            'extensions' => $registry->supportedExtensions(),
            'limits' => [
                'max_file_bytes' => (int) config('mutqin.student_import.max_file_bytes'),
                'max_files_per_batch' => (int) config('mutqin.student_import.max_files_per_batch'),
            ],
        ]);
    }

    public function store(
        Request $request,
        LearningGroup $group,
        StudentImportBatchService $batches,
    ): JsonResponse {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $data = $request->validate([
            'files' => ['nullable', 'array'],
            'files.*' => ['file'],
            'pasted_text' => ['nullable', 'string', 'max:524288'],
        ]);

        /** @var list<\Illuminate\Http\UploadedFile> $uploaded */
        $uploaded = $request->file('files', []);

        $batch = $batches->create(
            $user,
            $group,
            $uploaded,
            $data['pasted_text'] ?? null,
        );

        $batch->load(['files', 'rows' => fn ($q) => $q->orderBy('row_index')->limit(500)]);

        return response()->json($this->serializeBatch($batch, includeRows: true), 201);
    }

    public function show(Request $request, StudentImportBatch $import): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        Gate::forUser($user)->authorize('view', $import);

        $import->load(['files', 'rows' => fn ($q) => $q->orderBy('row_index')->limit(500)]);

        return response()->json($this->serializeBatch($import, includeRows: true));
    }

    public function process(
        Request $request,
        StudentImportBatch $import,
        StudentImportBatchService $batches,
    ): JsonResponse {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        Gate::forUser($user)->authorize('manage', $import);

        if ($import->status->isTerminal()) {
            throw ValidationException::withMessages(['batch' => 'This import batch can no longer be processed.']);
        }

        if (! $import->rows()->exists()) {
            $batches->processImportBatch($import->id);
        }

        $import = $import->fresh()->load(['files', 'rows' => fn ($q) => $q->orderBy('row_index')->limit(500)]);

        return response()->json($this->serializeBatch($import, includeRows: true));
    }

    public function updateRow(
        Request $request,
        StudentImportBatch $import,
        StudentImportRow $row,
        StudentImportRowValidator $validator,
        StudentImportBatchService $batches,
    ): JsonResponse {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        Gate::forUser($user)->authorize('manage', $import);
        $this->assertRowBelongsToBatch($import, $row);

        if ($import->status->isTerminal()) {
            throw ValidationException::withMessages(['batch' => 'This import batch can no longer be edited.']);
        }

        $data = $request->validate([
            'email' => ['nullable', 'string', 'max:255'],
            'name' => ['nullable', 'string', 'max:255'],
            'parent_email' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:64'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $fields = array_merge($row->normalized ?? [], array_filter($data, fn ($value) => $value !== null));
        $validation = $validator->validate($fields);

        $matchedUserId = null;
        $email = strtolower(trim((string) ($validation['normalized']['email'] ?? '')));
        if ($email !== '') {
            $matched = User::query()->whereRaw('LOWER(email) = ?', [$email])->value('id');
            $matchedUserId = $matched ? (int) $matched : null;
        }

        $row->forceFill([
            'normalized' => $validation['normalized'],
            'errors' => $validation['errors'],
            'status' => $row->status === StudentImportRowStatus::Skipped
                ? StudentImportRowStatus::Skipped
                : ($validation['valid'] ? StudentImportRowStatus::Valid : StudentImportRowStatus::Invalid),
            'matched_user_id' => $matchedUserId,
        ])->save();

        $import = $batches->refreshRowCounts($import->fresh());
        $import->load(['files', 'rows' => fn ($q) => $q->orderBy('row_index')->limit(500)]);

        return response()->json($this->serializeBatch($import, includeRows: true));
    }

    public function skipRow(
        Request $request,
        StudentImportBatch $import,
        StudentImportRow $row,
        StudentImportBatchService $batches,
    ): JsonResponse {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        Gate::forUser($user)->authorize('manage', $import);
        $this->assertRowBelongsToBatch($import, $row);

        if ($import->status->isTerminal()) {
            throw ValidationException::withMessages(['batch' => 'This import batch can no longer be edited.']);
        }

        if (! in_array($row->status, [StudentImportRowStatus::Valid, StudentImportRowStatus::Invalid], true)) {
            throw ValidationException::withMessages(['row' => 'This row cannot be skipped.']);
        }

        $row->forceFill(['status' => StudentImportRowStatus::Skipped])->save();
        $import = $batches->refreshRowCounts($import->fresh());
        $import->load(['files', 'rows' => fn ($q) => $q->orderBy('row_index')->limit(500)]);

        return response()->json($this->serializeBatch($import, includeRows: true));
    }

    public function commit(
        Request $request,
        StudentImportBatch $import,
        StudentImportCommitService $commit,
    ): JsonResponse {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $data = $request->validate([
            'async' => ['sometimes', 'boolean'],
        ]);

        $validRowCount = $import->rows()->where('status', 'valid')->count();
        if (($data['async'] ?? false) || $validRowCount > 50) {
            Gate::forUser($user)->authorize('manage', $import);
            CommitStudentImportBatchJob::dispatch($import->id, $user->id);

            return response()->json(['queued' => true, 'batch_id' => $import->id]);
        }

        $batch = $commit->commit($user, $import->fresh());
        $batch->load(['files', 'rows' => fn ($q) => $q->orderBy('row_index')->limit(500)]);

        return response()->json($this->serializeBatch($batch, includeRows: true));
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeBatch(StudentImportBatch $batch, bool $includeRows = false): array
    {
        $payload = [
            'id' => $batch->id,
            'status' => $batch->status->value,
            'progress_percent' => $batch->progress_percent,
            'learning_group_id' => $batch->learning_group_id,
            'organisation_id' => $batch->organisation_id,
            'rows_total' => $batch->rows_total,
            'rows_valid' => $batch->rows_valid,
            'rows_invalid' => $batch->rows_invalid,
            'rows_imported' => $batch->rows_imported,
            'error_summary' => $batch->error_summary,
            'expires_at' => $batch->expires_at?->toIso8601String(),
            'files' => $batch->relationLoaded('files')
                ? $batch->files->map(fn ($file) => [
                    'id' => $file->id,
                    'original_filename' => $file->original_filename,
                    'status' => $file->status->value,
                    'error_message' => $file->error_message,
                    'parser_key' => $file->parser_key,
                    'size_bytes' => $file->size_bytes,
                    'provenance' => $file->provenance,
                ])->values()->all()
                : [],
        ];

        if ($includeRows && $batch->relationLoaded('rows')) {
            $payload['rows'] = $batch->rows->map(fn ($row) => [
                'id' => $row->id,
                'row_index' => $row->row_index,
                'status' => $row->status->value,
                'normalized' => $row->normalized,
                'errors' => $row->errors,
                'source' => $row->source,
                'matched_user_id' => $row->matched_user_id,
            ])->values()->all();
        }

        return $payload;
    }

    private function assertRowBelongsToBatch(StudentImportBatch $import, StudentImportRow $row): void
    {
        if ((int) $row->student_import_batch_id !== (int) $import->id) {
            abort(404);
        }
    }
}
<?php

namespace App\Services\Teacher;

use App\Enums\MushafAnnotationCategory;
use App\Models\MushafAnnotation;
use App\Models\User;
use App\Services\Organisations\StudentAccessAuthorizer;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MushafAnnotationService
{
    public function __construct(
        private readonly StudentAccessAuthorizer $access,
        private readonly TeacherWordCoachingAudioService $audio,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function manualContext(User $teacher, User $student, string $contextType, int $contextId): array
    {
        abort_unless($this->access->allows($teacher, $student), 403);

        return MushafAnnotation::query()
            ->where('teacher_id', $teacher->id)
            ->where('student_id', $student->id)
            ->where('context_type', $contextType)
            ->where('context_id', max(0, $contextId))
            ->orderBy('id')
            ->get()
            ->map(fn (MushafAnnotation $row) => $this->present($row, forStudent: false))
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function publishedForStudent(User $student, int $surah, int $ayahFrom, int $ayahTo): array
    {
        return MushafAnnotation::query()
            ->where('student_id', $student->id)
            ->where('surah_number', $surah)
            ->whereBetween('ayah_number', [$ayahFrom, max($ayahFrom, $ayahTo)])
            ->where('is_published', true)
            ->where('is_draft', false)
            ->orderBy('ayah_number')
            ->orderBy('word_index')
            ->get()
            ->map(fn (MushafAnnotation $row) => $this->present($row, forStudent: true))
            ->all();
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function store(
        User $teacher,
        User $student,
        array $input,
        ?UploadedFile $audio = null,
    ): array {
        abort_unless($this->access->allows($teacher, $student), 403);
        $category = (string) ($input['category'] ?? '');
        if (! in_array($category, MushafAnnotationCategory::values(), true)) {
            throw ValidationException::withMessages(['category' => 'Choose a mistake category.']);
        }

        $granularity = (string) ($input['granularity'] ?? 'word');
        if (! in_array($granularity, ['word', 'ayah'], true)) {
            throw ValidationException::withMessages(['granularity' => 'Choose word or ayah scope.']);
        }

        return DB::transaction(function () use ($teacher, $student, $input, $audio, $category, $granularity) {
            $annotation = new MushafAnnotation;
            $annotation->forceFill([
                'teacher_id' => $teacher->id,
                'student_id' => $student->id,
                'context_type' => (string) $input['context_type'],
                'context_id' => (int) ($input['context_id'] ?? 0),
                'surah_number' => (int) $input['surah'],
                'ayah_number' => (int) $input['ayah'],
                'word_index' => $granularity === 'word' ? (int) $input['word_index'] : null,
                'granularity' => $granularity,
                'category' => $category,
                'severity' => isset($input['severity']) && $input['severity'] !== '' ? (string) $input['severity'] : null,
                'structured_rule' => isset($input['structured_rule']) && $input['structured_rule'] !== '' ? (string) $input['structured_rule'] : null,
                'guidance' => trim((string) ($input['guidance'] ?? '')) ?: null,
                'start_ms' => isset($input['start_ms']) ? (int) $input['start_ms'] : null,
                'end_ms' => isset($input['end_ms']) ? (int) $input['end_ms'] : null,
                'is_published' => (bool) ($input['publish'] ?? false),
                'is_draft' => ! (bool) ($input['publish'] ?? false),
            ])->save();

            if ($audio instanceof UploadedFile) {
                $stored = $this->storeAudio($annotation, $audio, isset($input['duration_ms']) ? (int) $input['duration_ms'] : null);
                if (! $stored) {
                    $annotation->delete();
                    throw ValidationException::withMessages([
                        'audio' => 'Use a supported voice recording smaller than 8 MB.',
                    ]);
                }
            }

            return $this->present($annotation->refresh(), forStudent: false);
        });
    }

    public function delete(User $teacher, User $student, MushafAnnotation $annotation): void
    {
        abort_unless(
            (int) $annotation->teacher_id === (int) $teacher->id
            && (int) $annotation->student_id === (int) $student->id,
            404,
        );
        abort_unless($this->access->allows($teacher, $student), 403);
        if ($annotation->audio_path) {
            $this->purgeAudio($annotation);
        }
        $annotation->delete();
    }

  /**
   * @return array<string, mixed>
   */
    private function present(MushafAnnotation $row, bool $forStudent): array
    {
        return [
            'id' => (int) $row->id,
            'context_type' => $row->context_type,
            'context_id' => (int) $row->context_id,
            'surah' => (int) $row->surah_number,
            'ayah' => (int) $row->ayah_number,
            'word_index' => $row->word_index !== null ? (int) $row->word_index : null,
            'granularity' => $row->granularity,
            'category' => $row->category,
            'severity' => $row->severity,
            'structured_rule' => $row->structured_rule,
            'guidance' => $forStudent && ! $row->is_published ? null : $row->guidance,
            'start_ms' => $row->start_ms,
            'end_ms' => $row->end_ms,
            'source' => 'teacher',
            'is_published' => (bool) $row->is_published,
            'is_draft' => (bool) $row->is_draft,
            'audio' => $this->audioPayload($row),
            'created_at' => $row->created_at?->toIso8601String(),
        ];
    }

    private function storeAudio(MushafAnnotation $annotation, UploadedFile $file, ?int $durationMs): bool
    {
        $mime = strtolower((string) ($file->getMimeType() ?: $file->getClientMimeType() ?: ''));
        $contents = $file->get();
        if (! is_string($contents)) {
            return false;
        }
        $bytes = strlen($contents);
        if ($mime === '' || $bytes === 0 || $bytes > TeacherWordCoachingAudioService::MAX_BYTES) {
            return false;
        }

        $durationMs = $durationMs && $durationMs > 0
            ? min($durationMs, TeacherWordCoachingAudioService::MAX_DURATION_MS)
            : null;
        $path = sprintf(
            '%s/%d/%s.webm',
            'mushaf-annotations',
            (int) $annotation->id,
            \Illuminate\Support\Str::uuid(),
        );

        $disk = TeacherWordCoachingAudioService::DISK;
        if (! \Illuminate\Support\Facades\Storage::disk($disk)->put($path, $contents)) {
            return false;
        }

        $annotation->forceFill([
            'audio_disk' => $disk,
            'audio_path' => $path,
            'audio_mime' => $mime,
            'audio_bytes' => $bytes,
            'audio_duration_ms' => $durationMs,
        ])->save();

        return true;
    }

    private function purgeAudio(MushafAnnotation $annotation): void
    {
        if (! $annotation->audio_path || ! $annotation->audio_disk) {
            return;
        }
        \Illuminate\Support\Facades\Storage::disk((string) $annotation->audio_disk)->delete((string) $annotation->audio_path);
    }

    /**
     * @return array<string, mixed>
     */
    private function audioPayload(MushafAnnotation $row): array
    {
        if (! $row->audio_path || ! $row->audio_disk) {
            return ['available' => false];
        }

        return [
            'available' => true,
            'url' => route('api.teacher.mushaf-annotations.audio', ['annotation' => $row->id]),
            'duration_ms' => $row->audio_duration_ms,
        ];
    }
}
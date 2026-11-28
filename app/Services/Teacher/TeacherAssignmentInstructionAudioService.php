<?php

namespace App\Services\Teacher;

use App\Enums\ParentGuardianPermission;
use App\Enums\TeacherAssignmentAudioRole;
use App\Models\LearningPlanItem;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentAudioAsset;
use App\Models\TeacherAssignmentAudioRevision;
use App\Models\TeacherAssignmentRecipient;
use App\Models\User;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Services\Parent\ParentAccessAuthorizer;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class TeacherAssignmentInstructionAudioService
{
    public function __construct(
        private readonly StudentAccessAuthorizer $access,
        private readonly ParentAccessAuthorizer $parentAccess,
    ) {}

    public const DISK = TeacherAssignmentMessageAudioService::DISK;

    public const PREFIX = 'teacher-assignment-audio';

    public const MAX_BYTES = TeacherAssignmentMessageAudioService::MAX_BYTES;

    public const MAX_DURATION_MS = TeacherAssignmentMessageAudioService::MAX_DURATION_MS;

    /** @var list<string> */
    private const ALLOWED_MIMES = [
        'audio/webm',
        'audio/mp4',
        'audio/m4a',
        'audio/x-m4a',
        'audio/ogg',
        'audio/wav',
        'audio/x-wav',
        'audio/wave',
        'audio/mpeg',
        'audio/mp3',
        'video/webm',
        'video/mp4',
    ];

    /**
     * @param  array<string, mixed>  $input
     */
    public function applyRoleInput(
        User $teacher,
        TeacherAssignment $assignment,
        TeacherAssignmentAudioRole $role,
        array $input,
        string $fileKey,
        string $assetIdKey,
        string $clearKey,
        string $column,
    ): bool {
        $changed = false;
        $currentId = $assignment->{$column} ? (int) $assignment->{$column} : null;

        if (! empty($input[$clearKey])) {
            if ($currentId !== null) {
                $this->archiveRevision($assignment, $role, $currentId);
                $assignment->forceFill([$column => null])->save();
                $changed = true;
            }

            return $changed;
        }

        $file = $input[$fileKey] ?? null;
        if ($file instanceof UploadedFile) {
            $asset = $this->storeFromUpload($teacher, $role, $file, isset($input['duration_ms']) ? (int) $input['duration_ms'] : null);
            if ($asset === null) {
                throw ValidationException::withMessages([
                    $fileKey => 'Voice recording could not be saved. Try again or publish without audio.',
                ]);
            }
            if ($currentId !== null && $currentId !== (int) $asset->id) {
                $this->archiveRevision($assignment, $role, $currentId);
            }
            $assignment->forceFill([$column => $asset->id])->save();
            $changed = true;

            return $changed;
        }

        $reuseId = isset($input[$assetIdKey]) ? (int) $input[$assetIdKey] : 0;
        if ($reuseId > 0) {
            $asset = $this->authorisedAsset($teacher, $reuseId, $role);
            if ($currentId !== null && $currentId !== (int) $asset->id) {
                $this->archiveRevision($assignment, $role, $currentId);
            }
            if ($currentId !== (int) $asset->id) {
                $assignment->forceFill([$column => $asset->id])->save();
                $changed = true;
            }
        }

        return $changed;
    }

    public function storeFromUpload(
        User $teacher,
        TeacherAssignmentAudioRole $role,
        UploadedFile $file,
        ?int $durationMs = null,
    ): ?TeacherAssignmentAudioAsset {
        if ($teacher->organisation_id === null) {
            return null;
        }

        $mime = $this->normaliseMime($file);
        $contents = $file->get();
        if (! is_string($contents)) {
            return null;
        }
        $bytes = strlen($contents);
        if ($mime === '' || $bytes === 0 || $bytes > self::MAX_BYTES) {
            return null;
        }

        $durationMs = $durationMs && $durationMs > 0
            ? min($durationMs, self::MAX_DURATION_MS)
            : null;
        $path = sprintf(
            '%s/%s/%s.%s',
            self::PREFIX,
            Str::uuid(),
            Str::uuid(),
            $this->extensionForMime($mime),
        );

        if (! Storage::disk(self::DISK)->put($path, $contents)) {
            return null;
        }

        $asset = new TeacherAssignmentAudioAsset;
        $asset->forceFill([
            'teacher_id' => $teacher->id,
            'organisation_id' => $teacher->organisation_id,
            'role' => $role->value,
            'audio_disk' => self::DISK,
            'audio_path' => $path,
            'audio_mime' => $mime,
            'audio_bytes' => $bytes,
            'audio_duration_ms' => $durationMs,
        ])->save();

        return $asset;
    }

    public function authorisedAsset(User $teacher, int $assetId, TeacherAssignmentAudioRole $role): TeacherAssignmentAudioAsset
    {
        $asset = TeacherAssignmentAudioAsset::query()->find($assetId);
        if ($asset === null
            || (int) $asset->teacher_id !== (int) $teacher->id
            || (int) $asset->organisation_id !== (int) $teacher->organisation_id) {
            throw ValidationException::withMessages([
                'audio' => 'That recording is not available for reuse.',
            ]);
        }
        $assetRole = $asset->role instanceof TeacherAssignmentAudioRole
            ? $asset->role
            : TeacherAssignmentAudioRole::tryFrom((string) $asset->role);
        if ($assetRole !== $role) {
            throw ValidationException::withMessages([
                'audio' => 'Recording type does not match this field.',
            ]);
        }
        if (! $asset->audio_path) {
            throw ValidationException::withMessages([
                'audio' => 'That recording is missing.',
            ]);
        }

        return $asset;
    }

  /**
     * @return array{available: bool, url: string|null, mime: string|null, duration_ms: int|null, role: string, reason: string}
     */
    public function payload(?TeacherAssignmentAudioAsset $asset): array
    {
        if (! $asset instanceof TeacherAssignmentAudioAsset || ! $asset->audio_path) {
            return [
                'available' => false,
                'url' => null,
                'mime' => null,
                'duration_ms' => null,
                'role' => '',
                'reason' => 'not_recorded',
            ];
        }

        $available = false;
        try {
            $available = Storage::disk($asset->audio_disk ?: self::DISK)->exists($asset->audio_path);
        } catch (\Throwable) {
            $available = false;
        }
        $role = $asset->role instanceof TeacherAssignmentAudioRole
            ? $asset->role->value
            : (string) $asset->role;

        return [
            'available' => $available,
            'url' => $available ? '/api/assignment-audio/'.$asset->id.'/stream' : null,
            'mime' => $asset->audio_mime,
            'duration_ms' => $asset->audio_duration_ms ? (int) $asset->audio_duration_ms : null,
            'role' => $role,
            'reason' => $available ? 'available' : 'missing',
        ];
    }

    /** @return array{instruction: array<string, mixed>, recitation_demo: array<string, mixed>} */
    public function assignmentPayload(TeacherAssignment $assignment): array
    {
        $assignment->loadMissing(['instructionAudioAsset', 'recitationDemoAudioAsset']);

        return [
            'instruction' => $this->payload($assignment->instructionAudioAsset),
            'recitation_demo' => $this->payload($assignment->recitationDemoAudioAsset),
        ];
    }

    /** @return array{instruction: array<string, mixed>, recitation_demo: array<string, mixed>} */
    public function planItemPayload(LearningPlanItem $item): array
    {
        $item->loadMissing(['instructionAudioAsset', 'recitationDemoAudioAsset']);

        return [
            'instruction' => $this->payload($item->instructionAudioAsset),
            'recitation_demo' => $this->payload($item->recitationDemoAudioAsset),
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     */
    public function applyPlanItemInstructionAudio(User $teacher, LearningPlanItem $item, array $input): bool
    {
        $instructionInput = $input;
        $instructionInput['duration_ms'] = $input['instruction_audio_duration_ms'] ?? null;
        $changed = $this->applyPlanRoleInput(
            $teacher,
            $item,
            TeacherAssignmentAudioRole::Instruction,
            $instructionInput,
            'instruction_audio',
            'instruction_audio_asset_id',
            'clear_instruction_audio',
            'instruction_audio_asset_id',
        );

        $demoInput = $input;
        $demoInput['duration_ms'] = $input['recitation_demo_audio_duration_ms'] ?? null;

        return $this->applyPlanRoleInput(
            $teacher,
            $item,
            TeacherAssignmentAudioRole::RecitationDemo,
            $demoInput,
            'recitation_demo_audio',
            'recitation_demo_audio_asset_id',
            'clear_recitation_demo_audio',
            'recitation_demo_audio_asset_id',
        ) || $changed;
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private function applyPlanRoleInput(
        User $teacher,
        LearningPlanItem $item,
        TeacherAssignmentAudioRole $role,
        array $input,
        string $fileKey,
        string $assetIdKey,
        string $clearKey,
        string $column,
    ): bool {
        $changed = false;
        $currentId = $item->{$column} ? (int) $item->{$column} : null;

        if (! empty($input[$clearKey])) {
            if ($currentId !== null) {
                $item->forceFill([$column => null])->save();
                $changed = true;
            }

            return $changed;
        }

        $file = $input[$fileKey] ?? null;
        if ($file instanceof UploadedFile) {
            $asset = $this->storeFromUpload($teacher, $role, $file, isset($input['duration_ms']) ? (int) $input['duration_ms'] : null);
            if ($asset === null) {
                throw ValidationException::withMessages([
                    $fileKey => 'Voice recording could not be saved. Try again or publish without audio.',
                ]);
            }
            $item->forceFill([$column => $asset->id])->save();

            return true;
        }

        $reuseId = isset($input[$assetIdKey]) ? (int) $input[$assetIdKey] : 0;
        if ($reuseId > 0) {
            $asset = $this->authorisedAsset($teacher, $reuseId, $role);
            if ($currentId !== (int) $asset->id) {
                $item->forceFill([$column => $asset->id])->save();
                $changed = true;
            }
        }

        return $changed;
    }

    public function stream(User $user, TeacherAssignmentAudioAsset $asset): ?Response
    {
        if (! $asset->audio_path) {
            return null;
        }

        if (! $this->canStream($user, $asset)) {
            return null;
        }

        $disk = Storage::disk($asset->audio_disk ?: self::DISK);
        if (! $disk->exists($asset->audio_path)) {
            return null;
        }

        return $disk->response($asset->audio_path, 'assignment-voice', [
            'Content-Type' => $asset->audio_mime ?: 'application/octet-stream',
            'Content-Disposition' => 'inline',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    private function canStream(User $user, TeacherAssignmentAudioAsset $asset): bool
    {
        if ((int) $asset->teacher_id === (int) $user->id && $user->isTeacher()) {
            return true;
        }

        $assignmentIds = TeacherAssignment::query()
            ->where(function ($query) use ($asset) {
                $query->where('instruction_audio_asset_id', $asset->id)
                    ->orWhere('recitation_demo_audio_asset_id', $asset->id);
            })
            ->pluck('id');

        if ($assignmentIds->isEmpty()) {
            return false;
        }

        $recipient = TeacherAssignmentRecipient::query()
            ->whereIn('teacher_assignment_id', $assignmentIds)
            ->where('student_id', $user->id)
            ->exists();
        if ($recipient) {
            return true;
        }

        $studentIds = TeacherAssignmentRecipient::query()
            ->whereIn('teacher_assignment_id', $assignmentIds)
            ->pluck('student_id')
            ->unique();

        foreach ($studentIds as $studentId) {
            $student = User::query()->find($studentId);
            if ($student instanceof User
                && $this->parentAccess->allows($user, $student, ParentGuardianPermission::ViewMessages->value)) {
                return true;
            }
        }

        return false;
    }

    private function archiveRevision(TeacherAssignment $assignment, TeacherAssignmentAudioRole $role, int $assetId): void
    {
        if ($assetId < 1) {
            return;
        }

        TeacherAssignmentAudioRevision::query()->create([
            'teacher_assignment_id' => $assignment->id,
            'audio_asset_id' => $assetId,
            'role' => $role->value,
            'published_at' => now(),
            'superseded_at' => now(),
        ]);
    }

    private function normaliseMime(UploadedFile $file): string
    {
        $mime = strtolower(trim((string) $file->getMimeType()));
        $mime = trim(explode(';', $mime, 2)[0]);
        if (in_array($mime, self::ALLOWED_MIMES, true)) {
            return $mime;
        }

        return '';
    }

    private function extensionForMime(string $mime): string
    {
        return match (true) {
            str_contains($mime, 'mp4'), str_contains($mime, 'm4a') => 'm4a',
            str_contains($mime, 'ogg') => 'ogg',
            str_contains($mime, 'wav'), str_contains($mime, 'wave') => 'wav',
            str_contains($mime, 'mpeg'), str_contains($mime, 'mp3') => 'mp3',
            default => 'webm',
        };
    }
}
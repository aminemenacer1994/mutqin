<?php

namespace App\Services\Learning;

use App\Enums\ParentGuardianPermission;
use App\Models\AiReciteAttempt;
use App\Models\User;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Services\Parent\ParentAccessAuthorizer;
use App\Support\AudioPrivacy;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;

class AiReciteAttemptAudioService
{
    public const DISK = 'local';

    public const PREFIX = 'ai-recite-audio';

    public const MAX_BYTES = 8_388_608;

    /**
     * @var list<string>
     */
    public const ALLOWED_MIMES = [
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
    ];

    public function __construct(private readonly StudentAccessAuthorizer $access) {}

    public function store(User $user, AiReciteAttempt $attempt, UploadedFile $file, ?int $durationMs = null): bool
    {
        if ((int) $attempt->user_id !== (int) $user->id) {
            return false;
        }

        if (AudioPrivacy::rawRecordingRetention() === AudioPrivacy::RETENTION_NEVER) {
            $this->deleteStored($attempt);

            return false;
        }

        $contents = $this->readUploadedContents($file);
        $mime = $this->normaliseMime($file);
        if ($mime === '') {
            $mime = $this->sniffMime($contents);
        }
        if ($mime === '' || $contents === '' || strlen($contents) > self::MAX_BYTES) {
            return false;
        }

        $extension = $this->extensionForMime($mime);
        $path = sprintf('%s/%d/%d.%s', self::PREFIX, $user->id, $attempt->id, $extension);
        $disk = Storage::disk(self::DISK);
        $temporary = $path.'.partial';
        $previousPath = $attempt->audio_path;
        $previousDisk = $attempt->audio_disk ?: self::DISK;
        $previousMime = $attempt->audio_mime;
        $previousBytes = $attempt->audio_bytes;
        $previousDuration = $attempt->audio_duration_ms;
        $previousExpires = $attempt->audio_expires_at;

        try {
            $disk->put($temporary, $contents);
        } catch (\Throwable $e) {
            Log::warning('Failed to stage AI Recite audio', [
                'attempt_id' => $attempt->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }

        try {
            $attempt->forceFill([
                'audio_disk' => self::DISK,
                'audio_path' => $path,
                'audio_mime' => $mime,
                'audio_bytes' => strlen($contents),
                'audio_duration_ms' => $durationMs && $durationMs > 0 ? $durationMs : $attempt->duration_ms,
                'audio_expires_at' => AudioPrivacy::rawRecordingRetention() === AudioPrivacy::RETENTION_TEMPORARY
                    ? now()->addHours(AudioPrivacy::temporaryTtlHours())
                    : null,
            ])->save();
        } catch (\Throwable $e) {
            $this->deletePath($disk, $temporary);
            Log::warning('Failed to record AI Recite audio reference', [
                'attempt_id' => $attempt->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }

        try {
            if ($disk->exists($path)) {
                $disk->delete($path);
            }
            $disk->move($temporary, $path);
        } catch (\Throwable $e) {
            try {
                $disk->put($path, $contents);
                $this->deletePath($disk, $temporary);
            } catch (\Throwable $inner) {
                $this->deletePath($disk, $temporary);
                $attempt->forceFill([
                    'audio_disk' => $previousPath ? $previousDisk : null,
                    'audio_path' => $previousPath,
                    'audio_mime' => $previousPath ? $previousMime : null,
                    'audio_bytes' => $previousPath ? $previousBytes : null,
                    'audio_duration_ms' => $previousDuration,
                    'audio_expires_at' => $previousExpires,
                ])->save();
                Log::warning('Failed to publish AI Recite audio', [
                    'attempt_id' => $attempt->id,
                    'error' => $inner->getMessage(),
                ]);

                return false;
            }
        }

        if (is_string($previousPath) && $previousPath !== '' && $previousPath !== $path) {
            try {
                $old = Storage::disk($previousDisk);
                if ($old->exists($previousPath)) {
                    $old->delete($previousPath);
                }
            } catch (\Throwable $e) {
                Log::warning('Failed to remove replaced AI Recite audio', [
                    'attempt_id' => $attempt->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return true;
    }

    /**
     * @return array{
     *     available: bool,
     *     url: string|null,
     *     mime: string|null,
     *     duration_ms: int|null,
     *     expires_at: string|null,
     *     reason: string
     * }
     */
    public function payload(?AiReciteAttempt $attempt): array
    {
        if (! $attempt) {
            return $this->emptyPayload('none');
        }

        if ($this->isExpired($attempt)) {
            $this->deleteStored($attempt);

            return $this->emptyPayload('expired', $attempt);
        }

        if (! $this->hasFile($attempt)) {
            return $this->emptyPayload($attempt->audio_path ? 'purged' : 'none', $attempt);
        }

        return [
            'available' => true,
            'url' => '/api/ai-recite-attempts/'.$attempt->id.'/audio',
            'mime' => $attempt->audio_mime,
            'duration_ms' => $attempt->audio_duration_ms ? (int) $attempt->audio_duration_ms : null,
            'expires_at' => optional($attempt->audio_expires_at)->toIso8601String(),
            'reason' => 'available',
        ];
    }

    /**
     * Metadata-only check for list/dashboard payloads.
     * Avoids per-row Storage::exists() round-trips; stream/detail still verify the file.
     */
    public function hasPlayableAudio(?AiReciteAttempt $attempt): bool
    {
        if (! $attempt?->audio_path) {
            return false;
        }

        return ! $this->isExpired($attempt);
    }

    public function stream(User $user, AiReciteAttempt $attempt): ?Response
    {
        if (! $this->canView($user, $attempt)) {
            return null;
        }

        if ($this->isExpired($attempt)) {
            $this->deleteStored($attempt);

            return null;
        }

        if (! $this->hasFile($attempt)) {
            return null;
        }

        $disk = Storage::disk($attempt->audio_disk ?: self::DISK);

        $headers = [
            'Content-Type' => $attempt->audio_mime ?: 'application/octet-stream',
            'Content-Disposition' => 'inline',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ];
        if (config('filesystems.disks.'.($attempt->audio_disk ?: self::DISK).'.driver') === 'local') {
            // BinaryFileResponse honours authenticated byte-range requests used by
            // browsers to seek and determine the duration of retained recordings.
            return new BinaryFileResponse($disk->path($attempt->audio_path), 200, $headers, false);
        }

        return $disk->response($attempt->audio_path, 'recitation', $headers);
    }

    public function canView(User $viewer, AiReciteAttempt $attempt): bool
    {
        if ((int) $attempt->user_id === (int) $viewer->id) {
            return true;
        }

        $student = $attempt->relationLoaded('user')
            ? $attempt->user
            : User::query()->find($attempt->user_id);

        if ($student instanceof User && $this->access->allows($viewer, $student)) {
            return true;
        }

        if ($student instanceof User && $viewer->isParent()) {
            $parentAccess = app(ParentAccessAuthorizer::class);

            return $parentAccess->allows($viewer, $student, ParentGuardianPermission::ViewProgress->value)
                && $this->hasPlayableAudio($attempt)
                && AudioPrivacy::rawRecordingRetention() !== AudioPrivacy::RETENTION_NEVER;
        }

        return false;
    }

    public function deleteStored(?AiReciteAttempt $attempt): void
    {
        if (! $attempt?->audio_path) {
            $this->clearColumns($attempt);

            return;
        }

        try {
            $disk = Storage::disk($attempt->audio_disk ?: self::DISK);
            if ($disk->exists($attempt->audio_path)) {
                $disk->delete($attempt->audio_path);
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to delete AI Recite audio file', [
                'attempt_id' => $attempt->id,
                'error' => $e->getMessage(),
            ]);
        }

        $this->clearColumns($attempt);
    }

    public function deleteAllForUser(User $user): int
    {
        $deleted = 0;
        AiReciteAttempt::query()
            ->where('user_id', $user->id)
            ->whereNotNull('audio_path')
            ->orderBy('id')
            ->chunkById(100, function ($attempts) use (&$deleted): void {
                foreach ($attempts as $attempt) {
                    $this->deleteStored($attempt);
                    $deleted++;
                }
            });

        $directory = self::PREFIX.'/'.$user->id;
        try {
            if (Storage::disk(self::DISK)->exists($directory)) {
                Storage::disk(self::DISK)->deleteDirectory($directory);
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to delete AI Recite audio directory', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }

        return $deleted;
    }

    public function purgeExpired(): int
    {
        $query = AiReciteAttempt::query()->whereNotNull('audio_path');

        if (AudioPrivacy::rawRecordingRetention() === AudioPrivacy::RETENTION_RETAIN) {
            return 0;
        }

        if (AudioPrivacy::rawRecordingRetention() !== AudioPrivacy::RETENTION_NEVER) {
            $query->whereNotNull('audio_expires_at')
                ->where('audio_expires_at', '<=', now());
        }

        $purged = 0;
        $query->orderBy('id')->chunkById(100, function ($attempts) use (&$purged): void {
            foreach ($attempts as $attempt) {
                $this->deleteStored($attempt);
                $purged++;
            }
        });

        return $purged;
    }

    private function hasFile(?AiReciteAttempt $attempt): bool
    {
        if (! $attempt?->audio_path) {
            return false;
        }

        try {
            return Storage::disk($attempt->audio_disk ?: self::DISK)->exists($attempt->audio_path);
        } catch (\Throwable) {
            return false;
        }
    }

    private function isExpired(?AiReciteAttempt $attempt): bool
    {
        if (! $attempt?->audio_expires_at) {
            return AudioPrivacy::rawRecordingRetention() === AudioPrivacy::RETENTION_NEVER
                && (bool) $attempt?->audio_path;
        }

        return $attempt->audio_expires_at->isPast();
    }

    /**
     * @return array{
     *     available: bool,
     *     url: null,
     *     mime: null,
     *     duration_ms: int|null,
     *     expires_at: string|null,
     *     reason: string
     * }
     */
    private function emptyPayload(string $reason, ?AiReciteAttempt $attempt = null): array
    {
        return [
            'available' => false,
            'url' => null,
            'mime' => null,
            'duration_ms' => $attempt?->audio_duration_ms ? (int) $attempt->audio_duration_ms : null,
            'expires_at' => optional($attempt?->audio_expires_at)->toIso8601String(),
            'reason' => $reason,
        ];
    }

    private function clearColumns(?AiReciteAttempt $attempt): void
    {
        if (! $attempt || ! $attempt->exists) {
            return;
        }

        if (
            $attempt->audio_disk === null
            && $attempt->audio_path === null
            && $attempt->audio_mime === null
            && $attempt->audio_bytes === null
            && $attempt->audio_expires_at === null
        ) {
            return;
        }

        $attempt->forceFill([
            'audio_disk' => null,
            'audio_path' => null,
            'audio_mime' => null,
            'audio_bytes' => null,
            'audio_expires_at' => null,
        ])->save();
    }

    private function readUploadedContents(UploadedFile $file): string
    {
        try {
            $contents = $file->get();
            if (is_string($contents) && $contents !== '') {
                return $contents;
            }
        } catch (\Throwable) {
            // Fall through to getContent().
        }

        try {
            $contents = $file->getContent();
        } catch (\Throwable) {
            return '';
        }

        return is_string($contents) ? $contents : '';
    }

    private function deletePath(Filesystem $disk, string $path): void
    {
        try {
            if ($disk->exists($path)) {
                $disk->delete($path);
            }
        } catch (\Throwable) {
            // The staged file is disposable. A later successful upload replaces it.
        }
    }

    private function sniffMime(string $contents): string
    {
        if ($contents === '') {
            return '';
        }
        if (str_starts_with($contents, 'RIFF') && str_contains(substr($contents, 0, 16), 'WAVE')) {
            return 'audio/wav';
        }
        if (str_starts_with($contents, 'OggS')) {
            return 'audio/ogg';
        }
        if (str_starts_with($contents, 'ID3')) {
            return 'audio/mpeg';
        }
        if (str_starts_with($contents, "\x1A\x45\xDF\xA3")) {
            return 'audio/webm';
        }
        if (strlen($contents) > 11 && substr($contents, 4, 4) === 'ftyp') {
            return 'audio/mp4';
        }

        return '';
    }

    private function normaliseMime(UploadedFile $file): string
    {
        $mime = strtolower(trim((string) ($file->getMimeType() ?: $file->getClientMimeType())));
        if ($mime === 'application/octet-stream' || $mime === 'binary/octet-stream' || $mime === '') {
            $mime = '';
        }
        if (in_array($mime, self::ALLOWED_MIMES, true)) {
            return $mime === 'audio/mp3' ? 'audio/mpeg' : $mime;
        }

        $extension = strtolower((string) $file->getClientOriginalExtension());

        return match ($extension) {
            'webm' => 'audio/webm',
            'mp4', 'm4a' => 'audio/mp4',
            'ogg' => 'audio/ogg',
            'wav' => 'audio/wav',
            'mp3' => 'audio/mpeg',
            default => '',
        };
    }

    private function extensionForMime(string $mime): string
    {
        return match (true) {
            str_contains($mime, 'mp4') || str_contains($mime, 'm4a') => 'm4a',
            str_contains($mime, 'ogg') => 'ogg',
            str_contains($mime, 'wav') => 'wav',
            str_contains($mime, 'mpeg') || str_contains($mime, 'mp3') => 'mp3',
            default => 'webm',
        };
    }
}

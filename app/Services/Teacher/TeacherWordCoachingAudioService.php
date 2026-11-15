<?php

namespace App\Services\Teacher;

use App\Models\TeacherWordCoachingCorrection;
use App\Models\User;
use App\Services\Organisations\StudentAccessAuthorizer;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class TeacherWordCoachingAudioService
{
    public const DISK = 'user_files';

    public const PREFIX = 'teacher-word-coaching';

    public const MAX_BYTES = 8_388_608;

    public const MAX_DURATION_MS = 120_000;

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

    public function __construct(private readonly StudentAccessAuthorizer $access) {}

    public function store(TeacherWordCoachingCorrection $correction, UploadedFile $file, ?int $durationMs = null): bool
    {
        $mime = $this->normaliseMime($file);
        $contents = $file->get();
        if (! is_string($contents)) {
            return false;
        }
        $bytes = strlen($contents);
        if ($mime === '' || $bytes === 0 || $bytes > self::MAX_BYTES) {
            return false;
        }

        $durationMs = $durationMs && $durationMs > 0
            ? min($durationMs, self::MAX_DURATION_MS)
            : null;
        $path = sprintf(
            '%s/%d/%s.%s',
            self::PREFIX,
            (int) $correction->teacher_word_coaching_id,
            Str::uuid(),
            $this->extensionForMime($mime),
        );

        if (! Storage::disk(self::DISK)->put($path, $contents)) {
            return false;
        }

        $correction->forceFill([
            'audio_disk' => self::DISK,
            'audio_path' => $path,
            'audio_mime' => $mime,
            'audio_bytes' => $bytes,
            'audio_duration_ms' => $durationMs,
        ])->save();

        return true;
    }

    /**
     * @return array{available: bool, url: string|null, mime: string|null, duration_ms: int|null, reason: string}
     */
    public function payload(TeacherWordCoachingCorrection $correction): array
    {
        $available = false;
        if ($correction->audio_path) {
            try {
                $available = Storage::disk($correction->audio_disk ?: self::DISK)->exists($correction->audio_path);
            } catch (\Throwable) {
                $available = false;
            }
        }

        return [
            'available' => $available,
            'url' => $available ? '/api/teacher/word-coaching-corrections/'.$correction->id.'/audio' : null,
            'mime' => $correction->audio_mime,
            'duration_ms' => $correction->audio_duration_ms ? (int) $correction->audio_duration_ms : null,
            'reason' => $available ? 'available' : ($correction->audio_path ? 'missing' : 'not_recorded'),
        ];
    }

    public function stream(User $user, TeacherWordCoachingCorrection $correction): ?Response
    {
        if (! $correction->audio_path || ! $this->canListen($user, $correction)) {
            return null;
        }

        $disk = Storage::disk($correction->audio_disk ?: self::DISK);
        if (! $disk->exists($correction->audio_path)) {
            return null;
        }

        return $disk->response($correction->audio_path, 'word-coaching', [
            'Content-Type' => $correction->audio_mime ?: 'application/octet-stream',
            'Content-Disposition' => 'inline',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function deleteStored(TeacherWordCoachingCorrection $correction): void
    {
        if ($correction->audio_path) {
            try {
                Storage::disk($correction->audio_disk ?: self::DISK)->delete($correction->audio_path);
            } catch (\Throwable) {
                // The row is cleared even when the file is already gone.
            }
        }

        $correction->forceFill([
            'audio_disk' => null,
            'audio_path' => null,
            'audio_mime' => null,
            'audio_bytes' => null,
            'audio_duration_ms' => null,
        ])->save();
    }

    public function canListen(User $user, TeacherWordCoachingCorrection $correction): bool
    {
        $correction->loadMissing('coaching.student');
        $coaching = $correction->coaching;
        if ($coaching === null) {
            return false;
        }
        if ((int) $coaching->student_id === (int) $user->id) {
            return true;
        }

        return (int) $coaching->teacher_id === (int) $user->id
            && $coaching->student !== null
            && $this->access->allows($user, $coaching->student);
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

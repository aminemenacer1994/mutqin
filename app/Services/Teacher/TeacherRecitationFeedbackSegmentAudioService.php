<?php

namespace App\Services\Teacher;

use App\Enums\ParentGuardianPermission;
use App\Models\TeacherRecitationFeedbackSegment;
use App\Models\User;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Services\Parent\ParentAccessAuthorizer;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class TeacherRecitationFeedbackSegmentAudioService
{
    public const DISK = 'user_files';

    public const PREFIX = 'teacher-feedback-segments';

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

    public function __construct(
        private readonly StudentAccessAuthorizer $access,
        private readonly ParentAccessAuthorizer $parentAccess,
    ) {}

    public function store(TeacherRecitationFeedbackSegment $segment, UploadedFile $file, ?int $durationMs = null): bool
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
            (int) $segment->ai_recite_attempt_id,
            Str::uuid(),
            $this->extensionForMime($mime),
        );

        if (! Storage::disk(self::DISK)->put($path, $contents)) {
            return false;
        }

        $segment->forceFill([
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
    public function payload(TeacherRecitationFeedbackSegment $segment): array
    {
        $available = false;
        if ($segment->audio_path) {
            try {
                $available = Storage::disk($segment->audio_disk ?: self::DISK)->exists($segment->audio_path);
            } catch (\Throwable) {
                $available = false;
            }
        }

        return [
            'available' => $available,
            'url' => $available ? '/api/teacher/feedback-segments/'.$segment->id.'/audio' : null,
            'mime' => $segment->audio_mime,
            'duration_ms' => $segment->audio_duration_ms ? (int) $segment->audio_duration_ms : null,
            'reason' => $available ? 'available' : ($segment->audio_path ? 'missing' : 'not_recorded'),
        ];
    }

    public function stream(User $user, TeacherRecitationFeedbackSegment $segment): ?Response
    {
        if (! $segment->audio_path || ! $this->canListen($user, $segment)) {
            return null;
        }

        $disk = Storage::disk($segment->audio_disk ?: self::DISK);
        if (! $disk->exists($segment->audio_path)) {
            return null;
        }

        return $disk->response($segment->audio_path, 'feedback-segment', [
            'Content-Type' => $segment->audio_mime ?: 'application/octet-stream',
            'Content-Disposition' => 'inline',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function deleteStored(TeacherRecitationFeedbackSegment $segment): void
    {
        if ($segment->audio_path) {
            try {
                Storage::disk($segment->audio_disk ?: self::DISK)->delete($segment->audio_path);
            } catch (\Throwable) {
                // Row is cleared even when the file is already gone.
            }
        }

        $segment->forceFill([
            'audio_disk' => null,
            'audio_path' => null,
            'audio_mime' => null,
            'audio_bytes' => null,
            'audio_duration_ms' => null,
        ])->save();
    }

    public function canListen(User $user, TeacherRecitationFeedbackSegment $segment): bool
    {
        $segment->loadMissing('student', 'teacher');
        if ((int) $segment->student_id === (int) $user->id) {
            return $this->segmentVisibleToStudent($segment);
        }
        if ((int) $segment->teacher_id === (int) $user->id
            && $segment->student !== null
            && $this->access->allows($user, $segment->student)) {
            return true;
        }
        if ($segment->student !== null
            && $this->parentAccess->allows($user, $segment->student, ParentGuardianPermission::ViewProgress->value)) {
            return $this->segmentVisibleToStudent($segment);
        }

        return false;
    }

    private function segmentVisibleToStudent(TeacherRecitationFeedbackSegment $segment): bool
    {
        $body = trim((string) $segment->body);

        return $body !== '' || ($segment->audio_path !== null && $segment->audio_path !== '');
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
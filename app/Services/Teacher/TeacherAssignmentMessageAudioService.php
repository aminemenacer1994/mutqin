<?php

namespace App\Services\Teacher;

use App\Models\TeacherNote;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class TeacherAssignmentMessageAudioService
{
    public const DISK = 'user_files';

    public const PREFIX = 'teacher-task-audio';

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
        // Some browsers label an audio-only MediaRecorder file as video/webm.
        'video/webm',
        'video/mp4',
    ];

    public function store(TeacherNote $note, UploadedFile $file, ?int $durationMs = null): bool
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
            (int) $note->teacher_assignment_id,
            Str::uuid(),
            $this->extensionForMime($mime),
        );

        if (! Storage::disk(self::DISK)->put($path, $contents)) {
            return false;
        }

        $note->forceFill([
            'audio_disk' => self::DISK,
            'audio_path' => $path,
            'audio_mime' => $mime,
            'audio_bytes' => $bytes,
            'audio_duration_ms' => $durationMs,
        ])->save();

        return true;
    }

    /** @return array{available: bool, url: string|null, mime: string|null, duration_ms: int|null} */
    public function payload(TeacherNote $note): array
    {
        return [
            'available' => (bool) $note->audio_path,
            'url' => $note->audio_path ? '/api/task-messages/'.$note->id.'/audio' : null,
            'mime' => $note->audio_mime,
            'duration_ms' => $note->audio_duration_ms ? (int) $note->audio_duration_ms : null,
        ];
    }

    public function stream(User $user, TeacherNote $note): ?Response
    {
        $canListen = $note->teacher_assignment_id !== null
            && ((int) $note->student_id === (int) $user->id || (int) $note->teacher_id === (int) $user->id);
        if (! $canListen || ! $note->audio_path) {
            return null;
        }

        $disk = Storage::disk($note->audio_disk ?: self::DISK);
        if (! $disk->exists($note->audio_path)) {
            return null;
        }

        return $disk->response($note->audio_path, 'voice-note', [
            'Content-Type' => $note->audio_mime ?: 'application/octet-stream',
            'Content-Disposition' => 'inline',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
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

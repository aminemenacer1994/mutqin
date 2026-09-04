<?php

namespace App\Services\Memorisation;

use App\Models\LearningHistoryAuditLog;
use App\Models\MemorisationAssessment;
use App\Models\MemorisationAssessmentWord;
use App\Models\MemorisationPracticePlan;
use App\Models\MemorisationSyncState;
use App\Models\User;
use App\Support\AudioPrivacy;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

/**
 * Privacy-preserving retention and account-deletion helpers for learning history.
 * Never writes private notes or raw recordings into application logs.
 */
class LearningHistoryRetentionService
{
    /** @var list<string> */
    private const RECORDING_COLLECTION_KEYS = [
        'recordingsLibrary',
        'recordings',
        'recordingBlobs',
        'audioRecordings',
    ];

    /** @var list<string> */
    private const RAW_AUDIO_FIELD_KEYS = [
        'audioBlob',
        'audioSrc',
        'audio_src',
        'blob',
        'recordingBlob',
        'recording_blob',
        'rawAudio',
        'raw_audio',
        'pcm',
        'chunks',
    ];

    /**
     * Strip optional recording payloads from sync state without wiping structured progress.
     */
    public function purgeOptionalRecordings(User $user, ?User $actor = null): int
    {
        $record = MemorisationSyncState::query()->firstWhere('user_id', $user->id);
        if (! $record || ! is_string($record->state) || $record->state === '') {
            return 0;
        }

        $state = json_decode($record->state, true);
        if (! is_array($state)) {
            return 0;
        }

        $removed = 0;
        foreach (self::RECORDING_COLLECTION_KEYS as $key) {
            if (! array_key_exists($key, $state)) {
                continue;
            }
            $value = $state[$key];
            if (is_array($value)) {
                $removed += count($value);
            } elseif ($value !== null) {
                $removed++;
            }
            unset($state[$key]);
        }

        if ($removed === 0) {
            return 0;
        }

        $encoded = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($encoded === false) {
            return 0;
        }

        $record->forceFill([
            'state' => $encoded,
            'payload_hash' => hash('sha256', $encoded),
            'state_updated_at' => now(),
        ])->save();

        $this->audit($actor, $user, 'purge_optional_recordings', 'memorisation_sync_state', $record->id, [
            'removed_entries' => $removed,
        ]);

        return $removed;
    }

    /**
     * Scrub raw audio fields from synced workspace state for every user when retention is not "retain".
     * Structured assessment metadata is kept; audio payloads and data-URLs are removed.
     */
    public function stripRawAudioFromAllSyncStates(?User $actor = null): int
    {
        if (AudioPrivacy::retainsRawAudio()) {
            return 0;
        }

        $scrubbedUsers = 0;

        MemorisationSyncState::query()->orderBy('id')->chunkById(50, function ($rows) use (&$scrubbedUsers, $actor) {
            foreach ($rows as $record) {
                if (! is_string($record->state) || $record->state === '') {
                    continue;
                }

                $state = json_decode($record->state, true);
                if (! is_array($state)) {
                    continue;
                }

                $before = $record->state;
                $state = $this->stripRawAudioFromStateTree($state);
                $encoded = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                if ($encoded === false || $encoded === $before) {
                    continue;
                }

                $record->forceFill([
                    'state' => $encoded,
                    'payload_hash' => hash('sha256', $encoded),
                    'state_updated_at' => now(),
                ])->save();

                $subject = User::query()->find($record->user_id);
                $this->audit($actor, $subject, 'strip_raw_audio_sync_state', 'memorisation_sync_state', $record->id, [
                    'retention' => AudioPrivacy::rawRecordingRetention(),
                ]);
                $scrubbedUsers++;
            }
        });

        return $scrubbedUsers;
    }

    /**
     * Delete expired files under the learner-audio temp directory.
     * Safe no-op when the directory is empty or missing. Never logs file contents.
     */
    public function purgeExpiredTemporaryAudioFiles(?int $ttlHours = null): int
    {
        $path = AudioPrivacy::tempDiskPath();
        if (! File::isDirectory($path)) {
            File::ensureDirectoryExists($path);

            return 0;
        }

        // When retention is "never", delete all temp files immediately.
        $hours = AudioPrivacy::rawRecordingRetention() === AudioPrivacy::RETENTION_NEVER
            ? 0
            : ($ttlHours ?? AudioPrivacy::temporaryTtlHours());
        $cutoff = now()->subHours(max(0, $hours))->getTimestamp();
        $deleted = 0;

        foreach (File::files($path) as $file) {
            $mtime = $file->getMTime() ?: 0;
            if ($mtime > $cutoff) {
                continue;
            }

            try {
                File::delete($file->getPathname());
                $deleted++;
            } catch (\Throwable $e) {
                Log::warning('Failed to delete temporary learner audio file', [
                    'path_basename' => $file->getFilename(),
                    'error' => $e->getMessage(),
                ]);
            }
        }

        if ($deleted > 0) {
            Log::info('Purged temporary learner audio files', [
                'deleted_count' => $deleted,
                'ttl_hours' => $hours,
                'retention' => AudioPrivacy::rawRecordingRetention(),
            ]);
        }

        return $deleted;
    }

    /**
     * Ensure the temp directory exists and is excluded from careless capture (empty .gitignore).
     */
    public function ensureTemporaryAudioDirectory(): string
    {
        $path = AudioPrivacy::tempDiskPath();
        File::ensureDirectoryExists($path);
        $gitignore = $path.DIRECTORY_SEPARATOR.'.gitignore';
        if (! File::exists($gitignore)) {
            File::put($gitignore, "*\n!.gitignore\n");
        }

        return $path;
    }

    /**
     * @param  array<string, mixed>  $state
     * @return array<string, mixed>
     */
    public function stripRawAudioFromStateTree(array $state): array
    {
        foreach (self::RECORDING_COLLECTION_KEYS as $key) {
            if (! isset($state[$key]) || ! is_array($state[$key])) {
                continue;
            }
            $state[$key] = array_map(
                fn ($entry) => is_array($entry) ? $this->stripRawAudioFields($entry) : $entry,
                $state[$key]
            );
        }

        return $this->stripRawAudioFields($state);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function stripRawAudioFields(array $payload): array
    {
        foreach (self::RAW_AUDIO_FIELD_KEYS as $key) {
            if (array_key_exists($key, $payload)) {
                $payload[$key] = is_string($payload[$key]) && str_starts_with($payload[$key], 'data:audio')
                    ? ''
                    : null;
                if (in_array($key, ['audioSrc', 'audio_src'], true)) {
                    $payload[$key] = '';
                }
            }
        }

        foreach ($payload as $key => $value) {
            if (is_array($value)) {
                $payload[$key] = $this->stripRawAudioFields($value);
            } elseif (is_string($value) && str_starts_with($value, 'data:audio')) {
                $payload[$key] = '';
            }
        }

        return $payload;
    }

    /**
     * Stage a temporary learner-audio file under the private temp directory.
     * Returns null when retention is "never" (caller must keep audio in memory only).
     * Never logs file contents.
     */
    public function stageTemporaryAudioFile(string $binary, string $extension = 'webm'): ?string
    {
        if (AudioPrivacy::rawRecordingRetention() === AudioPrivacy::RETENTION_NEVER) {
            return null;
        }

        $dir = $this->ensureTemporaryAudioDirectory();
        $safeExt = preg_replace('/[^a-z0-9]+/i', '', $extension) ?: 'bin';
        $filename = sprintf('learner-%s-%s.%s', now()->format('YmdHis'), bin2hex(random_bytes(8)), $safeExt);
        $path = $dir.DIRECTORY_SEPARATOR.$filename;
        File::put($path, $binary);

        return $path;
    }

    /**
     * Delete a staged temporary audio file after processing success or failure.
     * Safe if the path is missing or outside the temp directory.
     */
    public function deleteTemporaryAudioFile(?string $path): bool
    {
        if (! is_string($path) || $path === '') {
            return false;
        }

        $root = realpath(AudioPrivacy::tempDiskPath());
        $real = realpath($path);
        if (! $root || ! $real || ! str_starts_with($real, $root.DIRECTORY_SEPARATOR)) {
            return false;
        }

        try {
            return File::delete($real);
        } catch (\Throwable $e) {
            Log::warning('Failed to delete staged temporary learner audio file', [
                'path_basename' => basename($real),
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Keep queryable Quran IDs / result types while scrubbing transient recognition text.
     */
    public function anonymiseLearningHistory(User $user, ?User $actor = null): void
    {
        DB::transaction(function () use ($user, $actor) {
            MemorisationAssessment::query()
                ->where('user_id', $user->id)
                ->orderBy('id')
                ->chunkById(100, function ($assessments) {
                    foreach ($assessments as $assessment) {
                        $recognition = is_array($assessment->recognition_data) ? $assessment->recognition_data : [];
                        unset($recognition['transcript'], $recognition['recognition_words']);
                        $assessment->forceFill([
                            'recognition_data' => $recognition === [] ? null : $recognition,
                            'device_metadata' => null,
                            'friendly_summary' => null,
                        ])->save();
                    }
                });

            MemorisationAssessmentWord::query()
                ->where('user_id', $user->id)
                ->update(['detected_token' => null]);

            $this->purgeOptionalRecordings($user, $actor);

            $this->audit($actor, $user, 'anonymise_learning_history', 'user', $user->id, [
                'fields' => ['recognition_transcript', 'device_metadata', 'detected_token', 'recordings'],
            ]);
        });
    }

    /**
     * Account deletion path: scrub media, hide structured history, then soft-delete
     * the user so the row remains recoverable without blocking re-registration.
     */
    public function deleteUserAccount(User $user, ?User $actor = null): void
    {
        DB::transaction(function () use ($user, $actor) {
            $this->purgeOptionalRecordings($user, $actor);

            MemorisationAssessment::query()
                ->where('user_id', $user->id)
                ->delete();
            MemorisationPracticePlan::query()
                ->where('user_id', $user->id)
                ->delete();

            if (method_exists($user, 'tokens')) {
                $user->tokens()->delete();
            }

            DB::table('sessions')->where('user_id', $user->id)->delete();

            $isSelfDelete = $actor === null || (int) $actor->id === (int) $user->id;
            if ($isSelfDelete) {
                $user->releaseUniqueIdentifiers();
            }

            $this->audit($actor, $user, 'delete_user_account', 'user', $user->id, [
                'mode' => 'soft_delete',
                'anonymised' => $isSelfDelete,
            ]);

            $user->delete();
        });

        // Avoid logging emails or notes — only the numeric id is retained in audit.
        Log::info('Learning history account deletion processed', [
            'subject_user_id' => $user->id,
            'actor_user_id' => $actor?->id,
        ]);
    }

    /**
     * Soft-delete stale completed assessments past the configured retention window.
     * Does not delete history merely because a session was paused.
     */
    public function softDeleteExpiredAssessments(?int $retentionDays = null): int
    {
        $days = $retentionDays ?? (int) config('mutqin.learning_history.assessment_soft_delete_days', 0);
        if ($days <= 0) {
            return 0;
        }

        return MemorisationAssessment::query()
            ->where('status', MemorisationAssessment::STATUS_COMPLETED)
            ->where('created_at', '<', now()->subDays($days))
            ->whereNull('deleted_at')
            ->update(['deleted_at' => now()]);
    }

    /**
     * @param  array<string, mixed>  $changes
     */
    public function audit(
        ?User $actor,
        ?User $subject,
        string $action,
        string $entityType,
        ?int $entityId = null,
        array $changes = []
    ): void {
        // Strip any accidental sensitive keys before persistence.
        unset(
            $changes['notes'],
            $changes['note'],
            $changes['recording'],
            $changes['recordings'],
            $changes['audio'],
            $changes['audioBlob'],
            $changes['audioSrc'],
            $changes['blob'],
            $changes['pcm'],
            $changes['chunks'],
            $changes['transcript']
        );

        LearningHistoryAuditLog::query()->create([
            'actor_user_id' => $actor?->id,
            'subject_user_id' => $subject?->id,
            'action' => mb_substr($action, 0, 64),
            'entity_type' => mb_substr($entityType, 0, 64),
            'entity_id' => $entityId,
            'changes' => $changes === [] ? null : $changes,
            'ip_address' => request()?->ip(),
            'user_agent' => mb_substr((string) request()?->userAgent(), 0, 255) ?: null,
        ]);
    }
}

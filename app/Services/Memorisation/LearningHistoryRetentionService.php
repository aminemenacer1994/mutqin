<?php

namespace App\Services\Memorisation;

use App\Models\LearningHistoryAuditLog;
use App\Models\MemorisationAssessment;
use App\Models\MemorisationAssessmentWord;
use App\Models\MemorisationSyncState;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Privacy-preserving retention and account-deletion helpers for learning history.
 * Never writes private notes or raw recordings into application logs.
 */
class LearningHistoryRetentionService
{
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
        foreach (['recordingsLibrary', 'recordings', 'recordingBlobs', 'audioRecordings'] as $key) {
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
     * Account deletion path: scrub optional media, audit, then hard-delete the user
     * (FK cascades remove owned learning rows).
     */
    public function deleteUserAccount(User $user, ?User $actor = null): void
    {
        $this->purgeOptionalRecordings($user, $actor);
        $this->audit($actor, $user, 'delete_user_account', 'user', $user->id, [
            'mode' => 'hard_delete_with_cascade',
        ]);

        // Avoid logging emails or notes — only the numeric id is retained in audit.
        Log::info('Learning history account deletion processed', [
            'subject_user_id' => $user->id,
            'actor_user_id' => $actor?->id,
        ]);

        $user->delete();
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

<?php

namespace App\Services;

use App\Models\LearningAnalytic;
use App\Models\MemorisationProgress;
use App\Models\User;
use App\Models\UserLastPosition;
use App\Models\UserSession;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Derives the normalised learning tables (user_sessions, user_last_positions,
 * memorisation_progress, learning_analytics) from the Mutqin engine state blob.
 *
 * The engine state ("mutqin_state") remains the full-fidelity source produced by
 * the Vue client; this service projects it into queryable, database-driven tables.
 * All writes are idempotent upserts so it is safe to call on every sync.
 */
class LearningStateDeriver
{
    /**
     * Canonical status set required by the spec, mapped from engine statuses.
     */
    private const STATUS_MAP = [
        'mastered' => 'mastered',
        'reviewed' => 'memorised',
        'weak' => 'reviewing',
        'hidden_practice' => 'learning',
        'learning' => 'learning',
        'new' => 'learning',
    ];

    public function derive(User $user, array $state, ?array $continue = null): void
    {
        DB::transaction(function () use ($user, $state, $continue) {
            $this->deriveSession($user, $state);
            $this->deriveLastPosition($user, $state, $continue);
            $this->deriveProgress($user, $state);
            $this->deriveAnalytics($user, $state);
        });
    }

    private function deriveSession(User $user, array $state): void
    {
        $session = is_array($state['sessionState'] ?? null) ? $state['sessionState'] : [];
        $queue = is_array($session['queue'] ?? null) ? $session['queue'] : [];
        $index = (int) ($session['current_index'] ?? 0);
        $current = $queue[$index] ?? ($queue[0] ?? null);

        [$surah, $ayah] = $this->parseAyahId($current['ayahId'] ?? ($current['verse']['key'] ?? null));

        $lifecycle = app(SessionLifecycleService::class)->attributesFromEngineState($session);

        UserSession::updateOrCreate(
            ['user_id' => $user->id],
            array_merge([
                'surah_number' => $surah,
                'ayah_number' => $ayah,
                'current_step' => $index,
                'memorisation_mode' => isset($session['mode']) ? (string) $session['mode'] : null,
                'repetitions_completed' => (int) ($current['repeatCount'] ?? 0),
                'session_duration_seconds' => $this->sessionDurationSeconds($session),
                'last_activity_at' => $this->parseDate($session['updated_at'] ?? null),
                'metadata' => $session ?: null,
            ], $lifecycle)
        );
    }

    private function deriveLastPosition(User $user, array $state, ?array $continue): void
    {
        $session = is_array($state['sessionState'] ?? null) ? $state['sessionState'] : [];
        $queue = is_array($session['queue'] ?? null) ? $session['queue'] : [];
        $index = (int) ($session['current_index'] ?? 0);
        $current = $queue[$index] ?? null;

        $rawKey = $continue['activeVerseKey']
            ?? $continue['activeKey']
            ?? ($current['ayahId'] ?? ($current['verse']['key'] ?? null));

        [$surah, $ayah] = $this->parseAyahId($rawKey);

        if ($surah === null && $continue === null && empty($session)) {
            return;
        }

        UserLastPosition::updateOrCreate(
            ['user_id' => $user->id],
            [
                'surah_number' => $surah,
                'ayah_number' => $ayah,
                'last_step' => (int) ($continue['queueIndex'] ?? $index),
                'metadata' => $continue ?: ($session ? ['mode' => $session['mode'] ?? null, 'config' => $session['config'] ?? null] : null),
                'last_opened_at' => $this->parseDate($continue['timestamp'] ?? ($session['updated_at'] ?? null)) ?? now(),
            ]
        );
    }

    private function deriveProgress(User $user, array $state): void
    {
        $ayahs = is_array($state['ayahs'] ?? null) ? $state['ayahs'] : [];
        if (empty($ayahs)) {
            return;
        }

        $now = now();
        $rows = [];

        foreach ($ayahs as $id => $ayah) {
            if (! is_array($ayah)) {
                continue;
            }

            [$surah, $ayahNumber] = $this->parseAyahId($ayah['id'] ?? $id);
            if ($surah === null || $ayahNumber === null) {
                continue;
            }

            $engineStatus = (string) ($ayah['status'] ?? 'new');
            $status = self::STATUS_MAP[$engineStatus] ?? 'learning';
            $masteryLevel = (int) round(max(0, min(5, (float) ($ayah['mastery_level'] ?? 0))) / 5 * 100);
            $completedAt = ($status === 'mastered')
                ? ($this->parseDate($ayah['last_review'] ?? null) ?? $now)
                : null;

            $rows[] = [
                'user_id' => $user->id,
                'surah_number' => $surah,
                'ayah_number' => $ayahNumber,
                'status' => $status,
                'mastery_level' => $masteryLevel,
                'repetitions' => (int) ($ayah['repetition_count'] ?? 0),
                'metadata' => json_encode([
                    'zone' => $ayah['zone'] ?? null,
                    'zone_step' => $ayah['zone_step'] ?? null,
                    'weak_count' => $ayah['weak_count'] ?? null,
                    'last_review' => $ayah['last_review'] ?? null,
                    'next_review' => $ayah['next_review'] ?? null,
                    'engine_status' => $engineStatus,
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'completed_at' => $completedAt,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        foreach (array_chunk($rows, 200) as $chunk) {
            MemorisationProgress::upsert(
                $chunk,
                ['user_id', 'surah_number', 'ayah_number'],
                ['status', 'mastery_level', 'repetitions', 'metadata', 'completed_at', 'updated_at']
            );
        }
    }

    private function deriveAnalytics(User $user, array $state): void
    {
        $stats = is_array($state['stats'] ?? null) ? $state['stats'] : [];
        $ayahs = is_array($state['ayahs'] ?? null) ? $state['ayahs'] : [];
        $today = Carbon::now()->startOfDay();
        $todayString = $today->toDateString();

        $totalSeconds = (int) ($stats['total_session_seconds'] ?? 0);
        $sessionsCompleted = (int) ($stats['sessions_completed'] ?? 0);
        $totalMinutes = $totalSeconds > 0
            ? (int) round($totalSeconds / 60)
            : (int) ($stats['average_session_time'] ?? 0) * $sessionsCompleted;

        $reviewedToday = 0;
        foreach ($ayahs as $ayah) {
            if (is_array($ayah) && ($ayah['last_review'] ?? null) && str_starts_with((string) $ayah['last_review'], $todayString)) {
                $reviewedToday++;
            }
        }

        LearningAnalytic::updateOrCreate(
            ['user_id' => $user->id, 'session_date' => $today],
            [
                'sessions_completed' => $sessionsCompleted,
                'total_minutes' => $totalMinutes,
                'ayahs_memorised' => (int) ($stats['ayahs_memorised'] ?? 0),
                'ayahs_reviewed' => $reviewedToday,
                'streak_day' => (int) ($stats['streak'] ?? 0),
                'metadata' => [
                    'overdue_reviews' => $stats['overdue_reviews'] ?? null,
                    'zone_distribution' => $stats['zone_distribution'] ?? null,
                ],
            ]
        );
    }

    private function sessionDurationSeconds(array $session): int
    {
        $started = $this->parseDate($session['started_at'] ?? null);
        $updated = $this->parseDate($session['updated_at'] ?? null);

        if ($started && $updated && $updated->greaterThan($started)) {
            return (int) min($started->diffInSeconds($updated), 24 * 3600);
        }

        return 0;
    }

    /**
     * @return array{0: int|null, 1: int|null}
     */
    private function parseAyahId($raw): array
    {
        if (! is_string($raw) || ! str_contains($raw, ':')) {
            return [null, null];
        }

        [$surah, $ayah] = explode(':', $raw, 2);
        $surah = (int) trim($surah);
        $ayah = (int) trim($ayah);

        if ($surah < 1 || $surah > 114 || $ayah < 1) {
            return [null, null];
        }

        return [$surah, $ayah];
    }

    private function parseDate($value): ?Carbon
    {
        if (empty($value)) {
            return null;
        }

        try {
            if (is_numeric($value)) {
                // JS timestamps are in milliseconds.
                return Carbon::createFromTimestampMs((int) $value);
            }

            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }
}

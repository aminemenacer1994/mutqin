<?php

namespace App\Services\Analytics;

use App\Models\ProductEvent;
use App\Models\User;
use App\Support\Analytics\Acquisition;
use App\Support\Analytics\ProductEventName;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Carbon;

final class ProductEventRecorder
{
    /**
     * @param  array<string, mixed>  $properties
     * @param  array<string, mixed>  $acquisition
     */
    public function record(
        string $eventName,
        ?User $user,
        ?string $anonymousId,
        string $idempotencyKey,
        array $properties = [],
        array $acquisition = [],
        ?Carbon $occurredAt = null,
    ): ?ProductEvent {
        if (! in_array($eventName, ProductEventName::all(), true)) {
            return null;
        }

        $key = $this->idempotencyKey($idempotencyKey);
        if ($key === null) {
            return null;
        }

        $anonymousId = Acquisition::uuid($anonymousId);
        $properties = $this->properties($properties);
        $occurredAt ??= now();

        try {
            $event = ProductEvent::query()->firstOrCreate(
                [
                    'event_name' => $eventName,
                    'idempotency_key' => $key,
                ],
                [
                    'user_id' => $user?->id,
                    'anonymous_id' => $anonymousId,
                    'occurred_at' => $occurredAt,
                    'utm_source' => Acquisition::token($acquisition['utm_source'] ?? null),
                    'utm_medium' => Acquisition::token($acquisition['utm_medium'] ?? null),
                    'utm_campaign' => Acquisition::token($acquisition['utm_campaign'] ?? null),
                    'referral_code' => Acquisition::token($acquisition['referral_code'] ?? null),
                    'properties' => $properties === [] ? null : $properties,
                ],
            );
        } catch (UniqueConstraintViolationException) {
            $event = ProductEvent::query()
                ->where('event_name', $eventName)
                ->where('idempotency_key', $key)
                ->first();
        }

        if ($event && $user && $anonymousId) {
            ProductEvent::query()
                ->whereNull('user_id')
                ->where('anonymous_id', $anonymousId)
                ->update(['user_id' => $user->id]);
        }

        return $event;
    }

    /**
     * @param  array<string, mixed>  $properties
     * @param  array<string, mixed>  $acquisition
     */
    public function recordQuietly(
        string $eventName,
        ?User $user,
        ?string $anonymousId,
        string $idempotencyKey,
        array $properties = [],
        array $acquisition = [],
        ?Carbon $occurredAt = null,
    ): void {
        try {
            $this->record($eventName, $user, $anonymousId, $idempotencyKey, $properties, $acquisition, $occurredAt);
        } catch (\Throwable $error) {
            report($error);
        }
    }

    private function idempotencyKey(string $key): ?string
    {
        $text = trim($key);
        if ($text === '' || strlen($text) > 80) {
            return null;
        }
        if (preg_match('/^[A-Za-z0-9:._\-]+$/', $text) !== 1) {
            return null;
        }

        return $text;
    }

    /**
     * @param  array<string, mixed>  $properties
     * @return array<string, int|string>
     */
    private function properties(array $properties): array
    {
        $safe = [];

        $sessionType = (string) ($properties['session_type'] ?? '');
        if (in_array($sessionType, ['new', 'revision', 'sample', 'planner'], true)) {
            $safe['session_type'] = $sessionType;
        }

        $learningMode = (string) ($properties['learning_mode'] ?? '');
        if (in_array($learningMode, ['auto', 'manual', 'follow', 'beginner', 'advanced', 'planner'], true)) {
            $safe['learning_mode'] = $learningMode;
        }

        $method = (string) ($properties['method'] ?? '');
        if (in_array($method, ['email', 'google', 'demo'], true)) {
            $safe['method'] = $method;
        }

        $surah = (int) ($properties['surah_id'] ?? 0);
        if ($surah >= 1 && $surah <= 114) {
            $safe['surah_id'] = $surah;
        }

        if (isset($properties['duration_seconds']) && is_numeric($properties['duration_seconds'])) {
            $duration = (int) $properties['duration_seconds'];
            if ($duration >= 0 && $duration <= 86400) {
                $safe['duration_seconds'] = $duration;
            }
        }

        foreach (['session_id', 'recommendation_id', 'feedback_id', 'attempt_id', 'assessment_id'] as $idKey) {
            $id = (int) ($properties[$idKey] ?? 0);
            if ($id > 0 && $id <= 2000000000) {
                $safe[$idKey] = $id;
            }
        }

        $feature = Acquisition::token($properties['feature_id'] ?? null);
        if ($feature !== null && preg_match('/^[a-z0-9-]{1,40}$/', $feature) === 1) {
            $safe['feature_id'] = $feature;
        }

        $video = trim((string) ($properties['video_id'] ?? ''));
        if (preg_match('/^[A-Za-z0-9_-]{11}$/', $video) === 1) {
            $safe['video_id'] = $video;
        }

        $stage = (string) ($properties['stage'] ?? '');
        if (in_array($stage, ['ended_early', 'abandoned', 'discarded'], true)) {
            $safe['stage'] = $stage;
        }

        return $safe;
    }
}

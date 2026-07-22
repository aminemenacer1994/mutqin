<?php

namespace App\Services;

use App\Enums\UserSessionStatus;
use App\Models\User;
use App\Models\UserSession;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Authoritative start / resume / end transitions for user_sessions.
 *
 * Completed sessions are immutable historical records. Starting a new session
 * after completion always creates a new row rather than overwriting the past.
 * At most one unfinished (active/paused/interrupted) session exists per user.
 */
class SessionLifecycleService
{
    public function currentUnfinished(User $user): ?UserSession
    {
        $sessions = UserSession::query()
            ->where('user_id', $user->id)
            ->latest('last_activity_at')
            ->latest('id')
            ->get();

        foreach ($sessions as $session) {
            if ($this->isUnfinished($session)) {
                return $session;
            }
        }

        return null;
    }

    public function isUnfinished(UserSession $session): bool
    {
        if ($session->is_onboarding_example) {
            return false;
        }

        $meta = is_array($session->metadata) ? $session->metadata : [];
        if (! empty($meta['discarded_example'])) {
            return false;
        }

        $status = UserSessionStatus::tryFromMixed($session->status);

        // Explicit unfinished statuses win over stale completion metadata
        // (pause/resume can leave completed_at behind from an earlier attempt).
        if ($status?->isUnfinished()) {
            return true;
        }

        if (! empty($meta['completed']) || ! empty($meta['completed_at'])) {
            return false;
        }

        if ($status) {
            // Recover legacy mid-session rows incorrectly stored as "none".
            if ($status === UserSessionStatus::None && $this->hasRecoverableProgress($session, $meta)) {
                return true;
            }

            return false;
        }

        return (bool) ($meta['active'] ?? false) || $this->hasRecoverableProgress($session, $meta);
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private function hasRecoverableProgress(UserSession $session, array $meta): bool
    {
        if (! empty($meta['paused']) || ! empty($meta['active'])) {
            return true;
        }

        $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
        if (! empty($config['chapterId'])) {
            return true;
        }

        return ! empty($session->surah_number);
    }

    /**
     * Start (or re-assert) the single active learning session for the user.
     * Idempotent when the payload matches the current unfinished session or
     * when a start_idempotency_key was already used.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function start(User $user, array $attributes = []): UserSession
    {
        if (! empty($attributes['is_onboarding_example'])) {
            throw ValidationException::withMessages([
                'session' => ['Onboarding examples must not create resumable user sessions.'],
            ]);
        }

        $attributes = $this->normaliseIdempotencyAttributes($attributes, 'start');

        return DB::transaction(function () use ($user, $attributes) {
            $now = now();
            $idempotencyKey = isset($attributes['start_idempotency_key'])
                ? (string) $attributes['start_idempotency_key']
                : null;

            if ($idempotencyKey !== null && $idempotencyKey !== '') {
                $byKey = UserSession::query()
                    ->where('user_id', $user->id)
                    ->where('start_idempotency_key', $idempotencyKey)
                    ->lockForUpdate()
                    ->first();
                if ($byKey) {
                    return $byKey;
                }
            }

            $existing = $this->lockCurrentUnfinished($user);

            if ($existing) {
                // Idempotent re-start of the same unfinished session — never create a second active row.
                $existing->fill($this->sessionAttributes($attributes, [
                    'status' => UserSessionStatus::Active->value,
                    'is_onboarding_example' => false,
                    'resumed_at' => $existing->resumed_at ?: $now,
                    'paused_at' => null,
                    'ended_at' => null,
                    'last_activity_at' => $attributes['last_activity_at'] ?? $now,
                    'start_idempotency_key' => $idempotencyKey ?: $existing->start_idempotency_key,
                ]));
                $existing->save();

                return $existing->fresh();
            }

            // Never overwrite a completed session — create a new attempt.
            return UserSession::create($this->sessionAttributes($attributes, [
                'user_id' => $user->id,
                'status' => UserSessionStatus::Active->value,
                'is_onboarding_example' => false,
                'started_at' => $attributes['started_at'] ?? $now,
                'resumed_at' => null,
                'paused_at' => null,
                'ended_at' => null,
                'attempt_number' => $attributes['attempt_number'] ?? 1,
                'last_activity_at' => $attributes['last_activity_at'] ?? $now,
                'start_idempotency_key' => $idempotencyKey,
            ]));
        });
    }

    /**
     * Pause an unfinished session without completing it.
     * Paused sessions remain unfinished and resumable.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function pause(User $user, array $attributes = []): UserSession
    {
        $attributes = $this->normaliseIdempotencyAttributes($attributes, 'pause');

        return DB::transaction(function () use ($user, $attributes) {
            $session = $this->lockCurrentUnfinished($user);
            if (! $session) {
                throw ValidationException::withMessages([
                    'session' => ['No unfinished session is available to pause.'],
                ]);
            }

            $status = UserSessionStatus::tryFromMixed($session->status);
            if ($status === UserSessionStatus::Completed) {
                throw ValidationException::withMessages([
                    'session' => ['Completed sessions cannot be paused or resumed.'],
                ]);
            }

            $now = now();
            $meta = is_array($session->metadata) ? $session->metadata : [];
            $incomingMeta = is_array($attributes['metadata'] ?? null) ? $attributes['metadata'] : [];

            $session->fill($this->sessionAttributes($attributes, [
                'status' => UserSessionStatus::Paused->value,
                'is_onboarding_example' => false,
                'paused_at' => $attributes['paused_at'] ?? $now,
                'ended_at' => null,
                'last_activity_at' => $attributes['last_activity_at'] ?? $now,
                'metadata' => array_merge($meta, $incomingMeta, [
                    'active' => false,
                    'paused' => true,
                    'completed' => false,
                    'completed_at' => null,
                ]),
            ]));
            $session->save();

            return $session->fresh();
        });
    }

    /**
     * Resume an unfinished session. Rejects completed / sample / foreign sessions.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function resume(User $user, array $attributes = []): UserSession
    {
        $attributes = $this->normaliseIdempotencyAttributes($attributes, 'resume');

        return DB::transaction(function () use ($user, $attributes) {
            $session = $this->lockCurrentUnfinished($user);
            if (! $session) {
                throw ValidationException::withMessages([
                    'session' => ['No unfinished session is available to resume.'],
                ]);
            }

            $status = UserSessionStatus::tryFromMixed($session->status);
            if ($status === UserSessionStatus::Completed) {
                throw ValidationException::withMessages([
                    'session' => ['Completed sessions cannot be resumed.'],
                ]);
            }

            $now = now();
            $meta = is_array($session->metadata) ? $session->metadata : [];
            $incomingMeta = is_array($attributes['metadata'] ?? null) ? $attributes['metadata'] : [];

            $session->fill($this->sessionAttributes($attributes, [
                'status' => UserSessionStatus::Active->value,
                'is_onboarding_example' => false,
                'resumed_at' => $now,
                'paused_at' => null,
                'ended_at' => null,
                'last_activity_at' => $attributes['last_activity_at'] ?? $now,
                'metadata' => array_merge($meta, $incomingMeta, [
                    'active' => true,
                    'paused' => false,
                    'completed' => false,
                ]),
            ]));
            $session->save();

            return $session->fresh();
        });
    }

    /**
     * End the current unfinished session. Idempotent when already completed.
     * Never reactivates or mutates an already-completed historical record beyond
     * the first completion write.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function end(User $user, array $attributes = []): UserSession
    {
        $attributes = $this->normaliseIdempotencyAttributes($attributes, 'end');

        return DB::transaction(function () use ($user, $attributes) {
            $now = now();
            $endKey = isset($attributes['end_idempotency_key'])
                ? (string) $attributes['end_idempotency_key']
                : null;

            if ($endKey !== null && $endKey !== '') {
                $completed = UserSession::query()
                    ->where('user_id', $user->id)
                    ->where('status', UserSessionStatus::Completed->value)
                    ->orderByDesc('id')
                    ->lockForUpdate()
                    ->limit(20)
                    ->get();

                foreach ($completed as $candidate) {
                    $meta = is_array($candidate->metadata) ? $candidate->metadata : [];
                    if (($meta['end_idempotency_key'] ?? null) === $endKey) {
                        return $candidate;
                    }
                }
            }

            $session = $this->lockCurrentUnfinished($user);

            if (! $session) {
                $latest = UserSession::query()
                    ->where('user_id', $user->id)
                    ->latest('id')
                    ->lockForUpdate()
                    ->first();

                // Idempotent end: a prior state-sync/deriver completion (or a
                // completed row missing ended_at) must not 422 the client.
                if ($latest && $latest->status === UserSessionStatus::Completed) {
                    if (! $latest->ended_at) {
                        $latest->forceFill([
                            'ended_at' => $attributes['ended_at'] ?? $now,
                            'last_activity_at' => $attributes['last_activity_at'] ?? $now,
                        ])->save();

                        return $latest->fresh();
                    }

                    return $latest;
                }

                // Do not invent a completed historical row when nothing was unfinished.
                throw ValidationException::withMessages([
                    'session' => ['No unfinished session is available to end.'],
                ]);
            }

            if ($session->status === UserSessionStatus::Completed) {
                if (! $session->ended_at) {
                    $session->forceFill([
                        'ended_at' => $attributes['ended_at'] ?? $now,
                        'last_activity_at' => $attributes['last_activity_at'] ?? $now,
                    ])->save();

                    return $session->fresh();
                }

                return $session;
            }

            $meta = is_array($session->metadata) ? $session->metadata : [];
            $incomingMeta = is_array($attributes['metadata'] ?? null) ? $attributes['metadata'] : [];
            $completionSettings = $this->extractCompletionSettings($attributes, $meta, $incomingMeta);

            $session->fill($this->sessionAttributes($attributes, [
                'status' => UserSessionStatus::Completed->value,
                'is_onboarding_example' => false,
                'ended_at' => $attributes['ended_at'] ?? $now,
                'paused_at' => null,
                'last_activity_at' => $attributes['last_activity_at'] ?? $now,
                'completion_settings' => $completionSettings,
                'metadata' => array_merge($meta, $incomingMeta, [
                    'active' => false,
                    'completed' => true,
                    'completed_at' => ($attributes['ended_at'] ?? $now) instanceof Carbon
                        ? ($attributes['ended_at'] ?? $now)->toIso8601String()
                        : Carbon::parse($attributes['ended_at'] ?? $now)->toIso8601String(),
                    'final_settings' => $completionSettings,
                    'end_idempotency_key' => $endKey ?: ($meta['end_idempotency_key'] ?? null),
                ]),
            ]));
            $session->save();

            return $session->fresh();
        });
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function normaliseIdempotencyAttributes(array $attributes, string $for = 'start'): array
    {
        if (empty($attributes['idempotency_key'])) {
            return $attributes;
        }

        $key = (string) $attributes['idempotency_key'];
        if ($for === 'start' && empty($attributes['start_idempotency_key'])) {
            $attributes['start_idempotency_key'] = $key;
        }
        if ($for === 'end' && empty($attributes['end_idempotency_key'])) {
            $attributes['end_idempotency_key'] = $key;
        }

        return $attributes;
    }

    private function lockCurrentUnfinished(User $user): ?UserSession
    {
        $sessions = UserSession::query()
            ->where('user_id', $user->id)
            ->whereIn('status', [
                UserSessionStatus::Active->value,
                UserSessionStatus::Paused->value,
                UserSessionStatus::Interrupted->value,
            ])
            ->orderByDesc('last_activity_at')
            ->orderByDesc('id')
            ->lockForUpdate()
            ->get();

        foreach ($sessions as $session) {
            if ($this->isUnfinished($session)) {
                return $session;
            }
        }

        // Legacy rows without a reliable status enum value.
        $legacy = UserSession::query()
            ->where('user_id', $user->id)
            ->orderByDesc('last_activity_at')
            ->orderByDesc('id')
            ->lockForUpdate()
            ->get();

        foreach ($legacy as $session) {
            if ($this->isUnfinished($session)) {
                return $session;
            }
        }

        return null;
    }

    /**
     * Discard an onboarding example without leaving a resumable ghost session.
     */
    public function discardOnboardingExample(User $user): ?UserSession
    {
        $session = $this->currentUnfinished($user)
            ?? UserSession::query()->where('user_id', $user->id)->latest('id')->first();

        if (! $session) {
            return null;
        }

        if (! $session->is_onboarding_example) {
            return $session;
        }

        $session->fill([
            'status' => UserSessionStatus::None->value,
            'is_onboarding_example' => false,
            'ended_at' => now(),
            'metadata' => [
                'active' => false,
                'completed' => true,
                'discarded_example' => true,
            ],
        ]);
        $session->save();

        return $session->fresh();
    }

    /**
     * Project engine mutqin sessionState into lifecycle columns.
     *
     * @param  array<string, mixed>  $sessionState
     * @return array<string, mixed>
     */
    public function attributesFromEngineState(array $sessionState): array
    {
        $isSample = (bool) ($sessionState['is_onboarding_example'] ?? false)
            || (($sessionState['sessionKind'] ?? null) === 'sample');

        if ($isSample) {
            return [
                'status' => UserSessionStatus::None->value,
                'is_onboarding_example' => true,
                'ended_at' => now(),
                'metadata' => array_merge($sessionState, [
                    'active' => false,
                    'completed' => true,
                    'discarded_example' => true,
                ]),
            ];
        }

        // Explicit unfinished signals win over stale completion metadata.
        // Pause/active can otherwise be wiped by a leftover completed_at from an
        // earlier attempt in the same engine blob.
        if (! empty($sessionState['paused']) || (($sessionState['status'] ?? null) === UserSessionStatus::Paused->value)) {
            return [
                'status' => UserSessionStatus::Paused->value,
                'is_onboarding_example' => false,
                'paused_at' => $this->parseDate($sessionState['paused_at'] ?? null) ?? now(),
                'ended_at' => null,
                'metadata' => array_merge($sessionState, [
                    'active' => false,
                    'paused' => true,
                    'completed' => false,
                    'completed_at' => null,
                ]),
            ];
        }

        if (! empty($sessionState['active'])) {
            return [
                'status' => UserSessionStatus::Active->value,
                'is_onboarding_example' => false,
                'started_at' => $this->parseDate($sessionState['started_at'] ?? null),
                'ended_at' => null,
                'metadata' => array_merge($sessionState, [
                    'completed' => false,
                    'completed_at' => null,
                ]),
            ];
        }

        if (! empty($sessionState['completed']) || ! empty($sessionState['completed_at'])) {
            return [
                'status' => UserSessionStatus::Completed->value,
                'is_onboarding_example' => false,
                'ended_at' => $this->parseDate($sessionState['completed_at'] ?? null) ?? now(),
                'metadata' => $sessionState,
            ];
        }

        $config = is_array($sessionState['config'] ?? null) ? $sessionState['config'] : [];
        $hasProgress = ! empty($config['chapterId'])
            || ! empty($sessionState['surah_number'])
            || (is_array($sessionState['queue'] ?? null) && $sessionState['queue'] !== [])
            || (($sessionState['status'] ?? null) === UserSessionStatus::Interrupted->value);

        // Demoted / refreshed mid-session engine state must stay resumable.
        // Never collapse recoverable progress into status "none".
        if ($hasProgress) {
            return [
                'status' => UserSessionStatus::Interrupted->value,
                'is_onboarding_example' => false,
                'ended_at' => null,
                'metadata' => array_merge($sessionState, [
                    'active' => false,
                    'paused' => ! empty($sessionState['paused']),
                    'completed' => false,
                ]),
            ];
        }

        return [
            'status' => UserSessionStatus::None->value,
            'is_onboarding_example' => false,
            'metadata' => $sessionState ?: null,
        ];
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @param  array<string, mixed>  $defaults
     * @return array<string, mixed>
     */
    private function sessionAttributes(array $attributes, array $defaults = []): array
    {
        $allowed = [
            'surah_number',
            'ayah_number',
            'current_step',
            'memorisation_mode',
            'repetitions_completed',
            'session_duration_seconds',
            'last_activity_at',
            'metadata',
            'status',
            'is_onboarding_example',
            'started_at',
            'paused_at',
            'resumed_at',
            'ended_at',
            'user_id',
            'repeated_from_session_id',
            'attempt_number',
            'recommendation_id',
            'recommendation_source',
            'completion_settings',
            'start_idempotency_key',
        ];

        $merged = array_merge($defaults, $attributes);
        $filtered = [];
        foreach ($allowed as $key) {
            if (array_key_exists($key, $merged)) {
                $filtered[$key] = $merged[$key];
            }
        }

        return $filtered;
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @param  array<string, mixed>  $meta
     * @param  array<string, mixed>  $incomingMeta
     * @return array<string, mixed>|null
     */
    private function extractCompletionSettings(array $attributes, array $meta = [], array $incomingMeta = []): ?array
    {
        if (is_array($attributes['completion_settings'] ?? null)) {
            return $attributes['completion_settings'];
        }

        $config = [];
        foreach ([$meta, $incomingMeta, is_array($attributes['metadata'] ?? null) ? $attributes['metadata'] : []] as $blob) {
            if (is_array($blob['config'] ?? null)) {
                $config = array_merge($config, $blob['config']);
            }
            if (is_array($blob['final_settings'] ?? null)) {
                return $blob['final_settings'];
            }
            if (is_array($blob['settings'] ?? null)) {
                $config = array_merge($config, $blob['settings']);
            }
        }

        if ($config === []) {
            return null;
        }

        $technique = $config['technique']
            ?? (($config['talqinModeEnabled'] ?? false) ? 'talqin'
                : (($config['focusModeEnabled'] ?? false) ? 'focus'
                    : (($config['blurModeEnabled'] ?? false) ? 'blur' : null)));

        return [
            'technique' => $technique,
            'reciter' => $config['reciterId'] ?? $config['reciter'] ?? null,
            'playback_speed' => $config['playbackSpeed'] ?? $config['playback_speed'] ?? 1,
            'repetitions' => $config['repetitionsPerStep'] ?? $config['repetitions'] ?? 3,
            'ayat_per_step' => $config['ayatPerStep'] ?? $config['ayat_per_step'] ?? null,
            'focus_enabled' => (bool) ($config['focusModeEnabled'] ?? $config['focus_enabled'] ?? false),
            'blur_enabled' => (bool) ($config['blurModeEnabled'] ?? $config['blur_enabled'] ?? false),
            'talqin_enabled' => (bool) ($config['talqinModeEnabled'] ?? $config['talqin_enabled'] ?? ($technique === 'talqin')),
        ];
    }

    private function parseDate(mixed $value): ?Carbon
    {
        if ($value instanceof Carbon) {
            return $value;
        }
        if (! is_string($value) || trim($value) === '') {
            return null;
        }
        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }
}

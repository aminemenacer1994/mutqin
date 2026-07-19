<?php

namespace App\Services;

use App\Enums\UserSessionStatus;
use App\Models\User;
use App\Models\UserSession;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Authoritative start / resume / end transitions for user_sessions.
 *
 * The Vue lifecycle module remains the UX source of truth for button labels;
 * this service ensures the backend never invents duplicate active sessions or
 * resumes already completed / example sessions.
 */
class SessionLifecycleService
{
    public function currentUnfinished(User $user): ?UserSession
    {
        $session = UserSession::query()
            ->where('user_id', $user->id)
            ->latest('last_activity_at')
            ->latest('id')
            ->first();

        if (! $session || ! $this->isUnfinished($session)) {
            return null;
        }

        return $session;
    }

    public function isUnfinished(UserSession $session): bool
    {
        if ($session->is_onboarding_example) {
            return false;
        }

        $status = UserSessionStatus::tryFromMixed($session->status);
        if ($status) {
            return $status->isUnfinished();
        }

        $meta = is_array($session->metadata) ? $session->metadata : [];
        if (! empty($meta['completed']) || ! empty($meta['completed_at'])) {
            return false;
        }

        return (bool) ($meta['active'] ?? false);
    }

    /**
     * Start (or re-assert) the single active learning session for the user.
     * Idempotent when the payload matches the current unfinished session.
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

        $existing = UserSession::query()->where('user_id', $user->id)->first();
        $now = now();

        if ($existing && $this->isUnfinished($existing)) {
            // Idempotent re-start of the same unfinished session.
            $existing->fill($this->sessionAttributes($attributes, [
                'status' => UserSessionStatus::Active->value,
                'is_onboarding_example' => false,
                'resumed_at' => $existing->resumed_at ?: $now,
                'paused_at' => null,
                'ended_at' => null,
                'last_activity_at' => $attributes['last_activity_at'] ?? $now,
            ]));
            $existing->save();

            return $existing->fresh();
        }

        return UserSession::updateOrCreate(
            ['user_id' => $user->id],
            $this->sessionAttributes($attributes, [
                'status' => UserSessionStatus::Active->value,
                'is_onboarding_example' => false,
                'started_at' => $attributes['started_at'] ?? $now,
                'resumed_at' => null,
                'paused_at' => null,
                'ended_at' => null,
                'last_activity_at' => $attributes['last_activity_at'] ?? $now,
            ])
        );
    }

    /**
     * Resume an unfinished session. Rejects completed / sample / foreign sessions.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function resume(User $user, array $attributes = []): UserSession
    {
        $session = $this->currentUnfinished($user);
        if (! $session) {
            throw ValidationException::withMessages([
                'session' => ['No unfinished session is available to resume.'],
            ]);
        }

        $now = now();
        $session->fill($this->sessionAttributes($attributes, [
            'status' => UserSessionStatus::Active->value,
            'is_onboarding_example' => false,
            'resumed_at' => $now,
            'paused_at' => null,
            'ended_at' => null,
            'last_activity_at' => $attributes['last_activity_at'] ?? $now,
        ]));
        $session->save();

        return $session->fresh();
    }

    /**
     * End the current session. Idempotent when already completed.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function end(User $user, array $attributes = []): UserSession
    {
        $session = UserSession::query()->where('user_id', $user->id)->first();
        $now = now();

        if (! $session) {
            return UserSession::create($this->sessionAttributes($attributes, [
                'user_id' => $user->id,
                'status' => UserSessionStatus::Completed->value,
                'is_onboarding_example' => false,
                'ended_at' => $now,
                'last_activity_at' => $attributes['last_activity_at'] ?? $now,
                'metadata' => array_merge(
                    is_array($attributes['metadata'] ?? null) ? $attributes['metadata'] : [],
                    ['active' => false, 'completed' => true, 'completed_at' => $now->toIso8601String()]
                ),
            ]));
        }

        if ($session->status === UserSessionStatus::Completed->value && $session->ended_at) {
            return $session;
        }

        $meta = is_array($session->metadata) ? $session->metadata : [];
        $incomingMeta = is_array($attributes['metadata'] ?? null) ? $attributes['metadata'] : [];

        $session->fill($this->sessionAttributes($attributes, [
            'status' => UserSessionStatus::Completed->value,
            'is_onboarding_example' => false,
            'ended_at' => $attributes['ended_at'] ?? $now,
            'paused_at' => null,
            'last_activity_at' => $attributes['last_activity_at'] ?? $now,
            'metadata' => array_merge($meta, $incomingMeta, [
                'active' => false,
                'completed' => true,
                'completed_at' => ($attributes['ended_at'] ?? $now) instanceof Carbon
                    ? ($attributes['ended_at'] ?? $now)->toIso8601String()
                    : Carbon::parse($attributes['ended_at'] ?? $now)->toIso8601String(),
            ]),
        ]));
        $session->save();

        return $session->fresh();
    }

    /**
     * Discard an onboarding example without leaving a resumable ghost session.
     */
    public function discardOnboardingExample(User $user): ?UserSession
    {
        $session = UserSession::query()->where('user_id', $user->id)->first();
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

        if (! empty($sessionState['completed']) || ! empty($sessionState['completed_at'])) {
            return [
                'status' => UserSessionStatus::Completed->value,
                'is_onboarding_example' => false,
                'ended_at' => $this->parseDate($sessionState['completed_at'] ?? null) ?? now(),
                'metadata' => $sessionState,
            ];
        }

        if (! empty($sessionState['active'])) {
            return [
                'status' => UserSessionStatus::Active->value,
                'is_onboarding_example' => false,
                'started_at' => $this->parseDate($sessionState['started_at'] ?? null),
                'ended_at' => null,
                'metadata' => $sessionState,
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

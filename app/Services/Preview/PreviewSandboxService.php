<?php

namespace App\Services\Preview;

use App\Models\PreviewSandboxSession;
use App\Models\User;
use App\Support\LandingPreviewDemo;
use Illuminate\Support\Str;

class PreviewSandboxService
{
    public function ttlMinutes(): int
    {
        return max(15, (int) config('mutqin.preview_sandbox.session_ttl_minutes', 120));
    }

    public function maxActiveSessionsPerOwner(): int
    {
        return max(1, (int) config('mutqin.preview_sandbox.max_active_sessions_per_owner', 3));
    }

    public function aiAssessmentQuota(): int
    {
        return max(0, (int) config('mutqin.preview_sandbox.ai_assessments_per_session', 25));
    }

    public function startSession(User $owner): PreviewSandboxSession
    {
        $this->pruneExpiredForOwner($owner);

        $activeCount = PreviewSandboxSession::query()
            ->where('owner_user_id', $owner->id)
            ->where('expires_at', '>', now())
            ->count();

        if ($activeCount >= $this->maxActiveSessionsPerOwner()) {
            $oldest = PreviewSandboxSession::query()
                ->where('owner_user_id', $owner->id)
                ->where('expires_at', '>', now())
                ->oldest('last_activity_at')
                ->first();
            if ($oldest instanceof PreviewSandboxSession) {
                $oldest->forceFill(['expires_at' => now()->subSecond()])->save();
            }
        }

        $now = now();

        return PreviewSandboxSession::query()->create([
            'id' => (string) Str::uuid(),
            'owner_user_id' => $owner->id,
            'expires_at' => $now->copy()->addMinutes($this->ttlMinutes()),
            'last_activity_at' => $now,
            'quotas' => [],
        ]);
    }

    public function resumeOrStart(User $owner): PreviewSandboxSession
    {
        return PreviewSandboxSession::query()
            ->where('owner_user_id', $owner->id)
            ->where('expires_at', '>', now())
            ->latest('last_activity_at')
            ->first()
            ?? $this->startSession($owner);
    }

    public function resumeOrStartForOwner(User $owner, ?string $sessionId): PreviewSandboxSession
    {
        if (is_string($sessionId) && $sessionId !== '') {
            $session = PreviewSandboxSession::query()->find($sessionId);
            if (
                $session instanceof PreviewSandboxSession
                && (int) $session->owner_user_id === (int) $owner->id
                && ! $session->isExpired()
            ) {
                return $session;
            }
        }

        return $this->resumeOrStart($owner);
    }

    public function assertPersonaAllowed(PreviewSandboxSession $session, array $persona): void
    {
        $classroomKey = (string) ($persona['classroom_key'] ?? '');

        if ($classroomKey === 'personal_learning') {
            return;
        }

        if ($session->classroom_key === null) {
            $session->forceFill([
                'classroom_key' => $classroomKey,
                'catalog' => (string) ($persona['catalog'] ?? ''),
            ])->save();

            return;
        }

        if ($session->classroom_key !== $classroomKey) {
            abort(403, 'This sandbox session is bound to a different demonstration classroom.');
        }
    }

    public function recordPersona(PreviewSandboxSession $session, string $personaId): void
    {
        $session->forceFill([
            'active_persona' => $personaId,
            'last_activity_at' => now(),
            'expires_at' => now()->addMinutes($this->ttlMinutes()),
        ])->save();
    }

    public function manualReset(PreviewSandboxSession $session): void
    {
        $session->forceFill([
            'reset_at' => now(),
            'last_activity_at' => now(),
            'expires_at' => now()->addMinutes($this->ttlMinutes()),
        ])->save();
        $session->clearQuotas();
    }

    public function assertDemoUserBelongsToSandbox(PreviewSandboxSession $session, User $demoUser, string $personaId): void
    {
        $persona = LandingPreviewDemo::persona($personaId);
        if ($persona === null) {
            abort(404);
        }

        $expectedEmail = strtolower((string) ($persona['email'] ?? ''));
        $actualEmail = strtolower((string) $demoUser->email);

        if ($expectedEmail === '' || $expectedEmail !== $actualEmail) {
            abort(403, 'Sandbox persona does not match the signed-in demonstration account.');
        }

        if ((int) $session->owner_user_id < 1) {
            abort(403);
        }
    }

    public function hasAiAssessmentQuotaRemaining(PreviewSandboxSession $session): bool
    {
        $limit = $this->aiAssessmentQuota();
        if ($limit === 0) {
            return true;
        }

        return $session->quotaCount('ai_assessments') < $limit;
    }

    public function consumeAiAssessmentQuota(PreviewSandboxSession $session): bool
    {
        if (! $this->hasAiAssessmentQuotaRemaining($session)) {
            return false;
        }

        $session->incrementQuota('ai_assessments');

        return true;
    }

    public function expireStaleSessions(): int
    {
        return PreviewSandboxSession::query()
            ->where('expires_at', '<=', now())
            ->delete();
    }

    private function pruneExpiredForOwner(User $owner): void
    {
        PreviewSandboxSession::query()
            ->where('owner_user_id', $owner->id)
            ->where('expires_at', '<=', now())
            ->delete();
    }
}

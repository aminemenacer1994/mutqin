<?php

namespace App\Services\Analytics;

use App\Enums\UserSessionStatus;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Referrals\ReferralService;
use App\Support\Analytics\ProductEventName;
use Illuminate\Support\Carbon;

/** Session lifecycle events. No ayah text, audio, or transcripts. */
final class SessionProductEvents
{
    public function __construct(
        private readonly ProductEventRecorder $events,
        private readonly ReferralService $referrals,
    ) {}

    public function started(User $user, UserSession $session): void
    {
        if ($session->is_onboarding_example || ! $session->id) {
            return;
        }

        $properties = $this->properties($session);
        $this->events->recordQuietly(
            ProductEventName::SESSION_STARTED,
            $user,
            null,
            'session:'.$session->id.':started',
            $properties,
        );

        if ($this->isRevision($session)) {
            $this->events->recordQuietly(
                ProductEventName::REVISION_STARTED,
                $user,
                null,
                'session:'.$session->id.':revision-started',
                $properties,
            );
        }

        if ($this->usesProgressiveHiding($session)) {
            $this->events->recordQuietly(
                ProductEventName::PROGRESSIVE_HIDING_USED,
                $user,
                null,
                'session:'.$session->id.':blur',
                $properties,
            );
        }

        $this->recordReturn($user, $session);
    }

    public function ended(User $user, UserSession $session): void
    {
        if ($session->is_onboarding_example || ! $session->id) {
            return;
        }

        $status = UserSessionStatus::tryFromMixed($session->status);
        $properties = $this->properties($session);
        if ($session->session_duration_seconds) {
            $properties['duration_seconds'] = min(86400, (int) $session->session_duration_seconds);
        }

        if ($status === UserSessionStatus::Completed) {
            $this->events->recordQuietly(
                ProductEventName::SESSION_COMPLETED,
                $user,
                null,
                'session:'.$session->id.':completed',
                $properties,
            );
            if ($this->isRevision($session)) {
                $this->events->recordQuietly(
                    ProductEventName::REVISION_COMPLETED,
                    $user,
                    null,
                    'session:'.$session->id.':revision-completed',
                    $properties,
                );
            }

            $this->referrals->activateIfEligible($user, $session);

            return;
        }

        if ($status === UserSessionStatus::EndedEarly || $status === UserSessionStatus::Abandoned) {
            $properties['stage'] = $status === UserSessionStatus::Abandoned ? 'abandoned' : 'ended_early';
            $this->events->recordQuietly(
                ProductEventName::SESSION_ABANDONED,
                $user,
                null,
                'session:'.$session->id.':abandoned',
                $properties,
            );
        }
    }

    private function recordReturn(User $user, UserSession $session): void
    {
        $started = $session->started_at instanceof Carbon ? $session->started_at : now();
        $returned = UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->where('id', '!=', $session->id)
            ->whereNotNull('started_at')
            ->whereDate('started_at', '<', $started->toDateString())
            ->exists();

        if (! $returned) {
            return;
        }

        $this->events->recordQuietly(
            ProductEventName::USER_RETURNED,
            $user,
            null,
            'user:'.$user->id.':return:'.$started->toDateString(),
            ['session_id' => (int) $session->id],
        );
    }

    /**
     * @return array<string, int|string>
     */
    private function properties(UserSession $session): array
    {
        $properties = [
            'session_id' => (int) $session->id,
            'session_type' => $this->isRevision($session) ? 'revision' : 'new',
        ];
        $surah = (int) $session->surah_number;
        if ($surah >= 1 && $surah <= 114) {
            $properties['surah_id'] = $surah;
        }

        return $properties;
    }

    private function isRevision(UserSession $session): bool
    {
        $mode = strtolower((string) $session->memorisation_mode);
        if (in_array($mode, ['revision', 'revise', 'murajaah'], true)) {
            return true;
        }

        foreach ($this->metadataValues($session) as $value) {
            if (in_array($value, ['revision', 'revise', 'murajaah'], true)) {
                return true;
            }
        }

        return false;
    }

    private function usesProgressiveHiding(UserSession $session): bool
    {
        $meta = is_array($session->metadata) ? $session->metadata : [];
        $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
        $settings = is_array($session->completion_settings) ? $session->completion_settings : [];

        return ! empty($meta['blurModeEnabled'])
            || ! empty($meta['blur_enabled'])
            || ! empty($config['blurModeEnabled'])
            || ! empty($config['blurEnabled'])
            || ! empty($settings['blurModeEnabled']);
    }

    /**
     * @return list<string>
     */
    private function metadataValues(UserSession $session): array
    {
        $meta = is_array($session->metadata) ? $session->metadata : [];
        $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
        $values = [
            $meta['sessionMode'] ?? null,
            $meta['session_mode'] ?? null,
            $meta['sessionGoal'] ?? null,
            $config['sessionMode'] ?? null,
            $config['sessionGoal'] ?? null,
        ];

        return array_values(array_filter(array_map(
            static fn ($value) => strtolower(trim((string) $value)),
            $values
        )));
    }
}

<?php

namespace App\Services\Auth;

use App\Models\User;
use App\Support\AudioPrivacy;
use Illuminate\Support\Carbon;

/**
 * Persist and evaluate AI microphone / processing consent per user.
 */
class AiAudioConsentService
{
    public const STATUS_ACCEPTED = 'accepted';

    public const STATUS_DECLINED = 'declined';

    /**
     * @return array{
     *     status: string|null,
     *     version: string|null,
     *     accepted_at: string|null,
     *     policy_version: string,
     *     processor_name: string,
     *     raw_recording_retention: string,
     *     needs_consent: bool,
     *     privacy_policy_url: string
     * }
     */
    public function snapshot(?User $user): array
    {
        $policyVersion = AudioPrivacy::policyVersion();
        $status = $user?->ai_audio_consent_status;
        $version = $user?->ai_audio_consent_version;
        $acceptedAt = $user?->ai_audio_consent_at;

        return [
            'status' => is_string($status) && $status !== '' ? $status : null,
            'version' => is_string($version) && $version !== '' ? $version : null,
            'accepted_at' => $acceptedAt instanceof Carbon ? $acceptedAt->toIso8601String() : null,
            'policy_version' => $policyVersion,
            'processor_name' => AudioPrivacy::processorName(),
            'raw_recording_retention' => AudioPrivacy::rawRecordingRetention(),
            'needs_consent' => $this->needsConsent($user),
            'privacy_policy_url' => '/privacy',
        ];
    }

    public function needsConsent(?User $user): bool
    {
        if (! $user) {
            return true;
        }

        $status = (string) ($user->ai_audio_consent_status ?? '');

        // One-time registration decision — do not re-prompt after accept or decline.
        return $status === '';
    }

    /**
     * @return array{
     *     status: string,
     *     version: string,
     *     accepted_at: string|null,
     *     policy_version: string,
     *     processor_name: string,
     *     raw_recording_retention: string,
     *     needs_consent: bool,
     *     privacy_policy_url: string
     * }
     */
    public function record(User $user, bool $accepted): array
    {
        $policyVersion = AudioPrivacy::policyVersion();
        $status = $accepted ? self::STATUS_ACCEPTED : self::STATUS_DECLINED;

        $user->forceFill([
            'ai_audio_consent_status' => $status,
            'ai_audio_consent_version' => $policyVersion,
            'ai_audio_consent_at' => now(),
        ])->save();

        return $this->snapshot($user->fresh());
    }
}

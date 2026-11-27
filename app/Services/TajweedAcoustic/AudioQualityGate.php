<?php

namespace App\Services\TajweedAcoustic;

use App\Services\Memorisation\RecitationAttemptClassifier;

/**
 * Rejects acoustic inference when stored assessment metadata indicates unreliable audio.
 */
final class AudioQualityGate
{
    /**
     * @param  array<string, mixed>|null  $recognitionData
     * @return array{reliable: bool, status: string, reason: string|null}
     */
    public function evaluate(?array $recognitionData): array
    {
        $data = is_array($recognitionData) ? $recognitionData : [];
        $attemptClass = (string) ($data['attempt_class'] ?? RecitationAttemptClassifier::VALID_CHECK);
        if ($attemptClass !== RecitationAttemptClassifier::VALID_CHECK) {
            return [
                'reliable' => false,
                'status' => 'unusable',
                'reason' => 'attempt_not_scored',
            ];
        }

        $audioStatus = (string) (
            $data['calibration']['audio_quality_status']
            ?? $data['raw']['audio_quality_status']
            ?? 'unknown'
        );
        if (in_array($audioStatus, ['unreliable', 'rejected', 'unusable'], true)) {
            return [
                'reliable' => false,
                'status' => $audioStatus,
                'reason' => 'audio_quality_unreliable',
            ];
        }

        $speaker = is_array($data['speaker_analysis'] ?? null) ? $data['speaker_analysis'] : [];
        $speakerStatus = (string) ($speaker['status'] ?? '');
        if ($speakerStatus === 'unreliable') {
            return [
                'reliable' => false,
                'status' => 'unreliable',
                'reason' => 'speaker_unreliable',
            ];
        }

        return [
            'reliable' => true,
            'status' => $audioStatus !== '' ? $audioStatus : 'accepted',
            'reason' => null,
        ];
    }
}
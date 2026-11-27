<?php

namespace App\Support;

use App\Models\AcousticTajweedAssessment;
use App\Models\AiReciteAttempt;

/**
 * Experimental acoustic Tajweed findings for teacher playback — unverified until teacher acts.
 */
final class TeacherAcousticTajweedEvidence
{
    /**
     * @return array<string, mixed>|null
     */
    public static function fromAttempt(AiReciteAttempt $attempt): ?array
    {
        if (! config('mutqin.acoustic_tajweed.enabled', false)) {
            return null;
        }

        if (! config('mutqin.acoustic_tajweed.expose_teacher_playback', false)) {
            return null;
        }

        $assessmentId = (int) $attempt->memorisation_assessment_id;
        if ($assessmentId <= 0) {
            return null;
        }

        $record = AcousticTajweedAssessment::query()
            ->where('memorisation_assessment_id', $assessmentId)
            ->first();

        if (! $record) {
            return null;
        }

        if (! in_array($record->status, [
            AcousticTajweedAssessment::STATUS_COMPLETED,
            AcousticTajweedAssessment::STATUS_UNASSESSABLE,
        ], true)) {
            return null;
        }

        $findings = is_array($record->findings) ? $record->findings : [];
        if ($record->status === AcousticTajweedAssessment::STATUS_UNASSESSABLE && $findings === []) {
            return [
                'authority' => 'experimental_acoustic',
                'is_tajweed_assessment' => false,
                'experimental' => true,
                'verified' => false,
                'status' => $record->status,
                'provider' => $record->provider,
                'pipeline_version' => $record->pipeline_version,
                'finding_count' => 0,
                'findings' => [],
                'disclaimer' => 'Experimental engine could not assess this recording reliably.',
            ];
        }

        if ($findings === []) {
            return null;
        }

        $presented = [];
        foreach (array_slice($findings, 0, 30) as $finding) {
            if (! is_array($finding)) {
                continue;
            }
            $presented[] = [
                'category' => (string) ($finding['category'] ?? ''),
                'rule' => $finding['rule'] ?? null,
                'ayah' => isset($finding['ayah']) ? (int) $finding['ayah'] : null,
                'word_index' => $finding['word_index'] ?? null,
                'mistake_kind' => (string) ($finding['mistake_kind'] ?? ''),
                'start_sec' => $finding['start_sec'] ?? null,
                'end_sec' => $finding['end_sec'] ?? null,
                'confidence' => $finding['confidence'] ?? null,
                'corrective_hint' => isset($finding['corrective_hint'])
                    ? mb_substr((string) $finding['corrective_hint'], 0, 280)
                    : null,
                'uncertainty' => $finding['uncertainty'] ?? null,
            ];
        }

        return [
            'authority' => 'experimental_acoustic',
            'is_tajweed_assessment' => false,
            'experimental' => true,
            'verified' => $record->teacher_verification_status === 'confirmed',
            'status' => $record->status,
            'provider' => $record->provider,
            'pipeline_version' => $record->pipeline_version,
            'finding_count' => count($presented),
            'findings' => $presented,
            'disclaimer' => 'Experimental acoustic analysis — teacher verification is required before treating these as Tajweed grades.',
        ];
    }
}
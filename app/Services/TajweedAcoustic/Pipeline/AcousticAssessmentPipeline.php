<?php

namespace App\Services\TajweedAcoustic\Pipeline;

use App\Models\AiReciteAttempt;
use App\Models\MemorisationAssessment;
use App\Services\Learning\AiReciteAttemptAudioService;
use App\Services\TajweedAcoustic\AudioQualityGate;
use App\Services\TajweedAcoustic\Contracts\PhonemeRecognitionProvider;
use App\Services\TajweedAcoustic\Detectors\BasicPhonemeSubstitutionDetector;
use App\Services\TajweedAcoustic\Detectors\MaddDurationDetector;

final class AcousticAssessmentPipeline
{
    public const PIPELINE_VERSION = 'mutqin-acoustic-v0';

    public function __construct(
        private readonly AudioQualityGate $audioGate,
        private readonly PhonemeRecognitionProvider $phonemeProvider,
        private readonly MaddDurationDetector $maddDetector,
        private readonly BasicPhonemeSubstitutionDetector $substitutionDetector,
        private readonly AiReciteAttemptAudioService $attemptAudio,
    ) {}

    /**
     * @return array{
     *   status: string,
     *   audio_quality_status: string,
     *   provider: string,
     *   provider_version: string|null,
     *   findings: list<array<string, mixed>>,
     *   metadata: array<string, mixed>
     * }
     */
    public function run(MemorisationAssessment $assessment): array
    {
        $started = microtime(true);
        $recognitionData = is_array($assessment->recognition_data) ? $assessment->recognition_data : [];
        $gate = $this->audioGate->evaluate($recognitionData);
        if (! $gate['reliable']) {
            return [
                'status' => 'unassessable',
                'audio_quality_status' => (string) $gate['status'],
                'provider' => (string) config('mutqin.acoustic_tajweed.provider', 'null'),
                'provider_version' => null,
                'findings' => [],
                'metadata' => [
                    'pipeline_version' => self::PIPELINE_VERSION,
                    'reason' => (string) ($gate['reason'] ?? 'audio_unreliable'),
                    'latency_ms' => (int) round((microtime(true) - $started) * 1000),
                ],
            ];
        }

        $surah = (int) $assessment->surah_number;
        $startAyah = (int) $assessment->start_ayah;
        $endAyah = (int) $assessment->end_ayah;

        $findings = $this->maddDetector->detect($recognitionData, $surah, $startAyah, $endAyah);

        $configuredProvider = (string) config('mutqin.acoustic_tajweed.provider', 'null');
        $providerResult = ['status' => 'unavailable', 'provider' => $configuredProvider];
        $audioPath = $this->resolveAudioPath($assessment);
        if ($audioPath !== null) {
            $targetText = (string) data_get($recognitionData, 'normalised.transcript', '');
            $providerResult = $this->phonemeProvider->recognize($audioPath, [
                'qiraat' => 'hafs',
                'target_text' => $targetText,
                'surah' => $surah,
                'start_ayah' => $startAyah,
                'end_ayah' => $endAyah,
            ]);
            if (($providerResult['status'] ?? '') === 'ok') {
                $findings = array_merge(
                    $findings,
                    $this->substitutionDetector->detect($providerResult, $surah, $startAyah, $endAyah)
                );
            }
        }

        $status = $findings === [] ? 'unassessable' : 'completed';

        return [
            'status' => $status,
            'audio_quality_status' => (string) $gate['status'],
            'provider' => (string) ($providerResult['provider'] ?? $configuredProvider),
            'provider_version' => isset($providerResult['version']) ? (string) $providerResult['version'] : null,
            'findings' => $this->filterByConfidence($findings),
            'metadata' => [
                'pipeline_version' => self::PIPELINE_VERSION,
                'phoneme_status' => (string) ($providerResult['status'] ?? 'unavailable'),
                'phoneme_reason' => $providerResult['reason'] ?? null,
                'finding_count' => count($findings),
                'latency_ms' => (int) round((microtime(true) - $started) * 1000),
            ],
        ];
    }

    private function resolveAudioPath(MemorisationAssessment $assessment): ?string
    {
        $attempt = AiReciteAttempt::query()
            ->where('memorisation_assessment_id', $assessment->id)
            ->latest('id')
            ->first();
        if (! $attempt || ! $this->attemptAudio->hasPlayableAudio($attempt)) {
            return null;
        }

        return $this->attemptAudio->localPathForInference($attempt);
    }

    /**
     * @param  list<array<string, mixed>>  $findings
     * @return list<array<string, mixed>>
     */
    private function filterByConfidence(array $findings): array
    {
        $min = (float) config('mutqin.acoustic_tajweed.min_confidence', 0.3);
        $out = [];
        foreach ($findings as $finding) {
            $confidence = isset($finding['confidence']) ? (float) $finding['confidence'] : 0.0;
            if ($confidence < $min) {
                continue;
            }
            $out[] = $finding;
        }

        return $out;
    }
}
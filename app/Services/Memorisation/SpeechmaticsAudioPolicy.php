<?php

namespace App\Services\Memorisation;

/**
 * Converts provider speaker/audio evidence into an assessment-safe word stream.
 * Speaker choice is based on lexical continuity and sustained speech, never volume.
 */
class SpeechmaticsAudioPolicy
{
    public const VERSION = 'speechmatics-audio-policy-v1';

    /**
     * Must match resources/js/scripts/audio/speechmaticsAudioGate.js SPEECHMATICS_AUDIO_GATE.
     */
    public const MIN_SNR_DB = 4.0;

    public const MIN_RMS = 0.008;

    public const MIN_PEAK = 0.025;

    public const MAX_CLIPPING_RATIO = 0.08;

    public const MIN_SPEECH_RATIO = 0.08;

    /** @param array<string, mixed> $payload
     *  @return array{reliable:bool,status:string,reason:?string,words:array<int,mixed>,primary_speaker:?string,speaker_count:int}
     */
    public function evaluate(array $payload): array
    {
        $words = is_array($payload['recognition_words'] ?? null) ? $payload['recognition_words'] : [];
        $metrics = is_array($payload['audio_quality_metrics'] ?? null) ? $payload['audio_quality_metrics'] : [];
        $explicit = strtolower(trim((string) ($payload['audio_quality_status'] ?? '')));

        $reason = $this->unreliableAudioReason($metrics, $explicit);
        if ($reason !== null) {
            return $this->result(false, $reason, $words, null, 0);
        }

        $speakers = [];
        foreach ($words as $index => $word) {
            if (! is_array($word)) {
                continue;
            }
            $speaker = trim((string) ($word['speaker'] ?? ''));
            if ($speaker === '' || strtoupper($speaker) === 'UU') {
                continue;
            }
            $speakers[$speaker][] = $index;
        }

        if (count($speakers) <= 1) {
            return $this->result(true, 'clear', $words, array_key_first($speakers), count($speakers));
        }

        $targetText = (string) ($payload['target_text'] ?? '');
        if ($targetText === '' && is_array($payload['ayahs'] ?? null)) {
            $targetText = implode(' ', array_map(
                static fn ($ayah) => is_array($ayah) ? (string) ($ayah['text'] ?? $ayah['arabic'] ?? '') : '',
                $payload['ayahs']
            ));
        }
        $target = (new QuranTextNormalizer)->tokenizeComparisonText($targetText);
        $ranked = [];
        foreach ($speakers as $speaker => $indexes) {
            $speakerWords = array_map(fn (int $i) => $words[$i], $indexes);
            $ranked[] = [
                'speaker' => $speaker,
                'indexes' => $indexes,
                'count' => count($indexes),
                'continuity' => $this->orderedTargetMatches($speakerWords, $target),
            ];
        }
        usort($ranked, static fn ($a, $b) => [$b['continuity'], $b['count']] <=> [$a['continuity'], $a['count']]);

        $primary = $ranked[0];
        $secondary = $ranked[1];
        $substantialSecondStream = $secondary['count'] >= max(4, (int) ceil($primary['count'] * 0.55));
        $quranLikeSecondStream = $secondary['count'] >= max(3, (int) ceil($primary['count'] * 0.55))
            && $secondary['continuity'] >= max(2, (int) floor($primary['continuity'] * 0.6));
        $competing = $substantialSecondStream || $quranLikeSecondStream;
        if ($competing) {
            return $this->result(false, 'multiple_competing_speakers', [], null, count($speakers));
        }

        $selected = array_values(array_filter($words, static function ($word) use ($primary): bool {
            if (! is_array($word)) {
                return false;
            }
            $speaker = trim((string) ($word['speaker'] ?? ''));

            return $speaker === '' || strtoupper($speaker) === 'UU' || $speaker === $primary['speaker'];
        }));

        return $this->result(true, 'secondary_speaker_filtered', $selected, $primary['speaker'], count($speakers));
    }

    /** @param array<string, mixed> $metrics */
    private function unreliableAudioReason(array $metrics, string $explicit): ?string
    {
        if (preg_match('/heavy_noise|low_volume|clipping|broken|incomplete|unreliable|multiple_competing|music|tv/', $explicit)) {
            return $explicit;
        }
        $rms = $this->number($metrics['rms'] ?? null);
        $peak = $this->number($metrics['peak'] ?? null);
        $clipping = $this->number($metrics['clipping_ratio'] ?? null);
        $speech = $this->number($metrics['speech_ratio'] ?? null);
        $snr = $this->number($metrics['snr_db'] ?? null);

        if (($metrics['broken'] ?? false) === true || ($metrics['complete'] ?? true) === false) return 'broken_recording';
        if ($clipping !== null && $clipping >= self::MAX_CLIPPING_RATIO) return 'severe_clipping';
        if (($rms !== null && $rms < self::MIN_RMS) || ($peak !== null && $peak < self::MIN_PEAK)) return 'very_low_volume';
        if ($speech !== null && $speech < self::MIN_SPEECH_RATIO) return 'insufficient_usable_speech';
        if ($snr !== null && $snr < self::MIN_SNR_DB) return 'heavy_noise';

        return null;
    }

    /** @param array<int,mixed> $words @param list<string> $target */
    private function orderedTargetMatches(array $words, array $target): int
    {
        if ($target === []) return 0;
        $normalizer = new QuranTextNormalizer;
        $cursor = 0;
        $matches = 0;
        foreach ($words as $word) {
            $token = $normalizer->normalizeComparisonText((string) ($word['word'] ?? $word['text'] ?? ''));
            for ($i = $cursor; $i < count($target); $i++) {
                if ($token === $target[$i]) {
                    $matches++;
                    $cursor = $i + 1;
                    break;
                }
            }
        }

        return $matches;
    }

    private function number(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }

    /** @param array<int,mixed> $words */
    private function result(bool $reliable, string $status, array $words, ?string $speaker, int $count): array
    {
        return [
            'reliable' => $reliable,
            'status' => $status,
            'reason' => $reliable ? null : $status,
            'words' => $words,
            'primary_speaker' => $speaker,
            'speaker_count' => $count,
        ];
    }
}

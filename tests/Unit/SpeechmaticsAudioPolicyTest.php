<?php

namespace Tests\Unit;

use App\Services\Memorisation\SpeechmaticsAudioPolicy;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class SpeechmaticsAudioPolicyTest extends TestCase
{
    private SpeechmaticsAudioPolicy $policy;

    protected function setUp(): void
    {
        $this->policy = new SpeechmaticsAudioPolicy;
    }

    public function test_clear_single_reciter_is_assessable(): void
    {
        $result = $this->policy->evaluate($this->payload($this->words('S1', ['الحمد', 'لله', 'رب', 'العالمين'])));
        $this->assertTrue($result['reliable']);
        $this->assertSame('S1', $result['primary_speaker']);
    }

    public function test_small_background_speaker_is_filtered_without_using_loudness(): void
    {
        $words = array_merge(
            $this->words('S2', ['مساء', 'الخير']),
            $this->words('S1', ['الحمد', 'لله', 'رب', 'العالمين'])
        );
        $result = $this->policy->evaluate($this->payload($words));
        $this->assertTrue($result['reliable']);
        $this->assertSame('secondary_speaker_filtered', $result['status']);
        $this->assertSame(['الحمد', 'لله', 'رب', 'العالمين'], array_column($result['words'], 'word'));
    }

    public function test_strong_second_speaker_or_tv_speech_is_unassessed(): void
    {
        $words = array_merge(
            $this->words('S1', ['الحمد', 'لله', 'رب', 'العالمين']),
            $this->words('S2', ['الحمد', 'لله', 'رب'])
        );
        $result = $this->policy->evaluate($this->payload($words));
        $this->assertFalse($result['reliable']);
        $this->assertSame('multiple_competing_speakers', $result['reason']);
    }

    public function test_tv_background_speech_is_unassessed_even_when_not_quran_like(): void
    {
        $words = array_merge(
            $this->words('S1', ['الحمد', 'لله', 'رب', 'العالمين']),
            $this->words('S2', ['هذا', 'برنامج', 'التلفاز', 'مساء'])
        );
        $payload = ['ayahs' => [['text' => 'الحمد لله رب العالمين']], 'recognition_words' => $words];
        $result = $this->policy->evaluate($payload);
        $this->assertFalse($result['reliable']);
        $this->assertSame('multiple_competing_speakers', $result['reason']);
    }

    #[DataProvider('badAudioProvider')]
    public function test_unreliable_audio_is_unassessed(array $metrics, string $reason): void
    {
        $result = $this->policy->evaluate($this->payload($this->words('S1', ['الحمد']), $metrics));
        $this->assertFalse($result['reliable']);
        $this->assertSame($reason, $result['reason']);
    }

    public static function badAudioProvider(): array
    {
        return [
            'heavy noise' => [['snr_db' => 2.5], 'heavy_noise'],
            'low volume' => [['rms' => 0.003, 'peak' => 0.01], 'very_low_volume'],
            'clipping' => [['clipping_ratio' => 0.12], 'severe_clipping'],
            'broken recording' => [['complete' => false], 'broken_recording'],
            'insufficient speech' => [['speech_ratio' => 0.03], 'insufficient_usable_speech'],
        ];
    }

    public function test_normal_background_noise_does_not_fail_valid_recitation(): void
    {
        $result = $this->policy->evaluate($this->payload(
            $this->words('S1', ['الحمد', 'لله', 'رب', 'العالمين']),
            ['snr_db' => 9.0, 'rms' => 0.04, 'clipping_ratio' => 0.002, 'speech_ratio' => 0.5]
        ));
        $this->assertTrue($result['reliable']);
    }

    private function payload(array $words, array $metrics = []): array
    {
        return ['target_text' => 'الحمد لله رب العالمين', 'recognition_words' => $words, 'audio_quality_metrics' => $metrics];
    }

    private function words(string $speaker, array $tokens): array
    {
        return array_map(fn ($word) => ['word' => $word, 'confidence' => 0.9, 'speaker' => $speaker], $tokens);
    }
}

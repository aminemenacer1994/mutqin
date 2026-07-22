<?php

namespace Tests\Unit;

use App\Services\RepeatAdaptationService;
use PHPUnit\Framework\TestCase;

class RepeatAdaptationServiceTest extends TestCase
{
    private RepeatAdaptationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new RepeatAdaptationService;
    }

    public function test_low_confidence_increases_repetitions_and_slows_playback(): void
    {
        $result = $this->service->resolve([
            'technique' => 'focus',
            'reciter' => 'ar.alafasy',
            'playback_speed' => 1.0,
            'repetitions' => 3,
        ], [
            'confidence' => 'needs_practice',
            'attempt_number' => 1,
            'range_ayah_count' => 3,
        ]);

        $this->assertSame('talqin', $result['technique']);
        $this->assertSame(5, $result['repetitions']);
        $this->assertSame(0.75, $result['playback_speed']);
        $this->assertSame('ar.alafasy', $result['reciter']);
        $this->assertContains('increase_repetitions', $result['adaptations']);
        $this->assertContains('reduce_playback_speed', $result['adaptations']);
    }

    public function test_many_retries_reduce_ayat_per_step_instead_of_endless_reps(): void
    {
        $result = $this->service->resolve([
            'technique' => 'talqin',
            'playback_speed' => 0.75,
            'repetitions' => 6,
            'ayat_per_step' => 3,
        ], [
            'confidence' => 'needs_practice',
            'attempt_number' => 5,
            'range_ayah_count' => 4,
        ]);

        $this->assertSame(1, $result['ayat_per_step']);
        $this->assertLessThanOrEqual(7, $result['repetitions']);
        $this->assertContains('reduce_ayat_per_step', $result['adaptations']);
    }

    public function test_merge_overrides_rejects_invalid_technique(): void
    {
        $merged = $this->service->mergeOverrides([
            'technique' => 'talqin',
            'playback_speed' => 1.0,
            'repetitions' => 3,
        ], [
            'technique' => 'unsupported_mode',
            'playback_speed' => 0.5,
        ]);

        $this->assertSame('talqin', $merged['technique']);
        $this->assertSame(0.5, $merged['playback_speed']);
    }

    public function test_frequent_replay_prefers_talqin_over_generic_settings(): void
    {
        $result = $this->service->resolve([
            'technique' => 'focus',
            'playback_speed' => 1.0,
            'repetitions' => 3,
        ], [
            'confidence' => 'needs_practice',
            'mode' => 'revision',
            'attempt_number' => 1,
            'range_ayah_count' => 3,
            'replay_ratio' => 2.4,
            'max_ayah_replays' => 5,
            'replay_heavy_ayahs' => 2,
        ]);

        $this->assertSame('talqin', $result['technique']);
        $this->assertLessThan(1.0, $result['playback_speed']);
        $this->assertContains('use_talqin', $result['adaptations']);
        $this->assertNotEmpty($result['user_reason']);
        $this->assertNotEmpty($result['intended_outcome']);
    }

    public function test_sequence_errors_recommend_chaining(): void
    {
        $result = $this->service->resolve([
            'technique' => 'talqin',
            'playback_speed' => 1.0,
            'repetitions' => 3,
        ], [
            'confidence' => 'needs_practice',
            'mode' => 'revision',
            'sequence_errors' => 2,
            'range_ayah_count' => 4,
        ]);

        $this->assertSame('chaining', $result['technique']);
        $this->assertTrue($result['chaining_enabled']);
        $this->assertContains($result['chaining_method'], ['linking', 'cumulative']);
    }

    public function test_mixed_recall_gaps_recommend_blur(): void
    {
        $result = $this->service->resolve([
            'technique' => 'talqin',
            'playback_speed' => 1.0,
            'repetitions' => 3,
        ], [
            'confidence' => 'needs_practice',
            'mode' => 'revision',
            'ai_result' => 'mixed',
            'missed_words' => 3,
            'range_ayah_count' => 3,
        ]);

        $this->assertSame('blur', $result['technique']);
        $this->assertTrue($result['blur_enabled']);
    }

    public function test_confident_progression_can_use_blur_without_ai(): void
    {
        $result = $this->service->resolve([
            'technique' => 'talqin',
            'playback_speed' => 1.0,
            'repetitions' => 3,
        ], [
            'confidence' => 'confident',
            'mode' => 'progression',
            'attempt_number' => 1,
            'range_ayah_count' => 3,
            'replay_ratio' => 1.1,
            'max_ayah_replays' => 1,
        ]);

        $this->assertSame('blur', $result['technique']);
        $this->assertLessThanOrEqual(2, $result['repetitions']);
        $this->assertSame('continue_while_fresh', $result['reason_code']);
    }

    public function test_strong_ai_confident_can_recommend_chaining(): void
    {
        $result = $this->service->resolve([
            'technique' => 'talqin',
            'playback_speed' => 1.0,
            'repetitions' => 3,
        ], [
            'confidence' => 'confident',
            'mode' => 'progression',
            'ai_result' => 'strong',
            'range_ayah_count' => 3,
            'range_workload_score' => 30,
            'replay_ratio' => 1.0,
            'max_ayah_replays' => 1,
        ]);

        $this->assertSame('chaining', $result['technique']);
        $this->assertSame('anchor', $result['complementary_technique']);
        $this->assertTrue($result['chaining_enabled']);
        $this->assertTrue($result['anchor_mode_enabled']);
    }

    public function test_vocabulary_gaps_recommend_anchor(): void
    {
        $result = $this->service->resolve([
            'technique' => 'focus',
            'playback_speed' => 1.0,
            'repetitions' => 3,
        ], [
            'confidence' => 'needs_practice',
            'mode' => 'revision',
            'missed_words' => 2,
            'range_ayah_count' => 2,
            'replay_ratio' => 1.0,
            'max_ayah_replays' => 1,
        ]);

        $this->assertSame('anchor', $result['technique']);
        $this->assertTrue($result['anchor_mode_enabled']);
    }

    public function test_needs_practice_with_strong_ai_stays_light(): void
    {
        $result = $this->service->resolve([
            'technique' => 'talqin',
            'playback_speed' => 1.0,
            'repetitions' => 3,
        ], [
            'confidence' => 'needs_practice',
            'mode' => 'revision',
            'ai_result' => 'strong',
            'range_ayah_count' => 3,
        ]);

        $this->assertLessThanOrEqual(4, $result['repetitions']);
        $this->assertStringContainsString('light', strtolower($result['user_reason']));
    }

    public function test_confident_with_hints_explains_focus_and_anchor_plan(): void
    {
        $result = $this->service->resolve([
            'technique' => 'talqin',
            'playback_speed' => 1.0,
            'repetitions' => 3,
        ], [
            'confidence' => 'confident',
            'mode' => 'progression',
            'hints_used' => 3,
            'range_ayah_count' => 3,
            'replay_ratio' => 1.2,
            'max_ayah_replays' => 1,
        ]);

        $this->assertSame('focus', $result['technique']);
        $this->assertSame('anchor', $result['complementary_technique']);
        $this->assertStringContainsString('Confident', $result['user_reason']);
        $this->assertStringContainsString('memory prompts', $result['user_reason']);
        $this->assertStringContainsString('Focus and Anchor', $result['user_reason']);
        $this->assertStringNotContainsStringIgnoringCase('score', $result['user_reason']);
    }

    public function test_ai_word_errors_explain_talqin_repeat_plan(): void
    {
        $result = $this->service->resolve([
            'technique' => 'focus',
            'playback_speed' => 1.0,
            'repetitions' => 3,
        ], [
            'confidence' => 'needs_practice',
            'mode' => 'revision',
            'ai_result' => 'weak',
            'missed_words' => 2,
            'range_ayah_count' => 2,
            'replay_ratio' => 1.0,
            'max_ayah_replays' => 1,
        ]);

        $this->assertSame('talqin', $result['technique']);
        $this->assertLessThan(1.0, $result['playback_speed']);
        $this->assertStringContainsString('AI Recite found two words', $result['user_reason']);
        $this->assertStringContainsString('Talqin', $result['user_reason']);
        $this->assertStringContainsString('slower playback', $result['user_reason']);
        $this->assertStringNotContainsStringIgnoringCase('score', $result['user_reason']);
    }

    public function test_replay_signal_summary(): void
    {
        $signals = $this->service->summariseReplaySignals([
            '1:1' => 1,
            '1:2' => 4,
            '1:3' => 3,
        ], 3);

        $this->assertSame(2.67, $signals['replay_ratio']);
        $this->assertSame(4, $signals['max_ayah_replays']);
        $this->assertSame(2, $signals['replay_heavy_ayahs']);
    }
}

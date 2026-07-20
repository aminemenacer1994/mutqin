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
}

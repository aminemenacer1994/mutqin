<?php

namespace Tests\Unit;

use App\Support\AyahWorkload;
use PHPUnit\Framework\TestCase;

class AyahWorkloadTest extends TestCase
{
    public function test_short_ayat_can_form_a_multi_ayah_balanced_set(): void
    {
        $range = AyahWorkload::selectBalancedRange(2, 15, 3);

        $this->assertSame(15, $range['from']);
        $this->assertSame(17, $range['to']);
        $this->assertSame(3, $range['count']);
        $this->assertTrue($range['within_band']);
        $this->assertGreaterThanOrEqual(AyahWorkload::TARGET_MIN, $range['score']);
        $this->assertLessThanOrEqual(AyahWorkload::TARGET_MAX, $range['score']);
    }

    public function test_very_long_ayah_is_sufficient_alone(): void
    {
        $range = AyahWorkload::selectBalancedRange(2, 282, 4);

        $this->assertSame(282, $range['from']);
        $this->assertSame(282, $range['to']);
        $this->assertSame(1, $range['count']);
        $this->assertGreaterThan(AyahWorkload::TARGET_MAX, $range['score']);
    }

    public function test_ayat_al_kursi_is_sufficient_alone(): void
    {
        $range = AyahWorkload::selectBalancedRange(2, 255, 4);

        $this->assertSame(255, $range['from']);
        $this->assertSame(255, $range['to']);
        $this->assertSame(1, $range['count']);
    }

    public function test_range_never_exceeds_surah_boundary(): void
    {
        $range = AyahWorkload::selectBalancedRange(1, 5, 8);

        $this->assertSame(5, $range['from']);
        $this->assertSame(7, $range['to']);
        $this->assertLessThanOrEqual(7, $range['to']);
    }

    public function test_range_stats_sum_word_counts(): void
    {
        $stats = AyahWorkload::rangeStats(2, 12, 14);

        $this->assertSame(3, $stats['ayah_count']);
        $this->assertSame(
            AyahWorkload::wordCount(2, 12) + AyahWorkload::wordCount(2, 13) + AyahWorkload::wordCount(2, 14),
            $stats['word_count']
        );
    }
}

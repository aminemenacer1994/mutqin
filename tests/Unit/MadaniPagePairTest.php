<?php

namespace Tests\Unit;

use App\Support\Madani\MadaniPagePair;
use Tests\TestCase;

class MadaniPagePairTest extends TestCase
{
    public function test_spreads_pair_odd_right_and_even_left(): void
    {
        $this->assertSame(['right' => 1, 'left' => 2, 'pages' => [1, 2]], MadaniPagePair::spread(1));
        $this->assertSame(['right' => 1, 'left' => 2, 'pages' => [1, 2]], MadaniPagePair::spread(2));
        $this->assertSame(['right' => 5, 'left' => 6, 'pages' => [5, 6]], MadaniPagePair::spread(5));
        $this->assertSame(['right' => 5, 'left' => 6, 'pages' => [5, 6]], MadaniPagePair::spread(6));
        $this->assertSame(['right' => 299, 'left' => 300, 'pages' => [299, 300]], MadaniPagePair::spread(300));
        $this->assertSame(['right' => 603, 'left' => 604, 'pages' => [603, 604]], MadaniPagePair::spread(603));
        $this->assertSame(['right' => 603, 'left' => 604, 'pages' => [603, 604]], MadaniPagePair::spread(604));
    }

    public function test_spread_navigation_stays_inside_1_to_604(): void
    {
        $this->assertNull(MadaniPagePair::previousSpread(1));
        $this->assertNull(MadaniPagePair::previousSpread(2));
        $this->assertSame(3, MadaniPagePair::previousSpread(6));
        $this->assertSame(7, MadaniPagePair::nextSpread(6));
        $this->assertSame(601, MadaniPagePair::previousSpread(604));
        $this->assertNull(MadaniPagePair::nextSpread(603));
        $this->assertNull(MadaniPagePair::nextSpread(604));
        $this->assertSame(1, MadaniPagePair::previousPage(2));
        $this->assertNull(MadaniPagePair::previousPage(1));
        $this->assertNull(MadaniPagePair::nextPage(604));
    }

    public function test_clamp_never_emits_page_zero_or_605(): void
    {
        $this->assertSame(1, MadaniPagePair::clamp(0));
        $this->assertSame(604, MadaniPagePair::clamp(605));
        $this->assertSame([1, 2], MadaniPagePair::spread(0)['pages']);
        $this->assertSame([603, 604], MadaniPagePair::spread(605)['pages']);
    }
}

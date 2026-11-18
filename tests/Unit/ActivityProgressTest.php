<?php

namespace Tests\Unit;

use App\Services\Teacher\LearningPlanService;
use App\Support\ActivityProgress;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ActivityProgressTest extends TestCase
{
    #[Test]
    public function percent_matches_completed_activities(): void
    {
        $this->assertSame(0, ActivityProgress::percent(0, 0));
        $this->assertSame(0, ActivityProgress::percent(0, 1));
        $this->assertSame(50, ActivityProgress::percent(1, 2));
        $this->assertSame(100, ActivityProgress::percent(1, 1));
        $this->assertSame(100, ActivityProgress::percent(3, 2));
    }

    #[Test]
    public function plan_progress_keeps_cancelled_and_archived_out_of_the_ratio(): void
    {
        $plans = $this->app->make(LearningPlanService::class);

        $this->assertSame(0, $plans->progressFromItems([])['percent']);
        $this->assertSame(0, $plans->progressFromItems([])['total']);

        $empty = $plans->progressFromItems([
            ['origin' => 'assigned', 'item_status' => 'released', 'display_status' => 'planned'],
        ]);
        $this->assertSame(0, $empty['completed']);
        $this->assertSame(1, $empty['total']);
        $this->assertSame(0, $empty['percent']);

        $half = $plans->progressFromItems([
            ['origin' => 'assigned', 'item_status' => 'released', 'display_status' => 'completed'],
            ['origin' => 'assigned', 'item_status' => 'released', 'display_status' => 'planned'],
        ]);
        $this->assertSame(50, $half['percent']);

        $done = $plans->progressFromItems([
            ['origin' => 'assigned', 'item_status' => 'released', 'display_status' => 'completed'],
        ]);
        $this->assertSame(100, $done['percent']);

        $closed = $plans->progressFromItems([
            ['origin' => 'assigned', 'item_status' => 'cancelled', 'display_status' => 'completed'],
            ['origin' => 'assigned', 'item_status' => 'archived', 'display_status' => 'planned'],
            ['origin' => 'assigned', 'item_status' => 'released', 'display_status' => 'planned'],
        ]);
        $this->assertSame(1, $closed['cancelled']);
        $this->assertSame(1, $closed['archived']);
        $this->assertSame(0, $closed['completed']);
        $this->assertSame(1, $closed['total']);
        $this->assertSame(0, $closed['percent']);
    }
}

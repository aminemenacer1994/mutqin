<?php

namespace Tests\Unit;

use App\Services\RevisionReminders\SpacedRevisionScheduler;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class SpacedRevisionSchedulerTest extends TestCase
{
    public function test_easy_advances_zone_step_and_schedules_interval(): void
    {
        Carbon::setTestNow('2026-11-14 12:00:00');
        $scheduler = new SpacedRevisionScheduler;

        $first = $scheduler->advanceFromScore('Fresh', 0, 'Easy', now());
        $this->assertSame('Fresh', $first['zone']);
        $this->assertSame(1, $first['zone_step']);
        $this->assertSame(1, $first['interval_days']);
        $this->assertSame('2026-11-15', $first['next_review_at']->toDateString());

        $promote = $scheduler->advanceFromScore('Fresh', 2, 'Easy', now());
        $this->assertSame('Stable', $promote['zone']);
        $this->assertSame(0, $promote['zone_step']);
        $this->assertSame(3, $promote['interval_days']);
    }

    public function test_forgot_demotes_zone(): void
    {
        Carbon::setTestNow('2026-11-14 12:00:00');
        $scheduler = new SpacedRevisionScheduler;

        $result = $scheduler->advanceFromScore('Stable', 1, 'Forgot', now());
        $this->assertSame('Fresh', $result['zone']);
        $this->assertSame(0, $result['zone_step']);
        $this->assertSame(0, $result['interval_days']);
    }

    public function test_unreliable_score_returns_null(): void
    {
        $scheduler = new SpacedRevisionScheduler;
        $this->assertNull($scheduler->advanceFromScore('Fresh', 0, 'maybe', now()));
        $this->assertSame('Easy', $scheduler->scoreFromPerformanceSignal(90));
        $this->assertSame('Forgot', $scheduler->scoreFromPerformanceSignal(40));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }
}

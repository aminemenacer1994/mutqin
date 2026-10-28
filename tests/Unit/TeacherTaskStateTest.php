<?php

namespace Tests\Unit;

use App\Support\TeacherTaskState;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class TeacherTaskStateTest extends TestCase
{
    #[Test]
    public function overdue_overlay_applies_when_past_due_and_not_done(): void
    {
        Carbon::setTestNow('2026-03-10 12:00:00');

        $display = TeacherTaskState::displayState(
            'in_progress',
            null,
            Carbon::parse('2026-03-01'),
            null,
            Carbon::parse('2026-03-09'),
        );

        $this->assertSame(TeacherTaskState::OVERDUE, $display);
    }

    #[Test]
    public function done_tasks_ignore_overdue_overlay(): void
    {
        Carbon::setTestNow('2026-03-10 12:00:00');

        $display = TeacherTaskState::displayState(
            'completed',
            'approved',
            Carbon::parse('2026-03-01'),
            Carbon::parse('2026-03-05'),
            Carbon::parse('2026-03-09'),
        );

        $this->assertSame(TeacherTaskState::DONE, $display);
    }

    #[Test]
    public function due_urgency_buckets_match_spec(): void
    {
        Carbon::setTestNow('2026-03-10 08:00:00');
        $due = Carbon::parse('2026-03-09');

        $overdue = TeacherTaskState::dueUrgency($due, false);
        $this->assertSame('danger', $overdue['tone']);
        $this->assertSame('Overdue', $overdue['text']);

        $today = TeacherTaskState::dueUrgency(Carbon::parse('2026-03-10'), false);
        $this->assertSame('Due today', $today['text']);
        $this->assertSame('warn', $today['tone']);

        $tomorrow = TeacherTaskState::dueUrgency(Carbon::parse('2026-03-11'), false);
        $this->assertSame('Deadline tomorrow', $tomorrow['text']);

        $soon = TeacherTaskState::dueUrgency(Carbon::parse('2026-03-12'), false);
        $this->assertSame('warning', $soon['tone']);
        $this->assertSame('Deadline in 2 days', $soon['text']);

        $later = TeacherTaskState::dueUrgency(Carbon::parse('2026-03-20'), false);
        $this->assertSame('neutral', $later['tone']);
        $this->assertStringStartsWith('Due ', $later['text']);
    }
}

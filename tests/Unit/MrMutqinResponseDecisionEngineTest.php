<?php

namespace Tests\Unit;

use App\Enums\MrMutqinResponseMode;
use App\Services\MrMutqin\CommandRegistry;
use App\Services\MrMutqin\ResponseDecisionEngine;
use PHPUnit\Framework\TestCase;

class MrMutqinResponseDecisionEngineTest extends TestCase
{
  public function test_just_tell_me_forces_answer_only(): void
    {
        $engine = new ResponseDecisionEngine(new CommandRegistry());
        $mode = $engine->resolve(
            'teacher.assignments.overdue',
            ['preferences' => []],
            $engine->utterancePreferences('Who has not done homework? Just tell me.'),
        );

        $this->assertSame(MrMutqinResponseMode::AnswerOnly, $mode);
    }

    public function test_open_without_speaking_forces_navigate_only(): void
    {
        $engine = new ResponseDecisionEngine(new CommandRegistry());
        $mode = $engine->resolve(
            'teacher.students.list',
            ['preferences' => []],
            $engine->utterancePreferences('Open my students without speaking'),
        );

        $this->assertSame(MrMutqinResponseMode::NavigateOnly, $mode);
    }
}
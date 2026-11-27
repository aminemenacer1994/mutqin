<?php

namespace Tests\Unit;

use App\Support\SmartRevisionSettings;
use Tests\TestCase;

class SmartRevisionSettingsTest extends TestCase
{
    public function test_reason_rank_reads_configurable_priority(): void
    {
        config()->set('mutqin.revision_recommendations.reason_rank', [
            'teacher_confirmed_difficulty' => 2,
            'ai_word_match' => 7,
            'default' => 99,
        ]);

        $this->assertSame(2, SmartRevisionSettings::reasonRank('teacher_confirmed_difficulty'));
        $this->assertSame(7, SmartRevisionSettings::reasonRank('ai_word_match'));
        $this->assertSame(99, SmartRevisionSettings::reasonRank('unknown_code'));
    }

    public function test_weak_spot_and_recurring_thresholds_use_config(): void
    {
        config()->set('mutqin.revision_recommendations.min_weak_spot_attempts', 3);
        config()->set('mutqin.revision_recommendations.min_recurring_mistake_count', 4);

        $this->assertSame(3, SmartRevisionSettings::minWeakSpotAttempts());
        $this->assertSame(4, SmartRevisionSettings::minRecurringMistakeCount());
    }
}
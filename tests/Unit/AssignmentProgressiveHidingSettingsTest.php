<?php

namespace Tests\Unit;

use App\Support\AssignmentListeningSettings;
use App\Support\AssignmentProgressiveHidingSettings;
use PHPUnit\Framework\TestCase;

class AssignmentProgressiveHidingSettingsTest extends TestCase
{
    public function test_sanitize_enforces_bounds(): void
    {
        $clean = AssignmentProgressiveHidingSettings::sanitize([
            'enabled' => true,
            'blur_intensity' => 99,
            'stage_repetitions' => 0,
            'starting_visibility_percent' => 33,
        ]);

        $this->assertSame(18, $clean['blur_intensity']);
        $this->assertSame(1, $clean['stage_repetitions']);
        $this->assertSame(100, $clean['starting_visibility_percent']);
    }

    public function test_merge_into_memorisation_query(): void
    {
        $params = AssignmentProgressiveHidingSettings::mergeIntoMemorisationQuery([
            'progressive_hiding' => [
                'enabled' => true,
                'blur_intensity' => 12,
                'hints_allowed' => false,
                'stage_repetitions' => 4,
            ],
        ], [
            'surah' => 1,
        ]);

        $this->assertSame('blur', $params['technique']);
        $this->assertSame('1', $params['assignment_hiding']);
        $this->assertSame(12, $params['blur_intensity']);
        $this->assertSame('0', $params['hints_allowed']);
        $this->assertSame(4, $params['repetitions']);
    }

    public function test_listening_settings_absorbs_progressive_hiding(): void
    {
        $clean = AssignmentListeningSettings::sanitize([
            'technique' => 'talqin',
            'progressive_hiding' => [
                'enabled' => true,
                'blur_intensity' => 10,
            ],
        ]);

        $this->assertSame('blur', $clean['technique']);
        $this->assertTrue($clean['progressive_hiding']['enabled']);
    }
}
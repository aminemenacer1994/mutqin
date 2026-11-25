<?php

namespace Tests\Unit;

use App\Support\AssignmentListeningSettings;
use PHPUnit\Framework\TestCase;

class AssignmentListeningSettingsTest extends TestCase
{
    public function test_sanitize_accepts_known_reciter_and_snaps_speed(): void
    {
        $clean = AssignmentListeningSettings::sanitize([
            'reciter' => 'ar.husary',
            'playback_speed' => 0.76,
            'repetitions' => 9,
            'technique' => 'talqin',
        ]);

        $this->assertSame('ar.husary', $clean['reciter']);
        $this->assertSame(0.75, $clean['speed']);
        $this->assertSame(8, $clean['repetitions']);
        $this->assertSame('talqin', $clean['technique']);
    }

    public function test_merge_into_memorisation_query(): void
    {
        $params = AssignmentListeningSettings::mergeIntoMemorisationQuery([
            'surah' => 1,
            'from' => 1,
            'to' => 7,
        ], [
            'reciter' => 'ar.minshawi',
            'speed' => 0.75,
            'repetitions' => 3,
        ]);

        $this->assertSame('ar.minshawi', $params['reciter']);
        $this->assertSame(0.75, $params['speed']);
        $this->assertSame(3, $params['repetitions']);
    }
}
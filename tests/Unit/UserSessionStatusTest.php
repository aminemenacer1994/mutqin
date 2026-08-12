<?php

namespace Tests\Unit;

use App\Enums\UserSessionStatus;
use App\Services\SessionLifecycleService;
use PHPUnit\Framework\TestCase;

class UserSessionStatusTest extends TestCase
{
    public function test_frontend_lifecycle_aliases_map_to_canonical_statuses(): void
    {
        $this->assertSame(UserSessionStatus::Interrupted, UserSessionStatus::tryFromMixed('interrupted_resumable'));
        $this->assertSame(UserSessionStatus::Active, UserSessionStatus::tryFromMixed('starting'));
        $this->assertSame(UserSessionStatus::Paused, UserSessionStatus::tryFromMixed('pausing'));
        $this->assertSame(UserSessionStatus::Completed, UserSessionStatus::tryFromMixed('completing'));
        $this->assertSame(UserSessionStatus::EndedEarly, UserSessionStatus::tryFromMixed('ending'));
        $this->assertSame(UserSessionStatus::None, UserSessionStatus::tryFromMixed('ready_to_start'));
        $this->assertNull(UserSessionStatus::tryFromMixed('not-a-status'));
    }

    public function test_slim_metadata_strips_verse_objects_from_queue(): void
    {
        $slimmed = (new SessionLifecycleService)->slimMetadata([
            'active' => true,
            'config' => ['chapterId' => 1, 'verses' => [['text' => 'x']], 'rangeStart' => 1],
            'queue' => [
                [
                    'ayahId' => '1:1',
                    'phase' => 'Takrar',
                    'repeatCount' => 2,
                    'verse' => ['key' => '1:1', 'text' => 'bismillah', 'words' => [1, 2, 3]],
                ],
            ],
            'workspaceState' => ['audioState' => ['huge' => true]],
        ]);

        $this->assertSame(1, $slimmed['config']['chapterId']);
        $this->assertArrayNotHasKey('verses', $slimmed['config']);
        $this->assertSame('1:1', $slimmed['queue'][0]['ayahId']);
        $this->assertArrayNotHasKey('verse', $slimmed['queue'][0]);
        $this->assertArrayNotHasKey('workspaceState', $slimmed);
    }
}

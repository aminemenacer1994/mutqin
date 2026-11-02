<?php

namespace Tests\Unit;

use App\Models\MemorisationProgress;
use App\Models\User;
use App\Services\MainMemorisationPositionService;
use App\Support\QuranMetadata;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MainMemorisationPositionServiceTest extends TestCase
{
    use RefreshDatabase;

    private MainMemorisationPositionService $positions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->positions = new MainMemorisationPositionService;
    }

    public function test_ranges_overlap_only_inside_the_same_surah(): void
    {
        $main = ['surah_number' => 2, 'ayah_start' => 5, 'ayah_end' => 8];

        $this->assertTrue($this->positions->overlaps($main, 2, 8, 10));
        $this->assertTrue($this->positions->overlaps($main, 2, 1, 5));
        $this->assertFalse($this->positions->overlaps($main, 2, 9, 12));
        $this->assertFalse($this->positions->overlaps($main, 3, 5, 8));
    }

    public function test_continuation_follows_the_next_ayah_or_the_beginner_surah_path(): void
    {
        $baqarah = ['surah_number' => 2, 'ayah_start' => 1, 'ayah_end' => 5];
        $fatihah = ['surah_number' => 1, 'ayah_start' => 1, 'ayah_end' => 7];

        $this->assertTrue($this->positions->isContinuation($baqarah, 2, 6, 8));
        $this->assertFalse($this->positions->isContinuation($baqarah, 2, 7, 8));
        $this->assertTrue($this->positions->isContinuation($fatihah, 114, 1, 3));
        $this->assertFalse($this->positions->isContinuation($fatihah, 2, 1, 3));
    }

    public function test_metadata_merge_keeps_a_valid_main_position_and_drops_an_invalid_one(): void
    {
        $kept = $this->positions->mergePreservingMain(
            ['last_step' => 4],
            [
                MainMemorisationPositionService::METADATA_KEY => [
                    'surah_number' => 112,
                    'ayah_start' => 1,
                    'ayah_end' => 4,
                    'source' => 'recommendation',
                ],
            ]
        );

        $this->assertSame(112, $kept[MainMemorisationPositionService::METADATA_KEY]['surah_number']);
        $this->assertSame(4, $kept[MainMemorisationPositionService::METADATA_KEY]['ayah_end']);
        $this->assertSame('Al-Ikhlas', $kept[MainMemorisationPositionService::METADATA_KEY]['surah_name']);

        $dropped = $this->positions->mergePreservingMain([
            MainMemorisationPositionService::METADATA_KEY => [
                'surah_number' => 2,
                'ayah_start' => 999,
                'ayah_end' => 1000,
            ],
            'note' => 'kept',
        ], null);

        $this->assertArrayNotHasKey(MainMemorisationPositionService::METADATA_KEY, $dropped);
        $this->assertSame('kept', $dropped['note']);
        $this->assertNull($this->positions->mergePreservingMain(null, []));
    }

    public function test_overall_progress_counts_only_the_signed_in_users_memorised_ayahs(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        MemorisationProgress::query()->create([
            'user_id' => $user->id,
            'surah_number' => 112,
            'ayah_number' => 1,
            'status' => 'memorised',
        ]);
        MemorisationProgress::query()->create([
            'user_id' => $user->id,
            'surah_number' => 112,
            'ayah_number' => 2,
            'status' => 'learning',
        ]);
        MemorisationProgress::query()->create([
            'user_id' => $other->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'status' => 'mastered',
        ]);

        $progress = $this->positions->overallProgress($user);

        $this->assertSame(1, $progress['memorised_ayah_count']);
        $this->assertSame(QuranMetadata::totalAyahCount(), $progress['quran_ayah_count']);
        $this->assertSame(1, $progress['percent']);
        $this->assertSame(0, $this->positions->overallProgress(User::factory()->create())['percent']);
    }
}

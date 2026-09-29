<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\LearningStateDeriver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class LearningStateDeriverProgressFingerprintTest extends TestCase
{
    use RefreshDatabase;

    public function test_unchanged_ayahs_skip_progress_lookup_on_repeat_derive(): void
    {
        $user = User::factory()->create();
        $state = [
            'ayahs' => [
                '1:1' => [
                    'id' => '1:1',
                    'status' => 'learning',
                    'mastery_level' => 1,
                    'repetition_count' => 0,
                ],
            ],
            'sessionState' => [],
            'stats' => [],
        ];

        $deriver = app(LearningStateDeriver::class);
        $deriver->derive($user, $state);

        DB::flushQueryLog();
        DB::enableQueryLog();
        $deriver->derive($user, $state);

        $progressQueries = collect(DB::getQueryLog())->filter(
            static fn (array $query): bool => str_contains((string) ($query['query'] ?? ''), 'memorisation_progress')
        );

        $this->assertCount(0, $progressQueries);
    }
}

<?php

namespace Tests\Feature;

use App\Models\MutashabihatPair;
use App\Models\User;
use Database\Seeders\MutashabihatPairSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MutashabihatTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalog_lists_seeded_pairs(): void
    {
        $this->seed(MutashabihatPairSeeder::class);

        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $response = $this->actingAs($user)->getJson(route('api.mutashabihat.catalog'));

        $response->assertOk();
        $response->assertJsonStructure(['pairs']);
        $this->assertGreaterThan(0, count($response->json('pairs')));
    }

    public function test_for_ayah_returns_neighbors(): void
    {
        $this->seed(MutashabihatPairSeeder::class);

        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $response = $this->actingAs($user)->getJson(route('api.mutashabihat.for-ayah', [
            'verse_key' => '2:58',
        ]));

        $response->assertOk();
        $keys = collect($response->json('pairs'))
            ->flatMap(fn (array $pair) => [$pair['verse_key_1'], $pair['verse_key_2']])
            ->all();
        $this->assertContains('2:58', $keys);
        $this->assertContains('7:161', $keys);
    }

    public function test_compare_highlights_differences_without_mutating_text(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $left = 'قُولُوا حِطَّةٍ وَادْخُلُوا الْبَابَ';
        $right = 'قُولُوا حِطَّةٍ وَادْخُلُوا الْبَابَ سُجَّلًا';

        $response = $this->actingAs($user)->postJson(route('api.mutashabihat.compare'), [
            'left_text' => $left,
            'right_text' => $right,
        ]);

        $response->assertOk();
        $response->assertJsonPath('diff.left.0.text', 'قُولُوا');
        $this->assertIsArray($response->json('diff.right'));
    }

    public function test_confusion_progress_is_tracked_per_user(): void
    {
        $this->seed(MutashabihatPairSeeder::class);
        $pair = MutashabihatPair::query()->where('verse_key_1', '2:58')->orWhere('verse_key_2', '2:58')->first();
        $this->assertNotNull($pair);

        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $this->actingAs($user)->postJson(route('api.mutashabihat.confusion.store'), [
            'pair_id' => $pair->id,
            'expected_verse_key' => '2:58',
            'confused_verse_key' => '7:161',
        ])->assertOk();

        $this->assertDatabaseHas('user_mutashabihat_progress', [
            'user_id' => $user->id,
            'mutashabihat_pair_id' => $pair->id,
            'confusion_count' => 1,
            'status' => 'needs_practice',
        ]);
    }

    public function test_successful_practice_marks_pair_improving_not_strong(): void
    {
        $this->seed(MutashabihatPairSeeder::class);
        $pair = MutashabihatPair::query()->where('verse_key_1', '2:58')->orWhere('verse_key_2', '2:58')->first();
        $this->assertNotNull($pair);

        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $this->actingAs($user)->postJson(route('api.mutashabihat.practice.store'), [
            'pair_id' => $pair->id,
            'success' => true,
        ])->assertOk()->assertJsonPath('progress.status', 'improving');

        $this->assertDatabaseHas('user_mutashabihat_progress', [
            'user_id' => $user->id,
            'mutashabihat_pair_id' => $pair->id,
            'practice_attempts' => 1,
            'successful_attempts' => 1,
            'status' => 'improving',
        ]);
    }
}

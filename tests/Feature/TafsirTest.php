<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TafsirTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_fetch_tafsir(): void
    {
        $this->getJson('/api/quran/tafsir?surah_number=1')
            ->assertUnauthorized();
    }

    public function test_authenticated_user_can_fetch_chapter_tafsir(): void
    {
        Cache::flush();

        Http::fake([
            'api.quran.com/*' => Http::response([
                'tafsirs' => [
                    [
                        'verse_key' => '1:2',
                        'resource_id' => 169,
                        'text' => '<p>English tafsir for ayah two.</p>',
                    ],
                ],
            ], 200),
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/quran/tafsir?surah_number=1')
            ->assertOk()
            ->assertJsonPath('available', true)
            ->assertJsonPath('tafsir.tafsir_source', 'Tafsir Ibn Kathir (Abridged)')
            ->assertJsonPath('tafsir.tafsir_source_id', '169')
            ->assertJsonPath('tafsir.language', 'en')
            ->assertJsonPath('tafsir.ayahs.2.tafsir_text', 'English tafsir for ayah two.')
            ->assertJsonPath('tafsir.ayahs.2.language', 'en');
    }

    public function test_authenticated_user_can_fetch_single_ayah_tafsir(): void
    {
        Cache::flush();

        Http::fake([
            'api.quran.com/*' => Http::response([
                'tafsirs' => [
                    [
                        'verse_key' => '1:1',
                        'resource_id' => 169,
                        'text' => '<p>English tafsir for ayah one.</p>',
                    ],
                ],
            ], 200),
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/quran/tafsir?surah_number=1&ayah_number=1')
            ->assertOk()
            ->assertJsonPath('available', true)
            ->assertJsonPath('tafsir.tafsir_text', 'English tafsir for ayah one.')
            ->assertJsonPath('tafsir.tafsir_source', 'Tafsir Ibn Kathir (Abridged)')
            ->assertJsonPath('tafsir.language', 'en');
    }

    public function test_tafsir_unavailable_returns_graceful_empty_state(): void
    {
        Cache::flush();

        Http::fake([
            'api.quran.com/*' => Http::response([
                'tafsirs' => [],
            ], 200),
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/quran/tafsir?surah_number=1')
            ->assertOk()
            ->assertJsonPath('available', false)
            ->assertJsonPath('tafsir', null);
    }

    public function test_tafsir_validates_surah_and_ayah(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/quran/tafsir?surah_number=0')
            ->assertUnprocessable();

        $this->actingAs($user)
            ->getJson('/api/quran/tafsir?surah_number=1&ayah_number=0')
            ->assertUnprocessable();
    }
}

<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class QuranProxyTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_use_quran_proxy(): void
    {
        $this->get('/memorisation/quran-proxy/alquran/surah/1/quran-uthmani')
            ->assertRedirect();
    }

    public function test_authenticated_user_can_proxy_alquran_surah(): void
    {
        Http::fake([
            'api.alquran.cloud/*' => Http::response([
                'code' => 200,
                'status' => 'OK',
                'data' => [
                    'number' => 110,
                    'ayahs' => [
                        ['number' => 6214, 'numberInSurah' => 1, 'text' => 'اذا جاء نصر الله والفتح'],
                    ],
                ],
            ], 200, ['Content-Type' => 'application/json']),
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/memorisation/quran-proxy/alquran/surah/110/quran-uthmani')
            ->assertOk()
            ->assertJsonPath('code', 200)
            ->assertJsonPath('data.number', 110);
    }

    public function test_proxy_rejects_unknown_provider_and_path_traversal(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/memorisation/quran-proxy/evil/surah/1/quran-uthmani')
            ->assertNotFound();

        $this->actingAs($user)
            ->get('/memorisation/quran-proxy/alquran/../secret')
            ->assertStatus(400);
    }
}

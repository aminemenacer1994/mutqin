<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class QuranProxyTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_use_quran_proxy_for_demo(): void
    {
        Http::fake([
            'api.alquran.cloud/*' => Http::response([
                'code' => 200,
                'status' => 'OK',
                'data' => [
                    'number' => 1,
                    'ayahs' => [
                        ['number' => 1, 'numberInSurah' => 1, 'text' => 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'],
                    ],
                ],
            ], 200, ['Content-Type' => 'application/json']),
        ]);

        $this->get('/memorisation/quran-proxy/alquran/surah/1/quran-uthmani')
            ->assertOk()
            ->assertJsonPath('code', 200)
            ->assertJsonPath('data.number', 1);
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

    public function test_proxy_failures_do_not_leak_exception_text(): void
    {
        $source = file_get_contents(app_path('Http/Controllers/QuranProxyController.php'));

        $this->assertStringNotContainsString('getMessage()', $source);

        Http::fake([
            '*' => Http::response('internal-quran-secret-xyz', 500),
        ]);

        $this->get('/memorisation/quran-proxy/alquran/surah/1/quran-uthmani')
            ->assertStatus(500)
            ->assertDontSee('internal-quran-secret-xyz');
    }

    public function test_quran_proxy_route_is_rate_limited(): void
    {
        $middleware = Route::getRoutes()->getByName('memorisation.quran-proxy')?->gatherMiddleware() ?? [];

        $this->assertTrue(collect($middleware)->contains(
            fn ($entry) => is_string($entry) && str_contains($entry, 'throttle')
        ));
    }
}

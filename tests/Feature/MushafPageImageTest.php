<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class MushafPageImageTest extends TestCase
{
    private const PNG = "\x89PNG\r\n\x1a\n".'fake-madani-page-bytes';

    public function test_guest_can_fetch_a_madani_page_image(): void
    {
        Http::fake([
            'files.quran.app/*' => Http::response(self::PNG, 200, ['Content-Type' => 'image/png']),
        ]);

        $this->get('/memorisation/mushaf-page/1.png?w=1024')
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png')
            ->assertHeader('X-Mushaf-Page', '1');

        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'width_1024/page001.png');
        });
    }

    public function test_unknown_width_falls_back_to_1024(): void
    {
        Http::fake([
            'files.quran.app/*' => Http::response(self::PNG, 200, ['Content-Type' => 'image/png']),
        ]);

        $this->get('/memorisation/mushaf-page/50.png?w=9999')
            ->assertOk();

        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'width_1024/page050.png');
        });
    }

    public function test_invalid_pages_are_rejected(): void
    {
        $this->get('/memorisation/mushaf-page/0.png')->assertNotFound();
        $this->get('/memorisation/mushaf-page/605.png')->assertNotFound();
        $this->get('/memorisation/mushaf-page/1000.png')->assertNotFound();
    }

    public function test_falls_back_to_android_quran_host(): void
    {
        Http::fake([
            'files.quran.app/*' => Http::response('nope', 503),
            'android.quran.com/*' => Http::response(self::PNG, 200, ['Content-Type' => 'image/png']),
        ]);

        $this->get('/memorisation/mushaf-page/2.png')
            ->assertOk()
            ->assertHeader('X-Mushaf-Page', '2');
    }

    public function test_proxy_failures_do_not_leak_exception_text(): void
    {
        $source = file_get_contents(app_path('Http/Controllers/MushafPageImageController.php'));

        $this->assertStringNotContainsString('getMessage()', $source);

        Http::fake([
            '*' => Http::response('internal-cdn-secret-xyz', 500),
        ]);

        $this->get('/memorisation/mushaf-page/3.png')
            ->assertStatus(500)
            ->assertDontSee('internal-cdn-secret-xyz');
    }

    public function test_page_image_route_is_rate_limited(): void
    {
        $middleware = Route::getRoutes()->getByName('memorisation.mushaf-page')?->gatherMiddleware() ?? [];

        $this->assertTrue(collect($middleware)->contains(
            fn ($entry) => is_string($entry) && str_contains($entry, 'throttle')
        ));
    }
}

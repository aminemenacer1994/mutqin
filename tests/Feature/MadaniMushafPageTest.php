<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MadaniMushafPageTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('mutqin:import-madani-mushaf', ['--fixtures' => true]);
    }

    public function test_guest_can_fetch_madani_mushaf_page_one(): void
    {
        $this->getJson('/memorisation/madani-mushaf/pages/1')
            ->assertOk()
            ->assertJsonPath('pageNumber', 1)
            ->assertJsonStructure(['lines']);
    }

    public function test_invalid_page_returns_error(): void
    {
        $this->getJson('/memorisation/madani-mushaf/pages/0')
            ->assertNotFound();
        $this->getJson('/memorisation/madani-mushaf/pages/605')
            ->assertStatus(422);
    }

    public function test_api_route_matches_web_payload(): void
    {
        $web = $this->getJson('/memorisation/madani-mushaf/pages/2')->json();
        $api = $this->getJson('/api/quran/mushaf/pages/2')->json();
        $this->assertSame($web['pageNumber'], $api['pageNumber']);
        $this->assertCount(count($web['lines']), $api['lines']);
    }

    public function test_manifest_reports_imported_state(): void
    {
        $this->getJson('/memorisation/madani-mushaf/manifest')
            ->assertOk()
            ->assertJsonPath('imported', true);
    }

    public function test_fallback_serves_page_not_in_local_import(): void
    {
        Cache::flush();
        Http::fake([
            'api.quran.com/*' => Http::response([
                'verses' => [[
                    'verse_key' => '20:14',
                    'juz_number' => 16,
                    'hizb_number' => 32,
                    'page_number' => 313,
                    'words' => [[
                        'id' => 14950,
                        'position' => 1,
                        'char_type_name' => 'word',
                        'code_v2' => 'ﱁ',
                        'text_uthmani' => 'إِنَّنِي',
                        'line_number' => 2,
                        'page_number' => 313,
                    ]],
                ]],
            ], 200),
        ]);

        $this->getJson('/memorisation/madani-mushaf/pages/313')
            ->assertOk()
            ->assertJsonPath('pageNumber', 313)
            ->assertJsonPath('layoutSource', 'qurancom-fallback');

        @unlink(storage_path('app/madani-mushaf/pages/313.json'));
        Cache::forget('madani_mushaf_page:313');
    }

    public function test_resolve_uses_qurancom_when_local_index_incomplete(): void
    {
        Cache::flush();
        Http::fake([
            'api.quran.com/*' => Http::response([
                'verse' => ['verse_key' => '20:14', 'page_number' => 313],
            ], 200),
        ]);

        $this->getJson('/memorisation/madani-mushaf/resolve?verse_key=20:14')
            ->assertOk()
            ->assertJsonPath('pageNumber', 313);
    }
}

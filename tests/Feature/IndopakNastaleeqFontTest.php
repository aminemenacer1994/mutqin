<?php

namespace Tests\Feature;

use App\Support\Mushaf\IndopakNastaleeqFont;
use Tests\TestCase;

class IndopakNastaleeqFontTest extends TestCase
{
    public function test_font_file_exists_in_source_tree(): void
    {
        $this->assertTrue(IndopakNastaleeqFont::exists());
        $this->assertSame('IndopakNastaleeq', IndopakNastaleeqFont::FAMILY);
        $this->assertSame('indopak-15-qudratullah', IndopakNastaleeqFont::LAYOUT_ID);
        $this->assertSame('/indopak/font/indopak-nastaleeq.woff2', IndopakNastaleeqFont::url());
    }

    public function test_route_serves_local_woff2(): void
    {
        $response = $this->get(route('indopak.nastaleeq-font'));

        $response->assertOk();
        $response->assertHeader('content-type', 'font/woff2');
        $body = $response->streamedContent();
        $this->assertStringStartsWith('wOF2', $body);
        $this->assertSame(
            file_get_contents(IndopakNastaleeqFont::path()),
            $body
        );
    }

    public function test_madani_page_font_routes_are_unchanged(): void
    {
        $this->get(route('madani.page-font', ['page' => 1]))
            ->assertOk()
            ->assertHeader('content-type', 'font/woff2');

        $this->get('/indopak/font/indopak-nastaleeq.woff2')->assertOk();
    }

    public function test_layout_registry_points_at_indopak_font(): void
    {
        $layout = \App\Support\Mushaf\MushafLayoutRegistry::indopak15Qudratullah();

        $this->assertSame('IndopakNastaleeq', $layout->fontFamily);
        $this->assertSame(IndopakNastaleeqFont::url(), $layout->source['font_url']);
        $this->assertSame(IndopakNastaleeqFont::FAMILY, $layout->source['font_family']);

        $madani = \App\Support\Mushaf\MushafLayoutRegistry::madaniV2();
        $this->assertSame('QCF2', $madani->fontFamily);
        $this->assertArrayNotHasKey('font_url', $madani->source);
    }

    public function test_page_data_route_returns_renderer_envelope(): void
    {
        $response = $this->getJson(route('indopak.page-data', ['page' => 2]));

        $response->assertOk();
        $payload = $response->json();
        $this->assertSame('IndopakNastaleeq', $payload['font_family']);
        $this->assertSame('/indopak/font/indopak-nastaleeq.woff2', $payload['font_url']);
        $this->assertSame('indopak-15-qudratullah', $payload['layout_id']);
        $this->assertSame(2, $payload['page']['pageNumber']);
        $this->assertSame('surah_name', $payload['page']['lines'][0]['type']);
        $this->assertSame('basmallah', $payload['page']['lines'][1]['type']);
        $ayah = collect($payload['page']['lines'])->firstWhere('type', 'ayah');
        $this->assertNotEmpty($ayah['words']);
        $word = $ayah['words'][0];
        $this->assertArrayHasKey('location', $word);
        $this->assertArrayHasKey('verseKey', $word);
        $this->assertArrayHasKey('wordPosition', $word);
        $this->assertArrayHasKey('text', $word);
    }

    public function test_page_route_serves_generated_json(): void
    {
        $response = $this->get(route('indopak.page', ['page' => 1]));
        $response->assertOk();
        $response->assertHeader('content-type', 'application/json; charset=UTF-8');
        $payload = json_decode($response->streamedContent(), true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(1, $payload['pageNumber']);
    }

    public function test_out_of_range_page_is_rejected(): void
    {
        $this->get(route('indopak.page-data', ['page' => 611]))->assertNotFound();
        $this->get(route('indopak.page-data', ['page' => 0]))->assertNotFound();
    }

    public function test_verse_pages_route_serves_indopak_map(): void
    {
        $response = $this->get(route('indopak.verse-pages'));
        $response->assertOk();
        $response->assertHeader('content-type', 'application/json; charset=UTF-8');
        $payload = json_decode($response->streamedContent(), true, 512, JSON_THROW_ON_ERROR);
        $this->assertIsArray($payload);
        $this->assertSame(1, $payload['1:1']);
        $this->assertSame(603, $payload['95:2']);
        $madani = json_decode(
            (string) file_get_contents(public_path('quran/madani-v2/verse-pages.json')),
            true,
            512,
            JSON_THROW_ON_ERROR
        );
        $this->assertSame(597, $madani['95:2']);
        $this->assertNotSame(
            $madani['95:2'],
            $payload['95:2'],
            'IndoPak verse-page map must not reuse Madani page numbers'
        );
    }
}

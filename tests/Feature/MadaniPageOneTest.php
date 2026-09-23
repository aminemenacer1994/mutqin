<?php

namespace Tests\Feature;

use Tests\TestCase;

class MadaniPageOneTest extends TestCase
{
    public function test_page_one_route_embeds_the_qpc_payload_and_page_font(): void
    {
        $response = $this->get(route('madani.page', ['page' => 1]));

        $response->assertOk();
        $response->assertSee('<madani-spread', false);
        $response->assertSee('QCF2001', false);
        $response->assertSee('/madani/font/p1.woff2', false);
        $response->assertSee('surah_name', false);
        $response->assertSee('1:1:1', false);
        $response->assertSee('1:7:10', false);
        $response->assertDontSee('basmallah', false);
    }

    public function test_page_one_font_route_serves_only_p1_woff2(): void
    {
        $response = $this->get(route('madani.page-font', ['page' => 1]));

        $response->assertOk();
        $response->assertHeader('content-type', 'font/woff2');
        $body = $response->streamedContent();
        $this->assertStringStartsWith('wOF2', $body);
        $this->assertSame(
            file_get_contents(resource_path('quran/madani-v2/source/fonts/qpc-v2-fonts/p1.woff2')),
            $body
        );
    }

    public function test_verse_pages_and_resolve_routes_use_qpc_index(): void
    {
        $versePages = $this->get(route('madani.verse-pages'));
        $versePages->assertOk();
        $index = json_decode($versePages->streamedContent(), true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(1, $index['1:1']);
        $this->assertSame(6, $index['2:34']);

        $this->getJson(route('madani.resolve-verse', ['surah' => 2, 'ayah' => 34]))
            ->assertOk()
            ->assertJson([
                'surah' => 2,
                'ayah' => 34,
                'verse_key' => '2:34',
                'page' => 6,
            ]);
    }
}

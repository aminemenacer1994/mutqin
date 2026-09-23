<?php

namespace Tests\Feature;

use Tests\TestCase;

class MadaniPageRendererTest extends TestCase
{
    public function test_invalid_pages_fail_safely(): void
    {
        $this->get('/madani/page/0')->assertNotFound();
        $this->get('/madani/page/605')->assertNotFound();
        $this->get('/madani/font/p0.woff2')->assertNotFound();
        $this->get('/madani/font/p605.woff2')->assertNotFound();
    }

    public function test_page_two_embeds_the_opening_baqarah_layout(): void
    {
        $response = $this->get(route('madani.page', ['page' => 2]));

        $response->assertOk();
        $response->assertSee('QCF2002', false);
        $response->assertSee('/madani/font/p2.woff2', false);
        $response->assertSee('surah_name', false);
        $response->assertSee('basmallah', false);
        $response->assertSee('2:1:1', false);
        $response->assertSee('<madani-spread', false);
    }

    public function test_page_50_is_a_surah_boundary(): void
    {
        $response = $this->get(route('madani.page', ['page' => 50]));

        $response->assertOk();
        $response->assertSee('QCF2050', false);
        $response->assertSee('surah_name', false);
        $response->assertSee('basmallah', false);
        $this->assertSame(1, substr_count($response->getContent(), '"line_type":"surah_name"'));
        $this->assertSame(1, substr_count($response->getContent(), '"line_type":"basmallah"'));
    }

    public function test_page_300_embeds_mid_mushaf_ayahs(): void
    {
        $response = $this->get(route('madani.page', ['page' => 300]));

        $response->assertOk();
        $response->assertSee('QCF2300', false);
        $response->assertSee('/madani/font/p300.woff2', false);
        $response->assertSee('18:54:1', false);
        $response->assertSee('18:61:12', false);
    }

    public function test_page_604_is_the_last_page_and_disables_next(): void
    {
        $response = $this->get(route('madani.page', ['page' => 604]));

        $response->assertOk();
        $response->assertSee('QCF2604', false);
        $response->assertSee('112:1:1', false);
        $response->assertSee('114:6:4', false);
        $response->assertDontSee(route('madani.page', ['page' => 605]), false);
    }

    public function test_page_one_disables_previous(): void
    {
        $response = $this->get(route('madani.page', ['page' => 1]));

        $response->assertOk();
        $response->assertDontSee(route('madani.page', ['page' => 0]), false);
    }

    public function test_page_data_endpoint_returns_only_that_page(): void
    {
        $response = $this->get(route('madani.page-data', ['page' => 5]));

        $response->assertOk();
        $payload = json_decode($response->streamedContent(), true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(5, $payload['page']['page_number']);
        $this->assertSame('QCF2005', $payload['font_family']);
        $this->assertStringContainsString('/madani/font/p5.woff2', $payload['font_url']);
        $this->get(route('madani.page-data', ['page' => 0]))->assertNotFound();
        $this->get(route('madani.page-data', ['page' => 605]))->assertNotFound();
    }

    public function test_page_fonts_are_served_per_page(): void
    {
        foreach ([2, 300, 604] as $page) {
            $response = $this->get(route('madani.page-font', ['page' => $page]));
            $response->assertOk();
            $response->assertHeader('content-type', 'font/woff2');
            $this->assertSame(
                file_get_contents(resource_path('quran/madani-v2/source/fonts/qpc-v2-fonts/p'.$page.'.woff2')),
                $response->streamedContent()
            );
        }
    }
}

<?php

namespace Tests\Feature;

use Tests\TestCase;

class MadaniPageSixTest extends TestCase
{
    public function test_page_six_route_embeds_the_qpc_payload_and_page_font(): void
    {
        $response = $this->get(route('madani.page', ['page' => 6]));

        $response->assertOk();
        $response->assertSee('<madani-spread', false);
        $response->assertSee('QCF2006', false);
        $response->assertSee('/madani/font/p6.woff2', false);
        $response->assertSee('2:30:1', false);
        $response->assertSee('2:37:12', false);
        $this->assertSame(15, substr_count($response->getContent(), '"line_type":"ayah"'));
    }

    public function test_page_six_font_route_serves_only_p6_woff2(): void
    {
        $response = $this->get(route('madani.page-font', ['page' => 6]));

        $response->assertOk();
        $response->assertHeader('content-type', 'font/woff2');
        $body = $response->streamedContent();
        $this->assertStringStartsWith('wOF2', $body);
        $this->assertSame(
            file_get_contents(resource_path('quran/madani-v2/source/fonts/qpc-v2-fonts/p6.woff2')),
            $body
        );
    }
}

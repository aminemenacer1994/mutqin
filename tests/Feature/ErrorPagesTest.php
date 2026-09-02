<?php

namespace Tests\Feature;

use Tests\TestCase;

class ErrorPagesTest extends TestCase
{
    public function test_not_found_page_is_friendly_and_actionable(): void
    {
        $response = $this->get('/this-route-does-not-exist-mutqin-fallback');

        $response->assertNotFound();
        $response->assertSee('Page not found', false);
        $response->assertSee('Return Home', false);
        $response->assertDontSee('Stack trace', false);
        $response->assertDontSee('Illuminate\\', false);
    }

    public function test_server_error_view_hides_technical_details(): void
    {
        $html = view('errors.500')->render();

        $this->assertStringContainsString('Something went wrong', $html);
        $this->assertStringContainsString('We couldn’t load this page', $html);
        $this->assertStringContainsString('Retry', $html);
        $this->assertStringContainsString('Return Home', $html);
        $this->assertStringNotContainsString('$exception', $html);
        $this->assertStringNotContainsString('Stack trace', $html);
    }

    public function test_offline_error_view_uses_offline_copy(): void
    {
        $html = view('errors.offline')->render();

        $this->assertStringContainsString('You appear to be offline', $html);
        $this->assertStringContainsString('Retry', $html);
        $this->assertStringContainsString('Return Home', $html);
    }
}

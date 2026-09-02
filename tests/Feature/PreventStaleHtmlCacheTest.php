<?php

namespace Tests\Feature;

use Tests\TestCase;

class PreventStaleHtmlCacheTest extends TestCase
{
    public function test_html_documents_must_revalidate(): void
    {
        $response = $this->get('/');

        $response->assertOk();
        $cacheControl = strtolower((string) $response->headers->get('Cache-Control'));

        $this->assertStringContainsString('no-cache', $cacheControl);
        $this->assertStringContainsString('no-store', $cacheControl);
        $this->assertSame('no-cache', $response->headers->get('Pragma'));
    }

    public function test_json_api_responses_are_not_forced_to_html_cache_policy(): void
    {
        $response = $this->getJson('/api/state');

        $response->assertUnauthorized();
        $this->assertStringContainsString('application/json', strtolower((string) $response->headers->get('Content-Type')));

        $cacheControl = strtolower((string) $response->headers->get('Cache-Control', ''));
        $this->assertStringNotContainsString('no-store', $cacheControl);
    }
}

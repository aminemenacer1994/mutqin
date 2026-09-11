<?php

namespace Tests\Feature;

use Tests\TestCase;

class MushafPageProxyNotDeployedTest extends TestCase
{
    public function test_mushaf_page_png_proxy_is_not_registered(): void
    {
        $this->get('/memorisation/mushaf-page/1.png')->assertNotFound();
        $this->assertFalse(
            collect(\Illuminate\Support\Facades\Route::getRoutes())->contains(
                fn ($route) => str_contains((string) $route->uri(), 'mushaf-page')
            )
        );
    }
}

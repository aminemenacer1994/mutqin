<?php

namespace Tests\Unit;

use App\Support\Seo\SeoCatalog;
use Tests\TestCase;

class SeoCatalogTest extends TestCase
{
    public function test_future_prefixes_are_reserved_without_thin_pages(): void
    {
        $this->assertSame(
            ['features', 'quran-memorization', 'guides', 'tools'],
            SeoCatalog::FUTURE_PREFIXES
        );

        $locs = array_column(SeoCatalog::sitemapEntries(), 'loc');
        foreach (['quran-memorization'] as $prefix) {
            foreach ($locs as $loc) {
                $this->assertStringNotContainsString('/'.$prefix.'/', $loc);
            }
        }
        $this->assertTrue(
            collect($locs)->contains(fn (string $loc) => str_contains($loc, '/features/ai-recite'))
        );
        $this->assertTrue(
            collect($locs)->contains(fn (string $loc) => str_contains($loc, '/guides/hifz-revision'))
        );
        $this->assertTrue(
            collect($locs)->contains(fn (string $loc) => str_contains($loc, '/tools/quran-memorization-planner'))
        );
    }

    public function test_homepage_canonical_and_software_application_schema(): void
    {
        $seo = SeoCatalog::forPath('/');

        $this->assertTrue($seo->indexable);
        $this->assertSame('Quran Memorization App with AI | Mutqin', $seo->title);
        $this->assertSame('index, follow', $seo->robots);
        $this->assertNotEmpty($seo->hreflang);

        $types = array_column($seo->jsonLd, '@type');
        $this->assertContains('Organization', $types);
        $this->assertContains('WebSite', $types);
        $this->assertContains('SoftwareApplication', $types);
        $this->assertNotContains('Article', $types);
        $this->assertSame('summary_large_image', $seo->twitterCard);
        $this->assertStringContainsString('hero-center.jpg', $seo->ogImage);

        foreach ($seo->jsonLd as $block) {
            $this->assertArrayNotHasKey('aggregateRating', $block);
        }
    }

    public function test_dashboard_is_noindex(): void
    {
        $seo = SeoCatalog::forPath('/dashboard');

        $this->assertFalse($seo->indexable);
        $this->assertSame('noindex, follow', $seo->robots);
        $this->assertSame([], $seo->jsonLd);
    }

    public function test_use_seo_client_module_exports_apply_helpers(): void
    {
        $source = file_get_contents(resource_path('js/seo/useSeo.js'));

        $this->assertStringContainsString('export function useSeo', $source);
        $this->assertStringContainsString('export function applyDocumentSeo', $source);
        $this->assertStringContainsString('data-mutqin-seo', $source);
    }
}

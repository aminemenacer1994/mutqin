<?php

namespace Tests\Unit;

use App\Support\Seo\SeoArticles;
use App\Support\Seo\SeoCatalog;
use App\Support\Seo\SeoGuideIndex;
use Tests\TestCase;

class SeoArticlesTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        SeoArticles::flush();
    }

    public function test_published_sample_article_is_loaded_and_indexable(): void
    {
        $article = SeoArticles::forSlug('practice-between-lessons');

        $this->assertNotNull($article);
        $this->assertTrue($article['published']);
        $this->assertTrue($article['indexable']);
        $this->assertSame('/guides/practice-between-lessons', $article['path']);
        $this->assertSame('practice', $article['category']);
        $this->assertNotEmpty($article['sections']);
    }

    public function test_template_file_is_ignored(): void
    {
        $slugs = array_column(SeoArticles::all(), 'slug');

        $this->assertNotContains('_template', $slugs);
        $this->assertNotContains('your-article-slug', $slugs);
    }

    public function test_catalog_definitions_feed_article_schema_fields(): void
    {
        $defs = SeoArticles::catalogDefinitions();
        $match = collect($defs)->first(
            fn (array $def): bool => in_array('/guides/practice-between-lessons', $def['paths'], true)
        );

        $this->assertNotNull($match);
        $this->assertTrue($match['indexable']);
        $this->assertSame('article', $match['og_type']);
        $this->assertSame('2026-10-05', $match['article_meta']['datePublished']);

        $seo = SeoCatalog::forPath('/guides/practice-between-lessons');
        $this->assertTrue($seo->indexable);
        $types = array_column($seo->jsonLd, '@type');
        $this->assertContains('Article', $types);
        $this->assertContains('BreadcrumbList', $types);

        $article = collect($seo->jsonLd)->firstWhere('@type', 'Article');
        $this->assertSame('2026-10-05', $article['datePublished']);
        $this->assertArrayHasKey('image', $article);
    }

    public function test_guide_index_includes_launch_guides_and_articles(): void
    {
        $entries = SeoGuideIndex::entries();
        $hrefs = array_column($entries, 'href');

        $this->assertContains('/guides/quran-memorization-for-beginners', $hrefs);
        $this->assertContains('/guides/practice-between-lessons', $hrefs);

        $filtered = SeoGuideIndex::page('practice');
        $this->assertSame('practice', $filtered['guide_index']['active_category']);
        $this->assertNotEmpty($filtered['guide_index']['entries']);
        foreach ($filtered['guide_index']['entries'] as $entry) {
            $this->assertSame('practice', $entry['category']);
        }
    }

    public function test_sitemap_includes_indexable_article(): void
    {
        $locs = array_column(SeoCatalog::sitemapEntries(), 'loc');

        $this->assertTrue(
            collect($locs)->contains(
                fn (string $loc): bool => str_contains($loc, '/guides/practice-between-lessons')
            )
        );
    }
}

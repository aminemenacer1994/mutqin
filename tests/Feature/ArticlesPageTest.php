<?php

namespace Tests\Feature;

use App\Support\Seo\SeoCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArticlesPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_articles_page_is_indexable_with_catalogued_metadata(): void
    {
        $html = $this->get('/articles')
            ->assertOk()
            ->assertSee('Qur&#039;an Memorisation Articles &amp; Guides | Mutqin', false)
            ->assertSee('Explore practical Qur&#039;an memorisation guides, Hifz techniques, revision strategies, Mutashabihat advice and resources from Mutqin.', false)
            ->assertSee('content="index, follow"', false)
            ->assertSee('property="og:title"', false)
            ->assertSee('name="twitter:card"', false)
            ->assertSee('<articles-page', false)
            ->assertSee('How to Memorise the Qur&#039;an: A Beginner&#039;s Guide', false)
            ->assertSee('Mutashabihat: How to Memorise Similar Qur&#039;an Ayahs', false)
            ->assertSee('images.pexels.com', false)
            ->assertSee('CollectionPage', false)
            ->assertSee('ItemList', false)
            ->assertSee('name="keywords"', false)
            ->assertHeader('X-Robots-Tag', 'index, follow')
            ->getContent();

        $this->assertSame(1, substr_count($html, '<title>'));
        $this->assertStringContainsString('rel="canonical"', $html);
        $this->assertStringContainsString(SeoCatalog::absoluteUrl('/articles', 'marketing'), $html);
        $this->assertStringContainsString('BreadcrumbList', $html);
        $this->assertStringContainsString('nav-link-guides', $html);
        $this->assertStringContainsString('href="'.url('/articles').'"', $html);
        $this->assertStringContainsString('>Articles</strong>', $html);
        $this->assertStringNotContainsString('data-tour="nav-dashboard"', $html);
    }

    public function test_sitemap_and_robots_include_articles(): void
    {
        $this->get('/robots.txt')
            ->assertOk()
            ->assertSee('Allow: /articles', false);

        $this->get('/sitemap.xml')
            ->assertOk()
            ->assertSee(SeoCatalog::absoluteUrl('/articles', 'marketing'), false)
            ->assertSee(SeoCatalog::absoluteUrl('/articles/how-to-memorise-the-quran-beginners-guide', 'marketing'), false);
    }

    public function test_article_detail_page_is_indexable_with_body_and_related_links(): void
    {
        $html = $this->get('/articles/how-to-memorise-the-quran-beginners-guide')
            ->assertOk()
            ->assertSee('<article-detail-page', false)
            ->assertSee('How to Memorise the Qur&#039;an: A Beginner&#039;s Guide | Mutqin', false)
            ->assertSee('Start smaller than your enthusiasm', false)
            ->assertSee('/articles/quran-memorisation-plan-for-beginners', false)
            ->assertSee('application/ld+json', false)
            ->assertSee('"@type":"Article"', false)
            ->assertSee('wa.me', false)
            ->assertHeader('X-Robots-Tag', 'index, follow')
            ->getContent();

        $this->assertStringContainsString(SeoCatalog::absoluteUrl('/articles/how-to-memorise-the-quran-beginners-guide', 'marketing'), $html);
        $this->assertStringContainsString('nav-link-guides', $html);
    }

    public function test_unknown_article_slug_is_not_found(): void
    {
        $this->get('/articles/not-a-real-article')->assertNotFound();
    }

    public function test_articles_nav_link_is_hidden_in_production(): void
    {
        $previous = $this->app['env'] ?? config('app.env');
        $this->app['env'] = 'production';

        try {
            $html = $this->get('/articles')
                ->assertOk()
                ->getContent();

            $this->assertStringNotContainsString('<a class="nav-link nav-link-guides', $html);
            $this->assertStringNotContainsString('>Articles</strong>', $html);
        } finally {
            $this->app['env'] = $previous;
        }
    }
}

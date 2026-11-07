<?php

namespace Tests\Feature;

use App\Support\Seo\SeoCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArticlesPageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableArticles();
        $this->enableHowItWorks();
    }

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
        $this->assertStringContainsString('<a class="nav-link nav-link-guides', $html);
        $this->assertStringContainsString('>Articles</strong>', $html);
        $this->assertStringContainsString('<a class="nav-link nav-link-features', $html);
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
        $this->assertStringContainsString('<a class="nav-link nav-link-guides', $html);
    }

    public function test_complete_hifz_guide_article_is_published_with_verified_references(): void
    {
        $html = $this->get('/articles/how-to-memorise-quran-and-retain-it')
            ->assertOk()
            ->assertSee('How to Memorise the Qur&#039;an and Retain It | Mutqin', false)
            ->assertSee('A Complete Guide to Memorising the Qur&#039;an and Retaining It', false)
            ->assertSee('Qur&#039;an Memorisation', false)
            ->assertSee('Spiritual Foundations', false)
            ->assertSee('https://quran.com/54/17', false)
            ->assertSee('https://sunnah.com/muslim:791', false)
            ->assertSee('https://sunnah.com/muslim:789b', false)
            ->assertSee('https://sunnah.com/hisn:120', false)
            ->assertSee('Make Your Qur&#039;an Revision More Consistent', false)
            ->assertSee('Start Memorising with Mutqin', false)
            ->assertSee('/articles/how-to-revise-the-quran-and-retain-hifz', false)
            ->assertHeader('X-Robots-Tag', 'index, follow')
            ->getContent();

        $this->assertStringContainsString(SeoCatalog::absoluteUrl('/articles/how-to-memorise-quran-and-retain-it', 'marketing'), $html);
        $this->assertStringContainsString('images.pexels.com/photos/36188885', $html);
    }

    public function test_unknown_article_slug_is_not_found(): void
    {
        $this->get('/articles/not-a-real-article')->assertNotFound();
    }

    public function test_articles_and_how_it_works_nav_links_are_visible_when_enabled(): void
    {
        $html = $this->get('/articles')
            ->assertOk()
            ->getContent();

        $this->assertStringContainsString('<a class="nav-link nav-link-guides', $html);
        $this->assertStringContainsString('>Articles</strong>', $html);
        $this->assertStringContainsString('>How it works</strong>', $html);
        $this->assertStringContainsString('href="'.url('/features').'"', $html);
    }

    public function test_articles_are_hidden_from_nav_sitemap_and_routes_when_disabled(): void
    {
        config(['mutqin.show_articles' => false]);

        $this->get('/articles')->assertNotFound();
        $this->get('/articles/how-to-memorise-the-quran-beginners-guide')->assertNotFound();

        $this->get('/robots.txt')
            ->assertOk()
            ->assertSee('Disallow: /articles', false)
            ->assertDontSee('Allow: /articles', false);

        $this->get('/sitemap.xml')
            ->assertOk()
            ->assertDontSee(SeoCatalog::absoluteUrl('/articles', 'marketing'), false);

        $html = $this->get('/')->assertOk()->getContent();
        $this->assertStringNotContainsString('<a class="nav-link nav-link-guides', $html);
        $this->assertStringNotContainsString('>Articles</strong>', $html);
        $this->assertStringContainsString('>How it works</strong>', $html);
    }
}

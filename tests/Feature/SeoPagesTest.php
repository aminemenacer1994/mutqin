<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\Seo\SeoCatalog;
use Illuminate\Contracts\Http\Kernel as HttpKernel;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class SeoPagesTest extends TestCase
{
    use RefreshDatabase;

    public function createApplication(): Application
    {
        putenv('MUTQIN_DOMAIN_ROUTING_FORCE=false');
        $_ENV['MUTQIN_DOMAIN_ROUTING_FORCE'] = 'false';
        $_SERVER['MUTQIN_DOMAIN_ROUTING_FORCE'] = 'false';
        putenv('MUTQIN_DOMAIN_ROUTING_IN_TESTS=false');
        $_ENV['MUTQIN_DOMAIN_ROUTING_IN_TESTS'] = 'false';
        $_SERVER['MUTQIN_DOMAIN_ROUTING_IN_TESTS'] = 'false';

        return parent::createApplication();
    }

    public function test_robots_txt_allows_public_paths_and_blocks_private_ones(): void
    {
        $body = $this->get('/robots.txt')
            ->assertOk()
            ->assertHeader('Content-Type', 'text/plain; charset=UTF-8')
            ->getContent();

        $this->assertStringContainsString('Allow: /', $body);
        $this->assertStringContainsString('Disallow: /dashboard', $body);
        $this->assertStringContainsString('Disallow: /admin', $body);
        $this->assertStringContainsString('Disallow: /memorisation', $body);
        $this->assertStringContainsString('Disallow: /login', $body);
        $this->assertStringContainsString('Sitemap:', $body);
    }

    public function test_sitemap_lists_indexable_urls_only(): void
    {
        $xml = $this->get('/sitemap.xml')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/xml; charset=UTF-8')
            ->getContent();

        $this->assertStringContainsString('<urlset', $xml);
        $this->assertStringContainsString(SeoCatalog::absoluteUrl('/', 'marketing'), $xml);
        $this->assertStringContainsString(SeoCatalog::absoluteUrl('/waiting-list', 'marketing'), $xml);
        $this->assertStringContainsString(SeoCatalog::absoluteUrl('/about', 'app'), $xml);
        $this->assertStringContainsString(SeoCatalog::absoluteUrl('/features/ai-recite', 'app'), $xml);
        $this->assertStringContainsString(SeoCatalog::absoluteUrl('/guides/quran-memorization-for-beginners', 'app'), $xml);
        $this->assertStringContainsString(SeoCatalog::absoluteUrl('/tools/quran-memorization-planner', 'app'), $xml);
        $this->assertStringContainsString(SeoCatalog::absoluteUrl('/tools/find-an-ayah', 'app'), $xml);
        $this->assertStringNotContainsString('/dashboard', $xml);
        $this->assertStringNotContainsString('/login', $xml);
        $this->assertStringNotContainsString('/memorisation', $xml);
        $this->assertStringNotContainsString('/quran-memorization/', $xml);
        $this->assertStringNotContainsString('/compare/', $xml);
    }

    public function test_homepage_is_indexable_with_unique_metadata_and_prerendered_copy(): void
    {
        $html = $this->get('/')
            ->assertOk()
            ->assertSee('Quran Memorization App with AI | Mutqin', false)
            ->assertSee('rel="canonical"', false)
            ->assertSee('name="robots"', false)
            ->assertSee('content="index, follow"', false)
            ->assertSee('property="og:title"', false)
            ->assertSee('name="twitter:card"', false)
            ->assertSee('application/ld+json', false)
            ->assertSee('SoftwareApplication', false)
            ->assertSee('Organization', false)
            ->assertSee('WebSite', false)
            ->assertSee('A calmer, more structured way to memorise the Qur’an.', false)
            ->assertSee('href="/waiting-list"', false)
            ->assertSee('href="/tools"', false)
            ->assertSee('href="/tools/quran-memorization-planner"', false)
            ->assertSee('href="/guides/quran-memorization-techniques"', false)
            ->assertSee('<homepage', false)
            ->getContent();

        $this->assertSame(1, substr_count($html, '<title>'));
        $this->assertSame(1, substr_count($html, 'name="description"'));
        $this->assertStringContainsString('hreflang="x-default"', $html);
        $this->assertStringContainsString('og:image:width', $html);
        $this->assertStringContainsString('summary_large_image', $html);
        $this->assertStringNotContainsString('aggregateRating', $html);
        $this->assertStringNotContainsString('reviewCount', $html);
    }

    public function test_public_content_pages_are_indexable_and_have_distinct_titles(): void
    {
        $homeTitle = 'Quran Memorization App with AI | Mutqin';

        $this->get('/waiting-list')
            ->assertOk()
            ->assertSee('Join the Mutqin Waiting List', false)
            ->assertSee('content="index, follow"', false)
            ->assertDontSee($homeTitle, false);

        $this->get('/about')
            ->assertOk()
            ->assertSee('About Mutqin | Qur’an Memorisation Platform', false)
            ->assertSee('content="index, follow"', false)
            ->assertSee('Built for the quiet work of hifz', false)
            ->assertSee('Qur’an memorisation', false)
            ->assertDontSee('FAQPage', false);

        $this->get('/pricing')
            ->assertOk()
            ->assertSee('Mutqin Pricing | Free and Pro Hifz Plans', false)
            ->assertSee('content="index, follow"', false);

        $this->get('/privacy')
            ->assertOk()
            ->assertSee('Privacy Policy | Mutqin', false);

        $this->get('/our-mission')
            ->assertOk()
            ->assertSee('Our Mission | Mutqin Quran Memorization', false);

        $this->get('/donate')
            ->assertOk()
            ->assertSee('Help and Support | Mutqin', false)
            ->assertHeader('X-Robots-Tag', 'index, follow');
    }

    public function test_legacy_home_and_trailing_slash_use_permanent_redirects(): void
    {
        $this->get('/home')->assertRedirect('/')->assertStatus(301);

        $kernel = $this->app->make(HttpKernel::class);
        $request = Request::create('http://localhost/about/', 'GET');
        $response = $kernel->handle($request);
        $kernel->terminate($request, $response);

        $this->createTestResponse($response, $request)
            ->assertRedirect('http://localhost/about')
            ->assertStatus(301);
    }

    public function test_about_us_redirects_to_canonical_about(): void
    {
        $this->get('/about-us')
            ->assertRedirect('/about')
            ->assertStatus(301);
    }

    public function test_private_and_auth_pages_are_noindex(): void
    {
        $this->get(route('login'))
            ->assertOk()
            ->assertSee('content="noindex, follow"', false)
            ->assertDontSee('content="index, follow"', false)
            ->assertHeader('X-Robots-Tag', 'noindex, follow');

        $this->get(route('register'))
            ->assertOk()
            ->assertSee('content="noindex, follow"', false);

        $this->get(route('password.request'))
            ->assertOk()
            ->assertSee('content="noindex, follow"', false);

        $this->get(route('memorisation.demo'))
            ->assertOk()
            ->assertSee('content="noindex, follow"', false);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertSee('content="noindex, follow"', false);

        $this->actingAs($user)
            ->get(route('profile.show'))
            ->assertOk()
            ->assertSee('content="noindex, follow"', false);

        $this->actingAs($user)
            ->get(route('memorisation'))
            ->assertOk()
            ->assertSee('content="noindex, follow"', false);
    }

    public function test_custom_404_is_not_indexable(): void
    {
        $this->get('/this-route-does-not-exist-mutqin-fallback')
            ->assertNotFound()
            ->assertSee('noindex, follow', false)
            ->assertSee('Page not found', false);
    }

    public function test_launch_feature_and_guide_pages_are_indexable_with_unique_copy(): void
    {
        $ai = $this->get('/features/ai-recite')
            ->assertOk()
            ->assertSee('AI Quran Recitation Checker | Mutqin', false)
            ->assertSee('content="index, follow"', false)
            ->assertSee('Check your Hifz with AI Recite', false)
            ->assertSee('Check what you kept', false)
            ->assertSee('href="/features/quran-revision"', false)
            ->assertSee('<seo-launch-page', false)
            ->assertHeader('X-Robots-Tag', 'index, follow')
            ->getContent();

        $this->assertSame(1, substr_count($ai, '<title>'));
        $this->assertStringContainsString('SoftwareApplication', $ai);
        $this->assertStringContainsString('BreadcrumbList', $ai);

        $this->get('/features/mutashabihat')
            ->assertOk()
            ->assertSee('Mutashabihat: Similar Quran Ayahs | Mutqin', false)
            ->assertDontSee('AI Quran Recitation Checker | Mutqin', false);

        $this->get('/features/mushaf')
            ->assertOk()
            ->assertSee('gradually hide the text', false);

        $this->get('/guides')
            ->assertOk()
            ->assertSee('Hifz guides for Quran memorization', false)
            ->assertSee('href="/guides/quran-memorization-for-beginners"', false)
            ->assertSee('Browse guides', false)
            ->assertSee('href="/guides/practice-between-lessons"', false)
            ->assertSee('category=practice', false);

        $guide = $this->get('/guides/quran-memorization-techniques')
            ->assertOk()
            ->assertSee('How to Memorize the Quran | Hifz Techniques That Hold', false)
            ->assertSee('How to memorize the Quran: techniques that hold', false)
            ->assertSee('gradually hide the text', false)
            ->assertSee('href="/guides/similar-ayahs"', false)
            ->assertSee('href="/tools/quran-memorization-planner"', false)
            ->assertSee('href="/features/mushaf"', false)
            ->assertSee('Related tools', false)
            ->assertSee('"@type":"Article"', false)
            ->assertSee('datePublished', false)
            ->getContent();

        $this->assertStringContainsString('Article', $guide);
        $this->assertStringContainsString('BreadcrumbList', $guide);
        $this->assertStringNotContainsString('aggregateRating', $guide);

        $this->get('/guides/quran-memorization-for-beginners')
            ->assertOk()
            ->assertSee('Quran Memorization Plan for Beginners', false)
            ->assertSee('first-week shape', false)
            ->assertSee('href="/guides/hifz-plan"', false)
            ->assertSee('href="/tools/quran-memorization-planner"', false)
            ->assertSee('href="/guides/practice-between-lessons"', false);

        $this->get('/guides/hifz-revision')
            ->assertOk()
            ->assertSee('How to Revise the Quran and Retain Your Hifz', false)
            ->assertSee('Three buckets', false)
            ->assertSee('href="/features/quran-revision"', false)
            ->assertSee('href="/tools/hifz-progress-calculator"', false);

        $this->get('/guides/hifz-plan')
            ->assertOk()
            ->assertSee('How to make a Quran memorization plan you will keep', false)
            ->assertSee('href="/tools/quran-memorization-planner"', false);

        $this->get('/guides/similar-ayahs')
            ->assertOk()
            ->assertSee('Mutashabihat: How to Memorize Similar Quran Ayahs', false)
            ->assertSee('how to memorize similar Quran ayahs', false)
            ->assertSee('Compare first', false)
            ->assertSee('href="/features/mutashabihat"', false)
            ->assertSee('Related features', false);
    }

    public function test_file_based_seo_article_is_indexable_with_schema_and_related(): void
    {
        $html = $this->get('/guides/practice-between-lessons')
            ->assertOk()
            ->assertSee('How to Practise Hifz Between Lessons | Mutqin', false)
            ->assertSee('content="index, follow"', false)
            ->assertSee('How to practise Hifz between lessons', false)
            ->assertSee('href="/features/hifz-plan"', false)
            ->assertSee('href="/guides/quran-memorization-for-beginners"', false)
            ->assertSee('Related guides', false)
            ->assertSee('Related tools', false)
            ->assertSee('<seo-launch-page', false)
            ->assertHeader('X-Robots-Tag', 'index, follow')
            ->getContent();

        $this->assertStringContainsString('"@type":"Article"', $html);
        $this->assertStringContainsString('datePublished', $html);
        $this->assertStringContainsString('BreadcrumbList', $html);
        $this->assertStringContainsString('Keep the sitting small enough to finish', $html);

        $this->get('/guides?category=practice')
            ->assertOk()
            ->assertSee('href="/guides/practice-between-lessons"', false)
            ->assertDontSee('Quran memorization plan for beginners', false);

        $this->get('/sitemap.xml')
            ->assertOk()
            ->assertSee(SeoCatalog::absoluteUrl('/guides/practice-between-lessons', 'app'), false);
    }

    public function test_public_tool_pages_are_indexable_with_unique_copy(): void
    {
        $this->get('/robots.txt')
            ->assertOk()
            ->assertSee('Allow: /tools', false);

        $hub = $this->get('/tools')
            ->assertOk()
            ->assertSee('Free Quran Memorization Tools | Mutqin', false)
            ->assertSee('content="index, follow"', false)
            ->assertSee('Free tools for Quran memorization', false)
            ->assertSee('href="/tools/quran-memorization-planner"', false)
            ->assertSee('<seo-launch-page', false)
            ->assertHeader('X-Robots-Tag', 'index, follow')
            ->getContent();

        $this->assertSame(1, substr_count($hub, '<title>'));

        $planner = $this->get('/tools/quran-memorization-planner')
            ->assertOk()
            ->assertSee('Quran Memorization Planner | Daily Hifz Pace', false)
            ->assertSee('Quran memorization planner: a realistic daily Hifz pace', false)
            ->assertSee('How to use it', false)
            ->assertSee('Do I need an account to use the Quran memorization planner?', false)
            ->assertSee('Continue in Mutqin', false)
            ->assertSee('href="/features/hifz-plan"', false)
            ->assertSee('utm_campaign=planner', false)
            ->assertDontSee('Free Quran Memorization Tools | Mutqin', false)
            ->getContent();

        $this->assertStringContainsString('WebApplication', $planner);
        $this->assertStringContainsString('FAQPage', $planner);
        $this->assertStringContainsString('BreadcrumbList', $planner);
        $this->assertStringContainsString('Interactive tool', $planner);

        $this->get('/tools/hifz-progress-calculator')
            ->assertOk()
            ->assertSee('Hifz Progress Calculator | Pages, Juz, and Surahs', false)
            ->assertSee('Hifz progress calculator: pages, Juz, and surahs', false)
            ->assertSee('How to use it', false)
            ->assertSee('utm_campaign=progress', false)
            ->assertSee('"@type":"FAQPage"', false);

        $this->get('/tools/quran-memorization-test')
            ->assertOk()
            ->assertSee('Quran Memorization Test | Check What You Remember', false)
            ->assertSee('Quran memorization test: check a short range from memory', false)
            ->assertSee('href="/features/ai-recite"', false)
            ->assertSee('utm_campaign=quiz', false)
            ->assertSee('Does the Quran memorization test grade tajweed?', false);

        $this->get('/tools/find-an-ayah')
            ->assertOk()
            ->assertSee('Find an Ayah by Typing Arabic | Mutqin', false)
            ->assertSee('Find an ayah from Arabic you type', false)
            ->assertSee('href="/features/find-an-ayah"', false)
            ->assertSee('without a microphone', false)
            ->assertSee('utm_campaign=find-ayah', false)
            ->assertSee('Is the Arabic I type sent to analytics?', false);

        $this->get('/sitemap.xml')
            ->assertOk()
            ->assertSee(SeoCatalog::absoluteUrl('/tools/quran-memorization-planner', 'app'), false)
            ->assertSee(SeoCatalog::absoluteUrl('/tools/hifz-progress-calculator', 'app'), false)
            ->assertSee(SeoCatalog::absoluteUrl('/tools/quran-memorization-test', 'app'), false)
            ->assertSee(SeoCatalog::absoluteUrl('/tools/find-an-ayah', 'app'), false);
    }
}

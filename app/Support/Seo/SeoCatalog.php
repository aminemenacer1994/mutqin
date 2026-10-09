<?php

namespace App\Support\Seo;

use App\Support\Articles\PlaceholderArticles;
use App\Support\MutqinDomains;
use Illuminate\Http\Request;

/**
 * Central SEO registry for Mutqin public and private HTML pages.
 *
 * Future content prefixes (do not emit sitemap URLs until pages exist):
 * /features/*, /quran-memorization/*, /guides/*, /tools/*
 */
final class SeoCatalog
{
    public const FUTURE_PREFIXES = [
        'features',
        'quran-memorization',
        'guides',
        'tools',
    ];

    public const OG_IMAGE_PATH = '/images/landing/hero-center.jpg';

    public const OG_IMAGE_WIDTH = 493;

    public const OG_IMAGE_HEIGHT = 1020;

    public const OG_IMAGE_ALT = 'Mutqin Quran memorization app showing a Hifz practice session';

    public const LOGO_PATH = '/favicon-512.png';

    public static function forRequest(?Request $request = null): SeoDocument
    {
        $request ??= request();
        $path = self::normalizePath($request->path());

        return self::forPath($path, $request);
    }

    public static function forPath(string $path, ?Request $request = null): SeoDocument
    {
        $request ??= request();
        $path = self::normalizePath($path);
        $definition = self::definitionForPath($path);

        $canonicalPath = $definition['canonical_path'] ?? $path;
        $canonicalHost = $definition['canonical_host'] ?? 'app';
        $canonical = self::absoluteUrl($canonicalPath, $canonicalHost, $request);

        $title = $definition['title'];
        $description = $definition['description'];
        $indexable = (bool) ($definition['indexable'] ?? false);
        $robots = $indexable ? 'index, follow' : 'noindex, follow';
        $ogType = $definition['og_type'] ?? 'website';
        $ogImagePath = (string) ($definition['og_image'] ?? self::OG_IMAGE_PATH);
        if (str_starts_with($ogImagePath, 'https://')) {
            $ogImage = $ogImagePath;
        } else {
            if ($ogImagePath === '' || ! str_starts_with($ogImagePath, '/')) {
                $ogImagePath = self::OG_IMAGE_PATH;
            }
            $ogImageHost = str_starts_with($ogImagePath, '/images/') ? 'marketing' : 'app';
            $ogImage = self::absoluteUrl($ogImagePath, $ogImageHost, $request);
        }
        $ogLocale = self::ogLocale();
        $ogImageAlt = (string) ($definition['og_image_alt'] ?? self::OG_IMAGE_ALT);

        $hreflang = self::hreflangFor($canonical);

        $jsonLd = self::jsonLdFor(
            $definition['json_ld'] ?? [],
            $title,
            $description,
            $canonical,
            $ogImage,
            $definition['breadcrumbs'] ?? [],
            $request,
            $definition['article_meta'] ?? [],
            $definition['faqs'] ?? [],
        );

        return new SeoDocument(
            page: $definition['page'],
            title: $title,
            description: $description,
            canonical: $canonical,
            robots: $robots,
            ogType: $ogType,
            ogTitle: $definition['og_title'] ?? $title,
            ogDescription: $definition['og_description'] ?? $description,
            ogUrl: $canonical,
            ogImage: $ogImage,
            ogImageWidth: (int) ($definition['og_image_width'] ?? self::OG_IMAGE_WIDTH),
            ogImageHeight: (int) ($definition['og_image_height'] ?? self::OG_IMAGE_HEIGHT),
            ogImageAlt: $ogImageAlt,
            ogLocale: $ogLocale,
            twitterCard: 'summary_large_image',
            twitterTitle: $definition['og_title'] ?? $title,
            twitterDescription: $definition['og_description'] ?? $description,
            twitterImage: $ogImage,
            hreflang: $hreflang,
            jsonLd: $jsonLd,
            indexable: $indexable,
            keywords: (string) ($definition['keywords'] ?? ''),
        );
    }

    /**
     * Public URLs that should appear in sitemap.xml.
     *
     * @return list<array{loc: string, changefreq: string, priority: string}>
     */
    public static function sitemapEntries(?Request $request = null): array
    {
        $request ??= request();
        $entries = [];

        foreach (self::indexableDefinitions() as $definition) {
            if (! ($definition['indexable'] ?? false)) {
                continue;
            }
            $path = $definition['canonical_path'];
            $host = $definition['canonical_host'] ?? 'app';
            $entries[] = [
                'loc' => self::absoluteUrl($path, $host, $request),
                'changefreq' => $definition['changefreq'] ?? 'weekly',
                'priority' => $definition['priority'] ?? '0.6',
            ];
        }

        return $entries;
    }

    public static function robotsTxt(?Request $request = null): string
    {
        $request ??= request();
        $sitemap = self::absoluteUrl('/sitemap.xml', 'marketing', $request);

        $lines = [
            'User-agent: *',
            'Allow: /',
            'Allow: /waiting-list',
            'Allow: /about',
            'Allow: /pricing',
            'Allow: /privacy',
            'Allow: /our-mission',
            'Allow: /donate',
            'Allow: /features',
            'Allow: /guides',
            'Allow: /tools',
            'Allow: /articles',
            'Disallow: /login',
            'Disallow: /register',
            'Disallow: /password',
            'Disallow: /email',
            'Disallow: /auth',
            'Disallow: /dashboard',
            'Disallow: /profile',
            'Disallow: /admin',
            'Disallow: /memorisation',
            'Disallow: /billing',
            'Disallow: /checkout',
            'Disallow: /internal',
            'Disallow: /health',
            'Disallow: /up',
            'Disallow: /madani',
            'Disallow: /indopak',
            'Disallow: /audio',
            'Disallow: /api',
            'Disallow: /settings',
            '',
            'Sitemap: '.$sitemap,
            '',
        ];

        return implode("\n", $lines);
    }

    public static function normalizePath(string $path): string
    {
        $path = '/'.ltrim($path, '/');
        if ($path !== '/') {
            $path = rtrim($path, '/');
        }

        return $path === '//' ? '/' : $path;
    }

    /**
     * @return 'marketing'|'app'
     */
    public static function hostRole(?Request $request = null): string
    {
        $request ??= request();
        $host = MutqinDomains::normalizeHost($request->getHost());

        if (MutqinDomains::isMarketingHost($host)) {
            return 'marketing';
        }

        return 'app';
    }

    public static function absoluteUrl(string $path, string $hostRole, ?Request $request = null): string
    {
        $request ??= request();
        $path = self::normalizePath($path);
        $split = MutqinDomains::hostsDifferForSeo();

        if (! $split) {
            return rtrim((string) config('app.url'), '/').($path === '/' ? '/' : $path);
        }

        if ($hostRole === 'marketing') {
            return MutqinDomains::marketingUrl($path);
        }

        return MutqinDomains::appUrl($path);
    }

    /**
     * @return list<array{hreflang: string, href: string}>
     */
    private static function hreflangFor(string $canonical): array
    {
        // Locale is cookie/query based today. Point hreflang at the canonical URL
        // only; add prefixed alternates when /fr/*, /es/*, … routes exist.
        return [
            ['hreflang' => 'x-default', 'href' => $canonical],
            ['hreflang' => 'en', 'href' => $canonical],
        ];
    }

    private static function ogLocale(): string
    {
        $locale = strtolower((string) app()->getLocale());

        return match ($locale) {
            'en' => 'en_US',
            'ar' => 'ar_AR',
            'fr' => 'fr_FR',
            'es' => 'es_ES',
            'id' => 'id_ID',
            'tr' => 'tr_TR',
            'ur' => 'ur_PK',
            default => 'en_US',
        };
    }

    /**
     * @return array<string, mixed>
     */
    private static function definitionForPath(string $path): array
    {
        foreach (self::indexableDefinitions() as $definition) {
            if (in_array($path, $definition['paths'], true)) {
                return $definition;
            }
        }

        return self::privateDefinition($path);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function indexableDefinitions(): array
    {
        return array_merge(
            self::coreIndexableDefinitions(),
            SeoLaunchPages::catalogDefinitions(),
            SeoArticles::catalogDefinitions(),
            PlaceholderArticles::catalogDefinitions(),
        );
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function coreIndexableDefinitions(): array
    {
        return [
            [
                'page' => 'home',
                'paths' => ['/'],
                'canonical_path' => '/',
                'canonical_host' => 'marketing',
                'indexable' => true,
                'priority' => '1.0',
                'changefreq' => 'weekly',
                'title' => 'Quran Memorization App with AI | Mutqin',
                'description' => 'Mutqin is a Quran memorization app for Hifz. Listen, recite, and review ayahs, with optional AI recitation checks to support practice between lessons.',
                'og_type' => 'website',
                'json_ld' => ['organization', 'website', 'software'],
                'breadcrumbs' => [
                    ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ],
            ],
            [
                'page' => 'waiting-list',
                'paths' => ['/waiting-list'],
                'canonical_path' => '/waiting-list',
                'canonical_host' => 'marketing',
                'indexable' => true,
                'priority' => '0.8',
                'changefreq' => 'weekly',
                'title' => 'Join the Mutqin Waiting List | Quran Memorization App',
                'description' => 'Join the Mutqin waiting list for early access to a calm Quran memorization and Hifz practice app, including optional AI recitation support.',
                'json_ld' => ['organization', 'website'],
                'breadcrumbs' => [
                    ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                    ['name' => 'Waiting list', 'path' => '/waiting-list', 'host' => 'marketing'],
                ],
            ],
            [
                'page' => 'about',
                'paths' => ['/about', '/about-us'],
                'canonical_path' => '/about',
                'canonical_host' => 'app',
                'indexable' => true,
                'priority' => '0.7',
                'changefreq' => 'monthly',
                'title' => 'About Mutqin | Qur’an Memorisation Platform',
                'description' => 'About Mutqin: a warm Qur’an memorisation (hifz) workspace with memorisation techniques, Qur’an revision, and optional recitation feedback between lessons. It does not replace a teacher.',
                'og_image' => 'https://images.pexels.com/photos/30890556/pexels-photo-30890556.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
                'og_image_width' => 1200,
                'og_image_height' => 630,
                'og_image_alt' => 'Someone reading the Qur’an in a calm, well-lit space',
                'json_ld' => ['organization', 'website'],
                'breadcrumbs' => [
                    ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                    ['name' => 'About', 'path' => '/about', 'host' => 'app'],
                ],
            ],
            [
                'page' => 'pricing',
                'paths' => ['/pricing'],
                'canonical_path' => '/pricing',
                'canonical_host' => 'app',
                'indexable' => true,
                'priority' => '0.7',
                'changefreq' => 'weekly',
                'title' => 'Mutqin Pricing | Free and Pro Hifz Plans',
                'description' => 'Start Quran memorization on Mutqin’s Free plan, then upgrade to Pro for more recitation checks, saved sessions, and practice tools when you need them.',
                'json_ld' => ['organization', 'website', 'software'],
                'breadcrumbs' => [
                    ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                    ['name' => 'Pricing', 'path' => '/pricing', 'host' => 'app'],
                ],
            ],
            [
                'page' => 'privacy',
                'paths' => ['/privacy'],
                'canonical_path' => '/privacy',
                'canonical_host' => 'app',
                'indexable' => true,
                'priority' => '0.4',
                'changefreq' => 'yearly',
                'title' => 'Privacy Policy | Mutqin',
                'description' => 'How Mutqin handles account data, microphone audio, and AI recitation checks during Quran memorization practice.',
                'json_ld' => ['organization'],
                'breadcrumbs' => [
                    ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                    ['name' => 'Privacy', 'path' => '/privacy', 'host' => 'app'],
                ],
            ],
            [
                'page' => 'our-mission',
                'paths' => ['/our-mission'],
                'canonical_path' => '/our-mission',
                'canonical_host' => 'app',
                'indexable' => true,
                'priority' => '0.6',
                'changefreq' => 'monthly',
                'title' => 'Our Mission | Mutqin Quran Memorization',
                'description' => 'Mutqin exists to help people begin Hifz, keep going, and return each day, while still learning the Qur’an with a real teacher.',
                'json_ld' => ['organization', 'website'],
                'breadcrumbs' => [
                    ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                    ['name' => 'Our mission', 'path' => '/our-mission', 'host' => 'app'],
                ],
            ],
            [
                'page' => 'articles',
                'paths' => ['/articles'],
                'canonical_path' => '/articles',
                'canonical_host' => 'marketing',
                'indexable' => true,
                'priority' => '0.8',
                'changefreq' => 'weekly',
                'title' => 'Qur\'an Memorisation Articles & Guides | Mutqin',
                'description' => 'Explore practical Qur\'an memorisation guides, Hifz techniques, revision strategies, Mutashabihat advice and resources from Mutqin.',
                'keywords' => 'Quran memorisation, Hifz guides, Qur\'an revision, Mutashabihat, memorisation techniques, Mutqin articles',
                'og_type' => 'website',
                'og_image' => 'https://images.pexels.com/photos/30890556/pexels-photo-30890556.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',
                'og_image_width' => 1200,
                'og_image_height' => 627,
                'og_image_alt' => 'A person reads the Quran inside a mosque',
                'json_ld' => ['organization', 'website', 'collection'],
                'breadcrumbs' => [
                    ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                    ['name' => 'Articles', 'path' => '/articles', 'host' => 'marketing'],
                ],
            ],
            [
                'page' => 'donate',
                'paths' => ['/donate'],
                'canonical_path' => '/donate',
                'canonical_host' => 'app',
                'indexable' => true,
                'priority' => '0.5',
                'changefreq' => 'monthly',
                'title' => 'Help and Support | Mutqin',
                'description' => 'Get help with Mutqin accounts, sessions, and Quran memorization practice, or write to the team with a question.',
                'json_ld' => ['organization'],
                'breadcrumbs' => [
                    ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                    ['name' => 'Support', 'path' => '/donate', 'host' => 'app'],
                ],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function privateDefinition(string $path): array
    {
        $page = match (true) {
            str_starts_with($path, '/dashboard') => 'dashboard',
            str_starts_with($path, '/profile') => 'profile',
            str_starts_with($path, '/admin') => 'admin',
            str_starts_with($path, '/memorisation') => 'memorisation',
            str_starts_with($path, '/login') => 'login',
            str_starts_with($path, '/register') => 'register',
            str_starts_with($path, '/password') => 'password',
            str_starts_with($path, '/email') => 'verification',
            str_starts_with($path, '/billing') => 'billing',
            str_starts_with($path, '/auth') => 'auth',
            default => 'private',
        };

        return [
            'page' => $page,
            'paths' => [$path],
            'canonical_path' => $path,
            'canonical_host' => 'app',
            'indexable' => false,
            'title' => (string) __('ui.app_title'),
            'description' => 'Mutqin helps you memorise and revise the Qur’an. Listen, recite, review and return to each ayah with a calm Hifz practice path.',
            'json_ld' => [],
            'breadcrumbs' => [],
        ];
    }

    /**
     * @param  list<string>  $types
     * @param  list<array{name: string, path: string, host?: string}>  $breadcrumbs
     * @param  array<string, mixed>  $articleMeta
     * @param  list<array{q: string, a: string}>  $faqs
     * @return list<array<string, mixed>>
     */
    private static function jsonLdFor(
        array $types,
        string $title,
        string $description,
        string $canonical,
        string $ogImage,
        array $breadcrumbs,
        Request $request,
        array $articleMeta = [],
        array $faqs = [],
    ): array {
        $blocks = [];
        $marketingHome = self::absoluteUrl('/', 'marketing', $request);
        $logo = self::absoluteUrl(self::LOGO_PATH, 'marketing', $request);

        $organization = [
            '@type' => 'Organization',
            '@id' => $marketingHome.'#organization',
            'name' => 'Mutqin',
            'url' => $marketingHome,
            'logo' => [
                '@type' => 'ImageObject',
                'url' => $logo,
                'width' => 512,
                'height' => 512,
            ],
            'sameAs' => [
                'https://www.instagram.com/mutqinai/',
                'https://www.facebook.com/profile.php?id=61594103506759',
                'https://www.linkedin.com/company/146569969/',
            ],
        ];

        $website = [
            '@type' => 'WebSite',
            '@id' => $marketingHome.'#website',
            'name' => 'Mutqin',
            'url' => $marketingHome,
            'inLanguage' => 'en',
            'publisher' => ['@id' => $marketingHome.'#organization'],
            'description' => 'Quran memorization app for Hifz practice, revision, and optional AI recitation checks.',
        ];

        if (in_array('organization', $types, true)) {
            $blocks[] = $organization;
        }
        if (in_array('website', $types, true)) {
            $blocks[] = $website;
        }
        if (in_array('software', $types, true)) {
            $blocks[] = [
                '@type' => 'SoftwareApplication',
                'name' => 'Mutqin',
                'alternateName' => 'Quran memorization app',
                'applicationCategory' => 'EducationalApplication',
                'operatingSystem' => 'Web',
                'url' => $marketingHome,
                'image' => $ogImage,
                'description' => $description,
                'offers' => [
                    '@type' => 'Offer',
                    'price' => '0',
                    'priceCurrency' => (string) config('billing.currency', 'GBP'),
                ],
            ];
        }
        if (in_array('webapp', $types, true)) {
            $blocks[] = [
                '@type' => 'WebApplication',
                'name' => $title,
                'url' => $canonical,
                'applicationCategory' => 'EducationalApplication',
                'operatingSystem' => 'Web',
                'browserRequirements' => 'Requires JavaScript',
                'description' => $description,
                'image' => $ogImage,
                'offers' => [
                    '@type' => 'Offer',
                    'price' => '0',
                    'priceCurrency' => (string) config('billing.currency', 'GBP'),
                ],
                'isPartOf' => ['@id' => $marketingHome.'#website'],
            ];
        }
        if (in_array('faq', $types, true) && $faqs !== []) {
            $entities = [];
            foreach ($faqs as $faq) {
                $question = trim((string) ($faq['q'] ?? ''));
                $answer = trim((string) ($faq['a'] ?? ''));
                if ($question === '' || $answer === '') {
                    continue;
                }
                $entities[] = [
                    '@type' => 'Question',
                    'name' => $question,
                    'acceptedAnswer' => [
                        '@type' => 'Answer',
                        'text' => $answer,
                    ],
                ];
            }
            if ($entities !== []) {
                $blocks[] = [
                    '@type' => 'FAQPage',
                    'mainEntity' => $entities,
                ];
            }
        }
        if (in_array('article', $types, true)) {
            $headline = (string) ($articleMeta['headline'] ?? $title);
            $authorName = (string) ($articleMeta['author_name'] ?? 'Mutqin');
            $articleImage = (string) ($articleMeta['image'] ?? $ogImage);
            if ($articleImage !== '' && str_starts_with($articleImage, '/')) {
                $articleImage = self::absoluteUrl(
                    $articleImage,
                    str_starts_with($articleImage, '/images/') ? 'marketing' : 'app',
                    $request,
                );
            } else {
                $articleImage = $ogImage;
            }

            $article = [
                '@type' => 'Article',
                'headline' => $headline,
                'description' => $description,
                'mainEntityOfPage' => [
                    '@type' => 'WebPage',
                    '@id' => $canonical,
                ],
                'image' => [$articleImage],
                'author' => [
                    '@type' => 'Organization',
                    'name' => $authorName,
                    '@id' => $marketingHome.'#organization',
                ],
                'publisher' => ['@id' => $marketingHome.'#organization'],
            ];
            if (! empty($articleMeta['datePublished'])) {
                $article['datePublished'] = (string) $articleMeta['datePublished'];
            }
            if (! empty($articleMeta['dateModified'])) {
                $article['dateModified'] = (string) $articleMeta['dateModified'];
            }
            $blocks[] = $article;
        }
        if (in_array('collection', $types, true)) {
            $entries = PlaceholderArticles::all();
            $listItems = [];
            foreach ($entries as $index => $entry) {
                $listItems[] = [
                    '@type' => 'ListItem',
                    'position' => $index + 1,
                    'name' => (string) ($entry['title'] ?? ''),
                    'url' => self::absoluteUrl('/articles/'.(string) ($entry['slug'] ?? $entry['id'] ?? ''), 'marketing', $request),
                    'description' => (string) ($entry['excerpt'] ?? ''),
                    'image' => (string) ($entry['image'] ?? $ogImage),
                ];
            }
            $blocks[] = [
                '@type' => 'CollectionPage',
                '@id' => $canonical.'#collection',
                'name' => $title,
                'description' => $description,
                'url' => $canonical,
                'inLanguage' => 'en',
                'isPartOf' => ['@id' => $marketingHome.'#website'],
                'about' => [
                    '@type' => 'Thing',
                    'name' => 'Qur\'an memorisation and Hifz',
                ],
                'mainEntity' => [
                    '@type' => 'ItemList',
                    'numberOfItems' => count($listItems),
                    'itemListElement' => $listItems,
                ],
            ];
        }
        if (count($breadcrumbs) > 1) {
            $blocks[] = [
                '@type' => 'BreadcrumbList',
                'itemListElement' => array_values(array_map(
                    static function (array $crumb, int $index) use ($request): array {
                        $host = $crumb['host'] ?? 'app';

                        return [
                            '@type' => 'ListItem',
                            'position' => $index + 1,
                            'name' => $crumb['name'],
                            'item' => self::absoluteUrl($crumb['path'], $host, $request),
                        ];
                    },
                    $breadcrumbs,
                    array_keys($breadcrumbs),
                )),
            ];
        }

        return $blocks;
    }
}

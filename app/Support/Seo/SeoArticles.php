<?php

namespace App\Support\Seo;

/**
 * File-based SEO articles under content/seo/articles/*.php.
 * No database or CMS — publish by setting published + indexable on the file.
 */
final class SeoArticles
{
    public const CATEGORIES = [
        'beginners' => 'Beginners',
        'techniques' => 'Techniques',
        'revision' => 'Revision',
        'planning' => 'Planning',
        'practice' => 'Practice',
        'mutashabihat' => 'Similar ayahs',
    ];

    /** @var list<array<string, mixed>>|null */
    private static ?array $cache = null;

    /**
     * @return list<array<string, mixed>>
     */
    public static function all(): array
    {
        if (self::$cache !== null) {
            return self::$cache;
        }

        $dir = self::articlesPath();
        if (! is_dir($dir)) {
            return self::$cache = [];
        }

        $articles = [];
        foreach (glob($dir.'/*.php') ?: [] as $file) {
            $basename = basename($file, '.php');
            if (str_starts_with($basename, '_') || str_starts_with($basename, '.')) {
                continue;
            }
            /** @var mixed $raw */
            $raw = require $file;
            if (! is_array($raw)) {
                continue;
            }
            try {
                $articles[] = self::normalize($raw, $basename);
            } catch (\InvalidArgumentException $exception) {
                report($exception);
            }
        }

        usort($articles, static function (array $a, array $b): int {
            return strcmp($b['published_at'], $a['published_at'])
                ?: strcmp($a['slug'], $b['slug']);
        });

        return self::$cache = $articles;
    }

    /**
     * Reset in-memory cache (tests).
     */
    public static function flush(): void
    {
        self::$cache = null;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function published(): array
    {
        return array_values(array_filter(
            self::all(),
            static fn (array $article): bool => (bool) $article['published'],
        ));
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function indexable(): array
    {
        return array_values(array_filter(
            self::published(),
            static fn (array $article): bool => (bool) $article['indexable'],
        ));
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function forSlug(string $slug): ?array
    {
        $slug = trim($slug, '/');
        foreach (self::published() as $article) {
            if ($article['slug'] === $slug) {
                return $article;
            }
        }

        return null;
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function forPath(string $path): ?array
    {
        $path = SeoCatalog::normalizePath($path);
        if (! str_starts_with($path, '/guides/')) {
            return null;
        }
        $slug = trim(substr($path, strlen('/guides/')), '/');
        if ($slug === '' || str_contains($slug, '/')) {
            return null;
        }

        return self::forSlug($slug);
    }

    /**
     * Public article paths for route registration (published only).
     *
     * @return list<string>
     */
    public static function paths(): array
    {
        return array_map(
            static fn (array $article): string => $article['path'],
            self::published(),
        );
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function catalogDefinitions(): array
    {
        $definitions = [];
        foreach (self::published() as $article) {
            $definitions[] = [
                'page' => 'article-'.$article['slug'],
                'paths' => [$article['path']],
                'canonical_path' => $article['canonical_path'],
                'canonical_host' => 'app',
                'indexable' => (bool) $article['indexable'],
                'priority' => $article['sitemap_priority'],
                'changefreq' => 'monthly',
                'title' => $article['title'],
                'description' => $article['description'],
                'og_type' => 'article',
                'og_image' => $article['featured_image'],
                'og_image_alt' => $article['featured_image_alt'],
                'json_ld' => ['organization', 'article'],
                'breadcrumbs' => $article['breadcrumbs'],
                'article_meta' => [
                    'headline' => $article['h1'],
                    'datePublished' => $article['published_at'],
                    'dateModified' => $article['updated_at'],
                    'author_name' => $article['author'],
                    'image' => $article['featured_image'],
                ],
            ];
        }

        return $definitions;
    }

    /**
     * Page payload for the Vue island + SSR (published articles only).
     *
     * @return array<string, mixed>|null
     */
    public static function pagePayload(string $slug): ?array
    {
        $article = self::forSlug($slug);
        if ($article === null) {
            return null;
        }

        $related = [];
        foreach ($article['related_slugs'] as $relatedSlug) {
            $other = self::forSlug($relatedSlug);
            if ($other === null) {
                // Allow pointing at launch guides by path slug.
                $launch = SeoLaunchPages::forPath('/guides/'.$relatedSlug);
                if ($launch !== null && ($launch['kind'] ?? '') === 'guide') {
                    $related[] = [
                        'href' => $launch['path'],
                        'label' => $launch['h1'],
                        'description' => $launch['description'],
                        'category' => $launch['kicker'],
                    ];
                }
                continue;
            }
            $related[] = [
                'href' => $other['path'],
                'label' => $other['h1'],
                'description' => $other['description'],
                'category' => $other['category_label'],
            ];
        }

        return [
            'id' => 'article-'.$article['slug'],
            'path' => $article['path'],
            'kind' => 'article',
            'kicker' => $article['category_label'],
            'title' => $article['title'],
            'description' => $article['description'],
            'h1' => $article['h1'],
            'lede' => $article['lede'],
            'sections' => $article['sections'],
            'links' => $article['links'],
            'breadcrumbs' => $article['breadcrumbs'],
            'author' => $article['author'],
            'published_at' => $article['published_at'],
            'updated_at' => $article['updated_at'],
            'featured_image' => $article['featured_image'],
            'category' => $article['category'],
            'category_label' => $article['category_label'],
            'related_articles' => $related,
            'related_feature' => $article['related_feature'],
            'related_guides' => $article['related_guides'] ?? [],
            'related_tools' => $article['related_tools'] ?? [],
            'related_features' => $article['related_features'] ?? [],
            'cta_primary' => $article['cta_primary'],
            'cta_secondary' => $article['cta_secondary'],
            'tool' => null,
        ];
    }

    public static function articlesPath(): string
    {
        return base_path('content/seo/articles');
    }

    /**
     * @param  array<string, mixed>  $raw
     * @return array<string, mixed>
     */
    private static function normalize(array $raw, string $fallbackSlug): array
    {
        $slug = self::slug((string) ($raw['slug'] ?? $fallbackSlug));
        if ($slug === '') {
            $slug = $fallbackSlug;
        }

        $reserved = SeoLaunchPages::paths();
        $path = '/guides/'.$slug;
        if (in_array($path, $reserved, true)) {
            throw new \InvalidArgumentException(
                "SEO article slug \"{$slug}\" conflicts with an existing launch page at {$path}."
            );
        }

        $category = (string) ($raw['category'] ?? 'practice');
        if (! array_key_exists($category, self::CATEGORIES)) {
            $category = 'practice';
        }

        $publishedAt = self::dateToken($raw['published_at'] ?? null) ?? '1970-01-01';
        $updatedAt = self::dateToken($raw['updated_at'] ?? null) ?? $publishedAt;
        $image = (string) ($raw['featured_image'] ?? SeoCatalog::OG_IMAGE_PATH);
        if ($image === '' || ! str_starts_with($image, '/')) {
            $image = SeoCatalog::OG_IMAGE_PATH;
        }

        $relatedFeature = is_array($raw['related_feature'] ?? null) ? $raw['related_feature'] : null;
        $featureHref = is_string($relatedFeature['href'] ?? null) ? $relatedFeature['href'] : '/features';
        $featureLabel = is_string($relatedFeature['label'] ?? null)
            ? $relatedFeature['label']
            : 'Explore Mutqin features';

        $ctaPrimary = is_array($raw['cta'] ?? null) ? $raw['cta'] : null;
        $ctaHref = is_string($ctaPrimary['href'] ?? null) ? $ctaPrimary['href'] : $featureHref;
        $ctaLabel = is_string($ctaPrimary['label'] ?? null) ? $ctaPrimary['label'] : $featureLabel;

        $relatedSlugs = [];
        foreach ($raw['related_slugs'] ?? [] as $relatedSlug) {
            if (is_string($relatedSlug) && $relatedSlug !== '') {
                $relatedSlugs[] = self::slug($relatedSlug);
            }
        }

        $links = [];
        foreach ($raw['links'] ?? [] as $link) {
            if (! is_array($link)) {
                continue;
            }
            $href = (string) ($link['href'] ?? '');
            $label = (string) ($link['label'] ?? '');
            if ($href !== '' && $label !== '') {
                $links[] = ['href' => $href, 'label' => $label];
            }
        }
        if ($links === []) {
            $links = [
                ['href' => $featureHref, 'label' => $featureLabel],
                ['href' => '/guides', 'label' => 'All Hifz guides'],
                ['href' => '/tools', 'label' => 'Free Hifz tools'],
            ];
        }

        $relatedTools = self::normalizeLinkList($raw['related_tools'] ?? []);
        $relatedGuides = self::normalizeLinkList($raw['related_guides'] ?? []);
        $relatedFeatures = self::normalizeLinkList($raw['related_features'] ?? []);

        $canonicalPath = SeoCatalog::normalizePath((string) ($raw['canonical_path'] ?? $path));

        return [
            'slug' => $slug,
            'path' => $path,
            'canonical_path' => $canonicalPath,
            'title' => (string) ($raw['title'] ?? 'Mutqin Guide'),
            'description' => (string) ($raw['description'] ?? ''),
            'h1' => (string) ($raw['h1'] ?? $raw['title'] ?? 'Mutqin Guide'),
            'lede' => (string) ($raw['lede'] ?? $raw['description'] ?? ''),
            'author' => (string) ($raw['author'] ?? 'Mutqin'),
            'published_at' => $publishedAt,
            'updated_at' => $updatedAt,
            'featured_image' => $image,
            'featured_image_alt' => (string) ($raw['featured_image_alt'] ?? SeoCatalog::OG_IMAGE_ALT),
            'category' => $category,
            'category_label' => self::CATEGORIES[$category],
            'published' => (bool) ($raw['published'] ?? false),
            'indexable' => (bool) ($raw['indexable'] ?? false),
            'sitemap_priority' => (string) ($raw['sitemap_priority'] ?? '0.7'),
            'sections' => self::normalizeSections($raw['sections'] ?? []),
            'related_slugs' => $relatedSlugs,
            'related_feature' => ['href' => $featureHref, 'label' => $featureLabel],
            'related_tools' => $relatedTools,
            'related_guides' => $relatedGuides,
            'related_features' => $relatedFeatures,
            'cta_primary' => ['href' => $ctaHref, 'label' => $ctaLabel],
            'cta_secondary' => [
                'href' => (string) (($raw['cta_secondary']['href'] ?? null) ?: '/waiting-list'),
                'label' => (string) (($raw['cta_secondary']['label'] ?? null) ?: 'Join the waiting list'),
            ],
            'links' => $links,
            'breadcrumbs' => [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Guides', 'path' => '/guides', 'host' => 'app'],
                ['name' => (string) ($raw['breadcrumb'] ?? self::CATEGORIES[$category]), 'path' => $path, 'host' => 'app'],
            ],
        ];
    }

    /**
     * @param  mixed  $items
     * @return list<array{href: string, label: string}>
     */
    private static function normalizeLinkList(mixed $items): array
    {
        if (! is_array($items)) {
            return [];
        }
        $out = [];
        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }
            $href = (string) ($item['href'] ?? '');
            $label = (string) ($item['label'] ?? '');
            if ($href !== '' && $label !== '') {
                $out[] = ['href' => $href, 'label' => $label];
            }
        }

        return $out;
    }

    /**
     * @param  mixed  $sections
     * @return list<array<string, mixed>>
     */
    private static function normalizeSections(mixed $sections): array
    {
        if (! is_array($sections)) {
            return [];
        }
        $out = [];
        foreach ($sections as $section) {
            if (! is_array($section) || empty($section['h2'])) {
                continue;
            }
            $paragraphs = [];
            foreach ($section['paragraphs'] ?? [] as $paragraph) {
                if (is_string($paragraph) && $paragraph !== '') {
                    $paragraphs[] = $paragraph;
                }
            }
            $subs = [];
            foreach ($section['subs'] ?? [] as $sub) {
                if (! is_array($sub) || empty($sub['h3'])) {
                    continue;
                }
                $subParagraphs = [];
                foreach ($sub['paragraphs'] ?? [] as $paragraph) {
                    if (is_string($paragraph) && $paragraph !== '') {
                        $subParagraphs[] = $paragraph;
                    }
                }
                $subs[] = ['h3' => (string) $sub['h3'], 'paragraphs' => $subParagraphs];
            }
            $out[] = [
                'h2' => (string) $section['h2'],
                'paragraphs' => $paragraphs,
                'subs' => $subs,
            ];
        }

        return $out;
    }

    private static function slug(string $value): string
    {
        $value = strtolower(trim($value));
        $value = preg_replace('/[^a-z0-9\-]+/', '-', $value) ?? '';
        $value = trim($value, '-');

        return $value;
    }

    private static function dateToken(mixed $value): ?string
    {
        if (! is_string($value) || $value === '') {
            return null;
        }
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) {
            return null;
        }

        return $value;
    }
}

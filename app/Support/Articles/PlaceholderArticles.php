<?php

namespace App\Support\Articles;

use App\Support\Seo\SeoCatalog;

final class PlaceholderArticles
{
    public const WORDS_PER_MINUTE = 200;

    /**
     * @return list<array<string, mixed>>
     */
    public static function all(): array
    {
        $path = resource_path('js/data/articles.json');
        if (! is_file($path)) {
            return [];
        }

        $decoded = json_decode((string) file_get_contents($path), true);
        if (! is_array($decoded)) {
            return [];
        }

        $articles = [];
        foreach (array_values($decoded) as $entry) {
            if (! is_array($entry)) {
                continue;
            }
            $articles[] = self::normalize($entry);
        }

        return $articles;
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function forSlug(string $slug): ?array
    {
        $slug = trim($slug, '/');
        foreach (self::all() as $article) {
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
        if (! str_starts_with($path, '/articles/')) {
            return null;
        }
        $slug = trim(substr($path, strlen('/articles/')), '/');
        if ($slug === '' || str_contains($slug, '/')) {
            return null;
        }

        return self::forSlug($slug);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function catalogDefinitions(): array
    {
        $definitions = [];
        foreach (self::all() as $article) {
            $definitions[] = [
                'page' => 'article-'.$article['slug'],
                'paths' => [$article['path']],
                'canonical_path' => $article['path'],
                'canonical_host' => 'marketing',
                'indexable' => true,
                'priority' => '0.7',
                'changefreq' => 'monthly',
                'title' => $article['seoTitle'],
                'description' => $article['seoDescription'],
                'og_type' => 'article',
                'og_image' => $article['og_image'],
                'og_image_width' => 1200,
                'og_image_height' => 627,
                'og_image_alt' => $article['imageAlt'],
                'json_ld' => ['organization', 'website', 'article'],
                'breadcrumbs' => $article['breadcrumbs'],
                'article_meta' => [
                    'headline' => $article['title'],
                    'datePublished' => $article['publishedAt'],
                    'dateModified' => $article['updatedAt'],
                    'author_name' => $article['author'],
                    'image' => $article['og_image'],
                ],
            ];
        }

        return $definitions;
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function pagePayload(string $slug): ?array
    {
        $article = self::forSlug($slug);
        if ($article === null) {
            return null;
        }

        $related = [];
        foreach ($article['relatedSlugs'] as $relatedSlug) {
            $other = self::forSlug($relatedSlug);
            if ($other === null) {
                continue;
            }
            $related[] = [
                'id' => $other['id'],
                'slug' => $other['slug'],
                'href' => $other['path'],
                'title' => $other['title'],
                'excerpt' => $other['excerpt'],
                'category' => $other['category'],
                'publishedAt' => $other['publishedAt'],
                'image' => $other['image'],
                'imageAlt' => $other['imageAlt'],
                'imageCredit' => $other['imageCredit'],
            ];
        }

        return array_merge($article, ['related' => $related]);
    }

    /**
     * @param  array<string, mixed>  $raw
     * @return array<string, mixed>
     */
    private static function normalize(array $raw): array
    {
        $slug = trim((string) ($raw['slug'] ?? $raw['id'] ?? ''));
        $path = '/articles/'.$slug;
        $publishedAt = (string) ($raw['publishedAt'] ?? '');
        $updatedAt = (string) ($raw['updatedAt'] ?? $publishedAt);
        $image = (string) ($raw['image'] ?? '');
        $sections = is_array($raw['sections'] ?? null) ? $raw['sections'] : [];
        $related = [];
        foreach ($raw['relatedSlugs'] ?? [] as $relatedSlug) {
            if (is_string($relatedSlug) && $relatedSlug !== '') {
                $related[] = $relatedSlug;
            }
        }

        $title = (string) ($raw['title'] ?? '');
        $excerpt = (string) ($raw['excerpt'] ?? '');
        $seoTitle = trim((string) ($raw['seoTitle'] ?? ''));
        $seoDescription = trim((string) ($raw['seoDescription'] ?? ''));
        $intro = [];
        foreach ($raw['intro'] ?? [] as $paragraph) {
            if (is_string($paragraph) && $paragraph !== '') {
                $intro[] = $paragraph;
            }
        }
        $introQuote = is_array($raw['introQuote'] ?? null) ? $raw['introQuote'] : null;
        $cta = is_array($raw['cta'] ?? null) ? $raw['cta'] : null;

        $article = [
            'id' => (string) ($raw['id'] ?? $slug),
            'slug' => $slug,
            'path' => $path,
            'title' => $title,
            'excerpt' => $excerpt,
            'seoTitle' => $seoTitle !== '' ? $seoTitle : ($title !== '' ? $title.' | Mutqin' : 'Mutqin'),
            'seoDescription' => $seoDescription !== '' ? $seoDescription : $excerpt,
            'lede' => (string) ($raw['lede'] ?? $excerpt),
            'intro' => $intro,
            'introQuote' => $introQuote,
            'cta' => $cta,
            'category' => (string) ($raw['category'] ?? ''),
            'author' => (string) ($raw['author'] ?? 'Mutqin'),
            'publishedAt' => $publishedAt,
            'updatedAt' => $updatedAt,
            'image' => $image,
            'og_image' => self::ogImageUrl($image),
            'imageAlt' => (string) ($raw['imageAlt'] ?? $title),
            'imageCredit' => (string) ($raw['imageCredit'] ?? ''),
            'imagePhotographerUrl' => (string) ($raw['imagePhotographerUrl'] ?? ''),
            'imagePage' => (string) ($raw['imagePage'] ?? ''),
            'imageSource' => (string) ($raw['imageSource'] ?? ''),
            'sections' => $sections,
            'relatedSlugs' => $related,
            'breadcrumbs' => [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Articles', 'path' => '/articles', 'host' => 'marketing'],
                ['name' => $title !== '' ? $title : 'Article', 'path' => $path, 'host' => 'marketing'],
            ],
        ];
        $article['readingMinutes'] = self::readingMinutes($article);

        return $article;
    }

    /**
     * @param  array<string, mixed>  $article
     */
    public static function readingMinutes(array $article): int
    {
        $parts = [
            (string) ($article['title'] ?? ''),
            (string) ($article['lede'] ?? $article['excerpt'] ?? ''),
        ];
        foreach ($article['intro'] ?? [] as $paragraph) {
            $parts[] = (string) $paragraph;
        }
        self::appendQuoteParts($parts, is_array($article['introQuote'] ?? null) ? $article['introQuote'] : null);
        if (is_array($article['cta'] ?? null)) {
            $parts[] = (string) ($article['cta']['heading'] ?? '');
            $parts[] = (string) ($article['cta']['body'] ?? '');
            $parts[] = (string) ($article['cta']['label'] ?? '');
        }
        foreach ($article['sections'] ?? [] as $section) {
            if (! is_array($section)) {
                continue;
            }
            $parts[] = (string) ($section['h2'] ?? '');
            foreach ($section['paragraphs'] ?? [] as $paragraph) {
                $parts[] = (string) $paragraph;
            }
            foreach ($section['paragraphsAfter'] ?? [] as $paragraph) {
                $parts[] = (string) $paragraph;
            }
            foreach ($section['quotes'] ?? [] as $quote) {
                self::appendQuoteParts($parts, is_array($quote) ? $quote : null);
            }
            foreach ($section['steps'] ?? [] as $step) {
                if (! is_array($step)) {
                    continue;
                }
                $parts[] = (string) ($step['title'] ?? '');
                $parts[] = (string) ($step['body'] ?? '');
            }
            if (is_array($section['sequence'] ?? null)) {
                $parts[] = (string) ($section['sequence']['title'] ?? '');
                $parts[] = (string) ($section['sequence']['intro'] ?? '');
                $parts[] = (string) ($section['sequence']['outro'] ?? '');
                foreach ($section['sequence']['items'] ?? [] as $item) {
                    $parts[] = (string) $item;
                }
            }
            if (is_array($section['comparison'] ?? null)) {
                $parts[] = (string) ($section['comparison']['intro'] ?? '');
                $parts[] = (string) ($section['comparison']['left']['title'] ?? '');
                $parts[] = (string) ($section['comparison']['left']['body'] ?? '');
                $parts[] = (string) ($section['comparison']['right']['title'] ?? '');
                $parts[] = (string) ($section['comparison']['right']['body'] ?? '');
            }
            foreach ($section['routine'] ?? [] as $item) {
                if (! is_array($item)) {
                    continue;
                }
                $parts[] = (string) ($item['title'] ?? '');
                $parts[] = (string) ($item['body'] ?? '');
            }
            foreach ($section['subs'] ?? [] as $sub) {
                if (! is_array($sub)) {
                    continue;
                }
                $parts[] = (string) ($sub['h3'] ?? '');
                foreach ($sub['paragraphs'] ?? [] as $paragraph) {
                    $parts[] = (string) $paragraph;
                }
                foreach ($sub['quotes'] ?? [] as $quote) {
                    self::appendQuoteParts($parts, is_array($quote) ? $quote : null);
                }
            }
        }
        $words = preg_split('/\s+/', trim(implode(' ', $parts))) ?: [];
        $count = count(array_filter($words, static fn (string $word): bool => $word !== ''));

        return max(1, (int) ceil($count / self::WORDS_PER_MINUTE));
    }

    /**
     * @param  list<string>  $parts
     * @param  array<string, mixed>|null  $quote
     */
    private static function appendQuoteParts(array &$parts, ?array $quote): void
    {
        if ($quote === null) {
            return;
        }
        $parts[] = (string) ($quote['arabic'] ?? '');
        $parts[] = (string) ($quote['translation'] ?? '');
        $parts[] = (string) ($quote['reference'] ?? '');
        $parts[] = (string) ($quote['note'] ?? '');
        $parts[] = (string) ($quote['translator'] ?? '');
    }

    private static function ogImageUrl(string $image): string
    {
        if ($image === '') {
            return SeoCatalog::OG_IMAGE_PATH;
        }
        if (str_contains($image, 'h=500&w=800')) {
            return str_replace('h=500&w=800', 'h=627&w=1200', $image);
        }

        return $image;
    }
}

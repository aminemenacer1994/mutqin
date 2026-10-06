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
                'title' => $article['title'].' | Mutqin',
                'description' => $article['excerpt'],
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

        $article = [
            'id' => (string) ($raw['id'] ?? $slug),
            'slug' => $slug,
            'path' => $path,
            'title' => (string) ($raw['title'] ?? ''),
            'excerpt' => (string) ($raw['excerpt'] ?? ''),
            'lede' => (string) ($raw['lede'] ?? $raw['excerpt'] ?? ''),
            'category' => (string) ($raw['category'] ?? ''),
            'author' => (string) ($raw['author'] ?? 'Mutqin'),
            'publishedAt' => $publishedAt,
            'updatedAt' => $updatedAt,
            'image' => $image,
            'og_image' => self::ogImageUrl($image),
            'imageAlt' => (string) ($raw['imageAlt'] ?? $raw['title'] ?? ''),
            'imageCredit' => (string) ($raw['imageCredit'] ?? ''),
            'imagePhotographerUrl' => (string) ($raw['imagePhotographerUrl'] ?? ''),
            'imagePage' => (string) ($raw['imagePage'] ?? ''),
            'imageSource' => (string) ($raw['imageSource'] ?? ''),
            'sections' => $sections,
            'relatedSlugs' => $related,
            'breadcrumbs' => [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Articles', 'path' => '/articles', 'host' => 'marketing'],
                ['name' => (string) ($raw['title'] ?? 'Article'), 'path' => $path, 'host' => 'marketing'],
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
        foreach ($article['sections'] ?? [] as $section) {
            if (! is_array($section)) {
                continue;
            }
            $parts[] = (string) ($section['h2'] ?? '');
            foreach ($section['paragraphs'] ?? [] as $paragraph) {
                $parts[] = (string) $paragraph;
            }
            foreach ($section['subs'] ?? [] as $sub) {
                if (! is_array($sub)) {
                    continue;
                }
                $parts[] = (string) ($sub['h3'] ?? '');
                foreach ($sub['paragraphs'] ?? [] as $paragraph) {
                    $parts[] = (string) $paragraph;
                }
            }
        }
        $words = preg_split('/\s+/', trim(implode(' ', $parts))) ?: [];
        $count = count(array_filter($words, static fn (string $word): bool => $word !== ''));

        return max(1, (int) ceil($count / self::WORDS_PER_MINUTE));
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

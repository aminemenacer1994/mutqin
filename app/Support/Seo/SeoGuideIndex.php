<?php

namespace App\Support\Seo;

/**
 * Unified /guides index: launch guides + file-based articles, with categories.
 */
final class SeoGuideIndex
{
    /**
     * Map launch guide ids to index categories.
     *
     * @var array<string, string>
     */
    private const LAUNCH_CATEGORIES = [
        'guide-beginners' => 'beginners',
        'guide-techniques' => 'techniques',
        'guide-revision' => 'revision',
        'guide-plan' => 'planning',
        'guide-similar' => 'mutashabihat',
    ];

    /**
     * @return array<string, mixed>
     */
    public static function page(?string $category = null): array
    {
        $hub = SeoLaunchPages::forPath('/guides');
        abort_unless($hub !== null, 404);

        $category = is_string($category) ? trim($category) : '';
        if ($category !== '' && ! array_key_exists($category, SeoArticles::CATEGORIES)) {
            $category = '';
        }

        $entries = self::entries();
        if ($category !== '') {
            $entries = array_values(array_filter(
                $entries,
                static fn (array $entry): bool => $entry['category'] === $category,
            ));
        }

        $categories = [];
        foreach (SeoArticles::CATEGORIES as $id => $label) {
            $count = count(array_filter(
                self::entries(),
                static fn (array $entry): bool => $entry['category'] === $id,
            ));
            if ($count < 1) {
                continue;
            }
            $categories[] = [
                'id' => $id,
                'label' => $label,
                'count' => $count,
                'href' => '/guides?category='.urlencode($id),
            ];
        }

        $hub['guide_index'] = [
            'active_category' => $category,
            'categories' => $categories,
            'entries' => $entries,
            'all_href' => '/guides',
        ];

        // Prefer filterable list over the static hub link strip for articles.
        $hub['links'] = array_merge(
            array_map(
                static fn (array $entry): array => [
                    'href' => $entry['href'],
                    'label' => $entry['title'],
                ],
                $entries,
            ),
            [
                ['href' => '/features', 'label' => 'Mutqin features'],
                ['href' => '/tools', 'label' => 'Free Hifz tools'],
            ],
        );

        return $hub;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function entries(): array
    {
        $entries = [];

        foreach (SeoLaunchPages::all() as $page) {
            if (($page['kind'] ?? '') !== 'guide') {
                continue;
            }
            $category = self::LAUNCH_CATEGORIES[$page['id']] ?? 'practice';
            $entries[] = [
                'source' => 'launch',
                'id' => $page['id'],
                'href' => $page['path'],
                'title' => $page['h1'],
                'description' => $page['description'],
                'category' => $category,
                'category_label' => SeoArticles::CATEGORIES[$category] ?? 'Practice',
                'published_at' => null,
                'author' => 'Mutqin',
            ];
        }

        foreach (SeoArticles::indexable() as $article) {
            $entries[] = [
                'source' => 'article',
                'id' => 'article-'.$article['slug'],
                'href' => $article['path'],
                'title' => $article['h1'],
                'description' => $article['description'],
                'category' => $article['category'],
                'category_label' => $article['category_label'],
                'published_at' => $article['published_at'],
                'author' => $article['author'],
            ];
        }

        usort($entries, static function (array $a, array $b): int {
            $aDate = $a['published_at'] ?? '1970-01-01';
            $bDate = $b['published_at'] ?? '1970-01-01';
            // Launch guides without dates stay above undated empties but after dated articles of same day.
            if ($a['source'] !== $b['source'] && ($a['published_at'] === null || $b['published_at'] === null)) {
                if ($a['published_at'] === null && $b['published_at'] !== null) {
                    return 1;
                }
                if ($b['published_at'] === null && $a['published_at'] !== null) {
                    return -1;
                }
            }

            return strcmp($bDate, $aDate) ?: strcmp($a['title'], $b['title']);
        });

        return $entries;
    }
}

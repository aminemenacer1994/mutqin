<?php

/**
 * Template for a new SEO guide article.
 * Copy to `{slug}.php` (do not keep the leading underscore), then edit.
 *
 * @return array<string, mixed>
 */
return [
    'slug' => 'your-article-slug',
    'title' => 'Your Title | Mutqin',
    'description' => 'Unique meta description under ~160 characters. Real Hifz practice copy only.',
    'h1' => 'Your H1 (one clear intent)',
    'lede' => 'Opening paragraph for humans and crawlers.',
    'author' => 'Mutqin',
    'published_at' => '2026-10-05',
    'updated_at' => '2026-10-05',
    'featured_image' => '/images/landing/hero-center.jpg',
    'featured_image_alt' => 'Mutqin Quran memorization app showing a Hifz practice session',
    // beginners | techniques | revision | planning | practice | mutashabihat
    'category' => 'practice',
    // Draft: published false → no public route.
    'published' => false,
    // Preview URL without sitemap: published true + indexable false.
    'indexable' => false,
    'sitemap_priority' => '0.7',
    'breadcrumb' => 'Short crumb label',
    'related_feature' => [
        'href' => '/features/hifz-plan',
        'label' => 'Open the matching Mutqin feature',
    ],
    'cta' => [
        'href' => '/features/hifz-plan',
        'label' => 'Continue in Mutqin',
    ],
    'cta_secondary' => [
        'href' => '/waiting-list',
        'label' => 'Join the waiting list',
    ],
    // Other article slugs and/or launch guide path slugs (e.g. hifz-revision).
    'related_slugs' => [
        'quran-memorization-for-beginners',
    ],
    'links' => [
        ['href' => '/guides', 'label' => 'All guides'],
        ['href' => '/tools', 'label' => 'Free Hifz tools'],
    ],
    'sections' => [
        [
            'h2' => 'First section',
            'paragraphs' => [
                'Paragraph one.',
                'Paragraph two.',
            ],
            'subs' => [
                [
                    'h3' => 'Optional subsection',
                    'paragraphs' => [
                        'Supporting detail.',
                    ],
                ],
            ],
        ],
    ],
];

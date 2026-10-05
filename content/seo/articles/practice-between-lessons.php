<?php

/**
 * Example published SEO article.
 * Copy this file, change the slug/filename, edit fields, set published + indexable.
 *
 * @return array<string, mixed>
 */
return [
    'slug' => 'practice-between-lessons',
    'title' => 'How to Practise Hifz Between Lessons | Mutqin',
    'description' => 'A short Hifz practice routine between teacher lessons: listen, repeat a small range, check recall, and leave a slot for return — without replacing your teacher.',
    'h1' => 'How to practise Hifz between lessons',
    'lede' => 'Class time is for hearing and correction. The hours between lessons are for calm repetition of a range you can finish. Mutqin is built for that gap — not for taking your teacher’s place.',
    'author' => 'Mutqin',
    'published_at' => '2026-10-05',
    'updated_at' => '2026-10-05',
    'featured_image' => '/images/landing/hero-center.jpg',
    'featured_image_alt' => 'Mutqin Quran memorization app showing a Hifz practice session',
    'category' => 'practice',
    'published' => true,
    'indexable' => true,
    'sitemap_priority' => '0.7',
    'breadcrumb' => 'Between lessons',
    'related_feature' => [
        'href' => '/features/hifz-plan',
        'label' => 'Keep the range in a Hifz plan',
    ],
    'cta' => [
        'href' => '/features/hifz-plan',
        'label' => 'Open the Hifz plan feature',
    ],
    'cta_secondary' => [
        'href' => '/waiting-list',
        'label' => 'Join the waiting list',
    ],
    'related_slugs' => [
        'quran-memorization-for-beginners',
        'hifz-revision',
        'quran-memorization-techniques',
    ],
    'related_tools' => [
        ['href' => '/tools/quran-memorization-planner', 'label' => 'Quran memorization planner'],
        ['href' => '/tools/quran-memorization-test', 'label' => 'Quran memorization test'],
    ],
    'links' => [
        ['href' => '/features/hifz-plan', 'label' => 'Hifz plan in Mutqin'],
        ['href' => '/features/quran-revision', 'label' => 'Revision tools'],
        ['href' => '/features/mushaf', 'label' => 'Mushaf and hiding text'],
        ['href' => '/tools/quran-memorization-planner', 'label' => 'Public memorization planner'],
        ['href' => '/guides', 'label' => 'All guides'],
    ],
    'sections' => [
        [
            'h2' => 'Keep the sitting small enough to finish',
            'paragraphs' => [
                'Choose a surah and ayah range you can listen to, repeat, and recite in one sitting. If you leave mid-ayah because the set was too long, the next day starts with avoidance instead of return.',
                'A public pace check can help you see how many new ayahs fit a week — use the [Quran memorization planner](/tools/quran-memorization-planner) as a calendar tool, then let your teacher set the real programme. Beginners can follow the [beginner plan](/guides/quran-memorization-for-beginners).',
            ],
        ],
        [
            'h2' => 'Listen, repeat, then hide the text',
            'paragraphs' => [
                'Hear the ayah while it is still clear, repeat it aloud, then try without looking. Mutqin’s listen-and-repeat flow and [Mushaf text-hiding](/features/mushaf) support that sequence in one workspace. The full order is in [how to memorize the Quran](/guides/quran-memorization-techniques).',
            ],
            'subs' => [
                [
                    'h3' => 'When to run a short recall check',
                    'paragraphs' => [
                        'After the range feels familiar, a quiet quiz (“Check what you kept”) or the public [Quran memorization test](/tools/quran-memorization-test) can show what still needs another pass. Do not start the day with a microphone check if the wording is not yet steady.',
                    ],
                ],
            ],
        ],
        [
            'h2' => 'Leave a slot for return',
            'paragraphs' => [
                'New lesson without revision is how older ayahs slip. Keep a short return slot for recent pages or weak ayahs. Mutqin’s [revision suggestions](/features/quran-revision) are for that return — beside your teacher’s murajaah, not instead of it. See also [how to revise Hifz](/guides/hifz-revision).',
            ],
        ],
        [
            'h2' => 'Where Mutqin fits',
            'paragraphs' => [
                'Save the range, practise between lessons, and open the same place tomorrow. Join the waiting list if you do not have access yet. If a teacher already hears you weekly, treat Mutqin as the notebook and listening desk for the days in between.',
            ],
        ],
    ],
];

<?php

namespace App\Support\Seo;

/**
 * Launch SEO pages: unique intent, copy tied to real Mutqin behaviour.
 */
final class SeoLaunchPages
{
    /**
     * @return list<array<string, mixed>>
     */
    public static function all(): array
    {
        return [
            self::featuresHub(),
            self::aiRecite(),
            self::mutashabihatFeature(),
            self::mushaf(),
            self::hifzPlanFeature(),
            self::revisionFeature(),
            self::progress(),
            self::findAyah(),
            self::guidesHub(),
            self::beginners(),
            self::techniques(),
            self::revisionGuide(),
            self::planGuide(),
            self::similarAyahsGuide(),
            self::toolsHub(),
            self::memorizationPlanner(),
            self::hifzProgressCalculator(),
            self::memorizationTest(),
            self::findAyahTool(),
        ];
    }

    /**
     * @return list<string>
     */
    public static function paths(): array
    {
        return array_column(self::all(), 'path');
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function forPath(string $path): ?array
    {
        $path = SeoCatalog::normalizePath($path);
        foreach (self::all() as $page) {
            if ($page['path'] === $path) {
                return $page;
            }
        }

        return null;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function catalogDefinitions(): array
    {
        $definitions = [];
        foreach (self::all() as $page) {
            $definition = [
                'page' => $page['id'],
                'paths' => [$page['path']],
                'canonical_path' => $page['path'],
                'canonical_host' => 'app',
                'indexable' => true,
                'priority' => $page['sitemap_priority'],
                'changefreq' => $page['changefreq'],
                'title' => $page['title'],
                'description' => $page['description'],
                'og_type' => $page['kind'] === 'guide' ? 'article' : 'website',
                'json_ld' => $page['json_ld'],
                'breadcrumbs' => $page['breadcrumbs'],
            ];
            if (($page['kind'] ?? '') === 'guide') {
                $definition['article_meta'] = [
                    'headline' => $page['h1'],
                    'datePublished' => $page['published_at'] ?? '2026-03-01',
                    'dateModified' => $page['updated_at'] ?? '2026-10-05',
                    'author_name' => $page['author'] ?? 'Mutqin',
                ];
            }
            if (($page['kind'] ?? '') === 'tool' && ! empty($page['faqs'])) {
                $definition['faqs'] = $page['faqs'];
            }
            $definitions[] = $definition;
        }

        return $definitions;
    }

    /**
     * @return array<string, mixed>
     */
    private static function featuresHub(): array
    {
        return self::page(
            id: 'features-hub',
            path: '/features',
            kind: 'hub',
            kicker: 'Features',
            title: 'Hifz Features in Mutqin | Quran Memorization Tools',
            description: 'Explore Mutqin features for Hifz: AI Recite, Mutashābihāt, Mushaf practice, revision, progress, and Find an ayah — built for practice between lessons.',
            h1: 'Mutqin features for Quran memorization',
            lede: 'Each tool below is part of the same workspace. Open a page to see how it supports listening, reciting, and returning — without replacing a teacher.',
            sections: [
                [
                    'h2' => 'Practice and checking',
                    'paragraphs' => [
                        'AI Recite can follow along when you recite from memory. A separate check, “Check what you kept”, uses short questions on the range you just practised.',
                    ],
                ],
                [
                    'h2' => 'Page, similar ayahs, and finding a place',
                    'paragraphs' => [
                        'Mushaf layout keeps a familiar page while you hide text or join ayahs. Mutashābihāt compare similar passages. Find an ayah lets you recite a few words to open the right place.',
                    ],
                ],
                [
                    'h2' => 'Plan, revision, and progress',
                    'paragraphs' => [
                        'A Hifz plan and next-session suggestions sit beside revision of weak ayahs. Progress and strength stay on your dashboard after you practise — those screens are private to your account.',
                    ],
                ],
            ],
            links: [
                ['href' => '/features/ai-recite', 'label' => 'AI Recite'],
                ['href' => '/features/mutashabihat', 'label' => 'Mutashābihāt'],
                ['href' => '/features/mushaf', 'label' => 'Mushaf and hiding text'],
                ['href' => '/features/find-an-ayah', 'label' => 'Find an ayah'],
                ['href' => '/features/hifz-plan', 'label' => 'Hifz plan'],
                ['href' => '/features/quran-revision', 'label' => 'Quran revision'],
                ['href' => '/features/hifz-progress', 'label' => 'Hifz progress'],
                ['href' => '/guides', 'label' => 'Hifz guides'],
                ['href' => '/tools', 'label' => 'Free Hifz tools'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Features', 'path' => '/features', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'website'],
            sitemapPriority: '0.8',
        );
    }

    /**
     * @return array<string, mixed>
     */
    private static function aiRecite(): array
    {
        return self::page(
            id: 'feature-ai-recite',
            path: '/features/ai-recite',
            kind: 'feature',
            kicker: 'AI Recite',
            title: 'AI Quran Recitation Checker | Mutqin',
            description: 'Recite from memory and see which words and ayahs need another return. Mutqin’s AI Recite is a recitation checker for Hifz practice. A separate quiz checks what you kept.',
            h1: 'Check your Hifz with AI Recite',
            lede: 'When you are ready to recite without looking, AI Recite can follow the words you say and show where the recitation drifted. It supports practice between lessons. It does not replace a teacher, and it does not give ijāzah.',
            sections: [
                [
                    'h2' => 'Recite from memory',
                    'paragraphs' => [
                        'You choose a surah and a short ayah range, then practise by listening and repeating. When you start AI Recite, Mutqin uses the microphone to follow along on that range.',
                        'Matched words, weaker spots, and ayahs that still need care are shown so you know where to return. You can recite a single ayah or a session range, depending on how you opened the check.',
                    ],
                ],
                [
                    'h2' => 'Quran recitation checker, not a verdict',
                    'paragraphs' => [
                        'The checker is there so revision has a starting point. A missed word or a similar-ayah drift is a cue to listen again, not a score of your īmān.',
                        'Microphone audio is used only when you run this kind of check. Other tools — listening, Mushaf reading, hiding text — work without it. Privacy details are on the privacy page.',
                    ],
                ],
                [
                    'h2' => 'Quran memorization quiz: check what you kept',
                    'paragraphs' => [
                        'After a set, you can run “Check what you kept”. That is a short quiz on the same range: flashcards, multiple choice, fill-the-blank, or audio-and-choose, with a count of questions you pick before you start.',
                        'Your grades can feed the next review suggestion, including weak ayahs. This quiz is separate from live AI Recite. Use whichever matches the sitting: follow-along recitation, or a quiet recall check. A public [Quran memorization test](/tools/quran-memorization-test) offers the same quiet idea without an account.',
                    ],
                    'subs' => [
                        [
                            'h3' => 'Free and Pro check limits',
                            'paragraphs' => [
                                'The Free plan includes a small number of smart recitation checks. Pro increases that allowance and adds more history and insights. Current limits are on the [pricing](/pricing) page.',
                            ],
                        ],
                    ],
                ],
            ],
            links: [
                ['href' => '/pricing', 'label' => 'Free and Pro limits'],
                ['href' => '/privacy', 'label' => 'How audio is handled'],
                ['href' => '/features/quran-revision', 'label' => 'Revision after a check'],
                ['href' => '/features/mutashabihat', 'label' => 'Similar ayahs'],
                ['href' => '/guides/quran-memorization-techniques', 'label' => 'Memorization techniques'],
                ['href' => '/tools/quran-memorization-test', 'label' => 'Public memorization test'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Features', 'path' => '/features', 'host' => 'app'],
                ['name' => 'AI Recite', 'path' => '/features/ai-recite', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'website', 'software'],
            sitemapPriority: '0.9',
            relatedGuides: [
                ['href' => '/guides/quran-memorization-techniques', 'label' => 'How to memorize the Quran'],
            ],
            relatedTools: [
                ['href' => '/tools/quran-memorization-test', 'label' => 'Quran memorization test'],
            ],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private static function mutashabihatFeature(): array
    {
        return self::page(
            id: 'feature-mutashabihat',
            path: '/features/mutashabihat',
            kind: 'feature',
            kicker: 'Mutashābihāt',
            title: 'Mutashabihat: Similar Quran Ayahs | Mutqin',
            description: 'Compare similar Quran ayahs and practise the words that distinguish them. Mutqin’s Mutashābihāt tools help when two passages are easy to mix during Hifz.',
            h1: 'Practise Mutashabihat and similar ayahs',
            lede: 'Some ayahs share openings or rhythms and are easy to confuse. Mutqin’s Mutashābihāt panel lists similar matches for the ayah you are on, then lets you compare or practise the pair.',
            sections: [
                [
                    'h2' => 'See similar matches',
                    'paragraphs' => [
                        'Open similar ayahs from the workspace. You can search or filter pairs, then open a comparison. Differing words are marked so you can see what actually separates the two passages.',
                    ],
                ],
                [
                    'h2' => 'Compare, then recall',
                    'paragraphs' => [
                        'Practice walks through compare, recall of the distinguishing wording, choosing the correct continuation, and an optional recitation check on one of the ayahs.',
                        'If a live recitation drifts toward a known similar ayah, Mutqin can flag that possibility while still showing word-level feedback on the ayah you meant to recite.',
                    ],
                ],
                [
                    'h2' => 'Use it inside a session',
                    'paragraphs' => [
                        'This is not a separate Islamic encyclopaedia. It is a practice aid when you are already on an ayah that has known look-alikes. For the learning approach, read the [similar-ayahs guide](/guides/similar-ayahs).',
                    ],
                ],
            ],
            links: [
                ['href' => '/guides/similar-ayahs', 'label' => 'How to memorise similar ayahs'],
                ['href' => '/features/ai-recite', 'label' => 'AI Recite'],
                ['href' => '/features/mushaf', 'label' => 'Mushaf practice'],
                ['href' => '/guides/quran-memorization-techniques', 'label' => 'Techniques'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Features', 'path' => '/features', 'host' => 'app'],
                ['name' => 'Mutashābihāt', 'path' => '/features/mutashabihat', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'website'],
            sitemapPriority: '0.85',
            relatedGuides: [
                ['href' => '/guides/similar-ayahs', 'label' => 'How to memorize similar Quran ayahs'],
                ['href' => '/guides/quran-memorization-techniques', 'label' => 'How to memorize the Quran'],
            ],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private static function mushaf(): array
    {
        return self::page(
            id: 'feature-mushaf',
            path: '/features/mushaf',
            kind: 'feature',
            kicker: 'Mushaf',
            title: 'Mushaf Memorization and Hidden Text | Mutqin',
            description: 'Practise Hifz on a Mushaf page and gradually hide the text as recall improves. Mutqin supports Madani and Indopak layouts, stacked ayahs, and peek when you need a hint.',
            h1: 'Mushaf memorization, including hiding the text',
            lede: 'Many learners remember a page, not a scrolling list. Mutqin can show a familiar Mushaf page for the ayahs in your session, then apply the same listen–repeat–recite path around that view.',
            sections: [
                [
                    'h2' => 'Page layout for a session',
                    'paragraphs' => [
                        'Madani pages and Indopak pages are available in the workspace. If a page view does not load, you can switch to stacked ayahs and keep practising.',
                        'The Mushaf is for the session you opened — not a separate app. Aids such as translation, transliteration, tajweed colour, and tafsīr can sit nearby without forcing you off the ayah.',
                    ],
                ],
                [
                    'h2' => 'Progressive hiding (gradually hide the text)',
                    'paragraphs' => [
                        'One memorisation technique fades more of the wording after successful repeats, so you recall instead of reading. You can peek: hold Space or long-press when you need a hint, then hide again.',
                        'Hiding works together with “one ayah at a time” (other ayahs dim) and with joining ayahs when you are ready to move as a passage. None of these replace reciting to a teacher. The [how to memorize](/guides/quran-memorization-techniques) guide covers listen, hide, and join in order.',
                    ],
                ],
                [
                    'h2' => 'What this is not',
                    'paragraphs' => [
                        'Mutqin does not claim a print-mushaf ijāzah layout for every edition in the world. It offers practice layouts that stay with your chosen range and recitation checks.',
                    ],
                ],
            ],
            links: [
                ['href' => '/guides/quran-memorization-techniques', 'label' => 'Listen, hide, join ayahs'],
                ['href' => '/features/ai-recite', 'label' => 'Recite from memory'],
                ['href' => '/features/mutashabihat', 'label' => 'Similar ayahs'],
                ['href' => '/', 'label' => 'How Mutqin works'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Features', 'path' => '/features', 'host' => 'app'],
                ['name' => 'Mushaf', 'path' => '/features/mushaf', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'website'],
            sitemapPriority: '0.8',
            relatedGuides: [
                ['href' => '/guides/quran-memorization-techniques', 'label' => 'How to memorize the Quran'],
            ],
            relatedFeatures: [
                ['href' => '/features/ai-recite', 'label' => 'AI Recite'],
                ['href' => '/features/mutashabihat', 'label' => 'Mutashābihāt'],
            ],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private static function hifzPlanFeature(): array
    {
        return self::page(
            id: 'feature-hifz-plan',
            path: '/features/hifz-plan',
            kind: 'feature',
            kicker: 'Hifz plan',
            title: 'Quran Memorization Plan | Mutqin Hifz Planner',
            description: 'Keep a Quran memorization plan in Mutqin: choose a range, practise, then take a recommended next return. The plan sits beside your teacher’s programme, not instead of it.',
            h1: 'A Hifz plan you can open again tomorrow',
            lede: 'A plan in Mutqin is the range you are working, how you practised it, and a sensible next step — not a promise that you will finish the Qur’an on a fixed calendar.',
            sections: [
                [
                    'h2' => 'Set a range you can finish',
                    'paragraphs' => [
                        'Session setup asks for a surah, ayah range, and repetitions. A short set is easier to listen to, recite, and return to. You can save the session and resume the same place later.',
                    ],
                ],
                [
                    'h2' => 'What Mutqin suggests next',
                    'paragraphs' => [
                        'After a sitting, Mutqin can recommend what to open next: the same range, weak ayahs from a check, or a continuation while the wording is still close. Adaptive lesson plans and extra history are part of Pro; the Free plan still lets you set a range and practise.',
                    ],
                ],
                [
                    'h2' => 'Still your teacher’s Hifz',
                    'paragraphs' => [
                        'If you are in a ḥalaqah, the Mutqin plan is for the hours between lessons. It does not assign a new teacher, and it does not mark a khatm complete for you. For portion sizing in words, see [how to make a Hifz plan](/guides/hifz-plan); for a calendar pace check, use the [memorization planner](/tools/quran-memorization-planner).',
                    ],
                ],
            ],
            links: [
                ['href' => '/guides/hifz-plan', 'label' => 'How to choose a portion size'],
                ['href' => '/features/quran-revision', 'label' => 'Revision in the same workspace'],
                ['href' => '/pricing', 'label' => 'Free and Pro'],
                ['href' => '/guides/quran-memorization-for-beginners', 'label' => 'Starting Hifz'],
                ['href' => '/tools/quran-memorization-planner', 'label' => 'Public memorization planner'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Features', 'path' => '/features', 'host' => 'app'],
                ['name' => 'Hifz plan', 'path' => '/features/hifz-plan', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'website'],
            sitemapPriority: '0.85',
            relatedGuides: [
                ['href' => '/guides/hifz-plan', 'label' => 'How to make a Hifz plan'],
                ['href' => '/guides/quran-memorization-for-beginners', 'label' => 'Beginner plan'],
            ],
            relatedTools: [
                ['href' => '/tools/quran-memorization-planner', 'label' => 'Quran memorization planner'],
            ],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private static function revisionFeature(): array
    {
        return self::page(
            id: 'feature-revision',
            path: '/features/quran-revision',
            kind: 'feature',
            kicker: 'Revision',
            title: 'Quran and Hifz Revision | Mutqin',
            description: 'Keep Hifz revision in the same workspace as new memorisation. Mutqin surfaces weaker ayahs and a next return so murajaah stays on the path.',
            h1: 'Quran revision that stays beside new lesson',
            lede: 'Memorisation slips when return has no place in the week. Mutqin keeps murajaah in the same workspace: saved completed ranges, weak ayahs from checks, and a dashboard list of what could use a refresh.',
            sections: [
                [
                    'h2' => 'New lesson and return',
                    'paragraphs' => [
                        'You can revise a full saved range, practise only the weak ayahs from a session, or follow a “revision due” prompt when the workspace knows you have something waiting.',
                    ],
                ],
                [
                    'h2' => 'Weak ayahs',
                    'paragraphs' => [
                        'AI Recite and the recall quiz can both mark ayahs that still need care. Those ayahs can become the next short sitting instead of guessing what you forgot.',
                    ],
                ],
                [
                    'h2' => 'Spaced return, not a secret formula',
                    'paragraphs' => [
                        'Mutqin can recommend when to come back after a session. That is a practice prompt. Your teacher may still set the official murajaah. Read [how to revise Hifz](/guides/hifz-revision) if you want a simple weekly rhythm in words, or estimate kept pages with the [Hifz progress calculator](/tools/hifz-progress-calculator).',
                    ],
                ],
            ],
            links: [
                ['href' => '/guides/hifz-revision', 'label' => 'How to revise Hifz'],
                ['href' => '/features/hifz-progress', 'label' => 'Progress and strength'],
                ['href' => '/features/ai-recite', 'label' => 'Checks that feed revision'],
                ['href' => '/features/hifz-plan', 'label' => 'Hifz plan'],
                ['href' => '/tools/hifz-progress-calculator', 'label' => 'Progress calculator'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Features', 'path' => '/features', 'host' => 'app'],
                ['name' => 'Revision', 'path' => '/features/quran-revision', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'website'],
            sitemapPriority: '0.85',
            relatedGuides: [
                ['href' => '/guides/hifz-revision', 'label' => 'How to revise and retain Hifz'],
            ],
            relatedTools: [
                ['href' => '/tools/hifz-progress-calculator', 'label' => 'Hifz progress calculator'],
                ['href' => '/tools/quran-memorization-test', 'label' => 'Quran memorization test'],
            ],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private static function progress(): array
    {
        return self::page(
            id: 'feature-progress',
            path: '/features/hifz-progress',
            kind: 'feature',
            kicker: 'Progress',
            title: 'Hifz Progress and Strength | Mutqin',
            description: 'See Hifz progress from sessions and recitation checks: memorised ayahs, streaks, weak ayahs, and what to open next. Your dashboard stays private to your account.',
            h1: 'Hifz progress and strength tracking',
            lede: 'Mutqin’s dashboard shows a picture of your practice: ayahs marked memorised, a practice streak, coverage of what you have opened, and murajaah that still needs a look. Those pages are signed-in and not indexed for search.',
            sections: [
                [
                    'h2' => 'What you can see',
                    'paragraphs' => [
                        'After sessions, you can open Progress for memorised counts, recent activity, and ayahs that need review. Strength here means how a check or quiz described that sitting — strong, mixed, or still fragile — not a public ranking.',
                    ],
                ],
                [
                    'h2' => 'Insights stay behind sign-in',
                    'paragraphs' => [
                        'Deeper insights can stay tucked away until you ask for them. Pro adds more history and review of past mistakes. Guests do not get a public progress URL; search engines should not index /dashboard.',
                    ],
                ],
                [
                    'h2' => 'Use it to choose the next sitting',
                    'paragraphs' => [
                        'Progress is useful when it answers “what do I open?”. Combine it with [revision](/features/quran-revision) and the [Hifz plan](/features/hifz-plan) rather than collecting numbers for their own sake. Guests can still estimate a share with the public [Hifz progress calculator](/tools/hifz-progress-calculator).',
                    ],
                ],
            ],
            links: [
                ['href' => '/features/quran-revision', 'label' => 'Revision tools'],
                ['href' => '/features/hifz-plan', 'label' => 'Hifz plan'],
                ['href' => '/pricing', 'label' => 'What Pro adds'],
                ['href' => '/guides/hifz-revision', 'label' => 'Why return matters'],
                ['href' => '/tools/hifz-progress-calculator', 'label' => 'Progress calculator'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Features', 'path' => '/features', 'host' => 'app'],
                ['name' => 'Progress', 'path' => '/features/hifz-progress', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'website'],
            sitemapPriority: '0.75',
            relatedGuides: [
                ['href' => '/guides/hifz-revision', 'label' => 'How to revise Hifz'],
            ],
            relatedTools: [
                ['href' => '/tools/hifz-progress-calculator', 'label' => 'Hifz progress calculator'],
            ],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private static function findAyah(): array
    {
        return self::page(
            id: 'feature-find-ayah',
            path: '/features/find-an-ayah',
            kind: 'feature',
            kicker: 'Find an ayah',
            title: 'Find an Ayah by Reciting | Mutqin',
            description: 'Recite a few words and Mutqin finds the ayah so you can open it, a range, or a reading aid. Built for Hifz practice in the workspace.',
            h1: 'Find an ayah by reciting a few words',
            lede: 'When you remember the sound of a line but not the surah number, Find an ayah listens for the start of a verse, shows likely matches, then lets you open that ayah or a range around it.',
            sections: [
                [
                    'h2' => 'How matching works',
                    'paragraphs' => [
                        'You recite a short run of words. Mutqin looks for an ayah that fits what it heard. If several ayahs are close, you pick from a list. You can then play the ayah audio, open a translation or transliteration, or set an end ayah and open that span.',
                    ],
                ],
                [
                    'h2' => 'Inside the workspace',
                    'paragraphs' => [
                        'Voice Find an ayah lives in memorisation, next to AI Recite. A typed Arabic version is on the public [Find an ayah tool](/tools/find-an-ayah), without a microphone. Voice use in the workspace follows the same microphone consent idea as other listening features.',
                    ],
                ],
            ],
            links: [
                ['href' => '/privacy', 'label' => 'Microphone and privacy'],
                ['href' => '/features/ai-recite', 'label' => 'AI Recite'],
                ['href' => '/features/mushaf', 'label' => 'Open it on a Mushaf page'],
                ['href' => '/waiting-list', 'label' => 'Waiting list'],
                ['href' => '/tools/find-an-ayah', 'label' => 'Type to find an ayah'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Features', 'path' => '/features', 'host' => 'app'],
                ['name' => 'Find an ayah', 'path' => '/features/find-an-ayah', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'website'],
            sitemapPriority: '0.75',
            relatedTools: [
                ['href' => '/tools/find-an-ayah', 'label' => 'Find an ayah by typing Arabic'],
            ],
            relatedFeatures: [
                ['href' => '/features/ai-recite', 'label' => 'AI Recite'],
                ['href' => '/features/mushaf', 'label' => 'Mushaf practice'],
            ],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private static function guidesHub(): array
    {
        return self::page(
            id: 'guides-hub',
            path: '/guides',
            kind: 'hub',
            kicker: 'Guides',
            title: 'Hifz Guides | How to Memorize and Revise Quran',
            description: 'Short Hifz guides for Quran students: how to start, techniques, a memorization plan, revision, and similar ayahs. Written for practice, not generic Islamic filler.',
            h1: 'Hifz guides for Quran memorization',
            lede: 'These notes are for students who already intend to memorise with a teacher. They describe a calm path: short ranges, listening, reciting, and return. Mutqin is one workspace that can hold that path.',
            sections: [
                [
                    'h2' => 'Start and technique',
                    'paragraphs' => [
                        'Begin with a portion you can finish. Then use listen-and-repeat, hiding text, and joining ayahs only when the current ayah is steady.',
                    ],
                ],
                [
                    'h2' => 'Plan, revision, similar ayahs',
                    'paragraphs' => [
                        'A plan is a portion size plus a return slot. Revision is how you stop dropping what you already carried. Similar ayahs need comparison, not more speed.',
                    ],
                ],
            ],
            links: [
                ['href' => '/guides/quran-memorization-techniques', 'label' => 'How to memorize the Quran'],
                ['href' => '/guides/quran-memorization-for-beginners', 'label' => 'Plan for beginners'],
                ['href' => '/guides/hifz-revision', 'label' => 'How to revise and retain Hifz'],
                ['href' => '/guides/hifz-plan', 'label' => 'How to make a Hifz plan'],
                ['href' => '/guides/similar-ayahs', 'label' => 'Mutashabihat and similar ayahs'],
                ['href' => '/guides/practice-between-lessons', 'label' => 'Practice between lessons'],
                ['href' => '/features', 'label' => 'Mutqin features'],
                ['href' => '/tools', 'label' => 'Free Hifz tools'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Guides', 'path' => '/guides', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'website'],
            sitemapPriority: '0.8',
        );
    }

    /**
     * @return array<string, mixed>
     */
    private static function beginners(): array
    {
        return self::page(
            id: 'guide-beginners',
            path: '/guides/quran-memorization-for-beginners',
            kind: 'guide',
            kicker: 'Beginners',
            title: 'Quran Memorization Plan for Beginners | How to Start Hifz',
            description: 'A simple Quran memorization plan for beginners: choose a short first range, listen and repeat, revise yesterday, and grow only when the set is steady. Built for students who still have a teacher.',
            h1: 'Quran memorization plan for beginners',
            lede: 'Starting Hifz is less about a grand target and more about a plan you can finish this week. Pick a small range, practise it between lessons, and leave a slot to return tomorrow. A teacher still hears you; an app only holds the sitting in between.',
            sections: [
                [
                    'h2' => 'What a beginner plan actually is',
                    'paragraphs' => [
                        'A beginner plan is three decisions: which ayahs you open today, how you practise them, and when you will see them again. It is not a poster of thirty Juz. If the plan only lists “new lesson” and never names a return, forgetting is already built in.',
                        'Your teacher’s programme stays the authority. This page is for the hours between classes — the same spirit as Mutqin’s own Hifz workspace.',
                    ],
                ],
                [
                    'h2' => 'Choose a first range you can finish',
                    'paragraphs' => [
                        'Pick a surah you already hear often, or a few ayahs of the passage you are learning in class. The test is simple: can you listen, repeat, and recite that set in one sitting without rushing the last ayah?',
                        'If you leave mid-ayah because the set was too long, cut it. Length can grow later; an unfinished pile rarely does. For a rough pace check (not a teacher’s syllabus), the free [Quran memorization planner](/tools/quran-memorization-planner) can show how many new ayahs fit a week.',
                    ],
                    'subs' => [
                        [
                            'h3' => 'A concrete first-week shape',
                            'paragraphs' => [
                                'Day 1–2: one short range only — listen and repeat until you can recite it looking less. Day 3: same range from memory, then a quiet recall check. Day 4–5: add at most a few new ayahs if yesterday is still clean; otherwise stay. Day 6–7: return to the week’s ayahs before adding more. Adjust the days to your class schedule; keep the idea of return.',
                            ],
                        ],
                    ],
                ],
                [
                    'h2' => 'Listen, repeat, then hide',
                    'paragraphs' => [
                        'Hear the ayah from a reciter, repeat it while the sound is still close, then try without looking. Mutqin’s listen-and-repeat mode plays a section and waits for your turn. Gradually hiding the text is for when your eyes are still doing the work.',
                        'When one ayah is steady, join it to the next. If joining creates new mistakes, drop back to one ayah. The [how to memorize the Quran](/guides/quran-memorization-techniques) guide walks through that order in more detail.',
                    ],
                ],
                [
                    'h2' => 'Put revision in the plan from day one',
                    'paragraphs' => [
                        'Even a beginner plan needs a return slot. Open yesterday’s range before you chase a new page. Weak spots after a check are better than racing ahead. See [how to revise Hifz](/guides/hifz-revision) for a simple weekly rhythm once you have more than one set — or [how to practise between lessons](/guides/practice-between-lessons) for a short routine.',
                    ],
                ],
                [
                    'h2' => 'When to test recall',
                    'paragraphs' => [
                        'A short “check what you kept” quiz or the public [Quran memorization test](/tools/quran-memorization-test) is useful after the range feels familiar — not as the first action of the day. If the check is messy, shorten the range rather than pushing on. Live microphone checking ([AI Recite](/features/ai-recite)) can wait until you already know the wording.',
                    ],
                ],
                [
                    'h2' => 'Where Mutqin fits between lessons',
                    'paragraphs' => [
                        'Save the set, open the same place tomorrow, and take a suggested next return when you are ready. That is the [Hifz plan feature](/features/hifz-plan) — a workspace beside your teacher, not a replacement. Join the waiting list if you do not have access yet, or open memorisation if you already do.',
                    ],
                ],
            ],
            links: [
                ['href' => '/guides/hifz-plan', 'label' => 'How to make a fuller Hifz plan'],
                ['href' => '/guides/quran-memorization-techniques', 'label' => 'How to memorize: techniques'],
                ['href' => '/guides/hifz-revision', 'label' => 'How to revise'],
                ['href' => '/guides/practice-between-lessons', 'label' => 'Practice between lessons'],
                ['href' => '/tools/quran-memorization-planner', 'label' => 'Public memorization planner'],
                ['href' => '/features/hifz-plan', 'label' => 'Hifz plan in Mutqin'],
                ['href' => '/about', 'label' => 'What Mutqin is (and is not)'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Guides', 'path' => '/guides', 'host' => 'app'],
                ['name' => 'Beginners', 'path' => '/guides/quran-memorization-for-beginners', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'article'],
            sitemapPriority: '0.9',
            relatedFeature: ['href' => '/features/hifz-plan', 'label' => 'Keep your first range in a Hifz plan'],
            ctaPrimary: ['href' => '/features/hifz-plan', 'label' => 'See the Hifz plan feature'],
            publishedAt: '2026-03-01',
            updatedAt: '2026-10-05',
            relatedGuides: [
                ['href' => '/guides/quran-memorization-techniques', 'label' => 'How to memorize the Quran'],
                ['href' => '/guides/hifz-plan', 'label' => 'How to make a Hifz plan'],
                ['href' => '/guides/practice-between-lessons', 'label' => 'How to practise between lessons'],
            ],
            relatedTools: [
                ['href' => '/tools/quran-memorization-planner', 'label' => 'Quran memorization planner'],
                ['href' => '/tools/quran-memorization-test', 'label' => 'Quran memorization test'],
            ],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private static function techniques(): array
    {
        return self::page(
            id: 'guide-techniques',
            path: '/guides/quran-memorization-techniques',
            kind: 'guide',
            kicker: 'Techniques',
            title: 'How to Memorize the Quran | Hifz Techniques That Hold',
            description: 'How to memorize the Quran with practical Hifz techniques: listen and repeat, one ayah at a time, hide the text, join ayahs, handle similar ayahs, then revise. For practice between lessons with a teacher.',
            h1: 'How to memorize the Quran: techniques that hold',
            lede: 'Memorising the Qur’an is a repeatable sitting, not a single heroic day. Hear a short range, say it, hide it, join it, check what stayed, then return tomorrow. These Quran memorization techniques are the order of that sitting — the same order Mutqin names in the workspace.',
            sections: [
                [
                    'h2' => 'Start with a range you can finish today',
                    'paragraphs' => [
                        'Before technique, choose size. If the last ayah of the set is always rushed or unread, the set is too long. Cut ayahs until you can listen, repeat, and recite without abandoning the end. Beginners can follow a first-week shape on the [beginners plan](/guides/quran-memorization-for-beginners); for a calendar pace check, use the [Quran memorization planner](/tools/quran-memorization-planner). This page is about what you do inside the sitting.',
                    ],
                ],
                [
                    'h2' => 'Listen and repeat',
                    'paragraphs' => [
                        'Play a short section, pause, and recite it back before the next piece starts. Mutqin calls this listen and repeat (talqin in the session settings). It is the same idea as hearing a teacher, then echoing, when you are alone with a recording.',
                        'Do not stack three new ayahs in the ear before you have produced the first one aloud. The mouth needs a turn while the sound is still close.',
                    ],
                ],
                [
                    'h2' => 'One ayah at a time',
                    'paragraphs' => [
                        'Keep the active ayah clear and dim the rest so your eyes do not jump ahead. Move on only when this ayah can be recited without leaning on the neighbours for the next word.',
                    ],
                    'subs' => [
                        [
                            'h3' => 'Example sitting (short range)',
                            'paragraphs' => [
                                'Open ayah 1 only. Listen once or twice, repeat until you can say it with little looking. Hide more of the line. When ayah 1 is steady, open ayah 2 the same way. Only then recite 1→2 together. If the join breaks, separate them again.',
                            ],
                        ],
                    ],
                ],
                [
                    'h2' => 'Gradually hide the text',
                    'paragraphs' => [
                        'After successful repeats, more of the wording can disappear so you recall instead of read. Peek when you must, then hide again. This is Mutqin’s “gradually hide the text” technique, including on [Mushaf layout with progressive hiding](/features/mushaf), so the page still feels like a familiar print while the eyes do less of the work.',
                    ],
                ],
                [
                    'h2' => 'Join ayahs when one ayah is steady',
                    'paragraphs' => [
                        'Pair neighbouring ayahs, or grow a passage a step at a time, so transitions do not break. Joining too early trains a stumble at the seam. If joining creates new mistakes, drop back to one ayah.',
                    ],
                    'subs' => [
                        [
                            'h3' => 'Word hooks',
                            'paragraphs' => [
                                'Key words can stay visible as anchors while the rest is recalled. Use them as hooks into the ayah you already know — not as a new list of words to memorise in isolation.',
                            ],
                        ],
                    ],
                ],
                [
                    'h2' => 'Similar ayahs need their own step',
                    'paragraphs' => [
                        'When two ayahs share an opening or rhythm, speed alone usually makes the mix-up worse. Compare the distinguishing words, then practise the pair on purpose. The [mutashābihāt guide](/guides/similar-ayahs) covers that fork in detail; Mutqin’s [Mutashābihāt tools](/features/mutashabihat) follow compare → recall → recite.',
                    ],
                ],
                [
                    'h2' => 'Check recall, then leave a return',
                    'paragraphs' => [
                        'After the range feels familiar, recite from memory, run a short [memorization test](/tools/quran-memorization-test), or use [AI Recite](/features/ai-recite) when you want the microphone to follow along. Revision tomorrow is part of the technique, not an optional extra — see [how to revise Hifz](/guides/hifz-revision) for a simple weekly rhythm.',
                        'When you want the same order saved for tomorrow, keep the range in Mutqin’s workspace. The app is for [practice between lessons](/guides/practice-between-lessons); it does not replace a teacher or grant ijāzah.',
                    ],
                ],
            ],
            links: [
                ['href' => '/guides/quran-memorization-for-beginners', 'label' => 'Beginner plan'],
                ['href' => '/guides/similar-ayahs', 'label' => 'Similar ayahs (mutashābihāt)'],
                ['href' => '/guides/hifz-revision', 'label' => 'How to revise'],
                ['href' => '/guides/practice-between-lessons', 'label' => 'Practice between lessons'],
                ['href' => '/features/mushaf', 'label' => 'Hiding text on a Mushaf page'],
                ['href' => '/features/ai-recite', 'label' => 'Recitation check and quiz'],
                ['href' => '/tools/quran-memorization-planner', 'label' => 'Memorization planner'],
                ['href' => '/tools/quran-memorization-test', 'label' => 'Public memorization test'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Guides', 'path' => '/guides', 'host' => 'app'],
                ['name' => 'Techniques', 'path' => '/guides/quran-memorization-techniques', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'article'],
            sitemapPriority: '0.9',
            relatedFeature: ['href' => '/features/mushaf', 'label' => 'Practise hide-and-recite on a Mushaf page'],
            ctaPrimary: ['href' => '/features/mushaf', 'label' => 'See Mushaf practice in Mutqin'],
            publishedAt: '2026-03-01',
            updatedAt: '2026-10-05',
            relatedGuides: [
                ['href' => '/guides/similar-ayahs', 'label' => 'How to memorize similar ayahs'],
                ['href' => '/guides/hifz-revision', 'label' => 'How to revise and retain Hifz'],
                ['href' => '/guides/practice-between-lessons', 'label' => 'Practice between lessons'],
            ],
            relatedTools: [
                ['href' => '/tools/quran-memorization-planner', 'label' => 'Quran memorization planner'],
                ['href' => '/tools/quran-memorization-test', 'label' => 'Quran memorization test'],
            ],
            relatedFeatures: [
                ['href' => '/features/mushaf', 'label' => 'Mushaf and progressive hiding'],
                ['href' => '/features/mutashabihat', 'label' => 'Mutashābihāt practice'],
            ],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private static function revisionGuide(): array
    {
        return self::page(
            id: 'guide-revision',
            path: '/guides/hifz-revision',
            kind: 'guide',
            kicker: 'Revision',
            title: 'How to Revise the Quran and Retain Your Hifz | Mutqin',
            description: 'How to revise the Quran and retain your Hifz: recent lessons, older passages, and weak ayahs. A simple murajaah rhythm for students who still learn with a teacher.',
            h1: 'How to revise the Quran and retain your Hifz',
            lede: 'Forgetting is normal when there is no return. Retaining Hifz is not a second hobby; it is the same ayahs, opened again before they fade. Keep new lesson if your teacher assigned it — but give yesterday’s range a short slot first.',
            sections: [
                [
                    'h2' => 'Why memorised ayahs slip',
                    'paragraphs' => [
                        'A range you recited well once still needs another look while the sound is close, then later looks when it is no longer daily. If every sitting is only new lesson, the older pages have no owner. That is not a moral failure; it is a missing return.',
                    ],
                ],
                [
                    'h2' => 'Three buckets that keep a week honest',
                    'paragraphs' => [
                        'You do not need a complex calendar to start. You need three buckets to exist in the same week: what you took recently, a slightly older completed set, and any ayahs a check marked weak.',
                    ],
                    'subs' => [
                        [
                            'h3' => 'A simple weekly rhythm',
                            'paragraphs' => [
                                'Example only — fit it to your class: most days, open yesterday (or this week’s new lesson) before adding anything new. Two or three times a week, open an older completed set for a short murajaah pass. Whenever a check marks weak ayahs, those jump the queue on a short day. Your teacher may set different portions; keep the idea of recent + older + weak.',
                            ],
                        ],
                    ],
                ],
                [
                    'h2' => 'Weak ayahs first when time is short',
                    'paragraphs' => [
                        'If you only have a few minutes, open the weak ayahs from the last check instead of racing a full Juz. A quiet recall quiz or [AI Recite](/features/ai-recite) can surface those spots after you have already practised the range. Mutqin can list weak ayahs after a check so the next sitting has a starting point. For a quick map of how far you have kept, try the free [Hifz progress calculator](/tools/hifz-progress-calculator).',
                    ],
                ],
                [
                    'h2' => 'New lesson and revision in the same plan',
                    'paragraphs' => [
                        'Retention fails when the plan is only “new.” Leave a return slot when you size the week — the [memorization plan guide](/guides/hifz-plan) and the [beginners plan](/guides/quran-memorization-for-beginners) both treat return as part of the plan, not an afterthought.',
                    ],
                ],
                [
                    'h2' => 'Using Mutqin for returns',
                    'paragraphs' => [
                        'Saved completed sessions, dashboard murajaah, and “revision due” in the workspace are prompts for the next open. Your teacher may still set the official review. See [Quran revision in Mutqin](/features/quran-revision) for what the product shows, and [Hifz progress](/features/hifz-progress) when you want the practised ayahs in one place.',
                        'Mutqin supports [practice between lessons](/guides/practice-between-lessons). It does not replace a teacher, and it does not mark a khatm complete for you.',
                    ],
                ],
            ],
            links: [
                ['href' => '/features/quran-revision', 'label' => 'Revision in Mutqin'],
                ['href' => '/features/hifz-progress', 'label' => 'Progress after you practise'],
                ['href' => '/tools/hifz-progress-calculator', 'label' => 'Hifz progress calculator'],
                ['href' => '/guides/hifz-plan', 'label' => 'Leaving a slot for return'],
                ['href' => '/guides/quran-memorization-techniques', 'label' => 'Techniques in the sitting'],
                ['href' => '/guides/practice-between-lessons', 'label' => 'Practice between lessons'],
                ['href' => '/features/ai-recite', 'label' => 'Finding weak ayahs'],
                ['href' => '/tools/quran-memorization-test', 'label' => 'Public recall test'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Guides', 'path' => '/guides', 'host' => 'app'],
                ['name' => 'Revision', 'path' => '/guides/hifz-revision', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'article'],
            sitemapPriority: '0.9',
            relatedFeature: ['href' => '/features/quran-revision', 'label' => 'Open revision tools in Mutqin'],
            ctaPrimary: ['href' => '/features/quran-revision', 'label' => 'See Quran revision in Mutqin'],
            publishedAt: '2026-03-01',
            updatedAt: '2026-10-05',
            relatedGuides: [
                ['href' => '/guides/hifz-plan', 'label' => 'How to make a Hifz plan'],
                ['href' => '/guides/quran-memorization-techniques', 'label' => 'How to memorize the Quran'],
                ['href' => '/guides/practice-between-lessons', 'label' => 'Practice between lessons'],
            ],
            relatedTools: [
                ['href' => '/tools/hifz-progress-calculator', 'label' => 'Hifz progress calculator'],
                ['href' => '/tools/quran-memorization-test', 'label' => 'Quran memorization test'],
            ],
            relatedFeatures: [
                ['href' => '/features/hifz-progress', 'label' => 'Hifz progress in Mutqin'],
                ['href' => '/features/ai-recite', 'label' => 'AI Recite checks'],
            ],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private static function planGuide(): array
    {
        return self::page(
            id: 'guide-plan',
            path: '/guides/hifz-plan',
            kind: 'guide',
            kicker: 'Plan',
            title: 'How to Make a Quran Memorization Plan | Mutqin',
            description: 'How to make a Quran memorization plan: choose a daily portion you can finish, leave a revision slot, and resume when life interrupts. For students who already have a teacher.',
            h1: 'How to make a Quran memorization plan you will keep',
            lede: 'A useful Hifz plan is a portion size plus a return slot. It is not a poster of thirty Juz with no sitting behind it. Choose what you can listen to, recite, and see again this week — beside your teacher’s programme, not instead of it.',
            sections: [
                [
                    'h2' => 'Portion size you can finish',
                    'paragraphs' => [
                        'If a range is still shaky at the end of the sitting, it was too long. Cut ayahs until you can recite the set without rushing. Length can grow later; an unfinished pile rarely does.',
                        'If you are just starting, use the [beginners plan](/guides/quran-memorization-for-beginners) first. This page assumes you already know you need both new lesson and return, and you want to size them honestly.',
                    ],
                    'subs' => [
                        [
                            'h3' => 'A pace check, not a promise',
                            'paragraphs' => [
                                'The free [Quran memorization planner](/tools/quran-memorization-planner) can estimate calendar days from a daily ayah count. Treat that as a pace check. It is not a guarantee you will finish the Qur’an on that date, and it does not override your teacher.',
                            ],
                        ],
                    ],
                ],
                [
                    'h2' => 'New lesson and revision in the same week',
                    'paragraphs' => [
                        'Leave time for yesterday before you add today. A plan that is only “new” is how forgetting starts. Name the return slot the same way you name the new portion — even if the return is shorter. The [revision guide](/guides/hifz-revision) covers how to run that slot.',
                    ],
                ],
                [
                    'h2' => 'When life interrupts',
                    'paragraphs' => [
                        'Save the session and resume the same range. Mutqin keeps saved sets so you are not starting from a blank surah picker every time. That is the whole point of a workspace plan: continuity, not a new poster every Monday.',
                        'On a thin day, prefer a short return over forcing a full new lesson you cannot finish. Tomorrow is easier when yesterday still has an owner — see [practice between lessons](/guides/practice-between-lessons).',
                    ],
                ],
                [
                    'h2' => 'What Mutqin’s planner does',
                    'paragraphs' => [
                        'After you practise, Mutqin can suggest the next range or a weak-ayah sitting. Treat that as a draft next to your teacher’s programme. The [Hifz plan feature](/features/hifz-plan) page explains what the product stores and suggests.',
                        'Free and Pro differ in how much history and adaptive suggestion you get; current limits are on the [pricing](/pricing) page. The plan itself — a range you can open again — is the core idea on every plan.',
                    ],
                ],
            ],
            links: [
                ['href' => '/features/hifz-plan', 'label' => 'Hifz plan in Mutqin'],
                ['href' => '/guides/quran-memorization-for-beginners', 'label' => 'Beginner plan'],
                ['href' => '/guides/hifz-revision', 'label' => 'Building return into the week'],
                ['href' => '/guides/quran-memorization-techniques', 'label' => 'Techniques inside the sitting'],
                ['href' => '/guides/practice-between-lessons', 'label' => 'Practice between lessons'],
                ['href' => '/tools/quran-memorization-planner', 'label' => 'Public memorization planner'],
                ['href' => '/pricing', 'label' => 'Plans and limits'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Guides', 'path' => '/guides', 'host' => 'app'],
                ['name' => 'Memorization plan', 'path' => '/guides/hifz-plan', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'article'],
            sitemapPriority: '0.85',
            relatedFeature: ['href' => '/features/hifz-plan', 'label' => 'Use a Hifz plan in Mutqin'],
            ctaPrimary: ['href' => '/features/hifz-plan', 'label' => 'Open the Hifz plan feature'],
            publishedAt: '2026-03-01',
            updatedAt: '2026-10-05',
            relatedGuides: [
                ['href' => '/guides/quran-memorization-for-beginners', 'label' => 'Beginner memorization plan'],
                ['href' => '/guides/hifz-revision', 'label' => 'How to revise Hifz'],
                ['href' => '/guides/practice-between-lessons', 'label' => 'Practice between lessons'],
            ],
            relatedTools: [
                ['href' => '/tools/quran-memorization-planner', 'label' => 'Quran memorization planner'],
            ],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private static function similarAyahsGuide(): array
    {
        return self::page(
            id: 'guide-similar',
            path: '/guides/similar-ayahs',
            kind: 'guide',
            kicker: 'Similar ayahs',
            title: 'Mutashabihat: How to Memorize Similar Quran Ayahs | Mutqin',
            description: 'Mutashabihat in Hifz: why similar Quran ayahs get mixed, and how to memorise them — compare the distinguishing words, recall the fork, then recite. Mutqin’s Mutashābihāt tools follow that order.',
            h1: 'Mutashabihat: how to memorize similar Quran ayahs',
            lede: 'Similar ayahs are not a failure of effort. They share openings, endings, or a rhythm, so the mouth takes the familiar fork. Slow down at the fork: see the different word, then practise that pair on purpose — before you join a long passage that hides the mix-up.',
            sections: [
                [
                    'h2' => 'What “similar” means on this page',
                    'paragraphs' => [
                        'This guide is about look-alike passages you confuse while memorising — not a full treatment of mutashābihāt as a Qur’anic science, and not a list of rulings. If two ayahs steal each other’s continuation in your recitation, treat them as a practice pair.',
                    ],
                ],
                [
                    'h2' => 'Compare first',
                    'paragraphs' => [
                        'Put both ayahs in front of you and find the words that actually differ. Name the fork out loud (“here it is X, there it is Y”) so the distinction is not only visual. Mutqin marks those differences in a compare view so you are not scanning two full pages hoping the gap appears.',
                    ],
                    'subs' => [
                        [
                            'h3' => 'A practical compare pass',
                            'paragraphs' => [
                                'Open the two ayahs side by side. Underline or note only the words that change the meaning or the continuation. Ignore shared phrases for a moment. When you can point to the unique word without looking at the rest of the line, you are ready to hide and recall.',
                            ],
                        ],
                    ],
                ],
                [
                    'h2' => 'Recall the distinction, then recite',
                    'paragraphs' => [
                        'Cover the unique wording and try to produce it. Then recite the ayah you meant, listening for drift into the twin. Mutqin’s [Mutashābihāt practice](/features/mutashabihat) uses compare, recall, choosing the continuation, and an optional recitation check when you want the microphone to follow along.',
                    ],
                ],
                [
                    'h2' => 'Do not speed through the pair',
                    'paragraphs' => [
                        'Joining a long passage that contains two similar ayahs before you can tell them apart usually trains the mix-up. Separate the pair, fix the fork, then join again. The same rule as the [techniques guide](/guides/quran-memorization-techniques): join only when the pieces are steady.',
                    ],
                ],
                [
                    'h2' => 'When the mix-up returns in revision',
                    'paragraphs' => [
                        'If an older page starts swapping twins again, bring the pair back as a short weak-ayah sitting instead of racing the whole Juz. Revision is where similar-ayah slips often reappear — see [how to revise Hifz](/guides/hifz-revision) for keeping a weak-ayah bucket in the week.',
                    ],
                ],
                [
                    'h2' => 'Where Mutqin fits',
                    'paragraphs' => [
                        'Use [Mutashābihāt in the workspace](/features/mutashabihat) for compare and practice on the pair, [Mushaf layout](/features/mushaf) when you want both on a familiar page, and [AI Recite](/features/ai-recite) when drift shows up in a live check. Mutqin supports that practice between lessons; your teacher still hears the final recitation.',
                    ],
                ],
            ],
            links: [
                ['href' => '/features/mutashabihat', 'label' => 'Mutashābihāt in Mutqin'],
                ['href' => '/guides/quran-memorization-techniques', 'label' => 'Other memorization techniques'],
                ['href' => '/guides/hifz-revision', 'label' => 'Revision when twins return'],
                ['href' => '/features/ai-recite', 'label' => 'When recitation drifts'],
                ['href' => '/features/mushaf', 'label' => 'Seeing both on a page'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Guides', 'path' => '/guides', 'host' => 'app'],
                ['name' => 'Similar ayahs', 'path' => '/guides/similar-ayahs', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'article'],
            sitemapPriority: '0.9',
            relatedFeature: ['href' => '/features/mutashabihat', 'label' => 'Practise similar ayahs in Mutqin'],
            ctaPrimary: ['href' => '/features/mutashabihat', 'label' => 'Open Mutashābihāt'],
            publishedAt: '2026-03-01',
            updatedAt: '2026-10-05',
            relatedGuides: [
                ['href' => '/guides/quran-memorization-techniques', 'label' => 'How to memorize the Quran'],
                ['href' => '/guides/hifz-revision', 'label' => 'How to revise Hifz'],
            ],
            relatedFeatures: [
                ['href' => '/features/mutashabihat', 'label' => 'Mutashābihāt feature'],
                ['href' => '/features/mushaf', 'label' => 'Mushaf practice'],
                ['href' => '/features/ai-recite', 'label' => 'AI Recite'],
            ],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private static function toolsHub(): array
    {
        return self::page(
            id: 'tools-hub',
            path: '/tools',
            kind: 'hub',
            kicker: 'Tools',
            title: 'Free Quran Memorization Tools | Mutqin',
            description: 'Free Hifz tools: a Quran memorization planner, progress calculator, recall test, and typed Find an ayah. Use them without an account, then continue in Mutqin.',
            h1: 'Free tools for Quran memorization',
            lede: 'Each tool below does a real job on its own: plan a pace, estimate what you have kept, check a short range, or look up an ayah from Arabic you type. None of them replace a teacher. Mutqin is the workspace if you want the same logic beside listening, revision, and AI Recite.',
            sections: [
                [
                    'h2' => 'What you can do here without signing in',
                    'paragraphs' => [
                        'The planner uses Mutqin’s daily-ayah forecast. The progress calculator uses the same 6,236 ayahs, 604 Madani pages, and 30 Juz counts. The memorization test is a short public “Check what you kept”. Find an ayah matches typed Arabic with the same matcher as the in-app finder.',
                    ],
                ],
                [
                    'h2' => 'What stays in the Mutqin workspace',
                    'paragraphs' => [
                        'Saved plans, weak-ayah review, Mushaf practice, and microphone recitation checks need the memorisation workspace. These public tools are not a second copy of those screens.',
                    ],
                ],
            ],
            links: [
                ['href' => '/tools/quran-memorization-planner', 'label' => 'Memorization planner'],
                ['href' => '/tools/hifz-progress-calculator', 'label' => 'Hifz progress calculator'],
                ['href' => '/tools/quran-memorization-test', 'label' => 'Memorization test'],
                ['href' => '/tools/find-an-ayah', 'label' => 'Find an ayah'],
                ['href' => '/features', 'label' => 'Mutqin features'],
                ['href' => '/guides', 'label' => 'Hifz guides'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Tools', 'path' => '/tools', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'website'],
            sitemapPriority: '0.8',
        );
    }

    /**
     * @return array<string, mixed>
     */
    private static function memorizationPlanner(): array
    {
        return self::page(
            id: 'tool-planner',
            path: '/tools/quran-memorization-planner',
            kind: 'tool',
            kicker: 'Planner',
            title: 'Quran Memorization Planner | Daily Hifz Pace',
            description: 'Free Quran memorization planner: choose a target and daily ayahs for a realistic Hifz pace. Same forecast Mutqin uses — no account required.',
            h1: 'Quran memorization planner: a realistic daily Hifz pace',
            lede: 'Pick the whole Qur’an, Juz ʿAmma, or one surah. Set how many new ayahs you can add in a sitting and how many days you practise each week. The dates are a pace check, not a promise — and you can use the tool without signing in.',
            sections: [
                [
                    'h2' => 'What this planner does',
                    'paragraphs' => [
                        'It counts remaining ayahs for your target, divides them by your daily new-ayah target (1–10, the same band Mutqin’s Hifz forecast uses), then stretches the calendar if you do not practise every day.',
                        'You also see a short first-sitting slice — a portion you might actually open tonight — not only a distant completion date.',
                    ],
                ],
                [
                    'h2' => 'How to use it',
                    'paragraphs' => [
                        'Choose a target (whole Qur’an, Juz ʿAmma, or a surah range). Set new ayahs per sitting and practice days per week. Press Show plan. Adjust the numbers until the calendar feels honest for your week.',
                    ],
                    'subs' => [
                        [
                            'h3' => 'Who it helps',
                            'paragraphs' => [
                                'Students sizing a first portion, teachers suggesting homework pace, and anyone who wants a calendar check before committing to a programme. It does not replace a teacher’s syllabus.',
                            ],
                        ],
                    ],
                ],
                [
                    'h2' => 'How this differs from a Mutqin Hifz plan',
                    'paragraphs' => [
                        'In Mutqin you save a range, listen, recite, and take a recommended return. This page only forecasts. Continue in Mutqin when you want the sitting itself, not only the math. For portion sizing in words, see [how to make a Hifz plan](/guides/hifz-plan); beginners can start with the [beginner plan](/guides/quran-memorization-for-beginners).',
                    ],
                ],
            ],
            links: [
                ['href' => '/features/hifz-plan', 'label' => 'Hifz plan in Mutqin'],
                ['href' => '/guides/hifz-plan', 'label' => 'How to choose a portion size'],
                ['href' => '/guides/quran-memorization-for-beginners', 'label' => 'Beginner plan'],
                ['href' => '/tools/hifz-progress-calculator', 'label' => 'Progress calculator'],
                ['href' => '/tools', 'label' => 'All free tools'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Tools', 'path' => '/tools', 'host' => 'app'],
                ['name' => 'Planner', 'path' => '/tools/quran-memorization-planner', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'website', 'webapp', 'faq'],
            sitemapPriority: '0.85',
            tool: 'planner',
            relatedFeature: ['href' => '/features/hifz-plan', 'label' => 'Continue with a saved Hifz plan in Mutqin'],
            ctaPrimary: [
                'href' => '/waiting-list?utm_source=seo_tool&utm_medium=cta&utm_campaign=planner',
                'label' => 'Join the waiting list',
            ],
            ctaSecondary: ['href' => '/features/hifz-plan', 'label' => 'See the Hifz plan feature'],
            faqs: [
                [
                    'q' => 'Do I need an account to use the Quran memorization planner?',
                    'a' => 'No. The planner runs in the browser without registration.',
                ],
                [
                    'q' => 'Is the estimated completion date a guarantee?',
                    'a' => 'No. It assumes you keep the daily ayah target on your chosen practice days. Treat it as a pace check beside your teacher’s programme.',
                ],
                [
                    'q' => 'Can I plan only Juz Amma or one surah?',
                    'a' => 'Yes. Choose Juz Amma as the target, or pick a single surah and ayah range.',
                ],
            ],
            relatedGuides: [
                ['href' => '/guides/hifz-plan', 'label' => 'How to make a Hifz plan'],
                ['href' => '/guides/quran-memorization-for-beginners', 'label' => 'Beginner memorization plan'],
            ],
            relatedTools: [
                ['href' => '/tools/hifz-progress-calculator', 'label' => 'Hifz progress calculator'],
            ],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private static function hifzProgressCalculator(): array
    {
        return self::page(
            id: 'tool-progress',
            path: '/tools/hifz-progress-calculator',
            kind: 'tool',
            kicker: 'Progress',
            title: 'Hifz Progress Calculator | Pages, Juz, and Surahs',
            description: 'Free Hifz progress calculator: enter memorized pages, Juz, or surahs for an ayah-share estimate and days left at a daily pace. No account required.',
            h1: 'Hifz progress calculator: pages, Juz, and surahs',
            lede: 'Tell the calculator how far you have reached. It maps that onto 6,236 ayahs, 604 Madani pages, and 30 Juz — the same totals Mutqin uses when it forecasts a plan. Works in the browser without signing in.',
            sections: [
                [
                    'h2' => 'What this calculator does',
                    'paragraphs' => [
                        'It estimates how much of the Qur’an you have kept as an ayah share, shows equivalent pages and Juz at that share, and projects remaining days at a daily new-ayah pace you choose.',
                    ],
                ],
                [
                    'h2' => 'How to use it',
                    'paragraphs' => [
                        'Choose pages, a Juz range, or “through a surah.” Enter the numbers, set how many new ayahs you can add each day, then press Calculate. Compare the remaining duration with a plan you can actually keep.',
                    ],
                    'subs' => [
                        [
                            'h3' => 'Who it helps',
                            'paragraphs' => [
                                'Students who know “about twenty pages” or “Juz ʿAmma” but want a clearer map, and teachers who want a quick share estimate before talking about return and new lesson.',
                            ],
                        ],
                    ],
                ],
                [
                    'h2' => 'What the numbers mean',
                    'paragraphs' => [
                        'Pages are converted as a share of a 604-page Madani print, not as a scan of your personal mushaf. A Juz range uses standard Juz start ayahs. “Through a surah” counts every ayah from Al-Fātiḥah up to the end of that surah.',
                    ],
                ],
                [
                    'h2' => 'What Mutqin tracks instead',
                    'paragraphs' => [
                        'The dashboard records ayahs you practised and reviewed, including weak spots after a check. Use this calculator for a quick map; continue in Mutqin when you want the next sitting, not only a percentage. For how return fits the week, read [how to revise Hifz](/guides/hifz-revision).',
                    ],
                ],
            ],
            links: [
                ['href' => '/features/hifz-progress', 'label' => 'Progress in Mutqin'],
                ['href' => '/features/quran-revision', 'label' => 'Revision tools'],
                ['href' => '/guides/hifz-revision', 'label' => 'How to revise Hifz'],
                ['href' => '/tools/quran-memorization-planner', 'label' => 'Memorization planner'],
                ['href' => '/tools', 'label' => 'All free tools'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Tools', 'path' => '/tools', 'host' => 'app'],
                ['name' => 'Progress calculator', 'path' => '/tools/hifz-progress-calculator', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'website', 'webapp', 'faq'],
            sitemapPriority: '0.85',
            tool: 'progress',
            relatedFeature: ['href' => '/features/hifz-progress', 'label' => 'Continue with progress tracking in Mutqin'],
            ctaPrimary: [
                'href' => '/waiting-list?utm_source=seo_tool&utm_medium=cta&utm_campaign=progress',
                'label' => 'Join the waiting list',
            ],
            ctaSecondary: ['href' => '/features/hifz-progress', 'label' => 'See Hifz progress in Mutqin'],
            faqs: [
                [
                    'q' => 'Is the Hifz progress calculator as accurate as my mushaf?',
                    'a' => 'It is a share estimate from standard totals (6,236 ayahs, 604 Madani pages, 30 Juz), not a page scan of your print. Use it for orientation.',
                ],
                [
                    'q' => 'Do I need an account?',
                    'a' => 'No. The calculator runs without registration.',
                ],
            ],
            relatedGuides: [
                ['href' => '/guides/hifz-revision', 'label' => 'How to revise and retain Hifz'],
            ],
            relatedTools: [
                ['href' => '/tools/quran-memorization-planner', 'label' => 'Quran memorization planner'],
            ],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private static function memorizationTest(): array
    {
        return self::page(
            id: 'tool-quiz',
            path: '/tools/quran-memorization-test',
            kind: 'tool',
            kicker: 'Test',
            title: 'Quran Memorization Test | Check What You Remember',
            description: 'Free Quran memorization test on a short surah range: multiple choice, missing word, or flashcard. Public “Check what you kept” — no microphone, no account.',
            h1: 'Quran memorization test: check a short range from memory',
            lede: 'Choose a surah and a small ayah span. The tool loads Uthmani text through Mutqin’s Quran proxy and builds a short recall check — the same idea as “Check what you kept”, without your history or a live recitation checker. No login required.',
            sections: [
                [
                    'h2' => 'What this public test includes',
                    'paragraphs' => [
                        'You get up to six questions on at most twelve ayahs: pick the ayah, fill a missing Arabic word, or reveal a flashcard. It works without registration. It does not grade tajwīd and it does not listen to you recite.',
                    ],
                ],
                [
                    'h2' => 'How to use it',
                    'paragraphs' => [
                        'Select a surah and a short from–to range (the tool caps the span so the check stays small). Start the check, answer each question, then see how many you recalled on that pass. Try another range when you want a second sitting.',
                    ],
                    'subs' => [
                        [
                            'h3' => 'Who it helps',
                            'paragraphs' => [
                                'Students who want a quiet self-check after listening, and anyone who is not ready for a microphone check yet. Teachers can point students here for homework recall without creating accounts.',
                            ],
                        ],
                    ],
                ],
                [
                    'h2' => 'When to use AI Recite instead',
                    'paragraphs' => [
                        'If you want Mutqin to follow the words you say from memory, that is [AI Recite](/features/ai-recite) in the workspace. After a set there, “Check what you kept” can also feed weak ayahs into the next review. This page is for a quiet self-check first. Technique order is in [how to memorize the Quran](/guides/quran-memorization-techniques).',
                    ],
                ],
            ],
            links: [
                ['href' => '/features/ai-recite', 'label' => 'AI Recite and Check what you kept'],
                ['href' => '/guides/quran-memorization-techniques', 'label' => 'Memorization techniques'],
                ['href' => '/features/quran-revision', 'label' => 'Revision after a check'],
                ['href' => '/tools/find-an-ayah', 'label' => 'Find an ayah'],
                ['href' => '/tools', 'label' => 'All free tools'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Tools', 'path' => '/tools', 'host' => 'app'],
                ['name' => 'Memorization test', 'path' => '/tools/quran-memorization-test', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'website', 'webapp', 'faq'],
            sitemapPriority: '0.9',
            tool: 'quiz',
            relatedFeature: ['href' => '/features/ai-recite', 'label' => 'Continue with AI Recite and Check what you kept'],
            ctaPrimary: [
                'href' => '/waiting-list?utm_source=seo_tool&utm_medium=cta&utm_campaign=quiz',
                'label' => 'Join the waiting list',
            ],
            ctaSecondary: ['href' => '/features/ai-recite', 'label' => 'See AI Recite in Mutqin'],
            faqs: [
                [
                    'q' => 'Does the Quran memorization test grade tajweed?',
                    'a' => 'No. It checks recall of wording with short questions. A teacher still hears your recitation.',
                ],
                [
                    'q' => 'Do I need a microphone or an account?',
                    'a' => 'No. This public test is text-only and works without registration. Voice checking stays in the Mutqin workspace.',
                ],
            ],
            relatedGuides: [
                ['href' => '/guides/quran-memorization-techniques', 'label' => 'How to memorize the Quran'],
                ['href' => '/guides/hifz-revision', 'label' => 'How to revise Hifz'],
            ],
            relatedTools: [
                ['href' => '/tools/find-an-ayah', 'label' => 'Find an ayah by typing'],
            ],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private static function findAyahTool(): array
    {
        return self::page(
            id: 'tool-find-ayah',
            path: '/tools/find-an-ayah',
            kind: 'tool',
            kicker: 'Find an ayah',
            title: 'Find an Ayah by Typing Arabic | Mutqin',
            description: 'Free Find an ayah tool: type the first Arabic words of a verse to find matches. Same matcher as Mutqin — text only, no account, no microphone.',
            h1: 'Find an ayah from Arabic you type',
            lede: 'Remember the sound of a line but not the surah number? Type at least three Arabic words from the start of the verse. Matching uses the same prefix matcher as Mutqin’s Find an ayah — without a microphone and without sending your wording to analytics.',
            sections: [
                [
                    'h2' => 'What this finder does',
                    'paragraphs' => [
                        'It identifies likely ayahs from typed Arabic. If several ayahs are close, you see a short list so you can recognise the verse you meant.',
                    ],
                ],
                [
                    'h2' => 'How to use it',
                    'paragraphs' => [
                        'Type at least three clear Arabic words from the beginning of the ayah (not a translation). Press Find ayah. Open the match that fits; if the list is long, add another distinctive word and search again.',
                    ],
                    'subs' => [
                        [
                            'h3' => 'Who it helps',
                            'paragraphs' => [
                                'Students who remember the start of a line but not the surah number, and anyone who wants a lookup without enabling the microphone.',
                            ],
                        ],
                    ],
                ],
                [
                    'h2' => 'How the public finder works',
                    'paragraphs' => [
                        'The page loads Uthmani Quran text through Mutqin’s same-origin Quran proxy, builds the Ask Mutqin matching index, and ranks ayahs that fit the words you typed.',
                    ],
                ],
                [
                    'h2' => 'Voice, audio, and opening a range',
                    'paragraphs' => [
                        'Reciting into the microphone, playing ayah audio, translations, and opening a span around the match happen in the memorisation workspace — see [Find an ayah by reciting](/features/find-an-ayah). This tool stops at identification so it can stay public and free of speech services. Privacy details for microphone use are on the [privacy](/privacy) page.',
                    ],
                ],
            ],
            links: [
                ['href' => '/features/find-an-ayah', 'label' => 'Find an ayah in Mutqin (voice)'],
                ['href' => '/privacy', 'label' => 'How audio is handled'],
                ['href' => '/features/ai-recite', 'label' => 'AI Recite'],
                ['href' => '/tools/quran-memorization-test', 'label' => 'Memorization test'],
                ['href' => '/tools', 'label' => 'All free tools'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Tools', 'path' => '/tools', 'host' => 'app'],
                ['name' => 'Find an ayah', 'path' => '/tools/find-an-ayah', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'website', 'webapp', 'faq'],
            sitemapPriority: '0.85',
            tool: 'find-ayah',
            relatedFeature: ['href' => '/features/find-an-ayah', 'label' => 'Continue with voice Find an ayah in Mutqin'],
            ctaPrimary: [
                'href' => '/waiting-list?utm_source=seo_tool&utm_medium=cta&utm_campaign=find-ayah',
                'label' => 'Join the waiting list',
            ],
            ctaSecondary: ['href' => '/features/find-an-ayah', 'label' => 'See Find an ayah in Mutqin'],
            faqs: [
                [
                    'q' => 'Why does Find an ayah need at least three Arabic words?',
                    'a' => 'Short fragments match too many ayahs. Three or more words from the start of the verse give the matcher a fair chance.',
                ],
                [
                    'q' => 'Is the Arabic I type sent to analytics?',
                    'a' => 'No. Analytics events never include Arabic text or transcripts — only result statuses such as matched or short.',
                ],
            ],
            relatedFeatures: [
                ['href' => '/features/find-an-ayah', 'label' => 'Find an ayah by reciting'],
                ['href' => '/features/ai-recite', 'label' => 'AI Recite'],
            ],
            relatedTools: [
                ['href' => '/tools/quran-memorization-test', 'label' => 'Quran memorization test'],
            ],
        );
    }

    /**
     * @param  list<array<string, mixed>>  $sections
     * @param  list<array{href: string, label: string}>  $links
     * @param  list<array{name: string, path: string, host?: string}>  $breadcrumbs
     * @param  list<string>  $jsonLd
     * @param  array{href: string, label: string}|null  $relatedFeature
     * @param  array{href: string, label: string}|null  $ctaPrimary
     * @param  array{href: string, label: string}|null  $ctaSecondary
     * @param  list<array{q: string, a: string}>  $faqs
     * @param  list<array{href: string, label: string}>  $relatedGuides
     * @param  list<array{href: string, label: string}>  $relatedTools
     * @param  list<array{href: string, label: string}>  $relatedFeatures
     * @return array<string, mixed>
     */
    private static function page(
        string $id,
        string $path,
        string $kind,
        string $kicker,
        string $title,
        string $description,
        string $h1,
        string $lede,
        array $sections,
        array $links,
        array $breadcrumbs,
        array $jsonLd,
        string $sitemapPriority,
        string $changefreq = 'monthly',
        ?string $tool = null,
        ?array $relatedFeature = null,
        ?array $ctaPrimary = null,
        ?string $publishedAt = null,
        ?string $updatedAt = null,
        string $author = 'Mutqin',
        ?array $ctaSecondary = null,
        array $faqs = [],
        array $relatedGuides = [],
        array $relatedTools = [],
        array $relatedFeatures = [],
    ): array {
        return [
            'id' => $id,
            'path' => $path,
            'kind' => $kind,
            'kicker' => $kicker,
            'title' => $title,
            'description' => $description,
            'h1' => $h1,
            'lede' => $lede,
            'sections' => $sections,
            'links' => $links,
            'breadcrumbs' => $breadcrumbs,
            'json_ld' => $jsonLd,
            'sitemap_priority' => $sitemapPriority,
            'changefreq' => $changefreq,
            'tool' => $tool,
            'related_feature' => $relatedFeature,
            'related_guides' => $relatedGuides,
            'related_tools' => $relatedTools,
            'related_features' => $relatedFeatures,
            'faqs' => $faqs,
            'author' => $author,
            'published_at' => $publishedAt,
            'updated_at' => $updatedAt,
            'cta_primary' => $ctaPrimary ?? ['href' => '/waiting-list', 'label' => 'Join the waiting list'],
            'cta_secondary' => $ctaSecondary ?? ['href' => '/memorisation', 'label' => 'Open memorisation'],
        ];
    }
}

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
            $definitions[] = [
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
                        'Your grades can feed the next review suggestion, including weak ayahs. This quiz is separate from live AI Recite. Use whichever matches the sitting: follow-along recitation, or a quiet recall check.',
                    ],
                    'subs' => [
                        [
                            'h3' => 'Free and Pro check limits',
                            'paragraphs' => [
                                'The Free plan includes a small number of smart recitation checks. Pro increases that allowance and adds more history and insights. Current limits are on the pricing page.',
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
                        'This is not a separate Islamic encyclopaedia. It is a practice aid when you are already on an ayah that has known look-alikes. For the learning approach, read the similar-ayahs guide.',
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
                        'Hiding works together with “one ayah at a time” (other ayahs dim) and with joining ayahs when you are ready to move as a passage. None of these replace reciting to a teacher.',
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
                        'If you are in a ḥalaqah, the Mutqin plan is for the hours between lessons. It does not assign a new teacher, and it does not mark a khatm complete for you.',
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
                        'Mutqin can recommend when to come back after a session. That is a practice prompt. Your teacher may still set the official murajaah. Read the revision guide if you want a simple weekly rhythm in words.',
                    ],
                ],
            ],
            links: [
                ['href' => '/guides/hifz-revision', 'label' => 'How to revise Hifz'],
                ['href' => '/features/hifz-progress', 'label' => 'Progress and strength'],
                ['href' => '/features/ai-recite', 'label' => 'Checks that feed revision'],
                ['href' => '/features/hifz-plan', 'label' => 'Hifz plan'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Features', 'path' => '/features', 'host' => 'app'],
                ['name' => 'Revision', 'path' => '/features/quran-revision', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'website'],
            sitemapPriority: '0.85',
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
                        'Progress is useful when it answers “what do I open?”. Combine it with revision and the Hifz plan rather than collecting numbers for their own sake.',
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
                        'Voice Find an ayah lives in memorisation, next to AI Recite. A typed Arabic version is on the public Find an ayah tool, without a microphone. Voice use in the workspace follows the same microphone consent idea as other listening features.',
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
                ['href' => '/guides/quran-memorization-for-beginners', 'label' => 'How to start Hifz'],
                ['href' => '/guides/quran-memorization-techniques', 'label' => 'How to memorize the Quran'],
                ['href' => '/guides/hifz-plan', 'label' => 'Quran memorization plan'],
                ['href' => '/guides/hifz-revision', 'label' => 'How to revise (and not forget)'],
                ['href' => '/guides/similar-ayahs', 'label' => 'Mutashabihat and similar ayahs'],
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
            title: 'Quran Memorization for Beginners | How to Start Hifz',
            description: 'How to start Hifz with a short range, listening, reciting, and revision. A beginner path for Quran memorization that still assumes a real teacher.',
            h1: 'How to start Hifz (Quran memorization for beginners)',
            lede: 'You do not need a huge first target. You need a range you can listen to, repeat, and recite in one sitting, then a way to come back tomorrow. A teacher still hears you; an app only holds the practice in between.',
            sections: [
                [
                    'h2' => 'Start smaller than you think',
                    'paragraphs' => [
                        'Pick a surah you already hear often, or a few ayahs of one you are learning in class. Finish that set in the sitting. Adding pages you cannot recite only builds a pile you will avoid.',
                    ],
                ],
                [
                    'h2' => 'Listen, repeat, then hide',
                    'paragraphs' => [
                        'Hear the ayah from a reciter, repeat it while it is still in the ear, then try without looking. Mutqin’s listen-and-repeat mode plays a section and waits for your turn. Gradually hiding the text is for when reading is still doing the work for you.',
                    ],
                ],
                [
                    'h2' => 'When to test recall',
                    'paragraphs' => [
                        'A recitation check or a short “check what you kept” quiz is useful after the range feels familiar — not as the first action of the day. If the check is messy, shorten the range rather than pushing on.',
                    ],
                ],
                [
                    'h2' => 'Where Mutqin fits',
                    'paragraphs' => [
                        'Use the workspace to save the set, see a next suggestion, and keep revision on the same ayahs. Join the waiting list if you do not have access yet, or open memorisation if you already do.',
                    ],
                ],
            ],
            links: [
                ['href' => '/guides/quran-memorization-techniques', 'label' => 'Techniques in more detail'],
                ['href' => '/features/hifz-plan', 'label' => 'Plans in Mutqin'],
                ['href' => '/waiting-list', 'label' => 'Waiting list'],
                ['href' => '/about', 'label' => 'What Mutqin is (and is not)'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Guides', 'path' => '/guides', 'host' => 'app'],
                ['name' => 'Beginners', 'path' => '/guides/quran-memorization-for-beginners', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'article'],
            sitemapPriority: '0.85',
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
            title: 'Quran Memorization Techniques | How to Memorize the Quran',
            description: 'Practical Hifz techniques: listen and repeat, one ayah at a time, gradually hide the text, join ayahs, and test recall. How Mutqin supports the same steps in one workspace.',
            h1: 'How to memorize the Quran: techniques that hold',
            lede: 'Technique is the order of the sitting, not a trick. Hear it, say it, hide it, join it, then check what stayed. Mutqin names these steps in the workspace so you can repeat them without rebuilding the session each time.',
            sections: [
                [
                    'h2' => 'Listen and repeat',
                    'paragraphs' => [
                        'Play a short section, pause, and recite it back before the next piece starts. Mutqin calls this listen and repeat (talqin in the session settings). It is the same idea as hearing a teacher, then echoing, at home.',
                    ],
                ],
                [
                    'h2' => 'One ayah at a time',
                    'paragraphs' => [
                        'Keep the active ayah clear and dim the rest so your eyes do not jump ahead. Move on only when this ayah can be recited without leaning on the neighbours.',
                    ],
                ],
                [
                    'h2' => 'Gradually hide the text',
                    'paragraphs' => [
                        'After successful repeats, more of the wording can disappear so you recall instead of read. Peek when you must, then hide again. This is Mutqin’s “gradually hide the text” technique, including on Mushaf layout.',
                    ],
                ],
                [
                    'h2' => 'Join ayahs when one ayah is steady',
                    'paragraphs' => [
                        'Pair neighbouring ayahs, or grow a passage a step at a time, so transitions do not break. If joining creates new mistakes, drop back to one ayah.',
                    ],
                    'subs' => [
                        [
                            'h3' => 'Word hooks',
                            'paragraphs' => [
                                'Key words can stay visible as anchors while the rest is recalled. Use them as hooks, not as a new text to memorise in isolation.',
                            ],
                        ],
                    ],
                ],
                [
                    'h2' => 'Then check, then return',
                    'paragraphs' => [
                        'Recite from memory or run a short quiz on the range. Similar ayahs need their own compare step. Revision tomorrow is part of the technique, not an optional extra.',
                    ],
                ],
            ],
            links: [
                ['href' => '/features/mushaf', 'label' => 'Hiding text on a Mushaf page'],
                ['href' => '/features/ai-recite', 'label' => 'Recitation check and quiz'],
                ['href' => '/guides/similar-ayahs', 'label' => 'Similar ayahs'],
                ['href' => '/guides/hifz-revision', 'label' => 'How to revise'],
                ['href' => '/guides/quran-memorization-for-beginners', 'label' => 'Beginners'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Guides', 'path' => '/guides', 'host' => 'app'],
                ['name' => 'Techniques', 'path' => '/guides/quran-memorization-techniques', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'article'],
            sitemapPriority: '0.85',
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
            title: 'How to Revise Hifz and Stop Forgetting | Mutqin',
            description: 'How to revise memorized Quran: recent lessons, older passages, and weak ayahs. A simple murajaah rhythm, and how Mutqin prompts a return without replacing your teacher.',
            h1: 'How to revise Quran (and stop forgetting what you memorised)',
            lede: 'Forgetting is normal when there is no return. Revision is not a second hobby; it is the same ayahs, opened again before they fade. Keep new lesson, but give yesterday’s range a short slot first.',
            sections: [
                [
                    'h2' => 'Why ayahs slip',
                    'paragraphs' => [
                        'A range you recited well once still needs another look while the sound is close, then later looks when it is no longer daily. If every sitting is only new lesson, the older pages have no owner.',
                    ],
                ],
                [
                    'h2' => 'A simple rhythm',
                    'paragraphs' => [
                        'In one week, keep a slot for: what you took this week, a slightly older completed set, and any ayahs a check marked weak. You do not need a complex calendar to start. You need those three buckets to exist.',
                    ],
                ],
                [
                    'h2' => 'Weak ayahs first when time is short',
                    'paragraphs' => [
                        'If you only have a few minutes, open the weak ayahs from the last check instead of racing a full Juz. Mutqin can list those ayahs after AI Recite or a recall quiz.',
                    ],
                ],
                [
                    'h2' => 'Using Mutqin for returns',
                    'paragraphs' => [
                        'Saved completed sessions, dashboard murajaah, and “revision due” in the workspace are prompts. Your teacher may still set the official review. See the revision feature page for what the product shows.',
                    ],
                ],
            ],
            links: [
                ['href' => '/features/quran-revision', 'label' => 'Revision in Mutqin'],
                ['href' => '/features/hifz-progress', 'label' => 'Progress after you practise'],
                ['href' => '/guides/hifz-plan', 'label' => 'Leaving a slot for return'],
                ['href' => '/features/ai-recite', 'label' => 'Finding weak ayahs'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Guides', 'path' => '/guides', 'host' => 'app'],
                ['name' => 'Revision', 'path' => '/guides/hifz-revision', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'article'],
            sitemapPriority: '0.8',
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
            description: 'How to make a Hifz plan: choose a daily portion you can finish and revise. Practical Quran memorization planning for students who already have a teacher.',
            h1: 'How to make a Quran memorization plan',
            lede: 'A useful plan is a portion size plus a return slot. It is not a poster of thirty Juz with no sitting behind it. Choose what you can listen to, recite, and see again this week.',
            sections: [
                [
                    'h2' => 'Portion size',
                    'paragraphs' => [
                        'If a range is still shaky at the end of the sitting, it was too long. Cut ayahs until you can recite the set without rushing. Length can grow later; an unfinished pile rarely does.',
                    ],
                ],
                [
                    'h2' => 'New lesson and revision in the same week',
                    'paragraphs' => [
                        'Leave time for yesterday before you add today. A plan that is only “new” is how forgetting starts. The revision guide covers the return itself.',
                    ],
                ],
                [
                    'h2' => 'When life interrupts',
                    'paragraphs' => [
                        'Save the session and resume the same range. Mutqin keeps saved sets so you are not starting from a blank surah picker every time. That is the whole point of a workspace plan.',
                    ],
                ],
                [
                    'h2' => 'Mutqin’s planner',
                    'paragraphs' => [
                        'After you practise, Mutqin can suggest the next range or a weak-ayah sitting. Treat that as a draft next to your teacher’s programme. Details of the product are on the Hifz plan feature page.',
                    ],
                ],
            ],
            links: [
                ['href' => '/features/hifz-plan', 'label' => 'Hifz plan in Mutqin'],
                ['href' => '/guides/hifz-revision', 'label' => 'Building return into the week'],
                ['href' => '/guides/quran-memorization-for-beginners', 'label' => 'Starting small'],
                ['href' => '/pricing', 'label' => 'Plans and limits'],
                ['href' => '/tools/quran-memorization-planner', 'label' => 'Public memorization planner'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Guides', 'path' => '/guides', 'host' => 'app'],
                ['name' => 'Memorization plan', 'path' => '/guides/hifz-plan', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'article'],
            sitemapPriority: '0.75',
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
            title: 'Mutashabihat in the Quran | How to Memorize Similar Ayahs',
            description: 'Why similar Quran ayahs get mixed in Hifz, and how to memorise them: compare the distinguishing words, then recall and recite. Mutqin’s Mutashābihāt tools follow that order.',
            h1: 'Mutashabihat: how to memorize similar ayahs',
            lede: 'Similar ayahs are not a failure of effort. They share openings, endings, or a rhythm, so the mouth takes the familiar fork. Slow down at the fork: see the different word, then practise that pair on purpose.',
            sections: [
                [
                    'h2' => 'What “similar” means here',
                    'paragraphs' => [
                        'This page is about look-alike passages you confuse while memorising — not a full tafsīr of mutashābihāt as a Qur’anic science. If two ayahs steal each other’s continuation in your recitation, treat them as a pair.',
                    ],
                ],
                [
                    'h2' => 'Compare first',
                    'paragraphs' => [
                        'Put both ayahs in front of you and find the words that actually differ. Mutqin marks those differences in a compare view so you are not scanning two full pages hoping the gap appears.',
                    ],
                ],
                [
                    'h2' => 'Recall the distinction, then recite',
                    'paragraphs' => [
                        'Cover the unique wording and try to produce it. Then recite the ayah you meant, listening for drift into the twin. Mutqin’s practice flow uses compare, recall, choosing the continuation, and an optional recitation check.',
                    ],
                ],
                [
                    'h2' => 'Do not speed through the pair',
                    'paragraphs' => [
                        'Joining a long passage that contains two similar ayahs before you can tell them apart usually trains the mix-up. Separate the pair, then join again.',
                    ],
                ],
            ],
            links: [
                ['href' => '/features/mutashabihat', 'label' => 'Mutashābihāt in Mutqin'],
                ['href' => '/guides/quran-memorization-techniques', 'label' => 'Other techniques'],
                ['href' => '/features/ai-recite', 'label' => 'When recitation drifts'],
                ['href' => '/features/mushaf', 'label' => 'Seeing both on a page'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Guides', 'path' => '/guides', 'host' => 'app'],
                ['name' => 'Similar ayahs', 'path' => '/guides/similar-ayahs', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'article'],
            sitemapPriority: '0.8',
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
            description: 'Choose a target and daily ayahs to get a realistic Quran memorization plan. Same forecast Mutqin uses for Hifz, without creating an account.',
            h1: 'Plan a realistic daily Hifz pace',
            lede: 'Pick the whole Qur’an, Juz ʿAmma, or one surah. Set how many new ayahs you can add in a sitting and how many days you practise each week. The dates are a pace check, not a promise.',
            sections: [
                [
                    'h2' => 'What this planner calculates',
                    'paragraphs' => [
                        'It counts remaining ayahs, divides them by your daily new-ayah target (1–10, the same band Mutqin’s Hifz forecast uses), then stretches the calendar if you do not practise every day.',
                        'The first sitting is a short slice of the target, so you can see a portion you might actually open tonight.',
                    ],
                ],
                [
                    'h2' => 'How this differs from a Mutqin Hifz plan',
                    'paragraphs' => [
                        'In Mutqin you save a range, listen, recite, and take a recommended return. This page only forecasts. If you already have a teacher’s programme, match the daily ayahs to that programme rather than inventing a new one.',
                    ],
                ],
            ],
            links: [
                ['href' => '/features/hifz-plan', 'label' => 'Hifz plan in Mutqin'],
                ['href' => '/guides/hifz-plan', 'label' => 'How to choose a portion size'],
                ['href' => '/guides/quran-memorization-for-beginners', 'label' => 'Starting Hifz'],
                ['href' => '/tools/hifz-progress-calculator', 'label' => 'Progress calculator'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Tools', 'path' => '/tools', 'host' => 'app'],
                ['name' => 'Planner', 'path' => '/tools/quran-memorization-planner', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'website'],
            sitemapPriority: '0.85',
            tool: 'planner',
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
            description: 'Enter memorized pages, Juz, or surahs and see an ayah-share estimate, remaining Qur’an, and days left at a daily pace. Free, no account.',
            h1: 'Calculate Hifz progress from pages, Juz, or surahs',
            lede: 'Tell the calculator how far you have reached. It maps that onto 6,236 ayahs, 604 Madani pages, and 30 Juz — the same totals Mutqin uses when it forecasts a plan.',
            sections: [
                [
                    'h2' => 'What the numbers mean',
                    'paragraphs' => [
                        'Pages are converted as a share of a 604-page Madani print, not as a scan of your personal mushaf. A Juz range uses standard Juz start ayahs. “Through a surah” counts every ayah from Al-Fātiḥah up to the end of that surah.',
                    ],
                ],
                [
                    'h2' => 'What Mutqin tracks instead',
                    'paragraphs' => [
                        'The dashboard records ayahs you practised and reviewed, including weak spots after a check. Use this calculator for a quick map; use Mutqin when you want the next sitting, not only a percentage.',
                    ],
                ],
            ],
            links: [
                ['href' => '/features/hifz-progress', 'label' => 'Progress in Mutqin'],
                ['href' => '/features/quran-revision', 'label' => 'Revision tools'],
                ['href' => '/guides/hifz-revision', 'label' => 'How to revise Hifz'],
                ['href' => '/tools/quran-memorization-planner', 'label' => 'Memorization planner'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Tools', 'path' => '/tools', 'host' => 'app'],
                ['name' => 'Progress calculator', 'path' => '/tools/hifz-progress-calculator', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'website'],
            sitemapPriority: '0.8',
            tool: 'progress',
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
            description: 'A free Quran memorization test on a short surah range: multiple choice, missing word, or flashcard. Public version of Mutqin’s recall check — no microphone.',
            h1: 'Test a short range from memory',
            lede: 'Choose a surah and a small ayah span. The tool loads Uthmani text through Mutqin’s Quran proxy and builds a short recall check — the same idea as “Check what you kept”, without your history or a live recitation checker.',
            sections: [
                [
                    'h2' => 'What this public test includes',
                    'paragraphs' => [
                        'You get up to six questions on at most twelve ayahs: pick the ayah, fill a missing Arabic word, or reveal a flashcard. It works without registration. It does not grade tajwīd and it does not listen to you recite.',
                    ],
                ],
                [
                    'h2' => 'When to use AI Recite instead',
                    'paragraphs' => [
                        'If you want Mutqin to follow the words you say from memory, that is AI Recite in the workspace. After a set there, “Check what you kept” can also feed weak ayahs into the next review. This page is for a quiet self-check first.',
                    ],
                ],
            ],
            links: [
                ['href' => '/features/ai-recite', 'label' => 'AI Recite and Check what you kept'],
                ['href' => '/guides/quran-memorization-techniques', 'label' => 'Memorization techniques'],
                ['href' => '/features/quran-revision', 'label' => 'Revision after a check'],
                ['href' => '/tools', 'label' => 'All free tools'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Tools', 'path' => '/tools', 'host' => 'app'],
                ['name' => 'Memorization test', 'path' => '/tools/quran-memorization-test', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'website'],
            sitemapPriority: '0.85',
            tool: 'quiz',
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
            description: 'Type the first Arabic words of an ayah to find matching verses. Public, text-only Find an ayah using Mutqin’s matcher. Voice search stays in the workspace.',
            h1: 'Find an ayah from Arabic you type',
            lede: 'Remember the sound of a line but not the surah number? Type at least three Arabic words from the start of the verse. Matching uses the same prefix matcher as Mutqin’s Find an ayah — without a microphone and without sending your wording to analytics.',
            sections: [
                [
                    'h2' => 'How the public finder works',
                    'paragraphs' => [
                        'The page loads Uthmani Quran text through Mutqin’s same-origin Quran proxy, builds the Ask Mutqin matching index, and ranks ayahs that fit the words you typed. If several ayahs are close, you see a short list.',
                    ],
                ],
                [
                    'h2' => 'Voice, audio, and opening a range',
                    'paragraphs' => [
                        'Reciting into the microphone, playing ayah audio, translations, and opening a span around the match happen in the memorisation workspace. This tool stops at identification so it can stay public and free of speech services.',
                    ],
                ],
            ],
            links: [
                ['href' => '/features/find-an-ayah', 'label' => 'Find an ayah in Mutqin'],
                ['href' => '/privacy', 'label' => 'How audio is handled'],
                ['href' => '/features/ai-recite', 'label' => 'AI Recite'],
                ['href' => '/tools/quran-memorization-test', 'label' => 'Memorization test'],
            ],
            breadcrumbs: [
                ['name' => 'Home', 'path' => '/', 'host' => 'marketing'],
                ['name' => 'Tools', 'path' => '/tools', 'host' => 'app'],
                ['name' => 'Find an ayah', 'path' => '/tools/find-an-ayah', 'host' => 'app'],
            ],
            jsonLd: ['organization', 'website'],
            sitemapPriority: '0.8',
            tool: 'find-ayah',
        );
    }

    /**
     * @param  list<array<string, mixed>>  $sections
     * @param  list<array{href: string, label: string}>  $links
     * @param  list<array{name: string, path: string, host?: string}>  $breadcrumbs
     * @param  list<string>  $jsonLd
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
            'cta_primary' => ['href' => '/waiting-list', 'label' => 'Join the waiting list'],
            'cta_secondary' => ['href' => '/memorisation', 'label' => 'Open memorisation'],
        ];
    }
}

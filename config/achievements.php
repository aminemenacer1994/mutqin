<?php

/**
 * Achievement catalog and thresholds for Mutqin.
 *
 * Stable IDs are storage keys; display names live in locale files.
 * Tiers organise badges (Beginner / Intermediate / Advanced) but do not gate unlocking.
 * Each achievement unlocks independently from its own activity criteria.
 */
return [
    'min_meaningful_duration_seconds' => max(0, (int) env('MUTQIN_ACHIEVEMENT_MIN_DURATION', 20)),

    'thresholds' => [
        'consistent_consecutive_days' => max(2, (int) env('MUTQIN_ACHIEVEMENT_CONSISTENT_DAYS', 3)),
        'reviser_revision_sessions' => max(1, (int) env('MUTQIN_ACHIEVEMENT_REVISER_SESSIONS', 10)),
        'dedicated_distinct_days' => max(1, (int) env('MUTQIN_ACHIEVEMENT_DEDICATED_DAYS', 7)),
        'growing_min_comparable_attempts' => max(3, (int) env('MUTQIN_ACHIEVEMENT_GROWING_ATTEMPTS', 3)),
        'growing_min_accuracy_delta' => max(1, (int) env('MUTQIN_ACHIEVEMENT_GROWING_DELTA', 8)),
        'growing_min_baseline_score' => max(0, (int) env('MUTQIN_ACHIEVEMENT_GROWING_BASELINE', 20)),
        'growing_max_score_for_ceiling' => min(100, max(50, (int) env('MUTQIN_ACHIEVEMENT_GROWING_CEILING', 98))),
        'memoriser_sessions' => max(1, (int) env('MUTQIN_ACHIEVEMENT_MEMORISER_SESSIONS', 5)),
        'explorer_distinct_surahs' => max(1, (int) env('MUTQIN_ACHIEVEMENT_EXPLORER_SURAHS', 3)),
        'steadfast_distinct_days' => max(1, (int) env('MUTQIN_ACHIEVEMENT_STEADFAST_DAYS', 14)),
    ],

    'weekly_goal_min' => 1,
    'weekly_goal_max' => 7,

    /*
     | Organisational tiers for display order. Badges unlock independently.
     */
    'tiers' => [
        'beginner' => [
            'id' => 'beginner',
            'sort' => 10,
            'achievements' => ['first_steps', 'checker', 'consistent'],
        ],
        'intermediate' => [
            'id' => 'intermediate',
            'sort' => 20,
            'achievements' => ['memoriser', 'explorer', 'dedicated'],
        ],
        'advanced' => [
            'id' => 'advanced',
            'sort' => 30,
            'achievements' => ['reviser', 'growing', 'focused', 'steadfast'],
        ],
    ],

    /*
     | unit drives live progress copy on the client:
     | session | streak | day | surah | revision | check | improvement | week
     */
    'definitions' => [
        'first_steps' => [
            'id' => 'first_steps',
            'tier' => 'beginner',
            'category' => 'practice',
            'unit' => 'session',
            'icon' => 'book',
            'sort' => 10,
        ],
        'checker' => [
            'id' => 'checker',
            'tier' => 'beginner',
            'category' => 'assessment',
            'unit' => 'check',
            'icon' => 'mic',
            'sort' => 20,
        ],
        'consistent' => [
            'id' => 'consistent',
            'tier' => 'beginner',
            'category' => 'consistency',
            'unit' => 'streak',
            'icon' => 'flame',
            'sort' => 30,
        ],
        'memoriser' => [
            'id' => 'memoriser',
            'tier' => 'intermediate',
            'category' => 'practice',
            'unit' => 'session',
            'icon' => 'stars',
            'sort' => 40,
        ],
        'explorer' => [
            'id' => 'explorer',
            'tier' => 'intermediate',
            'category' => 'practice',
            'unit' => 'surah',
            'icon' => 'compass',
            'sort' => 50,
        ],
        'dedicated' => [
            'id' => 'dedicated',
            'tier' => 'intermediate',
            'category' => 'consistency',
            'unit' => 'day',
            'icon' => 'calendar',
            'sort' => 60,
        ],
        'reviser' => [
            'id' => 'reviser',
            'tier' => 'advanced',
            'category' => 'revision',
            'unit' => 'revision',
            'icon' => 'repeat',
            'sort' => 70,
        ],
        'growing' => [
            'id' => 'growing',
            'tier' => 'advanced',
            'category' => 'improvement',
            'unit' => 'improvement',
            'icon' => 'sprout',
            'sort' => 80,
        ],
        'focused' => [
            'id' => 'focused',
            'tier' => 'advanced',
            'category' => 'goal',
            'unit' => 'week',
            'icon' => 'target',
            'sort' => 90,
        ],
        'steadfast' => [
            'id' => 'steadfast',
            'tier' => 'advanced',
            'category' => 'consistency',
            'unit' => 'day',
            'icon' => 'shield',
            'sort' => 100,
        ],
    ],
];

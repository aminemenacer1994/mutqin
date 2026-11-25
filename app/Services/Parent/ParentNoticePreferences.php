<?php

namespace App\Services\Parent;

use App\Models\User;

/**
 * Parent notification toggles. Missing keys use the defaults.
 * Weekly summaries stay off until a parent opts in.
 */
final class ParentNoticePreferences
{
    /**
     * @var list<string>
     */
    public const KEYS = [
        'homework',
        'deadlines',
        'feedback',
        'messages',
        'updates',
        'attendance',
        'weekly_summary',
        'reports',
    ];

    /**
     * @return array<string, bool>
     */
    public function for(User $parent): array
    {
        $stored = is_array($parent->parent_notice_preferences) ? $parent->parent_notice_preferences : [];
        $preferences = [];
        foreach (self::KEYS as $key) {
            $preferences[$key] = array_key_exists($key, $stored)
                ? (bool) $stored[$key]
                : ! in_array($key, ['weekly_summary', 'reports'], true);
        }

        return $preferences;
    }

    public function allows(User $parent, string $key): bool
    {
        return (bool) ($this->for($parent)[$key] ?? false);
    }

    /**
     * @param  array<string, mixed>  $values
     * @return array<string, bool>
     */
    public function store(User $parent, array $values): array
    {
        $current = $this->for($parent);
        foreach (self::KEYS as $key) {
            if (array_key_exists($key, $values)) {
                $current[$key] = (bool) $values[$key];
            }
        }

        $parent->forceFill(['parent_notice_preferences' => $current])->save();

        return $current;
    }
}

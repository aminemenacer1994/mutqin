<?php

namespace App\Support;

/**
 * Read counts from the memorisation engine JSON blob (sync-state / client).
 */
final class MemorisationEngineState
{
    /**
     * @param  array<string, mixed>|null  $state
     */
    public static function countSavedSessions(?array $state): int
    {
        if ($state === null) {
            return 0;
        }

        $saved = $state['savedSessions'] ?? null;
        if (! is_array($saved) && is_array($state['workspaceState'] ?? null)) {
            $saved = $state['workspaceState']['savedSessions'] ?? null;
        }

        if (! is_array($saved)) {
            return 0;
        }

        return count(array_filter($saved, static fn ($row) => is_array($row) && ! empty($row['id'])));
    }
}
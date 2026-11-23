<?php

namespace App\Support;

use App\Models\AiReciteAttempt;
use Illuminate\Support\Collection;

/**
 * Identity for a stored recitation check.
 * Retries of the same session, assessment, or assignment event collapse to one row.
 */
class ScoredAttemptIdentity
{
    public static function key(AiReciteAttempt $attempt): string
    {
        $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
        $event = $attempt->user_session_id
            ? 'session:'.$attempt->user_session_id
            : ($attempt->memorisation_assessment_id
                ? 'assessment:'.$attempt->memorisation_assessment_id
                : ($attempt->teacher_assignment_recipient_id
                    ? 'assignment:'.$attempt->teacher_assignment_recipient_id
                    : ($attempt->session_recommendation_id
                        ? 'recommendation:'.$attempt->session_recommendation_id
                        : 'row:'.$attempt->id)));

        return implode('|', [
            $event,
            (string) ($range['surah'] ?? $range['surah_number'] ?? ''),
            (string) ($range['from'] ?? $range['start'] ?? ''),
            (string) ($range['to'] ?? $range['end'] ?? ''),
            (string) ($attempt->attempt_number ?? ''),
            (string) $attempt->accuracy_percent,
            (string) $attempt->band,
        ]);
    }

    /**
     * @param  Collection<int, AiReciteAttempt>  $attempts
     * @return Collection<int, AiReciteAttempt>
     */
    public static function unique(Collection $attempts): Collection
    {
        return $attempts
            ->sortByDesc(fn (AiReciteAttempt $attempt) => $attempt->id)
            ->unique(fn (AiReciteAttempt $attempt) => self::key($attempt))
            ->values();
    }
}

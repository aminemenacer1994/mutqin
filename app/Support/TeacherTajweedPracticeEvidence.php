<?php

namespace App\Support;

use App\Models\AiReciteAttempt;

/**
 * Student session Tajweed practice aid — acoustic/timing hints only, not STT grading.
 */
final class TeacherTajweedPracticeEvidence
{
    /**
     * @return array<string, mixed>|null
     */
    public static function fromAttempt(AiReciteAttempt $attempt): ?array
    {
        $attempt->loadMissing('assessment:id,recognition_data');
        $raw = data_get($attempt->assessment?->recognition_data, 'tajweed_practice_check');
        if (! is_array($raw) || empty($raw['assessed'])) {
            return null;
        }

        $band = (string) ($raw['band'] ?? 'unable');
        if (! in_array($band, ['strong', 'average', 'needs_work', 'unable'], true)) {
            $band = 'unable';
        }

        $segments = [];
        foreach (array_slice(is_array($raw['segments'] ?? null) ? $raw['segments'] : [], 0, 40) as $segment) {
            if (! is_array($segment)) {
                continue;
            }
            $outcome = (string) ($segment['outcome'] ?? '');
            if (! in_array($outcome, ['practice', 'review'], true)) {
                continue;
            }
            $segments[] = [
                'verse_key' => mb_substr((string) ($segment['verseKey'] ?? ''), 0, 32),
                'word_index' => isset($segment['wordIndex']) ? (int) $segment['wordIndex'] : null,
                'rule_key' => mb_substr((string) ($segment['ruleKey'] ?? ''), 0, 64),
                'word' => mb_substr((string) ($segment['word'] ?? ''), 0, 120),
                'outcome' => $outcome,
                'hold' => mb_substr((string) ($segment['hold'] ?? ''), 0, 32),
                'sound' => mb_substr((string) ($segment['sound'] ?? ''), 0, 32),
            ];
        }

        if ($band === 'unable' && $segments === []) {
            return null;
        }

        return [
            'authority' => 'ai_practice_check',
            'is_tajweed_assessment' => false,
            'version' => (int) ($raw['version'] ?? 1),
            'band' => $band,
            'headline' => self::text($raw['headline'] ?? null, 280),
            'summary' => self::text($raw['summary'] ?? null, 500),
            'disclaimer' => self::text($raw['disclaimer'] ?? null, 280),
            'segment_count' => count($segments),
            'segments' => $segments,
        ];
    }

    private static function text(mixed $value, int $max): ?string
    {
        $trimmed = trim((string) $value);

        return $trimmed !== '' ? mb_substr($trimmed, 0, $max) : null;
    }
}
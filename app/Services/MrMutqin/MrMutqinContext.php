<?php

namespace App\Services\MrMutqin;

use App\Models\User;
use App\Support\TeacherFeatures;

/**
 * @phpstan-type MrMutqinContextShape array{
 *   role: string,
 *   shell: string,
 *   view: string|null,
 *   student_id: int|null,
 *   surah: int|null,
 *   ayah_start: int|null,
 *   ayah_end: int|null,
 *   playback_active: bool,
 *   assessment_active: bool,
 *   preferences: array<string, bool>,
 * }
 */
final class MrMutqinContext
{
    /**
     * @param  array<string, mixed>  $payload
     * @return MrMutqinContextShape
     */
    public static function fromRequest(User $user, array $payload): array
    {
        $clientRole = strtolower(trim((string) ($payload['role'] ?? '')));
        $role = match (true) {
            $clientRole === 'teacher' && $user->isTeacher() && TeacherFeatures::enabled() => 'teacher',
            $clientRole === 'student' || $clientRole === 'learner' => 'student',
            $user->isTeacher() && TeacherFeatures::enabled() => 'teacher',
            default => 'student',
        };

        $prefs = is_array($payload['preferences'] ?? null) ? $payload['preferences'] : [];
        $clientPrefs = is_array($payload['client_preferences'] ?? null) ? $payload['client_preferences'] : [];

        return [
            'role' => $role,
            'shell' => self::clip((string) ($payload['shell'] ?? 'dashboard'), 32),
            'view' => self::nullableClip($payload['view'] ?? $payload['pane'] ?? null, 48),
            'student_id' => self::nullablePositiveInt($payload['student_id'] ?? $payload['selected_student_id'] ?? null),
            'surah' => self::nullablePositiveInt($payload['surah'] ?? null, 114),
            'ayah_start' => self::nullablePositiveInt($payload['ayah_start'] ?? null, 286),
            'ayah_end' => self::nullablePositiveInt($payload['ayah_end'] ?? null, 286),
            'playback_active' => filter_var($payload['playback_active'] ?? false, FILTER_VALIDATE_BOOL),
            'assessment_active' => filter_var($payload['assessment_active'] ?? false, FILTER_VALIDATE_BOOL),
            'preferences' => [
                'answer_only' => self::boolPref($prefs, $clientPrefs, 'answer_only'),
                'navigate_only' => self::boolPref($prefs, $clientPrefs, 'navigate_only'),
                'no_speech' => self::boolPref($prefs, $clientPrefs, 'no_speech'),
                'stay_on_page' => self::boolPref($prefs, $clientPrefs, 'stay_on_page'),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $a
     * @param  array<string, mixed>  $b
     */
    private static function boolPref(array $a, array $b, string $key): bool
    {
        if (array_key_exists($key, $b)) {
            return filter_var($b[$key], FILTER_VALIDATE_BOOL);
        }
        if (array_key_exists($key, $a)) {
            return filter_var($a[$key], FILTER_VALIDATE_BOOL);
        }

        return false;
    }

    private static function clip(string $value, int $max): string
    {
        $value = trim($value);

        return $value === '' ? 'dashboard' : mb_substr($value, 0, $max);
    }

    private static function nullableClip(mixed $value, int $max): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return mb_substr(trim((string) $value), 0, $max);
    }

    private static function nullablePositiveInt(mixed $value, int $max = PHP_INT_MAX): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        $int = (int) $value;
        if ($int < 1 || $int > $max) {
            return null;
        }

        return $int;
    }
}
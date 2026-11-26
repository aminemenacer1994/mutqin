<?php

namespace App\Support;

use App\Services\AskMutqin\CommandValidator;

/** Optional reciter / playback preferences stored on teacher memorisation assignments. */
final class AssignmentListeningSettings
{
    private const TECHNIQUES = ['talqin', 'focus', 'blur'];

    /**
     * @param  array<string, mixed>|null  $input
     * @return array<string, mixed>|null
     */
    public static function sanitize(?array $input): ?array
    {
        if ($input === null || $input === []) {
            return null;
        }

        $clean = [];

        $reciter = isset($input['reciter']) ? trim((string) $input['reciter']) : '';
        if ($reciter !== '' && array_key_exists($reciter, CommandValidator::RECITERS)) {
            $clean['reciter'] = $reciter;
        }

        $speedRaw = $input['speed'] ?? $input['playback_speed'] ?? null;
        if ($speedRaw !== null && $speedRaw !== '') {
            $speed = self::snapSpeed($speedRaw);
            if ($speed !== null) {
                $clean['speed'] = $speed;
            }
        }

        if (isset($input['repetitions']) && is_numeric($input['repetitions'])) {
            $reps = (int) round((float) $input['repetitions']);
            if ($reps >= 1) {
                $clean['repetitions'] = max(1, min(8, $reps));
            }
        }

        if (isset($input['technique']) && $input['technique'] !== '' && $input['technique'] !== null) {
            $technique = strtolower(trim((string) $input['technique']));
            if (in_array($technique, self::TECHNIQUES, true)) {
                $clean['technique'] = $technique;
            }
        }

        if (isset($input['repetitions_per_ayah']) && is_array($input['repetitions_per_ayah'])) {
            $perAyah = [];
            foreach ($input['repetitions_per_ayah'] as $ayah => $count) {
                if (! is_numeric($ayah) || ! is_numeric($count)) {
                    continue;
                }
                $ayahNum = (int) $ayah;
                $reps = (int) round((float) $count);
                if ($ayahNum < 1 || $ayahNum > 300 || $reps < 1 || $reps > 8) {
                    continue;
                }
                $perAyah[$ayahNum] = $reps;
            }
            if ($perAyah !== []) {
                ksort($perAyah);
                $clean['repetitions_per_ayah'] = $perAyah;
            }
        }

        $progressive = AssignmentProgressiveHidingSettings::sanitize(
            is_array($input['progressive_hiding'] ?? null) ? $input['progressive_hiding'] : null
        );
        if ($progressive !== null) {
            $clean['progressive_hiding'] = $progressive;
        }

        $merged = AssignmentProgressiveHidingSettings::mergeListeningSettings($clean);
        if (! $merged['ok']) {
            unset($merged['session_settings']['progressive_hiding']);
        }

        $clean = $merged['session_settings'];

        return $clean === [] ? null : $clean;
    }

    /**
     * @param  array<string, scalar|null>  $params
     * @param  array<string, mixed>|null  $settings
     * @return array<string, scalar|null>
     */
    public static function mergeIntoMemorisationQuery(array $params, ?array $settings): array
    {
        if (! is_array($settings) || $settings === []) {
            return $params;
        }

        foreach (['reciter', 'speed', 'repetitions', 'technique'] as $key) {
            if (! array_key_exists($key, $settings)) {
                continue;
            }
            $value = $settings[$key];
            if ($value === null || $value === '') {
                continue;
            }
            $params[$key] = $value;
        }

        return AssignmentProgressiveHidingSettings::mergeIntoMemorisationQuery($settings, $params);
    }

    public static function reciterLabel(?string $reciterId): ?string
    {
        if ($reciterId === null || $reciterId === '') {
            return null;
        }

        return CommandValidator::RECITERS[$reciterId] ?? null;
    }

    /**
     * @param  array<string, mixed>|null  $settings
     */
    public static function hasListeningRecommendation(?array $settings): bool
    {
        return is_array($settings) && $settings !== [];
    }

    /**
     * @param  array<string, mixed>|null  $settings
     * @return array<string, mixed>
     */
    public static function present(?array $settings): array
    {
        if (! is_array($settings) || $settings === []) {
            return [];
        }

        $reciter = isset($settings['reciter']) ? (string) $settings['reciter'] : null;
        $payload = $settings;
        $label = self::reciterLabel($reciter);
        if ($label !== null) {
            $payload['reciter_label'] = $label;
        }

        return $payload;
    }

    private static function snapSpeed(mixed $value): ?float
    {
        if (! is_numeric($value)) {
            return null;
        }
        $speed = round((float) $value, 2);
        foreach (CommandValidator::SPEEDS as $allowed) {
            if (abs($speed - (float) $allowed) < 0.001) {
                return (float) $allowed;
            }
        }

        $closest = null;
        $delta = PHP_FLOAT_MAX;
        foreach (CommandValidator::SPEEDS as $allowed) {
            $diff = abs($speed - (float) $allowed);
            if ($diff < $delta) {
                $delta = $diff;
                $closest = (float) $allowed;
            }
        }

        return $closest;
    }
}
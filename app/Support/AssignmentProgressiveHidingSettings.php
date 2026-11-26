<?php

namespace App\Support;

/** Optional Progressive Mushaf Hiding stored on teacher assignment session_settings. */
final class AssignmentProgressiveHidingSettings
{
    /** @var list<int> */
    public const VISIBILITY_PERCENTS = [10, 25, 50, 75, 100];

    /**
     * @param  array<string, mixed>|null  $input
     * @return array<string, mixed>|null
     */
    public static function sanitize(?array $input): ?array
    {
        if ($input === null || $input === []) {
            return null;
        }

        $enabled = filter_var($input['enabled'] ?? false, FILTER_VALIDATE_BOOL);
        if (! $enabled) {
            return null;
        }

        $intensity = isset($input['blur_intensity']) && is_numeric($input['blur_intensity'])
            ? (int) round((float) $input['blur_intensity'])
            : 10;
        $intensity = max(4, min(18, $intensity));

        $stageReps = isset($input['stage_repetitions']) && is_numeric($input['stage_repetitions'])
            ? (int) round((float) $input['stage_repetitions'])
            : 3;
        $stageReps = max(1, min(8, $stageReps));

        $visibility = isset($input['starting_visibility_percent']) && is_numeric($input['starting_visibility_percent'])
            ? (int) $input['starting_visibility_percent']
            : 100;
        if (! in_array($visibility, self::VISIBILITY_PERCENTS, true)) {
            $visibility = 100;
        }

        $hintsAllowed = filter_var($input['hints_allowed'] ?? true, FILTER_VALIDATE_BOOL);

        return [
            'enabled' => true,
            'blur_intensity' => $intensity,
            'hints_allowed' => $hintsAllowed,
            'stage_repetitions' => $stageReps,
            'starting_visibility_percent' => $visibility,
            'final_hidden_recitation' => filter_var($input['final_hidden_recitation'] ?? false, FILTER_VALIDATE_BOOL),
            'final_ai_assessment' => filter_var($input['final_ai_assessment'] ?? false, FILTER_VALIDATE_BOOL),
        ];
    }

    /**
     * @param  array<string, mixed>  $sessionSettings
     * @return array{ok: bool, session_settings: array<string, mixed>, progressive_hiding: array<string, mixed>|null}
     */
    public static function mergeListeningSettings(array $sessionSettings): array
    {
        $hiding = self::sanitize(
            is_array($sessionSettings['progressive_hiding'] ?? null) ? $sessionSettings['progressive_hiding'] : null
        );
        if ($hiding === null) {
            unset($sessionSettings['progressive_hiding']);

            return ['ok' => true, 'session_settings' => $sessionSettings, 'progressive_hiding' => null];
        }

        $technique = strtolower(trim((string) ($sessionSettings['technique'] ?? '')));
        if ($technique === 'focus') {
            return ['ok' => false, 'session_settings' => $sessionSettings, 'progressive_hiding' => $hiding];
        }

        $perAyah = $sessionSettings['repetitions_per_ayah'] ?? null;
        if (is_array($perAyah) && $perAyah !== []) {
            return ['ok' => false, 'session_settings' => $sessionSettings, 'progressive_hiding' => $hiding];
        }

        $sessionSettings['progressive_hiding'] = $hiding;
        $sessionSettings['technique'] = 'blur';

        return ['ok' => true, 'session_settings' => $sessionSettings, 'progressive_hiding' => $hiding];
    }

    /**
     * @param  array<string, mixed>|null  $sessionSettings
     * @param  array<string, scalar|null>  $params
     * @return array<string, scalar|null>
     */
    public static function mergeIntoMemorisationQuery(?array $sessionSettings, array $params): array
    {
        $hiding = is_array($sessionSettings['progressive_hiding'] ?? null)
            ? $sessionSettings['progressive_hiding']
            : null;
        if (! is_array($hiding) || empty($hiding['enabled'])) {
            return $params;
        }

        $params['technique'] = 'blur';
        $params['assignment_hiding'] = '1';
        if (isset($hiding['blur_intensity'])) {
            $params['blur_intensity'] = (int) $hiding['blur_intensity'];
        }
        if (isset($hiding['stage_repetitions'])) {
            $params['repetitions'] = (int) $hiding['stage_repetitions'];
        }
        if (array_key_exists('hints_allowed', $hiding) && $hiding['hints_allowed'] === false) {
            $params['hints_allowed'] = '0';
        }
        if (! empty($hiding['final_ai_assessment'])) {
            $params['ai_check'] = '1';
        }

        return $params;
    }

    /**
     * @param  array<string, mixed>|null  $settings
     */
    public static function isEnabled(?array $settings): bool
    {
        return is_array($settings)
            && is_array($settings['progressive_hiding'] ?? null)
            && ! empty($settings['progressive_hiding']['enabled']);
    }

    /**
     * @param  array<string, mixed>|null  $settings
     * @return array<string, mixed>
     */
    public static function present(?array $settings): array
    {
        $hiding = self::sanitize(
            is_array($settings['progressive_hiding'] ?? null) ? $settings['progressive_hiding'] : null
        );

        return $hiding ?? [];
    }
}
<?php

namespace App\Services\Auth;

use App\Models\User;

/**
 * Per-user AI Recite + AMD (Check memorisation) settings.
 *
 * AI Recite and AMD are separate product surfaces with distinct knobs.
 * Unknown keys are stripped; invalid values fall back to defaults.
 */
class AiSessionSettingsService
{
    /** @var list<int> */
    public const AMD_HIDE_PERCENTS = [10, 25, 50, 75, 100];

    /**
     * @return array{
     *     ai_recite: array{
     *         recall_mode_enabled: bool,
     *         strict_progression: bool,
     *         persist_mistakes: bool
     *     },
     *     amd: array{
     *         hide_percent: int,
     *         mistake_sound_enabled: bool
     *     }
     * }
     */
    public static function defaults(): array
    {
        return [
            'ai_recite' => [
                'recall_mode_enabled' => false,
                'strict_progression' => false,
                'persist_mistakes' => false,
            ],
            'amd' => [
                'hide_percent' => 100,
                'mistake_sound_enabled' => true,
            ],
        ];
    }

    /**
     * @param  array<string, mixed>|null  $raw
     * @return array{
     *     ai_recite: array{
     *         recall_mode_enabled: bool,
     *         strict_progression: bool,
     *         persist_mistakes: bool
     *     },
     *     amd: array{
     *         hide_percent: int,
     *         mistake_sound_enabled: bool
     *     }
     * }
     */
    public function normalise(?array $raw): array
    {
        $defaults = self::defaults();
        if (! is_array($raw)) {
            return $defaults;
        }

        $aiRecite = is_array($raw['ai_recite'] ?? null) ? $raw['ai_recite'] : [];
        $amd = is_array($raw['amd'] ?? null) ? $raw['amd'] : [];

        return [
            'ai_recite' => [
                'recall_mode_enabled' => $this->toBool(
                    $aiRecite['recall_mode_enabled'] ?? null,
                    $defaults['ai_recite']['recall_mode_enabled']
                ),
                'strict_progression' => $this->toBool(
                    $aiRecite['strict_progression'] ?? null,
                    $defaults['ai_recite']['strict_progression']
                ),
                'persist_mistakes' => $this->toBool(
                    $aiRecite['persist_mistakes'] ?? null,
                    $defaults['ai_recite']['persist_mistakes']
                ),
            ],
            'amd' => [
                'hide_percent' => $this->normaliseHidePercent(
                    $amd['hide_percent'] ?? null,
                    $defaults['amd']['hide_percent']
                ),
                'mistake_sound_enabled' => $this->toBool(
                    $amd['mistake_sound_enabled'] ?? null,
                    $defaults['amd']['mistake_sound_enabled']
                ),
            ],
        ];
    }

    /**
     * Merge a partial patch into existing settings (whitelist only).
     *
     * @param  array<string, mixed>|null  $existing
     * @param  array<string, mixed>  $patch
     * @return array{
     *     ai_recite: array{
     *         recall_mode_enabled: bool,
     *         strict_progression: bool,
     *         persist_mistakes: bool
     *     },
     *     amd: array{
     *         hide_percent: int,
     *         mistake_sound_enabled: bool
     *     }
     * }
     */
    public function merge(?array $existing, array $patch): array
    {
        $base = $this->normalise($existing);
        $aiPatch = is_array($patch['ai_recite'] ?? null) ? $patch['ai_recite'] : [];
        $amdPatch = is_array($patch['amd'] ?? null) ? $patch['amd'] : [];

        if (array_key_exists('recall_mode_enabled', $aiPatch)) {
            $base['ai_recite']['recall_mode_enabled'] = $this->toBool(
                $aiPatch['recall_mode_enabled'],
                $base['ai_recite']['recall_mode_enabled']
            );
        }
        if (array_key_exists('strict_progression', $aiPatch)) {
            $base['ai_recite']['strict_progression'] = $this->toBool(
                $aiPatch['strict_progression'],
                $base['ai_recite']['strict_progression']
            );
        }
        if (array_key_exists('persist_mistakes', $aiPatch)) {
            $base['ai_recite']['persist_mistakes'] = $this->toBool(
                $aiPatch['persist_mistakes'],
                $base['ai_recite']['persist_mistakes']
            );
        }

        if (array_key_exists('hide_percent', $amdPatch)) {
            $base['amd']['hide_percent'] = $this->normaliseHidePercent(
                $amdPatch['hide_percent'],
                $base['amd']['hide_percent']
            );
        }
        if (array_key_exists('mistake_sound_enabled', $amdPatch)) {
            $base['amd']['mistake_sound_enabled'] = $this->toBool(
                $amdPatch['mistake_sound_enabled'],
                $base['amd']['mistake_sound_enabled']
            );
        }

        return $base;
    }

    /**
     * @return array{
     *     ai_recite: array{
     *         recall_mode_enabled: bool,
     *         strict_progression: bool,
     *         persist_mistakes: bool
     *     },
     *     amd: array{
     *         hide_percent: int,
     *         mistake_sound_enabled: bool
     *     }
     * }
     */
    public function snapshot(?User $user): array
    {
        if (! $user) {
            return self::defaults();
        }

        $raw = $user->ai_session_settings;
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            $raw = is_array($decoded) ? $decoded : null;
        }

        return $this->normalise(is_array($raw) ? $raw : null);
    }

    /**
     * @param  array<string, mixed>  $patch
     * @return array{
     *     ai_recite: array{
     *         recall_mode_enabled: bool,
     *         strict_progression: bool,
     *         persist_mistakes: bool
     *     },
     *     amd: array{
     *         hide_percent: int,
     *         mistake_sound_enabled: bool
     *     }
     * }
     */
    public function update(User $user, array $patch): array
    {
        $merged = $this->merge(
            is_array($user->ai_session_settings) ? $user->ai_session_settings : null,
            $patch
        );

        $user->forceFill([
            'ai_session_settings' => $merged,
        ])->save();

        return $this->snapshot($user->fresh());
    }

    private function toBool(mixed $value, bool $fallback): bool
    {
        if ($value === null) {
            return $fallback;
        }

        $parsed = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($parsed === null) {
            return $fallback;
        }

        return $parsed;
    }

    private function normaliseHidePercent(mixed $value, int $fallback): int
    {
        if (! is_numeric($value)) {
            return $fallback;
        }

        $n = (int) round((float) $value);

        return in_array($n, self::AMD_HIDE_PERCENTS, true) ? $n : $fallback;
    }
}

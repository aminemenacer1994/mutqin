<?php

namespace App\Support;

/**
 * Canonical Mutqin colour modes. Keep in sync with resources/js/utils/theme.js.
 * Do not add modes here unless they already exist as html[data-theme] tokens.
 */
final class Theme
{
    public const DEFAULT = 'light';

    public const DEFAULT_PREFERENCE = 'light-mode';

    /**
     * @var array<string, array{
     *     id: string,
     *     preference: string,
     *     icon: string,
     *     label_key: string,
     *     theme_color: string,
     *     background_color: string,
     *     color_scheme: string
     * }>
     */
    public const MODES = [
        'light' => [
            'id' => 'light',
            'preference' => 'light-mode',
            'icon' => 'bi-sun',
            'label_key' => 'theme_light',
            'theme_color' => '#8b5e3c',
            'background_color' => '#f6f3ee',
            'color_scheme' => 'light',
        ],
        'sepia' => [
            'id' => 'sepia',
            'preference' => 'sepia-mode',
            'icon' => 'bi-book',
            'label_key' => 'theme_sepia',
            'theme_color' => '#8b5e3c',
            'background_color' => '#f1e7d8',
            'color_scheme' => 'light',
        ],
        'dark' => [
            'id' => 'dark',
            'preference' => 'dark-mode',
            'icon' => 'bi-moon-stars',
            'label_key' => 'theme_dark',
            'theme_color' => '#14110f',
            'background_color' => '#14110f',
            'color_scheme' => 'dark',
        ],
    ];

    /**
     * @var array<string, string>
     */
    public const ALIASES = [
        'light' => 'light-mode',
        'light-mode' => 'light-mode',
        'sepia' => 'sepia-mode',
        'sepia-mode' => 'sepia-mode',
        'dark' => 'dark-mode',
        'dark-mode' => 'dark-mode',
    ];

    /**
     * @return list<string>
     */
    public static function ids(): array
    {
        return array_keys(self::MODES);
    }

    /**
     * @return list<string>
     */
    public static function preferences(): array
    {
        return array_values(array_map(
            static fn (array $mode): string => $mode['preference'],
            self::MODES
        ));
    }

    /**
     * Values accepted by the profile theme API (short ids and preference strings).
     *
     * @return list<string>
     */
    public static function acceptedInput(): array
    {
        return array_keys(self::ALIASES);
    }

    /**
     * @return list<array{
     *     id: string,
     *     preference: string,
     *     icon: string,
     *     label_key: string,
     *     theme_color: string,
     *     background_color: string,
     *     color_scheme: string
     * }>
     */
    public static function modes(): array
    {
        return array_values(self::MODES);
    }

    /**
     * @return array{
     *     id: string,
     *     preference: string,
     *     icon: string,
     *     label_key: string,
     *     theme_color: string,
     *     background_color: string,
     *     color_scheme: string
     * }
     */
    public static function mode(?string $value = self::DEFAULT): array
    {
        $id = self::toDataTheme($value);

        return self::MODES[$id];
    }

    public static function normalizePreference(?string $value): string
    {
        if (! is_string($value) || $value === '') {
            return self::DEFAULT_PREFERENCE;
        }

        return self::ALIASES[strtolower($value)] ?? self::DEFAULT_PREFERENCE;
    }

    public static function toDataTheme(?string $value): string
    {
        $preference = self::normalizePreference($value);

        foreach (self::MODES as $mode) {
            if ($mode['preference'] === $preference) {
                return $mode['id'];
            }
        }

        return self::DEFAULT;
    }

    /**
     * @return array{theme_color: string, background_color: string, color_scheme: string}
     */
    public static function chrome(?string $value = self::DEFAULT): array
    {
        $mode = self::mode($value);

        return [
            'theme_color' => $mode['theme_color'],
            'background_color' => $mode['background_color'],
            'color_scheme' => $mode['color_scheme'],
        ];
    }

    /**
     * Browser catalog (camelCase) for FOUC + navbar scripts.
     *
     * @return list<array{
     *     id: string,
     *     preference: string,
     *     icon: string,
     *     labelKey: string,
     *     themeColor: string,
     *     backgroundColor: string,
     *     colorScheme: string
     * }>
     */
    public static function clientCatalog(): array
    {
        return array_map(static fn (array $mode): array => [
            'id' => $mode['id'],
            'preference' => $mode['preference'],
            'icon' => $mode['icon'],
            'labelKey' => $mode['label_key'],
            'themeColor' => $mode['theme_color'],
            'backgroundColor' => $mode['background_color'],
            'colorScheme' => $mode['color_scheme'],
        ], self::modes());
    }
}

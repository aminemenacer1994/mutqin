<?php

namespace Tests\Unit;

use App\Support\Theme;
use PHPUnit\Framework\TestCase;

class ThemeTest extends TestCase
{
    public function test_catalog_contains_only_light_and_dark(): void
    {
        $this->assertSame(['light', 'sepia', 'dark'], Theme::ids());
        $this->assertSame(['light', 'sepia', 'dark'], Theme::preferences());
        $this->assertSame('light', Theme::DEFAULT);
        $this->assertSame('light', Theme::DEFAULT_PREFERENCE);
    }

    public function test_aliases_normalize_to_light_or_dark(): void
    {
        $this->assertSame('sepia', Theme::normalizePreference('sepia'));
        $this->assertSame('dark', Theme::normalizePreference('DARK'));
        $this->assertSame('light', Theme::normalizePreference('light-mode'));
        $this->assertSame('light', Theme::normalizePreference('night'));
        $this->assertSame('light', Theme::normalizePreference(null));
    }

    public function test_data_theme_and_chrome_come_from_the_catalog(): void
    {
        $this->assertSame('sepia', Theme::toDataTheme('sepia-mode'));
        $this->assertSame('dark', Theme::toDataTheme('dark'));
        $this->assertSame('light', Theme::toDataTheme('unknown'));

        $this->assertSame('#14110f', Theme::chrome('dark')['theme_color']);
        $this->assertSame('#f6f3ee', Theme::chrome('light')['background_color']);
        $this->assertSame('light', Theme::chrome('light')['color_scheme']);
        $this->assertSame('bi-moon-stars', Theme::mode('dark')['icon']);
    }

    public function test_client_catalog_matches_mode_ids(): void
    {
        $ids = array_column(Theme::clientCatalog(), 'id');
        $this->assertSame(Theme::ids(), $ids);
        $this->assertSame('theme_light', Theme::clientCatalog()[0]['labelKey']);
    }
}

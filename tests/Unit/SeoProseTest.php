<?php

namespace Tests\Unit;

use App\Support\Seo\SeoProse;
use PHPUnit\Framework\TestCase;

class SeoProseTest extends TestCase
{
    public function test_renders_safe_relative_links(): void
    {
        $html = SeoProse::toHtml('See the [Quran memorization planner](/tools/quran-memorization-planner) today.');

        $this->assertStringContainsString(
            '<a href="/tools/quran-memorization-planner">Quran memorization planner</a>',
            $html
        );
        $this->assertStringNotContainsString('<script', $html);
    }

    public function test_escapes_html_and_rejects_unsafe_hrefs(): void
    {
        $html = SeoProse::toHtml('Bad <b>tag</b> and [x](javascript:alert(1)) plus [ok](/guides/hifz-revision).');

        $this->assertStringContainsString('&lt;b&gt;tag&lt;/b&gt;', $html);
        $this->assertStringNotContainsString('javascript:', $html);
        $this->assertStringContainsString('<a href="/guides/hifz-revision">ok</a>', $html);
    }
}

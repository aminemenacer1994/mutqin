<?php

namespace Tests\Unit;

use App\Support\MixAssetUrl;
use Tests\TestCase;

class MixAssetUrlTest extends TestCase
{
    public function test_with_manifest_build_includes_build_query_param(): void
    {
        if (! is_file(public_path('mix-manifest.json'))) {
            $this->markTestSkipped('mix-manifest.json missing — run npm run build');
        }

        $url = MixAssetUrl::withManifestBuild('css/app.css');

        $this->assertStringContainsString('/css/app.css', $url);
        $this->assertMatchesRegularExpression('/([?&])build=[a-f0-9]{12}/', $url);
    }

    public function test_compiled_styles_exist_after_build(): void
    {
        if (! is_file(public_path('mix-manifest.json'))) {
            $this->markTestSkipped('mix-manifest.json missing — run npm run build');
        }

        $this->assertTrue(
            MixAssetUrl::compiledStylesExist(),
            'public/css/app.css is missing — run npm run build (assets are gitignored).'
        );
    }
}

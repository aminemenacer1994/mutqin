<?php

namespace Tests\Unit;

use App\Support\Madani\MadaniV2StaticExporter;
use App\Support\Madani\MadaniV2StaticPaths;
use App\Support\Madani\QpcV2PageAdapter;
use Tests\TestCase;

class MadaniV2StaticExporterTest extends TestCase
{
    public function test_build_page_envelope_matches_adapter_payload(): void
    {
        $adapter = new QpcV2PageAdapter;
        $exporter = new MadaniV2StaticExporter($adapter);

        foreach ([1, 2, 6, 300, 603, 604] as $page) {
            $envelope = $exporter->buildPageEnvelope($page);
            $live = $adapter->page($page);

            $this->assertSame($live, $envelope['page']);
            $this->assertSame(QpcV2PageAdapter::pageFontFamily($page), $envelope['font_family']);
            $this->assertSame(MadaniV2StaticPaths::fontUrl($page), $envelope['font_url']);
        }
    }
}

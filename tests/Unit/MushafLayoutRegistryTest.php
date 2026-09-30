<?php

namespace Tests\Unit;

use App\Support\Madani\MadaniPagePair;
use App\Support\Madani\QpcV2PageAdapter;
use App\Support\Mushaf\MushafLayoutRegistry;
use App\Support\Mushaf\MushafPageRepository;
use InvalidArgumentException;
use Tests\TestCase;

class MushafLayoutRegistryTest extends TestCase
{
    public function test_registry_includes_madani_and_indopak_with_distinct_page_counts(): void
    {
        $madani = MushafLayoutRegistry::get('madani-v2');
        $indopak = MushafLayoutRegistry::get('indopak-15-qudratullah');

        $this->assertSame('madani-v2', $madani->id);
        $this->assertSame('Madani', $madani->name);
        $this->assertSame('V2', $madani->variant);
        $this->assertSame(604, $madani->pageCount);
        $this->assertSame(15, $madani->defaultLinesPerPage);
        $this->assertSame('rtl', $madani->direction);
        $this->assertSame('QCF2', $madani->fontFamily);

        $this->assertSame('indopak-15-qudratullah', $indopak->id);
        $this->assertSame('IndoPak 15 Lines', $indopak->name);
        $this->assertSame('Qudratullah', $indopak->variant);
        $this->assertSame(610, $indopak->pageCount);
        $this->assertSame(15, $indopak->defaultLinesPerPage);
        $this->assertSame('rtl', $indopak->direction);
        $this->assertSame('IndopakNastaleeq', $indopak->fontFamily);
        $this->assertStringEndsWith('quran/indopak-15-qudratullah/generated', $indopak->dataRoot);

        $this->assertNotSame($madani->pageCount, $indopak->pageCount);
        $this->assertSame(['madani-v2', 'indopak-15-qudratullah'], MushafLayoutRegistry::ids());
        $this->assertSame('madani-v2', MushafLayoutRegistry::default()->id);
    }

    public function test_page_clamping_is_layout_specific(): void
    {
        $madani = MushafLayoutRegistry::madaniV2();
        $indopak = MushafLayoutRegistry::indopak15Qudratullah();

        $this->assertSame(604, $madani->clampPage(605));
        $this->assertSame(610, $indopak->clampPage(611));
        $this->assertTrue($indopak->hasPage(610));
        $this->assertFalse($madani->hasPage(610));
        $this->assertFalse($indopak->hasPage(0));
        $this->assertSame('001.json', $madani->pageFileName(1));
        $this->assertSame('1.json', $indopak->pageFileName(1));
        $this->assertSame('610.json', $indopak->pageFileName(610));
    }

    public function test_madani_adapter_and_pairing_still_use_604(): void
    {
        $this->assertSame(604, QpcV2PageAdapter::MAX_PAGE);
        $this->assertSame(QpcV2PageAdapter::MAX_PAGE, MushafLayoutRegistry::madaniV2()->pageCount);
        $this->assertSame(604, MadaniPagePair::clamp(605));
        $this->assertSame([603, 604], MadaniPagePair::spread(604)['pages']);
        $this->assertNull(MadaniPagePair::nextPage(604));
    }

    public function test_indopak_repository_reads_generated_pages_without_assuming_604(): void
    {
        $repository = MushafPageRepository::forId('indopak-15-qudratullah');
        $page1 = $repository->page(1);
        $page610 = $repository->page(610);

        $this->assertSame(1, $page1['pageNumber']);
        $this->assertSame(610, $page610['pageNumber']);
        $this->assertArrayHasKey('1:1', $repository->versePageMap());
        $this->assertArrayHasKey('114:6', $repository->versePageMap());
        $this->assertSame(610, $repository->layout()->pageCount);

        $this->expectException(\RuntimeException::class);
        $repository->page(611);
    }

    public function test_unknown_layout_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Unknown mushaf layout');
        MushafLayoutRegistry::get('unknown-layout');
    }
}

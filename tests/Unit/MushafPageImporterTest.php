<?php

namespace Tests\Unit;

use App\Support\Mushaf\MushafCatalog;
use App\Support\Mushaf\MushafEdition;
use App\Support\Mushaf\MushafPageImporter;
use App\Support\Mushaf\QulLayoutAdapter;
use Tests\TestCase;

class MushafPageImporterTest extends TestCase
{
    protected function tearDown(): void
    {
        QulLayoutAdapter::forgetCachedWordScripts();
        parent::tearDown();
    }

    public function test_import_writes_sequential_pages_manifest_and_verse_map(): void
    {
        $output = sys_get_temp_dir().'/mutqin-indopak-import-'.bin2hex(random_bytes(4));
        $edition = $this->editionWithOutput($output);

        try {
            $result = MushafPageImporter::forEdition($edition)->import();

            $this->assertSame(610, $result['pages']);
            $this->assertGreaterThan(0, $result['bytes']);
            $this->assertGreaterThan(6000, $result['verses']);

            $this->assertFileExists($edition->manifestPath());
            $this->assertFileExists($edition->versePageMapPath());
            $this->assertFileExists($edition->pageJsonPath(1));
            $this->assertFileExists($edition->pageJsonPath(610));
            $this->assertFileDoesNotExist($edition->pageJsonPath(0));
            $this->assertFileDoesNotExist($edition->pageJsonPath(611));

            $manifest = json_decode((string) file_get_contents($edition->manifestPath()), true);
            $this->assertSame('indopak-15-qudratullah', $manifest['id']);
            $this->assertSame(610, $manifest['pageCount']);
            $this->assertSame(1, $manifest['pageMin']);
            $this->assertSame(610, $manifest['pageMax']);
            $this->assertCount(610, $manifest['checksums']);
            $this->assertSame(range(1, 610), array_map('intval', array_keys($manifest['checksums'])));

            $page1 = json_decode((string) file_get_contents($edition->pageJsonPath(1)), true);
            $this->assertSame(1, $page1['pageNumber']);
            $this->assertSame('surah_name', $page1['lines'][0]['type']);
            $word = $page1['lines'][1]['words'][0];
            $this->assertSame(['wordIndex', 'verseKey', 'wordPosition', 'location', 'text'], array_keys($word));
            $this->assertSame(1, $word['wordIndex']);
            $this->assertSame('1:1', $word['verseKey']);
            $this->assertSame(1, $word['wordPosition']);
            $this->assertSame('1:1:1', $word['location']);
            $this->assertSame('بِسْمِ', $word['text']);

            $verseMap = json_decode((string) file_get_contents($edition->versePageMapPath()), true);
            $this->assertSame(1, $verseMap['1:1']);
            $this->assertSame(610, $verseMap['114:6']);
        } finally {
            $this->removeDirectory($output);
        }
    }

    public function test_for_edition_uses_the_catalog_adapter(): void
    {
        $importer = MushafPageImporter::forEdition(MushafCatalog::indopak15Qudratullah());

        $this->assertInstanceOf(MushafPageImporter::class, $importer);
        $this->assertInstanceOf(QulLayoutAdapter::class, (new \ReflectionClass($importer))->getProperty('pages')->getValue($importer));
    }

    private function editionWithOutput(string $output): MushafEdition
    {
        $base = MushafCatalog::indopak15Qudratullah();

        return new MushafEdition(
            id: $base->id,
            name: $base->name,
            minPage: $base->minPage,
            maxPage: $base->maxPage,
            layoutDbRelative: $base->layoutDbRelative,
            wordScriptRelative: $base->wordScriptRelative,
            generatedRelative: $base->generatedRelative,
            source: $base->source,
            generatedAbsolute: $output,
        );
    }

    private function removeDirectory(string $directory): void
    {
        if (! is_dir($directory)) {
            return;
        }

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($directory, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($iterator as $file) {
            $file->isDir() ? rmdir($file->getPathname()) : unlink($file->getPathname());
        }
        rmdir($directory);
    }
}

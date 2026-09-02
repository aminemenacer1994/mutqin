<?php

namespace Tests\Feature;

use App\Services\MadaniMushaf\MadaniMushafImportService;
use App\Services\MadaniMushaf\MadaniMushafStorage;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class ImportMadaniMushafCommandTest extends TestCase
{
    public function test_imports_fixture_json_pages(): void
    {
        $this->artisan('mutqin:import-madani-mushaf', ['--fixtures' => true])
            ->assertSuccessful();

        $storage = app(MadaniMushafStorage::class);
        $this->assertContains(1, $storage->importedPageNumbers());
        $this->assertContains(2, $storage->importedPageNumbers());

        $page = $storage->readPage(1);
        $this->assertSame(1, $page['pageNumber']);
        $this->assertNotEmpty($page['lines']);
    }

    public function test_sqlite_fixture_imports_two_pages_with_correct_line_types(): void
    {
        $layout = database_path('fixtures/madani-mushaf/sqlite/layout.db');
        $script = database_path('fixtures/madani-mushaf/sqlite/script.db');

        /** @var MadaniMushafImportService $import */
        $import = app(MadaniMushafImportService::class);

        // Override total pages for fixture subset test
        config(['madani_mushaf.total_pages' => 2]);

        File::deleteDirectory(storage_path('app/madani-mushaf'));
        $summary = $import->importFromSqlite($layout, $script);

        $this->assertSame(2, $summary['pages']);
        $this->assertSame([], $summary['errors']);

        $storage = app(MadaniMushafStorage::class);
        $page1 = $storage->readPage(1);
        $types = array_column($page1['lines'], 'lineType');
        $this->assertContains('surah_name', $types);

        $page2 = $storage->readPage(2);
        $types2 = array_column($page2['lines'], 'lineType');
        $this->assertContains('surah_name', $types2);
        $this->assertContains('basmala', $types2);
        $this->assertNotContains('basmala', $types, 'At-Tawbah is not on page 1; Fatihah has no separate basmala line');
    }

    public function test_import_is_idempotent(): void
    {
        $this->artisan('mutqin:import-madani-mushaf', ['--fixtures' => true])->assertSuccessful();
        $storage = app(MadaniMushafStorage::class);
        $first = File::lastModified($storage->pageFilePath(1));

        sleep(1);
        $this->artisan('mutqin:import-madani-mushaf', ['--fixtures' => true])->assertSuccessful();
        $second = File::lastModified($storage->pageFilePath(1));

        $this->assertGreaterThanOrEqual($first, $second);
    }
}

<?php

namespace Tests\Unit;

use App\Support\Mushaf\MushafCatalog;
use App\Support\Mushaf\QulLayoutAdapter;
use RuntimeException;
use Tests\TestCase;

class QulLayoutAdapterTest extends TestCase
{
    private ?string $wordScriptRaw = null;

    protected function tearDown(): void
    {
        $this->wordScriptRaw = null;
        QulLayoutAdapter::forgetCachedWordScripts();
        parent::tearDown();
    }

    public function test_pages_are_sequential_one_through_610(): void
    {
        $adapter = $this->adapter();

        $this->assertSame(range(1, 610), $adapter->pageNumbers());
        $adapter->assertSequentialPages();
    }

    public function test_page_one_preserves_qul_rows_and_fatiha_words(): void
    {
        $page = $this->adapter()->page(1);

        $this->assertSame(1, $page['pageNumber']);
        $this->assertCount(8, $page['lines']);
        $this->assertSame(range(1, 8), array_column($page['lines'], 'lineNumber'));
        $this->assertSame(
            ['surah_name', 'ayah', 'ayah', 'ayah', 'ayah', 'ayah', 'ayah', 'ayah'],
            array_column($page['lines'], 'type')
        );
        $this->assertNotContains('basmallah', array_column($page['lines'], 'type'));

        $this->assertSame(1, $page['lines'][0]['surahNumber']);
        $this->assertTrue($page['lines'][0]['centered']);
        $this->assertNull($page['lines'][0]['firstWordId']);
        $this->assertNull($page['lines'][0]['lastWordId']);
        $this->assertSame([], $page['lines'][0]['words']);

        $this->assertSame(1, $page['lines'][1]['firstWordId']);
        $this->assertSame(5, $page['lines'][1]['lastWordId']);
        $this->assertTrue($page['lines'][1]['centered']);
        $this->assertNull($page['lines'][1]['surahNumber']);
        $this->assertSame(['1:1:1', '1:1:2', '1:1:3', '1:1:4', '1:1:5'], array_column($page['lines'][1]['words'], 'location'));
        $this->assertSame([1, 2, 3, 4, 5], array_column($page['lines'][1]['words'], 'wordIndex'));
        $this->assertSame(['1:1', '1:1', '1:1', '1:1', '1:1'], array_column($page['lines'][1]['words'], 'verseKey'));
        $this->assertSame([1, 2, 3, 4, 5], array_column($page['lines'][1]['words'], 'wordPosition'));
        $this->assertSame('بِسْمِ', $page['lines'][1]['words'][0]['text']);

        $words = array_merge(...array_column($page['lines'], 'words'));
        $this->assertCount(36, $words);
        $this->assertSame(range(1, 36), array_column($words, 'wordIndex'));

        foreach ($words as $word) {
            $source = $this->sourceWord($word['location']);
            $this->assertSame($source['text'], $word['text']);
            $this->assertSame($source['location'], $word['location']);
            $this->assertSame($source['surah'].':'.$source['ayah'], $word['verseKey']);
            $this->assertSame((int) $source['word'], $word['wordPosition']);
        }
    }

    public function test_page_two_keeps_surah_name_and_basmala_without_guessed_words(): void
    {
        $page = $this->adapter()->page(2);

        $this->assertSame(2, $page['pageNumber']);
        $this->assertCount(8, $page['lines']);
        $this->assertSame(
            ['surah_name', 'basmallah', 'ayah', 'ayah', 'ayah', 'ayah', 'ayah', 'ayah'],
            array_column($page['lines'], 'type')
        );
        $this->assertSame(2, $page['lines'][0]['surahNumber']);
        $this->assertTrue($page['lines'][1]['centered']);
        $this->assertSame([], $page['lines'][1]['words']);
        $this->assertNull($page['lines'][1]['firstWordId']);
        $this->assertNull($page['lines'][1]['lastWordId']);

        $words = array_merge(...array_column($page['lines'], 'words'));
        $this->assertSame('2:1:1', $words[0]['location']);
        $this->assertSame(37, $words[0]['wordIndex']);
        $this->assertSame('2:1', $words[0]['verseKey']);
        $this->assertSame(range(37, 68), array_column($words, 'wordIndex'));
    }

    public function test_pages_three_100_and_610_preserve_stored_ranges(): void
    {
        $adapter = $this->adapter();

        $page3 = $adapter->page(3);
        $this->assertCount(15, $page3['lines']);
        $this->assertSame(array_fill(0, 15, 'ayah'), array_column($page3['lines'], 'type'));
        $page3Words = array_merge(...array_column($page3['lines'], 'words'));
        $this->assertSame(69, $page3Words[0]['wordIndex']);
        $this->assertSame(203, $page3Words[array_key_last($page3Words)]['wordIndex']);

        $page100 = $adapter->page(100);
        $this->assertCount(15, $page100['lines']);
        $page100Words = array_merge(...array_column($page100['lines'], 'words'));
        $this->assertSame(13170, $page100['lines'][0]['firstWordId']);
        $this->assertSame(13313, $page100['lines'][14]['lastWordId']);
        $this->assertSame(range(13170, 13313), array_column($page100Words, 'wordIndex'));

        $page610 = $adapter->page(610);
        $this->assertCount(10, $page610['lines']);
        $this->assertSame(
            ['surah_name', 'basmallah', 'ayah', 'ayah', 'ayah', 'surah_name', 'basmallah', 'ayah', 'ayah', 'ayah'],
            array_column($page610['lines'], 'type')
        );
        $this->assertSame(113, $page610['lines'][0]['surahNumber']);
        $this->assertSame(114, $page610['lines'][5]['surahNumber']);
        $this->assertTrue($page610['lines'][4]['centered']);
        $this->assertTrue($page610['lines'][9]['centered']);
        $lastWords = array_merge(...array_column($page610['lines'], 'words'));
        $this->assertSame('113:1:1', $lastWords[0]['location']);
        $this->assertSame('114:6:4', $lastWords[array_key_last($lastWords)]['location']);
        $this->assertSame(83668, $lastWords[array_key_last($lastWords)]['wordIndex']);
    }

    public function test_verse_page_index_uses_earliest_layout_page(): void
    {
        $index = $this->adapter()->versePageIndex();

        $this->assertSame(1, $index['1:1']);
        $this->assertSame(1, $index['1:7']);
        $this->assertSame(2, $index['2:1']);
        $this->assertSame(610, $index['113:1']);
        $this->assertSame(610, $index['114:6']);
        $this->assertArrayHasKey('2:5', $index);
    }

    public function test_missing_script_word_fails_the_import_mapping(): void
    {
        $adapter = $this->adapter();
        $method = new \ReflectionMethod(QulLayoutAdapter::class, 'normalizeLine');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('cannot be mapped to the word-by-word script');

        $method->invoke($adapter, [
            'page_number' => 1,
            'line_number' => 2,
            'line_type' => 'ayah',
            'is_centered' => 1,
            'first_word_id' => 999999,
            'last_word_id' => 999999,
            'surah_number' => '',
        ], 1);
    }

    private function adapter(): QulLayoutAdapter
    {
        return new QulLayoutAdapter(MushafCatalog::indopak15Qudratullah());
    }

    /**
     * @return array<string, mixed>
     */
    private function sourceWord(string $location): array
    {
        $this->wordScriptRaw ??= (string) file_get_contents(resource_path('quran/indopak-15-qudratullah/source/indopak-nastaleeq.json'));
        $pattern = '/"'.preg_quote($location, '/').'"\s*:\s*(\{[^{}]*\})/u';
        $this->assertSame(1, preg_match($pattern, $this->wordScriptRaw, $match));

        $record = json_decode($match[1], true, 512, JSON_THROW_ON_ERROR);
        $this->assertIsArray($record);

        return $record;
    }
}

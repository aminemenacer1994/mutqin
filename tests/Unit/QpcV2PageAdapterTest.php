<?php

namespace Tests\Unit;

use App\Support\Madani\QpcV2PageAdapter;
use Tests\TestCase;

class QpcV2PageAdapterTest extends TestCase
{
    public function test_page_one_uses_the_eight_stored_layout_rows(): void
    {
        $page = (new QpcV2PageAdapter)->pageOne();

        $this->assertSame(1, $page['page_number']);
        $this->assertSame('QCF2001', $page['font_family']);
        $this->assertCount(8, $page['lines']);
        $this->assertSame(range(1, 8), array_column($page['lines'], 'line_number'));
        $this->assertSame(
            ['surah_name', 'ayah', 'ayah', 'ayah', 'ayah', 'ayah', 'ayah', 'ayah'],
            array_column($page['lines'], 'line_type')
        );
        $this->assertNotContains('basmallah', array_column($page['lines'], 'line_type'));
    }

    public function test_page_one_preserves_centering_and_empty_surah_numbers(): void
    {
        $lines = (new QpcV2PageAdapter)->pageOne()['lines'];

        $this->assertSame(1, $lines[0]['surah_number']);
        $this->assertSame([], $lines[0]['words']);
        $this->assertSame(1, $lines[0]['is_centered']);

        foreach (array_slice($lines, 1) as $line) {
            $this->assertSame('', $line['surah_number']);
            $this->assertSame(1, $line['is_centered']);
            $this->assertNotEmpty($line['words']);
        }
    }

    public function test_page_one_word_ids_match_qpc_glyphs_exactly(): void
    {
        $lines = (new QpcV2PageAdapter)->pageOne()['lines'];

        $this->assertSame(['1:1:1', '1:1:2', '1:1:3', '1:1:4', '1:1:5'], array_column($lines[1]['words'], 'location'));
        $this->assertSame([1, 2, 3, 4, 5], array_column($lines[1]['words'], 'id'));
        $this->assertSame(['1:7:8', '1:7:9', '1:7:10'], array_column($lines[7]['words'], 'location'));
        $this->assertSame([34, 35, 36], array_column($lines[7]['words'], 'id'));

        $words = array_merge(...array_column($lines, 'words'));
        $this->assertCount(36, $words);
        $this->assertSame(range(1, 36), array_column($words, 'id'));

        foreach ($words as $word) {
            $source = $this->sourceWord($word['location']);
            $this->assertSame($source['text'], $word['text']);
            $this->assertSame((string) $source['surah'], $word['surah']);
            $this->assertSame((string) $source['ayah'], $word['ayah']);
            $this->assertSame((string) $source['word'], $word['word']);
            $this->assertSame($word['location'], $source['location']);
            $this->assertSame(1, $word['page']);
        }

        $this->assertSame(2, $lines[1]['words'][0]['line']);
        $this->assertSame(8, $lines[7]['words'][0]['line']);
        $this->assertSame('1:3:1', $lines[3]['words'][0]['location']);
        $this->assertSame('1:4:4', $lines[3]['words'][6]['location']);
    }

    public function test_page_six_uses_fifteen_stored_ayah_lines(): void
    {
        $page = (new QpcV2PageAdapter)->page(6);

        $this->assertSame(6, $page['page_number']);
        $this->assertSame('QCF2006', $page['font_family']);
        $this->assertCount(15, $page['lines']);
        $this->assertSame(range(1, 15), array_column($page['lines'], 'line_number'));
        $this->assertSame(array_fill(0, 15, 'ayah'), array_column($page['lines'], 'line_type'));
        $this->assertSame(array_fill(0, 15, 0), array_column($page['lines'], 'is_centered'));

        $words = array_merge(...array_column($page['lines'], 'words'));
        $this->assertCount(146, $words);
        $this->assertSame('2:30:1', $words[0]['location']);
        $this->assertSame('2:37:12', $words[array_key_last($words)]['location']);
        $this->assertSame(range(488, 633), array_column($words, 'id'));

        foreach ($words as $word) {
            $this->assertSame(6, $word['page']);
        }
    }

    public function test_page_two_keeps_the_eight_stored_opening_rows(): void
    {
        $page = (new QpcV2PageAdapter)->page(2);

        $this->assertSame(2, $page['page_number']);
        $this->assertSame('QCF2002', $page['font_family']);
        $this->assertCount(8, $page['lines']);
        $this->assertSame(
            ['surah_name', 'basmallah', 'ayah', 'ayah', 'ayah', 'ayah', 'ayah', 'ayah'],
            array_column($page['lines'], 'line_type')
        );
        $this->assertSame(2, $page['lines'][0]['surah_number']);
        $this->assertSame([], $page['lines'][1]['words']);
        $this->assertSame('basmallah', $page['lines'][1]['line_type']);

        $words = array_merge(...array_column($page['lines'], 'words'));
        $this->assertSame('2:1:1', $words[0]['location']);
        $this->assertSame('2:5:9', $words[array_key_last($words)]['location']);
        $this->assertSame(range(37, 77), array_column($words, 'id'));
    }

    public function test_page_300_and_604_use_stored_ranges(): void
    {
        $adapter = new QpcV2PageAdapter;

        $mid = $adapter->page(300);
        $this->assertSame('QCF2300', $mid['font_family']);
        $this->assertCount(15, $mid['lines']);
        $midWords = array_merge(...array_column($mid['lines'], 'words'));
        $this->assertSame('18:54:1', $midWords[0]['location']);
        $this->assertSame('18:61:12', $midWords[array_key_last($midWords)]['location']);

        $last = $adapter->page(604);
        $this->assertSame('QCF2604', $last['font_family']);
        $this->assertContains('surah_name', array_column($last['lines'], 'line_type'));
        $this->assertContains('basmallah', array_column($last['lines'], 'line_type'));
        $lastWords = array_merge(...array_column($last['lines'], 'words'));
        $this->assertSame('112:1:1', $lastWords[0]['location']);
        $this->assertSame('114:6:4', $lastWords[array_key_last($lastWords)]['location']);
    }

    public function test_every_madani_page_is_resolvable(): void
    {
        $pages = (new QpcV2PageAdapter)->resolvablePageNumbers();

        $this->assertSame(range(1, 604), $pages);
    }

    public function test_verse_page_index_resolves_opening_middle_and_closing_pages(): void
    {
        $adapter = new QpcV2PageAdapter;

        $this->assertSame(1, $adapter->pageForVerse(1, 1));
        $this->assertSame(1, $adapter->pageForVerse(1, 7));
        $this->assertSame(2, $adapter->pageForVerse(2, 1));
        $this->assertSame(6, $adapter->pageForVerse(2, 30));
        $this->assertSame(6, $adapter->resolveMadaniPage(2, 34));
        $this->assertSame(6, $adapter->pageForVerse(2, 34));
        $this->assertSame(300, $adapter->pageForVerse(18, 54));
        $this->assertSame(604, $adapter->pageForVerse(112, 1));
        $this->assertSame(604, $adapter->pageForVerse(114, 6));
        $this->assertSame(603, $adapter->pageForVerse(109, 1));
        $this->assertSame(2, $adapter->pageForVerse(2, 5));
    }

    /**
     * @return array<string, mixed>
     */
    private function sourceWord(string $location): array
    {
        static $raw = null;
        $raw ??= (string) file_get_contents(resource_path('quran/madani-v2/source/qpc-v2.json'));
        $pattern = '/"'.preg_quote($location, '/').'"\s*:\s*(\{[^{}]*\})/u';
        $this->assertSame(1, preg_match($pattern, $raw, $match));

        $record = json_decode($match[1], true, 512, JSON_THROW_ON_ERROR);
        $this->assertIsArray($record);

        return $record;
    }
}

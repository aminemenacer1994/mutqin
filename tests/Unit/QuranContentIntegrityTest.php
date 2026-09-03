<?php

namespace Tests\Unit;

use App\Services\Memorisation\QuranAlignmentService;
use App\Support\QuranContentIntegrity;
use App\Support\QuranMetadata;
use PHPUnit\Framework\TestCase;

class QuranContentIntegrityTest extends TestCase
{
    public function test_full_integrity_suite_passes(): void
    {
        $result = QuranContentIntegrity::runAll();
        $this->assertTrue($result['ok'], implode("\n", $result['errors']));
    }

    public function test_surah_boundaries_and_totals(): void
    {
        $this->assertSame(114, count(QuranMetadata::AYAH_COUNTS));
        $this->assertSame(6236, QuranMetadata::totalAyahCount());
        $this->assertSame(7, QuranMetadata::ayahCount(1));
        $this->assertSame(286, QuranMetadata::ayahCount(2));
        $this->assertSame(129, QuranMetadata::ayahCount(9));
        $this->assertSame(6, QuranMetadata::ayahCount(114));
        $this->assertTrue(QuranMetadata::isValidAyah(2, 286));
        $this->assertFalse(QuranMetadata::isValidAyah(2, 287));
        $this->assertFalse(QuranMetadata::isValidAyah(9, 130));
    }

    public function test_selected_canonical_ayahs_and_audio_linkage(): void
    {
        $corpus = QuranContentIntegrity::loadCorpus();
        $byKey = [];
        foreach ($corpus['selected_ayahs'] as $ayah) {
            $byKey[$ayah['key']] = $ayah;
        }

        $this->assertArrayHasKey('1:1', $byKey);
        $this->assertStringContainsString('بِسْمِ', $byKey['1:1']['uthmani']);
        $this->assertSame(1, $byKey['1:1']['global_number']);
        $this->assertSame(1, QuranMetadata::globalAyahNumber(1, 1));

        $this->assertSame(6222, $byKey['112:1']['global_number']);
        $this->assertSame(6222, QuranMetadata::globalAyahNumber(112, 1));
        $this->assertSame(['surah' => 114, 'ayah' => 6], QuranMetadata::fromGlobalAyahNumber(6236));

        $this->assertSame(255, $byKey['2:255']['ayah']);
        $this->assertNotSame('', $byKey['2:255']['translation_en_asad']);
        $this->assertNotSame('', $byKey['2:255']['transliteration']);
    }

    public function test_bismillah_edge_cases_in_corpus(): void
    {
        $corpus = QuranContentIntegrity::loadCorpus();
        $fatiha = null;
        $tawbah = null;
        foreach ($corpus['selected_ayahs'] as $ayah) {
            if ($ayah['key'] === '1:1') {
                $fatiha = $ayah;
            }
            if ($ayah['key'] === '9:1') {
                $tawbah = $ayah;
            }
        }
        $this->assertNotNull($fatiha);
        $this->assertNotNull($tawbah);
        $this->assertStringContainsString('بِسْمِ', $fatiha['uthmani']);
        $this->assertStringNotContainsString('بِسْمِ ٱللَّهِ', $tawbah['uthmani']);
    }

    public function test_page_transitions(): void
    {
        $errors = QuranContentIntegrity::verifyPagePins();
        $this->assertSame([], $errors);
        $corpus = QuranContentIntegrity::loadCorpus();
        $byPage = [];
        foreach ($corpus['page_pins'] as $pin) {
            $byPage[$pin['page']] = $pin;
        }
        $this->assertSame('1:1', $byPage[1]['first_key']);
        $this->assertSame('1:7', $byPage[1]['last_key']);
        $this->assertSame($byPage[1]['last_global'] + 1, $byPage[2]['first_global']);
        $this->assertSame('114:6', $byPage[604]['last_key']);
        $this->assertSame(6236, $byPage[604]['last_global']);
    }

    public function test_detects_duplicate_missing_reordered_and_misaligned_records(): void
    {
        $good = [];
        for ($ayah = 1; $ayah <= 7; $ayah++) {
            $good[] = [
                'surah' => 1,
                'ayah' => $ayah,
                'key' => "1:{$ayah}",
                'global_number' => $ayah,
                'page' => 1,
                'translation_en_asad' => 't',
                'transliteration' => 'x',
            ];
        }
        $this->assertSame([], QuranContentIntegrity::detectRecordDefects($good, [
            'expect_surah' => 1,
            'expect_count' => 7,
        ]));

        $missing = array_slice($good, 0, 6);
        $this->assertTrue($this->errorsContain(
            QuranContentIntegrity::detectRecordDefects($missing, ['expect_surah' => 1, 'expect_count' => 7]),
            'Missing'
        ));

        $dup = $good;
        $dup[] = $good[0];
        $this->assertTrue($this->errorsContain(
            QuranContentIntegrity::detectRecordDefects($dup, ['expect_surah' => 1, 'expect_count' => 7]),
            'Duplicated'
        ));

        $reordered = array_reverse($good);
        $this->assertTrue($this->errorsContain(
            QuranContentIntegrity::detectRecordDefects($reordered, ['expect_surah' => 1, 'expect_count' => 7]),
            'reordered'
        ));

        $this->assertTrue($this->errorsContain(
            QuranContentIntegrity::detectRecordDefects([[
                'surah' => 1,
                'ayah' => 1,
                'key' => '1:2',
                'translation_en_asad' => 'wrong',
                'transliteration' => 'x',
            ]]),
            'wrong ayah'
        ));

        $this->assertTrue($this->errorsContain(
            QuranContentIntegrity::detectRecordDefects([[
                'surah' => 1,
                'ayah' => 1,
                'key' => '1:1',
                'global_number' => 99,
            ]]),
            'Misaligned'
        ));

        $this->assertTrue($this->errorsContain(
            QuranContentIntegrity::detectRecordDefects([[
                'surah' => 1,
                'ayah' => 1,
                'key' => '1:1',
                'page' => 999,
            ]]),
            'outside Madani'
        ));
    }

    /**
     * @param  list<string>  $errors
     */
    private function errorsContain(array $errors, string $needle): bool
    {
        foreach ($errors as $error) {
            if (str_contains($error, $needle)) {
                return true;
            }
        }

        return false;
    }

    public function test_normalization_does_not_mutate_canonical_uthmani(): void
    {
        $service = new QuranAlignmentService;
        $errors = QuranContentIntegrity::verifyNormalizationPreservesCanonical(
            fn (string $text): string => $service->normalizeArabic($text)
        );
        $this->assertSame([], $errors);

        $corpus = QuranContentIntegrity::loadCorpus();
        $uthmani = $corpus['selected_ayahs'][0]['uthmani'];
        $original = $uthmani;
        $normalized = $service->normalizeArabic($uthmani);
        $this->assertSame($original, $uthmani);
        $this->assertNotSame($normalized, $uthmani);
    }
}

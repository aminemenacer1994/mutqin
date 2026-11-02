<?php

namespace Tests\Unit;

use App\Services\Memorisation\QuranTextNormalizer;
use PHPUnit\Framework\TestCase;

class QuranTextNormalizerTest extends TestCase
{
    private QuranTextNormalizer $normalizer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->normalizer = new QuranTextNormalizer;
    }

    public function test_comparison_strips_harakat_and_unifies_alef_variants(): void
    {
        $withMarks = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ";

        $this->assertSame('بسم الله الرحمان', $this->normalizer->normalizeComparisonText($withMarks));
    }

    public function test_comparison_maps_ta_marbuta_alef_maksura_and_hamza_carriers(): void
    {
        $this->assertSame('صلاه نبي موحد', $this->normalizer->normalizeComparisonText('صلاة نبيء مؤحد'));
        $this->assertSame('هدي', $this->normalizer->normalizeComparisonText('هُدًى'));
    }

    public function test_comparison_drops_punctuation_tatweel_and_collapses_space(): void
    {
        $this->assertSame('قل هو الله', $this->normalizer->normalizeComparisonText('قُلْ  ـ  هُوَ، الله.'));
        $this->assertSame('', $this->normalizer->normalizeComparisonText('   ...  '));
    }

    public function test_display_tokens_keep_harakat_and_drop_markup(): void
    {
        $tokens = $this->normalizer->tokenizeDisplayText('<span>بِسْمِ</span> اللَّهِ');

        $this->assertSame(['بِسْمِ', 'اللَّهِ'], $tokens);
    }

    public function test_empty_and_non_arabic_display_text_tokenizes_to_nothing(): void
    {
        $this->assertSame([], $this->normalizer->tokenizeDisplayText(''));
        $this->assertSame([], $this->normalizer->tokenizeDisplayText('123 — hello'));
        $this->assertSame([], $this->normalizer->tokenizeComparisonText(''));
    }

    public function test_comparison_tokens_match_normalised_words(): void
    {
        $this->assertSame(
            ['بسم', 'الله'],
            $this->normalizer->tokenizeComparisonText('بِسْمِ   ٱللَّهِ')
        );
    }
}

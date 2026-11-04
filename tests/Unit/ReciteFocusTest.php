<?php

namespace Tests\Unit;

use App\Support\ReciteFocus;
use PHPUnit\Framework\TestCase;

class ReciteFocusTest extends TestCase
{
    public function test_perfect_set_is_secure(): void
    {
        $focus = ReciteFocus::build($this->words(10, 1, 'matched'));

        $this->assertSame('secure', $focus['code']);
        $this->assertSame(10, $focus['matched']);
        $this->assertSame(0, $focus['needsWork']);
        $this->assertSame('This set is secure, continue to the next recommended set.', $focus['explanation']);
    }

    public function test_single_weak_word_names_that_ayah(): void
    {
        $words = $this->words(9, 4, 'matched');
        $words[] = ['ayah' => 4, 'text' => 'word-10', 'status' => 'unmatched'];

        $focus = ReciteFocus::build($words);

        $this->assertSame('one', $focus['code']);
        $this->assertSame(9, $focus['matched']);
        $this->assertSame(1, $focus['needsWork']);
        $this->assertSame('Give Ayah 4 one more pass.', $focus['explanation']);
        $this->assertSame('word-10', $focus['weakWords'][0]['text']);
    }

    public function test_multiple_weak_ayahs_name_the_weakest_first(): void
    {
        $words = [
            ['ayah' => 3, 'text' => 'a', 'status' => 'unmatched'],
            ['ayah' => 3, 'text' => 'b', 'status' => 'missing'],
            ['ayah' => 3, 'text' => 'ok-3', 'status' => 'matched'],
            ['ayah' => 3, 'text' => 'ok-3b', 'status' => 'matched'],
            ['ayah' => 6, 'text' => 'c', 'status' => 'unmatched'],
            ['ayah' => 6, 'text' => 'ok-6', 'status' => 'matched'],
            ['ayah' => 6, 'text' => 'ok-6b', 'status' => 'matched'],
            ['ayah' => 7, 'text' => 'd', 'status' => 'low_confidence'],
            ['ayah' => 7, 'text' => 'ok-7', 'status' => 'matched'],
            ['ayah' => 7, 'text' => 'ok-7b', 'status' => 'matched'],
        ];

        $focus = ReciteFocus::build($words);

        $this->assertSame('many', $focus['code']);
        $this->assertSame(4, $focus['needsWork']);
        $this->assertSame('Focus on Ayah 3, then 6 and 7.', $focus['explanation']);
    }

    public function test_no_matches_asks_for_a_slower_pass(): void
    {
        $focus = ReciteFocus::build($this->words(4, 2, 'unmatched'));

        $this->assertSame('low_match', $focus['code']);
        $this->assertSame(0, $focus['matched']);
        $this->assertSame('Try this range again, a little slower.', $focus['explanation']);
    }

    public function test_partial_recitation_does_not_flag_the_unread_tail(): void
    {
        $words = [
            ['ayah' => 1, 'text' => 'one', 'status' => 'matched'],
            ['ayah' => 1, 'text' => 'two', 'status' => 'matched'],
            ['ayah' => 2, 'text' => 'three', 'status' => 'missing'],
            ['ayah' => 2, 'text' => 'four', 'status' => 'not_recited'],
        ];

        $focus = ReciteFocus::build($words);

        $this->assertSame('secure', $focus['code']);
        $this->assertSame(2, $focus['matched']);
        $this->assertSame(0, $focus['needsWork']);
        $this->assertSame(2, $focus['notRecitedCount']);
    }

    public function test_order_only_error_does_not_call_the_set_secure(): void
    {
        $words = $this->words(3, 5, 'matched');
        $words[] = ['ayah' => 5, 'text' => 'late', 'status' => 'out_of_order'];

        $focus = ReciteFocus::build($words);

        $this->assertSame('order', $focus['code']);
        $this->assertSame(1, $focus['needsWork']);
        $this->assertSame('Check the order in Ayah 5.', $focus['explanation']);
    }

    public function test_low_confidence_word_is_weak(): void
    {
        $words = [
            ['ayah' => 6, 'text' => 'clear', 'status' => 'correct', 'confidence' => 0.9],
            ['ayah' => 6, 'text' => 'soft', 'status' => 'correct', 'confidence' => 0.4],
        ];

        $focus = ReciteFocus::build($words);

        $this->assertSame('one', $focus['code']);
        $this->assertSame(1, $focus['needsWork']);
        $this->assertSame('low_confidence', $focus['weakWords'][0]['status']);
        $this->assertSame('Give Ayah 6 one more pass.', $focus['explanation']);
    }

    /**
     * @return list<array{ayah: int, text: string, status: string}>
     */
    private function words(int $count, int $ayah, string $status): array
    {
        $words = [];
        for ($i = 1; $i <= $count; $i++) {
            $words[] = ['ayah' => $ayah, 'text' => 'word-'.$i, 'status' => $status];
        }

        return $words;
    }
}

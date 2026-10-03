<?php

namespace App\Services\Memorisation;

/**
 * Compare-only diff between two canonical ayah texts (display tokens preserved).
 */
class MutashabihatComparisonService
{
    public function __construct(
        private readonly QuranTextNormalizer $normalizer,
    ) {}

    /**
     * @return array{
     *   left: list<array{kind: string, text: string}>,
     *   right: list<array{kind: string, text: string}>,
     *   stats: array{shared: int, different: int, inserted: int, omitted: int}
     * }
     */
    public function compareDisplayTexts(string $leftText, string $rightText): array
    {
        $leftTokens = $this->normalizer->tokenizeDisplayText($leftText);
        $rightTokens = $this->normalizer->tokenizeDisplayText($rightText);
        $leftNorm = array_map(fn (string $t) => $this->normalizer->normalizeComparisonText($t), $leftTokens);
        $rightNorm = array_map(fn (string $t) => $this->normalizer->normalizeComparisonText($t), $rightTokens);

        $ops = $this->alignTokens($leftNorm, $rightNorm);
        $leftSegments = [];
        $rightSegments = [];
        $stats = ['shared' => 0, 'different' => 0, 'inserted' => 0, 'omitted' => 0];

        foreach ($ops as $op) {
            $kind = $op['kind'];
            if ($kind === 'equal') {
                $leftSegments[] = ['kind' => 'shared', 'text' => $leftTokens[$op['i']] ?? ''];
                $rightSegments[] = ['kind' => 'shared', 'text' => $rightTokens[$op['j']] ?? ''];
                $stats['shared']++;
            } elseif ($kind === 'replace') {
                $leftSegments[] = ['kind' => 'different', 'text' => $leftTokens[$op['i']] ?? ''];
                $rightSegments[] = ['kind' => 'different', 'text' => $rightTokens[$op['j']] ?? ''];
                $stats['different']++;
            } elseif ($kind === 'delete') {
                $leftSegments[] = ['kind' => 'omitted', 'text' => $leftTokens[$op['i']] ?? ''];
                $rightSegments[] = ['kind' => 'inserted', 'text' => ''];
                $stats['omitted']++;
            } elseif ($kind === 'insert') {
                $leftSegments[] = ['kind' => 'omitted', 'text' => ''];
                $rightSegments[] = ['kind' => 'inserted', 'text' => $rightTokens[$op['j']] ?? ''];
                $stats['inserted']++;
            }
        }

        return [
            'left' => $leftSegments,
            'right' => $rightSegments,
            'stats' => $stats,
        ];
    }

    /**
     * @param list<string> $left
     * @param list<string> $right
     * @return list<array{kind: string, i?: int, j?: int}>
     */
    private function alignTokens(array $left, array $right): array
    {
        $n = count($left);
        $m = count($right);
        $dp = array_fill(0, $n + 1, array_fill(0, $m + 1, 0));

        for ($i = $n - 1; $i >= 0; $i--) {
            for ($j = $m - 1; $j >= 0; $j--) {
                if ($left[$i] !== '' && $left[$i] === $right[$j]) {
                    $dp[$i][$j] = 1 + $dp[$i + 1][$j + 1];
                } else {
                    $dp[$i][$j] = max($dp[$i + 1][$j], $dp[$i][$j + 1]);
                }
            }
        }

        $ops = [];
        $i = 0;
        $j = 0;
        while ($i < $n && $j < $m) {
            if ($left[$i] !== '' && $left[$i] === $right[$j]) {
                $ops[] = ['kind' => 'equal', 'i' => $i, 'j' => $j];
                $i++;
                $j++;
            } elseif ($dp[$i + 1][$j] >= $dp[$i][$j + 1]) {
                $ops[] = ['kind' => 'delete', 'i' => $i];
                $i++;
            } elseif ($dp[$i][$j + 1] >= $dp[$i + 1][$j]) {
                $ops[] = ['kind' => 'insert', 'j' => $j];
                $j++;
            } else {
                $ops[] = ['kind' => 'replace', 'i' => $i, 'j' => $j];
                $i++;
                $j++;
            }
        }
        while ($i < $n) {
            $ops[] = ['kind' => 'delete', 'i' => $i];
            $i++;
        }
        while ($j < $m) {
            $ops[] = ['kind' => 'insert', 'j' => $j];
            $j++;
        }

        return $ops;
    }
}

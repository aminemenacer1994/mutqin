<?php

namespace App\Support;

/**
 * Server twin of resources/js/scripts/workspaceAiRecite/reciteFocus.js.
 * Keep the status rules and copy identical.
 */
final class ReciteFocus
{
    public const LOW_MATCH = 0.5;

    /**
     * @param  list<array<string, mixed>>  $words
     * @return array<string, mixed>
     */
    public static function build(array $words): array
    {
        $list = self::normalize($words);
        $matched = 0;
        $weak = [];
        $order = [];
        $notRecited = 0;

        foreach ($list as $word) {
            if ($word['status'] === 'matched') {
                $matched++;
            } elseif ($word['status'] === 'not_recited') {
                $notRecited++;
            } elseif (in_array($word['status'], ['unmatched', 'missing', 'out_of_order', 'low_confidence'], true)) {
                $weak[] = $word;
                if ($word['status'] === 'out_of_order') {
                    $order[] = $word;
                }
            }
        }

        $contentWeak = array_values(array_filter(
            $weak,
            fn (array $word) => $word['status'] !== 'out_of_order'
        ));
        $attempted = $matched + count($weak);
        $ratio = $attempted === 0 ? 0.0 : $matched / $attempted;

        $byAyah = [];
        foreach ($weak as $word) {
            $byAyah[$word['ayah']] = ($byAyah[$word['ayah']] ?? 0) + 1;
        }
        $ayahs = [];
        foreach ($byAyah as $ayah => $count) {
            $ayahs[] = ['ayah' => (int) $ayah, 'count' => $count];
        }
        usort($ayahs, function (array $a, array $b): int {
            return $b['count'] <=> $a['count'] ?: $a['ayah'] <=> $b['ayah'];
        });

        $code = 'secure';
        $explanation = 'This set is secure, continue to the next recommended set.';
        if ($attempted > 0 && $ratio < self::LOW_MATCH) {
            $code = 'low_match';
            $explanation = 'Try this range again, a little slower.';
        } elseif ($contentWeak === [] && $order !== []) {
            $code = 'order';
            $explanation = 'Check the order in Ayah '.$order[0]['ayah'].'.';
        } elseif (count($ayahs) === 1) {
            $code = 'one';
            $explanation = 'Give Ayah '.$ayahs[0]['ayah'].' one more pass.';
        } elseif (count($ayahs) > 1) {
            $numbers = array_map(fn (array $row) => $row['ayah'], $ayahs);
            $first = array_shift($numbers);
            $code = 'many';
            $explanation = 'Focus on Ayah '.$first.', then '.self::joinAyahs($numbers).'.';
        }

        return [
            'matched' => $matched,
            'total' => $attempted,
            'rangeTotal' => count($list),
            'weakCount' => count($weak),
            'needsWork' => count($weak),
            'orderIssueCount' => count($order),
            'notRecitedCount' => $notRecited,
            'code' => $code,
            'explanation' => $explanation,
            'weakWords' => array_map(fn (array $word) => [
                'ayah' => $word['ayah'],
                'text' => $word['text'],
                'status' => $word['status'],
                'ayahLabel' => 'Ayah '.$word['ayah'],
            ], $weak),
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $words
     * @return list<array{ayah: int, text: string, status: string}>
     */
    private static function normalize(array $words): array
    {
        $list = [];
        foreach ($words as $word) {
            if (! is_array($word)) {
                continue;
            }
            $ayah = (int) ($word['ayah'] ?? $word['ayah_number'] ?? $word['ayahNumber'] ?? 0);
            $text = trim((string) ($word['text'] ?? $word['word'] ?? $word['target_word'] ?? ''));
            if ($ayah < 1 || $text === '') {
                continue;
            }
            $list[] = [
                'ayah' => $ayah,
                'text' => $text,
                'status' => self::status($word),
            ];
        }

        $lastReached = -1;
        foreach ($list as $index => $word) {
            if (! in_array($word['status'], ['not_recited', 'missing', 'pending'], true)) {
                $lastReached = $index;
            }
        }

        foreach ($list as $index => $word) {
            if ($index > $lastReached && in_array($word['status'], ['missing', 'not_recited'], true)) {
                $list[$index]['status'] = 'not_recited';
            }
        }

        return $list;
    }

    /**
     * @param  array<string, mixed>  $word
     */
    private static function status(array $word): string
    {
        $raw = strtolower(trim((string) ($word['status'] ?? $word['focusStatus'] ?? '')));
        if (in_array($raw, ['matched', 'unmatched', 'missing', 'out_of_order', 'low_confidence', 'not_recited'], true)) {
            return $raw;
        }
        if (! empty($word['outOfOrder']) || ! empty($word['out_of_order'])) {
            return 'out_of_order';
        }
        if (in_array($raw, ['correct', 'match', 'ok'], true)) {
            $confidence = isset($word['confidence']) ? (float) $word['confidence'] : null;
            if ($confidence !== null && $confidence > 0 && $confidence < 0.55) {
                return 'low_confidence';
            }

            return 'matched';
        }
        if (in_array($raw, ['partial', 'uncertain', 'minor_mistake'], true)) {
            return 'low_confidence';
        }
        if (in_array($raw, ['incorrect', 'wrong', 'substitution'], true)) {
            return 'unmatched';
        }
        if (in_array($raw, ['omitted', 'skipped', 'deletion'], true)) {
            return 'missing';
        }

        return 'not_recited';
    }

    /**
     * @param  list<int>  $numbers
     */
    private static function joinAyahs(array $numbers): string
    {
        if (count($numbers) <= 1) {
            return (string) ($numbers[0] ?? '');
        }
        if (count($numbers) === 2) {
            return $numbers[0].' and '.$numbers[1];
        }
        $last = array_pop($numbers);

        return implode(', ', $numbers).' and '.$last;
    }
}

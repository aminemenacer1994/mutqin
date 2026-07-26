<?php

namespace App\Services\Memorisation;

class PracticePlanRecommendationService
{
    public const MAX_PRACTICE_AYAH_SPAN = 3;

    public const BAND_STRONG = 'strong';

    public const BAND_FOCUSED = 'focused';

    public const BAND_GENTLE = 'gentle';

    /**
     * @param  array<string,mixed>  $analysis
     * @param  array{surah_number:int,surah_name?:string|null,start_ayah:int,end_ayah:int}  $range
     * @return array<string,mixed>
     */
    public function recommend(array $analysis, array $range, int $accuracy): array
    {
        $band = $this->band($accuracy);
        $weakWords = array_values(array_filter(
            is_array($analysis['weak_words'] ?? null) ? $analysis['weak_words'] : [],
            fn ($w) => is_array($w)
        ));
        $weakAyahs = array_values(array_filter(
            array_map('intval', is_array($analysis['weak_ayahs'] ?? null) ? $analysis['weak_ayahs'] : []),
            fn ($n) => $n > 0
        ));
        $ayahResults = is_array($analysis['ayah_results'] ?? null) ? $analysis['ayah_results'] : [];
        $ayahWordCounts = [];
        foreach ($ayahResults as $ayah) {
            $num = (int) ($ayah['ayah_number'] ?? 0);
            if ($num > 0) {
                $ayahWordCounts[$num] = (int) (($ayah['correct'] ?? 0)
                    + ($ayah['minor_mistake'] ?? 0)
                    + ($ayah['wrong'] ?? 0)
                    + ($ayah['missing'] ?? 0)
                    + ($ayah['uncertain'] ?? 0));
            }
        }
        $colorCounts = is_array($analysis['color_counts'] ?? null) ? $analysis['color_counts'] : [];
        $pattern = (string) ($analysis['error_pattern'] ?? 'mixed');
        $weakPhrases = is_array($analysis['weak_phrases'] ?? null) ? $analysis['weak_phrases'] : [];

        $techniques = $this->selectTechniques([
            'band' => $band,
            'weak_words' => $weakWords,
            'weak_ayahs' => $weakAyahs,
            'ayah_word_counts' => $ayahWordCounts,
            'color_counts' => $colorCounts,
            'pattern' => $pattern,
            'ayah_results' => $ayahResults,
        ]);

        $practiceRange = $this->resolvePracticeRange(
            (int) $range['start_ayah'],
            (int) $range['end_ayah'],
            $weakAyahs,
            $weakWords
        );

        $repetitions = $this->repetitions($band, $weakWords, $colorCounts, $ayahResults);
        $primary = $techniques[0] ?? $this->techniqueMeta('talqin');
        $chunks = $this->buildChunks($practiceRange, $weakAyahs, $primary['id']);

        $title = $this->title($band, $primary['id'], $weakAyahs);
        $why = $this->why($accuracy, $band, $weakWords, $weakPhrases, $primary, $pattern);
        $difficulty = match ($band) {
            self::BAND_GENTLE => 'gentle',
            self::BAND_STRONG => 'light',
            default => 'focused',
        };

        $playbackSpeed = match ($band) {
            self::BAND_GENTLE => 0.75,
            self::BAND_FOCUSED => 0.85,
            default => 1.0,
        };
        $hard = (int) ($colorCounts['red'] ?? 0) + (int) ($colorCounts['black'] ?? 0);
        if ($hard >= 6) {
            $playbackSpeed = min($playbackSpeed, 0.75);
        } elseif ($hard >= 3) {
            $playbackSpeed = min($playbackSpeed, 0.85);
        }

        $config = [
            'technique' => $primary['id'],
            'techniques' => array_map(fn ($t) => $t['id'], $techniques),
            'playback_speed' => $playbackSpeed,
            'repetitions' => $repetitions['target'],
            'talqin_enabled' => $primary['id'] === 'talqin',
            'blur_enabled' => $primary['id'] === 'blur',
            'focus_enabled' => in_array($primary['id'], ['focus', 'chunking'], true),
            'chaining_enabled' => $primary['id'] === 'chaining',
            'chaining_method' => $primary['id'] === 'chaining' ? 'linking' : null,
            'chaining_repetitions' => $primary['id'] === 'chaining' ? 2 : null,
            'anchor_mode_enabled' => $primary['id'] === 'anchor' || collect($techniques)->contains(fn ($t) => ($t['id'] ?? '') === 'anchor'),
            'anchor_count' => min(4, max(2, count(array_filter($weakWords, fn ($w) => ($w['severity'] ?? '') !== 'amber')) ?: 2)),
            'practice_weak_words' => array_slice($weakWords, 0, 16),
            'chunks' => $chunks,
            'audio_enabled' => true,
            'visual_assistance' => $band === self::BAND_GENTLE ? 'high' : ($band === self::BAND_STRONG ? 'low' : 'medium'),
            'source' => 'memorisation_detection',
            'average_accuracy' => $accuracy,
            'color_counts' => $colorCounts,
            'surah_name' => $range['surah_name'] ?? null,
        ];

        return [
            'title' => $title,
            'explanation' => $why,
            'band' => $band,
            'difficulty' => $difficulty,
            'surah_number' => (int) $range['surah_number'],
            'start_ayah' => $practiceRange['from'],
            'end_ayah' => $practiceRange['to'],
            'priority_ayahs' => $practiceRange['focus_ayahs'],
            'weak_words' => array_slice($weakWords, 0, 16),
            'weak_phrases' => array_slice($weakPhrases, 0, 8),
            'techniques' => $techniques,
            'repetitions' => $repetitions,
            'config' => $config,
            'friendly_summary' => $this->friendlySummary($accuracy),
            'range' => [
                'surah_number' => (int) $range['surah_number'],
                'surah_name' => $range['surah_name'] ?? null,
                'from' => $practiceRange['from'],
                'to' => $practiceRange['to'],
                'count' => $practiceRange['count'],
                'focus_ayahs' => $practiceRange['focus_ayahs'],
                'label' => $this->rangeLabel($range['surah_name'] ?? null, $practiceRange['from'], $practiceRange['to']),
            ],
        ];
    }

    /**
     * @param  array<string,mixed>  $input
     * @return list<array<string,mixed>>
     */
    public function selectTechniques(array $input): array
    {
        $weakWords = $input['weak_words'] ?? [];
        $weakAyahs = $input['weak_ayahs'] ?? [];
        $band = $input['band'] ?? self::BAND_FOCUSED;
        $ayahWordCounts = $input['ayah_word_counts'] ?? [];
        $colorCounts = $input['color_counts'] ?? [];
        $pattern = $input['pattern'] ?? 'mixed';
        $ayahResults = $input['ayah_results'] ?? [];

        $uniqueAyahs = array_values(array_unique(array_merge(
            array_map(fn ($w) => (int) ($w['ayahNumber'] ?? 0), $weakWords),
            array_map('intval', $weakAyahs)
        )));
        $uniqueAyahs = array_values(array_filter($uniqueAyahs, fn ($n) => $n > 0));

        $hardWords = array_filter($weakWords, fn ($w) => in_array($w['severity'] ?? '', ['red', 'black'], true));
        $hardCount = max(count($hardWords), (int) ($colorCounts['red'] ?? 0) + (int) ($colorCounts['black'] ?? 0));
        $amberCount = max(
            count(array_filter($weakWords, fn ($w) => ($w['severity'] ?? '') === 'amber')),
            (int) ($colorCounts['amber'] ?? 0)
        );

        $entireAyahWeak = false;
        foreach ($uniqueAyahs as $ayah) {
            $count = (int) ($ayahWordCounts[$ayah] ?? 0);
            if ($count < 4) {
                continue;
            }
            $weakInAyah = count(array_filter($weakWords, fn ($w) => (int) ($w['ayahNumber'] ?? 0) === $ayah));
            if ($weakInAyah / $count >= 0.55) {
                $entireAyahWeak = true;
                break;
            }
        }

        $transitionWeak = $this->detectTransitionWeakness($ayahResults);

        $primaryId = 'focus';
        $tipId = null;

        if ($pattern === 'scattered' || ($hardCount >= 6 && count($uniqueAyahs) >= 2)) {
            $primaryId = 'chunking';
            if ($entireAyahWeak) {
                $tipId = 'talqin';
            } elseif ($hardCount >= 2 && $hardCount <= 4) {
                $tipId = 'anchor';
            }
        } elseif ($transitionWeak) {
            $primaryId = 'chaining';
            if ($hardCount >= 2 && $hardCount <= 4) {
                $tipId = 'anchor';
            }
        } elseif ($band === self::BAND_STRONG) {
            $primaryId = 'blur';
            if ($hardCount >= 2 && $hardCount <= 4) {
                $tipId = 'anchor';
            }
        } elseif ($band === self::BAND_GENTLE || $entireAyahWeak) {
            $primaryId = 'talqin';
            if (count($uniqueAyahs) >= 2 || $hardCount >= 5) {
                $tipId = 'chaining';
            } elseif ($hardCount >= 2 && $hardCount <= 4) {
                $tipId = 'anchor';
            }
        } elseif (count($uniqueAyahs) >= 2 || $hardCount >= 5) {
            $primaryId = 'chaining';
            if ($hardCount >= 2 && $hardCount <= 4) {
                $tipId = 'anchor';
            }
        } elseif ($hardCount >= 2 && $hardCount <= 4 && ! $entireAyahWeak) {
            $primaryId = 'anchor';
        } elseif ($amberCount >= 2 && $hardCount <= 1) {
            $primaryId = 'blur';
        } else {
            $primaryId = 'focus';
        }

        $out = [$this->techniqueMeta($primaryId)];
        if ($tipId && $tipId !== $primaryId) {
            $tip = $this->techniqueMeta($tipId);
            $tip['tip_only'] = true;
            $out[] = $tip;
        }

        return $out;
    }

    /**
     * @param  list<int>  $weakAyahs
     * @param  list<array<string,mixed>>  $weakWords
     * @return array{from:int,to:int,count:int,focus_ayahs:list<int>}
     */
    public function resolvePracticeRange(int $sessionFrom, int $sessionTo, array $weakAyahs, array $weakWords): array
    {
        $lo = min($sessionFrom, $sessionTo);
        $hi = max($sessionFrom, $sessionTo);
        $weakAyahs = array_values(array_unique(array_filter(
            array_map('intval', $weakAyahs),
            fn ($n) => $n >= $lo && $n <= $hi
        )));
        sort($weakAyahs);

        if ($weakAyahs === []) {
            return [
                'from' => $lo,
                'to' => $hi,
                'count' => max(1, $hi - $lo + 1),
                'focus_ayahs' => [],
            ];
        }

        $from = min($weakAyahs);
        $to = max($weakAyahs);
        $maxSpan = self::MAX_PRACTICE_AYAH_SPAN;

        if (($to - $from + 1) > $maxSpan) {
            $density = [];
            foreach ($weakAyahs as $ayah) {
                $density[$ayah] = 0;
            }
            foreach ($weakWords as $word) {
                $ayah = (int) ($word['ayahNumber'] ?? 0);
                if (isset($density[$ayah])) {
                    $density[$ayah]++;
                }
            }
            $bestFrom = $from;
            $bestScore = -1;
            for ($start = $from; $start <= $to - $maxSpan + 1; $start++) {
                $end = $start + $maxSpan - 1;
                $score = 0;
                for ($ayah = $start; $ayah <= $end; $ayah++) {
                    $score += (int) ($density[$ayah] ?? 0);
                    if (in_array($ayah, $weakAyahs, true)) {
                        $score += 1;
                    }
                }
                if ($score > $bestScore) {
                    $bestScore = $score;
                    $bestFrom = $start;
                }
            }
            $from = $bestFrom;
            $to = $bestFrom + $maxSpan - 1;
        }

        $from = max($lo, $from);
        $to = min($hi, $to);
        if ($to < $from) {
            $from = $lo;
            $to = min($hi, $lo + $maxSpan - 1);
        }

        return [
            'from' => $from,
            'to' => $to,
            'count' => max(1, $to - $from + 1),
            'focus_ayahs' => array_values(array_filter($weakAyahs, fn ($n) => $n >= $from && $n <= $to)),
        ];
    }

    public function band(int $accuracy): string
    {
        if ($accuracy >= 80) {
            return self::BAND_STRONG;
        }
        if ($accuracy >= 55) {
            return self::BAND_FOCUSED;
        }

        return self::BAND_GENTLE;
    }

    /**
     * @param  list<array<string,mixed>>  $weakWords
     * @param  array<string,int>  $colorCounts
     * @param  list<array<string,mixed>>  $ayahResults
     * @return array{target:int,per_ayah:array<int,int>,label:string}
     */
    private function repetitions(string $band, array $weakWords, array $colorCounts, array $ayahResults): array
    {
        $target = match ($band) {
            self::BAND_GENTLE => 5,
            self::BAND_FOCUSED => 4,
            default => count($weakWords) ? 3 : 2,
        };
        $hard = (int) ($colorCounts['red'] ?? 0) + (int) ($colorCounts['black'] ?? 0);
        if ($hard >= 6) {
            $target = max($target, 5);
        } elseif ($hard >= 3) {
            $target = max($target, 4);
        } elseif ($hard === 0 && (int) ($colorCounts['amber'] ?? 0) <= 1 && $band === self::BAND_STRONG) {
            $target = min($target, 2);
        }

        if (count($weakWords) > 0 && count($weakWords) <= 3 && $hard <= 2) {
            $target = min($target, 3);
        }

        $perAyah = [];
        foreach ($ayahResults as $ayah) {
            $num = (int) ($ayah['ayah_number'] ?? 0);
            if ($num <= 0) {
                continue;
            }
            $priority = (string) ($ayah['priority'] ?? 'strong');
            $perAyah[$num] = match ($priority) {
                'priority' => max(4, min(6, $target + 1)),
                'attention' => max(3, min(4, $target)),
                default => max(1, min(2, $target - 1)),
            };
        }

        return [
            'target' => $target,
            'per_ayah' => $perAyah,
            'label' => $target === 1 ? '1 repetition' : "{$target} repetitions",
        ];
    }

    /**
     * @param  array{from:int,to:int,count:int,focus_ayahs:list<int>}  $practiceRange
     * @param  list<int>  $weakAyahs
     * @return list<array{from:int,to:int,label:string}>
     */
    private function buildChunks(array $practiceRange, array $weakAyahs, string $primaryId): array
    {
        if ($primaryId !== 'chunking') {
            return [[
                'from' => $practiceRange['from'],
                'to' => $practiceRange['to'],
                'label' => 'Full focus range',
            ]];
        }

        $ayahs = $practiceRange['focus_ayahs'] !== []
            ? $practiceRange['focus_ayahs']
            : range($practiceRange['from'], $practiceRange['to']);
        $chunks = [];
        foreach ($ayahs as $ayah) {
            $chunks[] = [
                'from' => (int) $ayah,
                'to' => (int) $ayah,
                'label' => 'Ayah '.$ayah,
            ];
        }
        if (count($ayahs) >= 2) {
            $chunks[] = [
                'from' => (int) min($ayahs),
                'to' => (int) max($ayahs),
                'label' => 'Combine all chunks',
            ];
        }

        return $chunks;
    }

    /**
     * @param  list<array<string,mixed>>  $ayahResults
     */
    private function detectTransitionWeakness(array $ayahResults): bool
    {
        if (count($ayahResults) < 2) {
            return false;
        }
        $strongIndividual = 0;
        $attentionEdges = 0;
        foreach ($ayahResults as $ayah) {
            $acc = (int) ($ayah['accuracy'] ?? 0);
            if ($acc >= 75) {
                $strongIndividual++;
            }
            if (($ayah['priority'] ?? '') === 'attention' && (int) ($ayah['missing'] ?? 0) > 0) {
                $attentionEdges++;
            }
        }

        return $strongIndividual >= 2 && $attentionEdges >= 1 && $strongIndividual / count($ayahResults) >= 0.6;
    }

    /**
     * @return array<string,mixed>
     */
    private function techniqueMeta(string $id): array
    {
        $map = [
            'anchor' => [
                'id' => 'anchor',
                'title' => 'Anchor Method',
                'why' => 'A few specific words need strengthening.',
                'how' => 'Notice the marked focus words, say them clearly, then recite the full ayah.',
                'steps' => [
                    'Notice the marked focus words.',
                    'Say those words clearly first.',
                    'Then recite the full ayah.',
                ],
            ],
            'talqin' => [
                'id' => 'talqin',
                'title' => 'Talqin Mode',
                'why' => 'An ayah needs listen-and-repeat support.',
                'how' => 'Listen, repeat, then recite independently.',
                'steps' => [
                    'Play the ayah once and listen carefully.',
                    'Repeat it aloud while looking.',
                    'Repeat again from memory.',
                ],
            ],
            'chunking' => [
                'id' => 'chunking',
                'title' => 'Chunking',
                'why' => 'Mistakes are spread across a longer passage.',
                'how' => 'Practise smaller sections, then combine them.',
                'steps' => [
                    'Practise each small section separately.',
                    'Master one chunk before the next.',
                    'Gradually combine the chunks.',
                ],
            ],
            'blur' => [
                'id' => 'blur',
                'title' => 'Progressive Blur',
                'why' => 'Your foundation is strong — light recall will firm it.',
                'how' => 'Begin with more text visible, then hide more each repeat.',
                'steps' => [
                    'Read once with the text clear.',
                    'Hide a little more each repeat.',
                    'Finish by recalling without looking.',
                ],
            ],
            'chaining' => [
                'id' => 'chaining',
                'title' => 'Linking',
                'why' => 'Transitions between ayahs need practice.',
                'how' => 'Join the end of one ayah to the start of the next.',
                'steps' => [
                    'Practise the first ayah alone.',
                    'Add the next ayah and join them.',
                    'Recite the short chain smoothly.',
                ],
            ],
            'focus' => [
                'id' => 'focus',
                'title' => 'Focused Practice',
                'why' => 'A calm focused pass will strengthen this range.',
                'how' => 'Work on one ayah until it feels steady.',
                'steps' => [
                    'Work on one ayah only.',
                    'Do not move on until it feels steady.',
                    'Then go to the next ayah.',
                ],
            ],
        ];

        return $map[$id] ?? $map['focus'];
    }

    /**
     * @param  list<int>  $weakAyahs
     */
    private function title(string $band, string $techniqueId, array $weakAyahs): string
    {
        if ($band === self::BAND_STRONG) {
            return 'Light Reinforcement';
        }
        if ($techniqueId === 'anchor') {
            return 'Strengthen Your Weak Words';
        }
        if ($techniqueId === 'chunking') {
            return 'Rebuild This Passage in Chunks';
        }
        if (count($weakAyahs) === 1) {
            return 'Strengthen Ayah '.$weakAyahs[0];
        }
        if ($weakAyahs !== []) {
            return 'Strengthen Your Weak Ayahs';
        }

        return 'Personalised Practice Plan';
    }

    /**
     * @param  list<array<string,mixed>>  $weakWords
     * @param  list<array<string,mixed>>  $weakPhrases
     * @param  array<string,mixed>  $primary
     */
    private function why(
        int $accuracy,
        string $band,
        array $weakWords,
        array $weakPhrases,
        array $primary,
        string $pattern
    ): string {
        if ($weakPhrases !== []) {
            $phrase = (string) ($weakPhrases[0]['text'] ?? '');
            $ayah = (int) ($weakPhrases[0]['ayah_number'] ?? 0);

            return "Most of your mistakes clustered around a phrase in Ayah {$ayah}".
                ($phrase !== '' ? " («{$phrase}»). " : '. ').
                "This plan uses {$primary['title']} there first instead of repeating the entire passage equally.";
        }
        if (count($weakWords) >= 1 && count($weakWords) <= 4) {
            $sample = implode(' · ', array_map(fn ($w) => (string) ($w['text'] ?? ''), array_slice($weakWords, 0, 3)));

            return "Your memorisation is developing well ({$accuracy}%). ".
                "A few words need strengthening".($sample !== '' ? " ({$sample})" : '').
                ". {$primary['title']} focuses there first.";
        }
        if ($pattern === 'scattered') {
            return "Mistakes were spread across several ayahs. Chunking breaks the range into smaller sections so each part can settle before you combine them.";
        }
        if ($band === self::BAND_STRONG) {
            return 'Your foundation is developing well. We found only light areas to reinforce with progressive recall.';
        }

        return "Based on this assessment ({$accuracy}%), {$primary['title']} is the most appropriate next step. May Allah strengthen what you have memorised.";
    }

    private function friendlySummary(int $accuracy): string
    {
        if ($accuracy >= 85) {
            return 'Mā shā’ Allāh — your memorisation is developing well. A light review will keep it firm.';
        }
        if ($accuracy >= 60) {
            return 'Your foundation is developing well. We found a few areas that can become stronger.';
        }

        return 'May Allah strengthen what you have memorised. Let’s strengthen these areas calmly before moving on.';
    }

    private function rangeLabel(?string $surahName, int $from, int $to): string
    {
        $range = $from === $to ? "Ayah {$from}" : "Ayahs {$from}–{$to}";

        return $surahName ? "{$surahName} · {$range}" : $range;
    }
}

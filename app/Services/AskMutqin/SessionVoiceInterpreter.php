<?php

namespace App\Services\AskMutqin;

use App\Support\QuranMetadata;

/**
 * Turns a spoken session request into the settings the workspace already understands.
 * Names come from {@see QuranMetadata} and {@see CommandValidator::RECITERS}.
 */
final class SessionVoiceInterpreter
{
    /** Matches the setup repetition slider, not an invented range. */
    public const MIN_REPETITIONS = 1;

    public const MAX_REPETITIONS = 10;

    /** Same window as the default new-session range when the user names no ayahs. */
    public const DEFAULT_RANGE_END = 5;

    /**
     * Speech-friendly Latin aliases that the canonical spelling does not already cover.
     *
     * @var array<int, list<string>>
     */
    private const EXTRA_LATIN = [
        1 => ['fatiha', 'fatihah', 'fatihat', 'fateha'],
        2 => ['baqara', 'baqarah', 'bakara'],
        3 => ['imran', 'aal imran', 'ali imran', 'al imran'],
        9 => ['tawba', 'tawbah', 'tauba'],
        12 => ['yusuf', 'yusif'],
        14 => ['ibrahim', 'ibraheem'],
        17 => ['isra', 'israa'],
        18 => ['kahf', 'kahfi'],
        19 => ['maryam'],
        20 => ['taha', 'ta ha', 'ta haa'],
        31 => ['luqman', 'lukman'],
        36 => ['yasin', 'yaseen', 'ya seen', 'ya sin', 'yassin'],
        55 => ['rahman', 'rahmaan', 'rehman'],
        56 => ['waqiah', 'waqia'],
        67 => ['mulk'],
        71 => ['nuh', 'nooh'],
        78 => ['naba', 'nabaa'],
        112 => ['ikhlas', 'ikhlaas'],
        113 => ['falaq', 'falak'],
        114 => ['nas', 'naas'],
    ];

    /**
     * @var array<int, string>
     */
    private const ARABIC_SURAHS = [
        1 => 'الفاتحة', 2 => 'البقرة', 3 => 'آل عمران', 4 => 'النساء', 5 => 'المائدة',
        6 => 'الأنعام', 7 => 'الأعراف', 8 => 'الأنفال', 9 => 'التوبة', 10 => 'يونس',
        11 => 'هود', 12 => 'يوسف', 13 => 'الرعد', 14 => 'إبراهيم', 15 => 'الحجر',
        16 => 'النحل', 17 => 'الإسراء', 18 => 'الكهف', 19 => 'مريم', 20 => 'طه',
        21 => 'الأنبياء', 22 => 'الحج', 23 => 'المؤمنون', 24 => 'النور', 25 => 'الفرقان',
        26 => 'الشعراء', 27 => 'النمل', 28 => 'القصص', 29 => 'العنكبوت', 30 => 'الروم',
        31 => 'لقمان', 32 => 'السجدة', 33 => 'الأحزاب', 34 => 'سبأ', 35 => 'فاطر',
        36 => 'يس', 37 => 'الصافات', 38 => 'ص', 39 => 'الزمر', 40 => 'غافر',
        41 => 'فصلت', 42 => 'الشورى', 43 => 'الزخرف', 44 => 'الدخان', 45 => 'الجاثية',
        46 => 'الأحقاف', 47 => 'محمد', 48 => 'الفتح', 49 => 'الحجرات', 50 => 'ق',
        51 => 'الذاريات', 52 => 'الطور', 53 => 'النجم', 54 => 'القمر', 55 => 'الرحمن',
        56 => 'الواقعة', 57 => 'الحديد', 58 => 'المجادلة', 59 => 'الحشر', 60 => 'الممتحنة',
        61 => 'الصف', 62 => 'الجمعة', 63 => 'المنافقون', 64 => 'التغابن', 65 => 'الطلاق',
        66 => 'التحريم', 67 => 'الملك', 68 => 'القلم', 69 => 'الحاقة', 70 => 'المعارج',
        71 => 'نوح', 72 => 'الجن', 73 => 'المزمل', 74 => 'المدثر', 75 => 'القيامة',
        76 => 'الإنسان', 77 => 'المرسلات', 78 => 'النبأ', 79 => 'النازعات', 80 => 'عبس',
        81 => 'التكوير', 82 => 'الانفطار', 83 => 'المطففين', 84 => 'الانشقاق', 85 => 'البروج',
        86 => 'الطارق', 87 => 'الأعلى', 88 => 'الغاشية', 89 => 'الفجر', 90 => 'البلد',
        91 => 'الشمس', 92 => 'الليل', 93 => 'الضحى', 94 => 'الشرح', 95 => 'التين',
        96 => 'العلق', 97 => 'القدر', 98 => 'البينة', 99 => 'الزلزلة', 100 => 'العاديات',
        101 => 'القارعة', 102 => 'التكاثر', 103 => 'العصر', 104 => 'الهمزة', 105 => 'الفيل',
        106 => 'قريش', 107 => 'الماعون', 108 => 'الكوثر', 109 => 'الكافرون', 110 => 'النصر',
        111 => 'المسد', 112 => 'الإخلاص', 113 => 'الفلق', 114 => 'الناس',
    ];

    public function __construct(private readonly CommandValidator $validator) {}

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    public function interpret(string $transcript, array $overrides = []): array
    {
        $latin = $this->foldLatin($this->normalize($transcript));
        $arabic = $this->normalizeArabic($this->normalize($transcript));
        if ($latin === '' && $arabic === '') {
            return ['ok' => false, 'reason' => 'empty'];
        }

        $draft = $this->parse($latin, $arabic);
        $draft = $this->applyOverrides($draft, $overrides);

        return $this->finalize($draft);
    }

    /**
     * @return array<string, mixed>
     */
    private function parse(string $latin, string $arabic): array
    {
        $spoken = $this->replaceNumberWords($latin, $arabic);
        $reciterLatin = $this->withoutSurahNames($latin, $arabic);
        $draft = [
            'mode' => $this->parseMode($latin, $arabic),
            'surah' => $this->findSurah($latin, $arabic),
            'range' => $this->parseRange($spoken['latin'], $spoken['arabic']),
            'reciters' => $this->findReciters($reciterLatin, $arabic),
            'reciter_cue' => $this->hasReciterCue($latin, $arabic),
            'with_tail' => $this->unmatchedWithTail($this->replaceNumberWords($reciterLatin, '')['latin']),
            'speed' => $this->parseSpeed($spoken['latin'], $spoken['arabic']),
            'repetitions' => $this->parseRepetitions($spoken['latin'], $spoken['arabic']),
            'locks' => [],
        ];

        return $draft;
    }

    /**
     * @param  array<string, mixed>  $draft
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function applyOverrides(array $draft, array $overrides): array
    {
        $mode = strtolower(trim((string) ($overrides['mode'] ?? '')));
        if (in_array($mode, ['recite', 'memorise', 'revise', 'test'], true)) {
            $draft['mode'] = $mode;
            $draft['locks']['mode'] = true;
        }
        if (isset($overrides['surah']) && is_numeric($overrides['surah'])) {
            $draft['surah'] = [
                'status' => 'match',
                'id' => (int) $overrides['surah'],
                'options' => [],
            ];
            $draft['locks']['surah'] = true;
        }
        if (isset($overrides['start_ayah'], $overrides['end_ayah']) && is_numeric($overrides['start_ayah']) && is_numeric($overrides['end_ayah'])) {
            $draft['range'] = [
                'explicit' => true,
                'start' => (int) $overrides['start_ayah'],
                'end' => (int) $overrides['end_ayah'],
            ];
            $draft['locks']['range'] = true;
        }
        if (! empty($overrides['reciter'])) {
            $resolved = $this->validator->resolveReciter($overrides['reciter']);
            if ($resolved) {
                $draft['reciters'] = [[
                    'id' => $resolved['id'],
                    'name' => $resolved['name'],
                    'phrase' => $resolved['id'],
                ]];
                $draft['locks']['reciter'] = true;
            }
        }
        if (array_key_exists('speed', $overrides) && $overrides['speed'] !== null && $overrides['speed'] !== '') {
            $draft['speed'] = ['requested' => (float) $overrides['speed'], 'source' => 'override'];
            $draft['locks']['speed'] = true;
        }
        if (array_key_exists('repetitions', $overrides) && $overrides['repetitions'] !== null && $overrides['repetitions'] !== '') {
            $draft['repetitions'] = ['requested' => (int) $overrides['repetitions']];
            $draft['locks']['repetitions'] = true;
        }

        return $draft;
    }

    /**
     * @param  array<string, mixed>  $draft
     * @return array<string, mixed>
     */
    private function finalize(array $draft): array
    {
        $surah = $draft['surah'];
        if (($surah['status'] ?? '') === 'unknown') {
            return $this->failure('unknown_surah', 'surah', $draft);
        }
        if (($surah['status'] ?? '') === 'ambiguous') {
            return $this->failure('ambiguous_surah', 'surah', $draft, [
                'options' => $surah['options'] ?? [],
            ]);
        }

        $surahId = (int) ($surah['id'] ?? 1);
        if (($surah['status'] ?? '') === 'absent') {
            $surahId = 1;
        }
        $count = QuranMetadata::ayahCount($surahId);
        if ($count === null) {
            return $this->failure('unknown_surah', 'surah', $draft);
        }

        $range = $this->resolveRange($draft['range'] ?? [], $count);
        if (($range['reason'] ?? null) === 'reversed_range') {
            return $this->failure('reversed_range', 'range', $draft, [
                'start_ayah' => $range['start'],
                'end_ayah' => $range['end'],
                'suggested_start' => $range['end'],
                'suggested_end' => $range['start'],
                'surah' => $surahId,
                'surah_name' => QuranMetadata::name($surahId),
            ], $surahId);
        }
        if (($range['reason'] ?? null) === 'invalid_range') {
            return $this->failure('invalid_range', 'range', $draft, [
                'surah' => $surahId,
                'surah_name' => QuranMetadata::name($surahId),
                'ayah_count' => $count,
            ], $surahId);
        }

        $reciters = $draft['reciters'] ?? [];
        if (count($reciters) > 1) {
            return $this->failure('ambiguous_reciter', 'reciter', $draft, [
                'options' => array_map(fn (array $row) => ['id' => $row['id'], 'name' => $row['name']], $reciters),
            ], $surahId, $range);
        }
        if (count($reciters) === 0 && ($draft['reciter_cue'] || $draft['with_tail'])) {
            return $this->failure('unknown_reciter', 'reciter', $draft, [], $surahId, $range);
        }

        $speed = $this->resolveSpeed($draft['speed'] ?? null);
        if (($speed['reason'] ?? null) === 'unsupported_speed') {
            return $this->failure('unsupported_speed', 'speed', $draft, [
                'requested' => $speed['requested'],
                'supported' => CommandValidator::SPEEDS,
            ], $surahId, $range);
        }

        $repetitions = $this->resolveRepetitions($draft['repetitions'] ?? null);
        if (($repetitions['reason'] ?? null) === 'unsupported_repetitions') {
            return $this->failure('unsupported_repetitions', 'repetitions', $draft, [
                'requested' => $repetitions['requested'],
                'min' => self::MIN_REPETITIONS,
                'max' => self::MAX_REPETITIONS,
            ], $surahId, $range, $speed['value'] ?? null);
        }

        $mode = (string) ($draft['mode'] ?? 'memorise');
        $reciter = $reciters[0] ?? null;

        return [
            'ok' => true,
            'command' => [
                'mode' => $mode,
                'goal' => $this->goalFor($mode),
                'surah' => $surahId,
                'surah_name' => QuranMetadata::name($surahId),
                'start_ayah' => $range['start'],
                'end_ayah' => $range['end'],
                'reciter' => $reciter['id'] ?? null,
                'reciter_label' => $reciter['name'] ?? null,
                'repetitions' => $repetitions['value'],
                'speed' => $speed['value'],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $draft
     * @param  array<string, mixed>  $extra
     * @param  array{start: int, end: int}|null  $range
     * @return array<string, mixed>
     */
    private function failure(
        string $reason,
        string $field,
        array $draft,
        array $extra = [],
        ?int $surahId = null,
        ?array $range = null,
        ?float $speed = null,
    ): array {
        return [
            'ok' => false,
            'reason' => $reason,
            'clarification' => array_merge(['field' => $field], $extra),
            'partial' => [
                'mode' => $draft['mode'] ?? 'memorise',
                'goal' => $this->goalFor((string) ($draft['mode'] ?? 'memorise')),
                'surah' => $surahId,
                'surah_name' => $surahId ? QuranMetadata::name($surahId) : null,
                'start_ayah' => $range['start'] ?? null,
                'end_ayah' => $range['end'] ?? null,
                'speed' => $speed,
            ],
        ];
    }

    private function goalFor(string $mode): string
    {
        return match ($mode) {
            'revise' => 'revise',
            'test' => 'test',
            default => 'memorise',
        };
    }

    private function parseMode(string $latin, string $arabic): string
    {
        if (preg_match('/\btest\b/', $latin) || preg_match('/اختبر|اختبار/u', $arabic)) {
            return 'test';
        }
        if (preg_match('/\b(?:revise|review|murajaah|muraajaah)\b/', $latin) || preg_match('/راجع/u', $arabic)) {
            return 'revise';
        }
        if (preg_match('/\b(?:memorise|memorize|memorisation|memorization|hifz)\b/', $latin) || preg_match('/احفظ|تحفيظ|(?<![\p{Arabic}])حفظ(?![\p{Arabic}])/u', $arabic)) {
            return 'memorise';
        }
        if (preg_match('/\b(?:recite|play|listen)\b/', $latin) || preg_match('/اقرا|شغل|سمع/u', $arabic)) {
            return 'recite';
        }

        return 'memorise';
    }

    /**
     * @return array{status: string, id?: int, options?: list<array{id: int, name: string}>}
     */
    private function findSurah(string $latin, string $arabic): array
    {
        $cue = (bool) preg_match('/\b(?:surah|surat|sura|chapter)\b/', $latin)
            || (bool) preg_match('/سوره/u', $arabic);

        if (preg_match('/\b(?:surah|surat|sura|chapter)\s+(?:number\s+|no\s+)?(\d{1,3})\b/', $latin, $match)
            || preg_match('/سوره\s*(?:رقم\s*)?(\d{1,3})/u', $arabic, $match)) {
            $id = (int) $match[1];
            if ($id < 1 || $id > 114) {
                return ['status' => 'unknown'];
            }

            return ['status' => 'match', 'id' => $id];
        }

        $scores = [];
        foreach ($this->latinSurahPhrases() as $row) {
            if (! $this->containsLatin($latin, $row['phrase'])) {
                continue;
            }
            if ($row['needs_cue'] && ! $this->hasSurahCueBefore($latin, $row['phrase'])) {
                continue;
            }
            if ($this->blockedByReciterContext($latin, $row['phrase'])) {
                continue;
            }
            $scores[$row['id']] = max($scores[$row['id']] ?? 0, mb_strlen($row['phrase']));
        }

        foreach (self::ARABIC_SURAHS as $id => $name) {
            $normalized = $this->normalizeArabic($name);
            $phrases = [$normalized];
            $stripped = preg_replace('/^ال/u', '', $normalized) ?: $normalized;
            if ($stripped !== $normalized && mb_strlen($stripped) >= 3) {
                $phrases[] = $stripped;
            }
            foreach ($phrases as $phrase) {
                $short = mb_strlen($phrase) <= 2;
                if ($short && ! preg_match('/سوره\s*'.preg_quote($phrase, '/').'/u', $arabic)) {
                    continue;
                }
                if (! $short && ! $this->containsArabic($arabic, $phrase)) {
                    continue;
                }
                if ($short || $this->containsArabic($arabic, $phrase)) {
                    $scores[$id] = max($scores[$id] ?? 0, mb_strlen($phrase));
                }
            }
        }

        if ($scores === []) {
            return ['status' => $cue ? 'unknown' : 'absent'];
        }

        $best = max($scores);
        $ids = array_keys(array_filter($scores, fn (int $score) => $score === $best));
        if (count($ids) > 1) {
            return [
                'status' => 'ambiguous',
                'options' => array_map(fn (int $id) => [
                    'id' => $id,
                    'name' => (string) QuranMetadata::name($id),
                ], $ids),
            ];
        }

        return ['status' => 'match', 'id' => (int) $ids[0]];
    }

    /**
     * @param  array<string, mixed>  $range
     * @return array{start: int, end: int, reason?: string}
     */
    private function resolveRange(array $range, int $count): array
    {
        if (! empty($range['explicit'])) {
            $start = (int) ($range['start'] ?? 0);
            $end = (int) ($range['end'] ?? 0);
            if ($start > $end) {
                return ['start' => $start, 'end' => $end, 'reason' => 'reversed_range'];
            }
            if ($start < 1 || $end > $count) {
                return ['start' => $start, 'end' => $end, 'reason' => 'invalid_range'];
            }

            return ['start' => $start, 'end' => $end];
        }

        if (! empty($range['full'])) {
            return ['start' => 1, 'end' => $count];
        }

        return ['start' => 1, 'end' => min(self::DEFAULT_RANGE_END, $count)];
    }

    /**
     * @return array<string, mixed>
     */
    private function parseRange(string $latin, string $arabic): array
    {
        $latinPatterns = [
            '/\b(?:from|starting(?:\s+at)?|between)\s+(?:ayah|verse|ayat)?\s*(\d{1,3})\s+(?:to|through|until|and|-)\s+(?:ayah|verse|ayat)?\s*(\d{1,3})\b/',
            '/\b(?:ayah|verse|ayat)s?\s+(\d{1,3})\s+(?:to|through|-)\s+(?:ayah|verse|ayat)?\s*(\d{1,3})\b/',
        ];
        $arabicPatterns = [
            '/من\s+(?:ال)?ايه\s*(\d{1,3})\s+ال[ىي]\s+(?:ال)?ايه\s*(\d{1,3})/u',
            '/من\s+(\d{1,3})\s+ال[ىي]\s+(\d{1,3})/u',
        ];
        foreach ($latinPatterns as $pattern) {
            if (preg_match($pattern, $latin, $match)) {
                return ['explicit' => true, 'start' => (int) $match[1], 'end' => (int) $match[2]];
            }
        }
        foreach ($arabicPatterns as $pattern) {
            if (preg_match($pattern, $arabic, $match)) {
                return ['explicit' => true, 'start' => (int) $match[1], 'end' => (int) $match[2]];
            }
        }

        if (preg_match('/\bfirst\s+(\d{1,3})\s+(?:ayahs?|verses?|ayat)\b/', $latin, $match)
            || preg_match('/اول\s+(\d{1,3})\s+ايات/u', $arabic, $match)) {
            return ['explicit' => true, 'start' => 1, 'end' => (int) $match[1]];
        }

        if (preg_match('/\b(?:whole|entire|full|complete)\b|\ball of\b/', $latin)
            || preg_match('/كامل|كلها|كامله/u', $arabic)) {
            return ['explicit' => false, 'full' => true];
        }

        if (preg_match('/\b(\d{1,3})\s+(?:ayahs?|verses?|ayat)\b/', $latin, $match)
            || preg_match('/(\d{1,3})\s+ايات/u', $arabic, $match)) {
            return ['explicit' => true, 'start' => 1, 'end' => (int) $match[1]];
        }

        if (preg_match('/\b(?:ayah|verse|ayat)\s+(\d{1,3})\b/', $latin, $match)) {
            $ayah = (int) $match[1];

            return ['explicit' => true, 'start' => $ayah, 'end' => $ayah];
        }

        return ['explicit' => false];
    }

    /**
     * @return list<array{id: string, name: string, phrase: string}>
     */
    private function findReciters(string $latin, string $arabic): array
    {
        $candidates = [];
        foreach ($this->reciterPhrases() as $row) {
            $text = $row['script'] === 'arabic' ? $arabic : $latin;
            $found = $row['script'] === 'arabic'
                ? $this->containsArabic($text, $row['phrase'])
                : $this->containsLatin($text, $row['phrase']);
            if (! $found) {
                continue;
            }
            $current = $candidates[$row['id']]['phrase'] ?? '';
            if (mb_strlen($row['phrase']) > mb_strlen($current)) {
                $candidates[$row['id']] = [
                    'id' => $row['id'],
                    'name' => $row['name'],
                    'phrase' => $row['phrase'],
                ];
            }
        }

        $list = array_values($candidates);
        $kept = [];
        foreach ($list as $candidate) {
            $dominated = false;
            foreach ($list as $other) {
                if ($other['id'] === $candidate['id']) {
                    continue;
                }
                if (mb_strlen($other['phrase']) > mb_strlen($candidate['phrase'])
                    && str_contains($other['phrase'], $candidate['phrase'])) {
                    $dominated = true;
                    break;
                }
            }
            if (! $dominated) {
                $kept[] = $candidate;
            }
        }

        return $kept;
    }

    /**
     * @return array{requested: float|null, source: string}|null
     */
    private function parseSpeed(string $latin, string $arabic): ?array
    {
        if (preg_match('/(?<![\d])(\d+\.\d+)\s*x\b/', $latin, $match)
            || preg_match('/\b(?:at|speed|playback)\s+(\d+(?:\.\d+)?)\s*x\b/', $latin, $match)) {
            return ['requested' => (float) $match[1], 'source' => 'number'];
        }
        if (preg_match('/\b(?:very\s+fast|fastest)\b/', $latin)) {
            return ['requested' => 2.0, 'source' => 'word'];
        }
        if (preg_match('/\b(?:slow|slowly|half speed)\b/', $latin) || preg_match('/بطيء|بطيئ|ببطء|بطيئه/u', $arabic)) {
            return ['requested' => 0.5, 'source' => 'word'];
        }
        if (preg_match('/\b(?:normal|regular)\b/', $latin) || preg_match('/عادي/u', $arabic)) {
            return ['requested' => 1.0, 'source' => 'word'];
        }
        if (preg_match('/\b(?:fast|quickly)\b/', $latin) || preg_match('/سريع/u', $arabic)) {
            return ['requested' => 1.5, 'source' => 'word'];
        }

        return null;
    }

    /**
     * @param  array{requested: float|null, source?: string}|null  $speed
     * @return array{value: float|null, reason?: string, requested?: float}
     */
    private function resolveSpeed(?array $speed): array
    {
        if ($speed === null || $speed['requested'] === null) {
            return ['value' => null];
        }
        foreach (CommandValidator::SPEEDS as $option) {
            if (abs(((float) $speed['requested']) - (float) $option) < 0.001) {
                return ['value' => (float) $option];
            }
        }

        return ['value' => null, 'reason' => 'unsupported_speed', 'requested' => (float) $speed['requested']];
    }

    /**
     * @return array{requested: int}|null
     */
    private function parseRepetitions(string $latin, string $arabic): ?array
    {
        if (preg_match('/\btwice\b/', $latin) || preg_match('/مرتين/u', $arabic)) {
            return ['requested' => 2];
        }
        if (preg_match('/\bonce\b/', $latin)) {
            return ['requested' => 1];
        }
        if (preg_match('/\brepeat(?:ed|s|ing)?\s+(\d{1,2})\b/', $latin, $match)
            || preg_match('/(?<![\d.])(\d{1,2})\s*(?:times|repetitions)\b/', $latin, $match)
            || preg_match('/كرر(?:ها)?\s*(\d{1,2})/u', $arabic, $match)
            || preg_match('/(\d{1,2})\s*مرات/u', $arabic, $match)) {
            return ['requested' => (int) $match[1]];
        }

        return null;
    }

    /**
     * @param  array{requested: int}|null  $repetitions
     * @return array{value: int|null, reason?: string, requested?: int}
     */
    private function resolveRepetitions(?array $repetitions): array
    {
        if ($repetitions === null) {
            return ['value' => null];
        }
        $value = (int) $repetitions['requested'];
        if ($value < self::MIN_REPETITIONS || $value > self::MAX_REPETITIONS) {
            return ['value' => null, 'reason' => 'unsupported_repetitions', 'requested' => $value];
        }

        return ['value' => $value];
    }

    private function hasReciterCue(string $latin, string $arabic): bool
    {
        return (bool) preg_match('/\b(?:reciter|qari|qaari|sheikh|shaykh)\b/', $latin)
            || (bool) preg_match('/قارئ|شيخ/u', $arabic);
    }

    private function unmatchedWithTail(string $latin): bool
    {
        if (! preg_match('/\b(?:with|by)\s+([a-z][a-z\s]{2,40})/', $latin, $match)) {
            return false;
        }
        $tail = trim((string) preg_split('/\b(?:at|and|then|speed|slow|repetition|times|ayah|verse)\b/', $match[1])[0]);
        if ($tail === '') {
            return false;
        }
        $words = array_filter(explode(' ', $tail));
        $ignored = ['slow', 'slowly', 'normal', 'regular', 'fast', 'quickly', 'speed', 'the', 'a', 'an', 'al', 'each', 'every', 'repeat', 'repeated', 'repetition', 'repetitions', 'times', 'set', 'this'];
        foreach ($words as $word) {
            if (! in_array($word, $ignored, true)) {
                return true;
            }
        }

        return false;
    }

    private function withoutSurahNames(string $latin, string $arabic): string
    {
        $text = $latin;
        $surah = $this->findSurah($latin, $arabic);
        $id = (int) ($surah['id'] ?? 0);
        if ($id < 1) {
            return $text;
        }
        foreach ($this->latinSurahPhrases() as $row) {
            if ($row['id'] !== $id) {
                continue;
            }
            $text = preg_replace('/(?<![a-z0-9])'.preg_quote($row['phrase'], '/').'(?![a-z0-9])/', ' ', $text) ?: $text;
        }

        return trim((string) preg_replace('/\s+/', ' ', $text));
    }

    /**
     * @return list<array{id: int, phrase: string, needs_cue: bool}>
     */
    private function latinSurahPhrases(): array
    {
        $rows = [];
        foreach (QuranMetadata::NAMES as $index => $name) {
            $id = $index + 1;
            $folded = $this->foldLatin($name);
            $rows[] = ['id' => $id, 'phrase' => $folded, 'needs_cue' => $this->needsSurahCue($folded)];
            $stripped = (string) preg_replace('/^(al|ar|as|ash|at|an|ad|adh|az|the)\s+/', '', $folded);
            if ($stripped !== $folded && strlen($stripped) >= 4 && ! $this->needsSurahCue($stripped)) {
                $rows[] = ['id' => $id, 'phrase' => $stripped, 'needs_cue' => false];
            }
            $compact = str_replace(' ', '', $stripped);
            if ($compact !== $stripped && strlen($compact) >= 4 && ! $this->needsSurahCue($compact)) {
                $rows[] = ['id' => $id, 'phrase' => $compact, 'needs_cue' => false];
            }
        }
        foreach (QuranMetadata::TRANSLATED_NAMES as $index => $name) {
            $folded = $this->foldLatin($name);
            if (! str_contains($folded, ' ') || strlen($folded) < 8) {
                continue;
            }
            $rows[] = ['id' => $index + 1, 'phrase' => $folded, 'needs_cue' => false];
        }
        foreach (self::EXTRA_LATIN as $id => $phrases) {
            foreach ($phrases as $phrase) {
                $folded = $this->foldLatin($phrase);
                if ($folded === '') {
                    continue;
                }
                $rows[] = ['id' => $id, 'phrase' => $folded, 'needs_cue' => $this->needsSurahCue($folded)];
            }
        }

        return $rows;
    }

    /**
     * @return list<array{id: string, name: string, phrase: string, script: string}>
     */
    private function reciterPhrases(): array
    {
        $rows = [];
        $aliases = [
            'mishary' => 'ar.alafasy',
            'mishari' => 'ar.alafasy',
            'mishari rashid' => 'ar.alafasy',
            'mishary rashid' => 'ar.alafasy',
            'alafasy' => 'ar.alafasy',
            'afasy' => 'ar.alafasy',
            'al afasy' => 'ar.alafasy',
            'husary' => 'ar.husary',
            'al husary' => 'ar.husary',
            'husary mujawwad' => 'ar.husarymujawwad',
            'minshawi' => 'ar.minshawi',
            'al minshawi' => 'ar.minshawi',
            'minshawi mujawwad' => 'ar.minshawimujawwad',
            'sudais' => 'ar.abdurrahmaansudais',
            'as sudais' => 'ar.abdurrahmaansudais',
            'al sudais' => 'ar.abdurrahmaansudais',
            'sudays' => 'ar.abdurrahmaansudais',
            'shatri' => 'ar.shaatree',
            'ash shatri' => 'ar.shaatree',
            'muaiqly' => 'ar.mahermuaiqly',
            'maher' => 'ar.mahermuaiqly',
            'hudhaify' => 'ar.hudhaify',
            'basfar' => 'ar.abdullahbasfar',
            'ayyoub' => 'ar.muhammadayyoub',
            'ayyub' => 'ar.muhammadayyoub',
            'jibreel' => 'ar.muhammadjibreel',
            'jibril' => 'ar.muhammadjibreel',
            'ajamy' => 'ar.ahmedajamy',
            'rifai' => 'ar.hanirifai',
            'shuraym' => 'ar.saoodshuraym',
            'abdul basit' => 'ar.abdulbasitmurattal',
            'abdulbasit' => 'ar.abdulbasitmurattal',
            'abdul basit murattal' => 'ar.abdulbasitmurattal',
            'abdul basit mujawwad' => 'ar.abdulsamad',
            'parhizgar' => 'ar.parhizgar',
            'sowaid' => 'ar.aymanswoaid',
            'akhdar' => 'ar.ibrahimakhbar',
        ];
        $arabic = [
            'العفاسي' => 'ar.alafasy',
            'مشاري' => 'ar.alafasy',
            'السديس' => 'ar.abdurrahmaansudais',
            'سديس' => 'ar.abdurrahmaansudais',
            'الحصري' => 'ar.husary',
            'حصري' => 'ar.husary',
            'المنشاوي' => 'ar.minshawi',
            'منشاوي' => 'ar.minshawi',
            'الشريم' => 'ar.saoodshuraym',
            'المعيقلي' => 'ar.mahermuaiqly',
            'ماهر' => 'ar.mahermuaiqly',
            'عبد الباسط' => 'ar.abdulbasitmurattal',
        ];
        foreach ($aliases as $phrase => $id) {
            $rows[] = [
                'id' => $id,
                'name' => CommandValidator::RECITERS[$id],
                'phrase' => $phrase,
                'script' => 'latin',
            ];
        }
        foreach (CommandValidator::RECITERS as $id => $name) {
            $folded = $this->foldLatin((string) preg_replace('/\s*\(.*?\)/', '', $name));
            if ($folded !== '') {
                $rows[] = ['id' => $id, 'name' => $name, 'phrase' => $folded, 'script' => 'latin'];
            }
            foreach (explode(' ', $folded) as $token) {
                if (strlen($token) < 5 || $this->isGenericReciterToken($token)) {
                    continue;
                }
                $rows[] = ['id' => $id, 'name' => $name, 'phrase' => $token, 'script' => 'latin'];
            }
        }
        foreach ($arabic as $phrase => $id) {
            $rows[] = [
                'id' => $id,
                'name' => CommandValidator::RECITERS[$id],
                'phrase' => $this->normalizeArabic($phrase),
                'script' => 'arabic',
            ];
        }

        return $rows;
    }

    private function isGenericReciterToken(string $token): bool
    {
        return in_array($token, [
            'abdul', 'rahman', 'ahmed', 'mahmoud', 'khalil', 'rashid', 'mohamed',
            'siddiq', 'abdullah', 'ayman', 'shahriar', 'saud',
        ], true);
    }

    private function needsSurahCue(string $phrase): bool
    {
        return in_array($phrase, ['sad', 'qaf'], true);
    }

    private function hasSurahCueBefore(string $text, string $phrase): bool
    {
        return (bool) preg_match('/(?:surah|surat|sura|chapter)\s+'.preg_quote($phrase, '/').'(?![a-z0-9])/', $text);
    }

    private function blockedByReciterContext(string $latin, string $phrase): bool
    {
        if (! in_array($phrase, ['muhammad', 'ibrahim', 'ibraheem'], true)) {
            return false;
        }
        if ($this->hasSurahCueBefore($latin, $phrase)) {
            return false;
        }
        if (in_array($phrase, ['ibrahim', 'ibraheem'], true) && str_contains($latin, 'akhdar')) {
            return true;
        }
        if ($phrase === 'muhammad' && preg_match('/\b(?:ayyoub|ayyub|jibreel|jibril)\b/', $latin)) {
            return true;
        }

        return false;
    }

    /**
     * @return array{latin: string, arabic: string}
     */
    private function replaceNumberWords(string $latin, string $arabic): array
    {
        $words = [
            'twenty' => '20', 'nineteen' => '19', 'eighteen' => '18', 'seventeen' => '17',
            'sixteen' => '16', 'fifteen' => '15', 'fourteen' => '14', 'thirteen' => '13',
            'twelve' => '12', 'eleven' => '11', 'ten' => '10', 'nine' => '9', 'eight' => '8',
            'seven' => '7', 'six' => '6', 'five' => '5', 'four' => '4', 'three' => '3',
            'two' => '2', 'one' => '1',
        ];
        foreach ($words as $word => $digit) {
            $latin = preg_replace('/(?<![a-z0-9])'.preg_quote($word, '/').'(?![a-z0-9])/', $digit, $latin) ?: $latin;
        }

        $arabicWords = [
            'عشرين' => '20', 'عشره' => '10', 'عشرة' => '10', 'تسعه' => '9', 'تسعة' => '9',
            'ثمانيه' => '8', 'ثمانية' => '8', 'سبعه' => '7', 'سبعة' => '7', 'سته' => '6',
            'ستة' => '6', 'خمسه' => '5', 'خمسة' => '5', 'اربعه' => '4', 'أربعة' => '4',
            'ثلاثه' => '3', 'ثلاثة' => '3', 'اثنين' => '2', 'اثنان' => '2', 'واحد' => '1',
            'عشر' => '10', 'تسع' => '9', 'ثمان' => '8', 'سبع' => '7', 'ست' => '6',
            'خمس' => '5', 'اربع' => '4', 'أربع' => '4', 'ثلاث' => '3',
        ];
        foreach ($arabicWords as $word => $digit) {
            $normalized = $this->normalizeArabic($word);
            $arabic = preg_replace('/(?<![\p{Arabic}])'.preg_quote($normalized, '/').'(?![\p{Arabic}])/u', $digit, $arabic) ?: $arabic;
        }

        return ['latin' => $latin, 'arabic' => $arabic];
    }

    private function normalize(string $transcript): string
    {
        $text = trim($transcript);
        $text = str_replace(
            ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'],
            ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
            $text,
        );
        $text = str_replace(['×', '–', '—'], ['x', '-', '-'], $text);

        return trim((string) preg_replace('/\s+/u', ' ', $text));
    }

    private function foldLatin(string $value): string
    {
        $text = strtolower($value);
        $text = str_replace(['ʿ', 'ʾ', "'", '’', '‘', '`'], '', $text);
        $text = (string) preg_replace('/[^a-z0-9\s.]+/', ' ', $text);
        $text = (string) preg_replace('/\s+/', ' ', $text);

        return trim($text);
    }

    private function normalizeArabic(string $value): string
    {
        $text = preg_replace('/[\x{064B}-\x{065F}\x{0670}\x{0640}]/u', '', $value) ?: $value;
        $text = str_replace(['أ', 'إ', 'آ', 'ٱ'], 'ا', $text);
        $text = str_replace(['ة'], 'ه', $text);
        $text = str_replace(['ى', 'ئ'], 'ي', $text);
        $text = str_replace(['ؤ'], 'و', $text);

        return trim((string) preg_replace('/\s+/u', ' ', $text));
    }

    private function containsLatin(string $text, string $phrase): bool
    {
        $phrase = trim($phrase);
        if ($phrase === '') {
            return false;
        }

        return (bool) preg_match('/(?<![a-z0-9])'.preg_quote($phrase, '/').'(?![a-z0-9])/', $text);
    }

    private function containsArabic(string $text, string $phrase): bool
    {
        $phrase = trim($phrase);
        if ($phrase === '') {
            return false;
        }

        return (bool) preg_match('/(?<![\p{Arabic}])'.preg_quote($phrase, '/').'(?![\p{Arabic}])/u', $text);
    }
}

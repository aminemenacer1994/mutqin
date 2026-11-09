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

    /**
     * Arabic display names for the reciters already offered in the workspace.
     *
     * @var array<string, string>
     */
    private const RECITER_ARABIC = [
        'ar.alafasy' => 'مشاري العفاسي',
        'ar.abdulbasitmurattal' => 'عبد الباسط',
        'ar.abdurrahmaansudais' => 'عبد الرحمن السديس',
        'ar.hanirifai' => 'هاني الرفاعي',
        'ar.husary' => 'محمود الحصري',
        'ar.minshawi' => 'محمد المنشاوي',
        'ar.saoodshuraym' => 'سعود الشريم',
        'ar.shaatree' => 'أبو بكر الشاطري',
        'ar.mahermuaiqly' => 'ماهر المعيقلي',
        'ar.hudhaify' => 'علي الحذيفي',
        'ar.abdullahbasfar' => 'عبد الله بصفر',
        'ar.muhammadayyoub' => 'محمد أيوب',
        'ar.muhammadjibreel' => 'محمد جبريل',
        'ar.ahmedajamy' => 'أحمد العجمي',
        'ar.husarymujawwad' => 'محمود الحصري مجود',
        'ar.minshawimujawwad' => 'محمد المنشاوي مجود',
        'ar.abdulsamad' => 'عبد الباسط مجود',
        'ar.ibrahimakhbar' => 'إبراهيم الأخضر',
        'ar.parhizgar' => 'شهريار برهيزكار',
        'ar.aymanswoaid' => 'أيمن سويد',
    ];

    public function __construct(private readonly CommandValidator $validator) {}

    /**
     * Custom dictionary for the session assistant only, never recitation transcription.
     * English sessions ask Speechmatics to write canonical Latin names.
     * Arabic sessions keep Arabic spellings, with Latin pronunciations beside them.
     *
     * @return list<array{kind: string, content: string, sounds_like: list<string>}>
     */
    public function recognitionVocabulary(string $language = 'en'): array
    {
        return str_starts_with(strtolower($language), 'ar')
            ? $this->arabicRecognitionVocabulary()
            : $this->englishRecognitionVocabulary();
    }

    /**
     * @return list<array{kind: string, content: string, sounds_like: list<string>}>
     */
    private function englishRecognitionVocabulary(): array
    {
        $rows = [];
        foreach (QuranMetadata::NAMES as $index => $name) {
            $id = $index + 1;
            $sounds = [];
            foreach (self::EXTRA_LATIN[$id] ?? [] as $sound) {
                $this->pushSound($sounds, (string) $sound);
            }
            $folded = strtolower(str_replace(['-', '’', "'"], ' ', (string) $name));
            $stripped = trim((string) preg_replace('/^(al|ar|as|ash|at|an|ad|adh|az)\s+/', '', $folded));
            if ($stripped !== '' && $stripped !== $folded) {
                $this->pushSound($sounds, $stripped);
                $this->pushSound($sounds, str_replace(' ', '', $stripped));
            }
            if ($sounds === []) {
                continue;
            }
            $rows[] = ['kind' => 'surah', 'content' => (string) $name, 'sounds_like' => $sounds];
        }
        foreach ($this->reciterSpeechHints() as $id => $hint) {
            if (! isset(CommandValidator::RECITERS[$id])) {
                continue;
            }
            $rows[] = [
                'kind' => 'reciter',
                'content' => $hint['content'],
                'sounds_like' => $hint['sounds'],
            ];
        }

        return $rows;
    }

    /**
     * @return array<string, array{content: string, sounds: list<string>}>
     */
    private function reciterSpeechHints(): array
    {
        return [
            'ar.alafasy' => ['content' => 'Mishary Alafasy', 'sounds' => ['mishary', 'mishari', 'alafasy', 'al afasy']],
            'ar.abdurrahmaansudais' => ['content' => 'Al-Sudais', 'sounds' => ['sudais', 'sudays', 'as sudais', 'sudice']],
            'ar.abdulbasitmurattal' => ['content' => 'Abdul Basit', 'sounds' => ['abdul basit', 'abdulbasit', 'basit']],
            'ar.husary' => ['content' => 'Al-Husary', 'sounds' => ['husary', 'hussary', 'al husary']],
            'ar.minshawi' => ['content' => 'Al-Minshawi', 'sounds' => ['minshawi', 'minshawy', 'al minshawi']],
            'ar.saoodshuraym' => ['content' => 'Al-Shuraym', 'sounds' => ['shuraym', 'shuraim', 'al shuraym']],
            'ar.mahermuaiqly' => ['content' => 'Maher Al Muaiqly', 'sounds' => ['muaiqly', 'maher', 'al muaiqly']],
            'ar.hudhaify' => ['content' => 'Al-Hudhaify', 'sounds' => ['hudhaify', 'huthaify', 'al hudhaify']],
            'ar.shaatree' => ['content' => 'Al-Shatri', 'sounds' => ['shatri', 'shaatree', 'ash shatri']],
            'ar.hanirifai' => ['content' => 'Hani ar-Rifai', 'sounds' => ['rifai', 'rifaee', 'hani']],
            'ar.abdullahbasfar' => ['content' => 'Abdullah Basfar', 'sounds' => ['basfar']],
            'ar.muhammadayyoub' => ['content' => 'Muhammad Ayyoub', 'sounds' => ['ayyoub', 'ayyub']],
            'ar.muhammadjibreel' => ['content' => 'Muhammad Jibreel', 'sounds' => ['jibreel', 'jibril']],
            'ar.ahmedajamy' => ['content' => 'Ahmed al-Ajamy', 'sounds' => ['ajamy', 'ajmi']],
            'ar.husarymujawwad' => ['content' => 'Husary Mujawwad', 'sounds' => ['husary mujawwad']],
            'ar.minshawimujawwad' => ['content' => 'Minshawi Mujawwad', 'sounds' => ['minshawi mujawwad']],
            'ar.abdulsamad' => ['content' => 'Abdul Basit Mujawwad', 'sounds' => ['abdul basit mujawwad', 'mujawwad']],
            'ar.ibrahimakhbar' => ['content' => 'Ibrahim Akhdar', 'sounds' => ['akhdar', 'al akhdar']],
            'ar.parhizgar' => ['content' => 'Shahriar Parhizgar', 'sounds' => ['parhizgar']],
            'ar.aymanswoaid' => ['content' => 'Ayman Sowaid', 'sounds' => ['sowaid', 'suwaid']],
        ];
    }

    /**
     * @param  list<string>  $sounds
     */
    private function pushSound(array &$sounds, string $sound): void
    {
        $sound = trim(strtolower($sound));
        if ($sound === '' || strlen($sound) > 48 || in_array($sound, $sounds, true) || count($sounds) >= 4) {
            return;
        }
        $sounds[] = $sound;
    }

    /**
     * @return list<array{kind: string, content: string, sounds_like: list<string>}>
     */
    private function arabicRecognitionVocabulary(): array
    {
        $extra = [
            109 => ['cafrune', 'kafiroun'],
            'ar.abdurrahmaansudais' => ['sudice', 'sudaisi'],
        ];
        $rows = [];
        foreach (self::ARABIC_SURAHS as $id => $arabic) {
            $rows[] = [
                'kind' => 'surah',
                'content' => $arabic,
                'sounds_like' => $this->soundsFor((string) QuranMetadata::name($id), $extra[$id] ?? []),
            ];
        }
        foreach (self::RECITER_ARABIC as $id => $arabic) {
            if (! isset(CommandValidator::RECITERS[$id])) {
                continue;
            }
            $plain = trim((string) preg_replace('/\s*\([^)]*\)/', '', CommandValidator::RECITERS[$id]));
            $rows[] = [
                'kind' => 'reciter',
                'content' => $arabic,
                'sounds_like' => $this->soundsFor($plain, $extra[$id] ?? []),
            ];
        }

        return array_values(array_filter(
            $rows,
            fn (array $row) => $row['content'] !== '' && $row['sounds_like'] !== []
        ));
    }

    /**
     * @param  list<string>  $extra
     * @return list<string>
     */
    private function soundsFor(string $label, array $extra): array
    {
        $plain = strtolower($label);
        $plain = str_replace(['ʿ', 'ʾ', "'", '’', '‘', '`', '-', '–', '(', ')'], ' ', $plain);
        $plain = trim((string) preg_replace('/[^a-z\s]+/', ' ', $plain));
        $plain = trim((string) preg_replace('/\s+/', ' ', $plain));
        $tokens = $plain === '' ? [] : (preg_split('/\s+/', $plain) ?: []);
        $last = $tokens === [] ? '' : (string) $tokens[array_key_last($tokens)];
        $sounds = [];
        $push = function (string $sound) use (&$sounds): void {
            $sound = trim(strtolower($sound));
            if ($sound === '' || strlen($sound) > 48 || in_array($sound, $sounds, true) || count($sounds) >= 4) {
                return;
            }
            $sounds[] = $sound;
        };
        if (strlen($last) >= 4 && $last !== $plain) {
            $push($last);
        }
        foreach ($extra as $sound) {
            $push($sound);
        }
        $push($plain);

        return $sounds;
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    public function interpret(string $transcript, array $overrides = [], array $words = []): array
    {
        $normalized = $this->normalize($transcript);
        $latin = $this->stripFillers($this->foldLatin($normalized));
        $arabic = $this->normalizeArabic($normalized);
        if ($latin === '' && $arabic === '') {
            return ['ok' => false, 'reason' => 'empty'];
        }

        if ($overrides === []) {
            $control = $this->parseControl($this->replaceNumberWords($latin, $arabic)['latin']);
            if ($control !== null) {
                return ['ok' => true, 'command' => $control];
            }
        }

        $draft = $this->parse($latin, $arabic);
        $draft['words'] = $this->normalizeWords($words);
        $draft = $this->applyOverrides($draft, $overrides);

        return $this->finalize($draft);
    }

    /**
     * In-session controls. A named surah stays a session request.
     *
     * @return array<string, mixed>|null
     */
    private function parseControl(string $latin): ?array
    {
        $surah = $this->findSurah($latin, '');
        if (($surah['status'] ?? '') === 'match') {
            return null;
        }

        if (preg_match('/\b(?:pause|stop)\b/', $latin)
            && preg_match('/\b(?:recitation|playback|audio|playing)\b|\bpause\b/', $latin)
            && ! preg_match('/\b(?:play|memorise|memorize|revise|recite|surah)\b/', $latin)) {
            return ['control' => 'pause'];
        }
        if (preg_match('/\brepeat (?:this|the|that) (?:ayah|verse)\b/', $latin)) {
            return ['control' => 'repeat_ayah'];
        }
        if (preg_match('/\b(?:go|jump|skip) to (?:ayah|verse) (\d{1,3})\b/', $latin, $match)) {
            $ayah = (int) $match[1];
            if ($ayah >= 1 && $ayah <= 286) {
                return ['control' => 'go_to_ayah', 'ayah' => $ayah];
            }
        }
        if (preg_match('/\b(?:change|switch)(?:\s+the\s+reciter)?\s+to\b/', $latin)) {
            $reciters = $this->findReciters($latin, '');
            if (count($reciters) === 1) {
                return [
                    'control' => 'set_reciter',
                    'reciter' => $reciters[0]['id'],
                    'reciter_label' => $reciters[0]['name'],
                ];
            }
        }
        if (preg_match('/\bhalf(?:\s+|-)?speed\b/', $latin)
            && ! preg_match('/\b(?:surah|ayah|verse|times|repeat)\b/', $latin)) {
            return ['control' => 'set_speed', 'speed' => 0.5];
        }

        return null;
    }

    /**
     * @param  list<array<string, mixed>>  $words
     * @return list<array{text: string, confidence: float|null}>
     */
    private function normalizeWords(array $words): array
    {
        $normalized = [];
        foreach (array_slice($words, 0, 80) as $word) {
            if (! is_array($word)) {
                continue;
            }
            $text = trim((string) ($word['text'] ?? $word['word'] ?? ''));
            if ($text === '') {
                continue;
            }
            $confidence = $word['confidence'] ?? null;
            $normalized[] = [
                'text' => $text,
                'confidence' => is_numeric($confidence) ? (float) $confidence : null,
            ];
        }

        return $normalized;
    }

    /**
     * Lowest Speechmatics confidence among words that named this surah or reciter.
     * Missing confidences do not block a match.
     *
     * @param  list<array{text: string, confidence: float|null}>  $words
     */
    private function mentionConfidence(int|string $id, array $words, string $kind): ?float
    {
        if ($words === []) {
            return null;
        }
        $phrases = [];
        if ($kind === 'surah') {
            foreach ($this->latinSurahPhrases() as $row) {
                if ((int) $row['id'] === (int) $id) {
                    $phrases[] = $row['phrase'];
                }
            }
        } else {
            foreach ($this->reciterPhrases() as $row) {
                if ($row['id'] === $id && $row['script'] === 'latin') {
                    $phrases[] = $row['phrase'];
                }
            }
        }
        $phrases = array_values(array_filter($phrases, fn (string $phrase) => strlen($phrase) >= 4));
        if ($phrases === []) {
            return null;
        }

        $lowest = null;
        foreach ($words as $word) {
            if (! is_numeric($word['confidence'] ?? null)) {
                continue;
            }
            $text = $this->foldLatin((string) $word['text']);
            if ($text === '') {
                continue;
            }
            $matched = false;
            foreach (preg_split('/\s+/', $text) ?: [] as $token) {
                if (strlen((string) $token) < 4) {
                    continue;
                }
                foreach ($phrases as $phrase) {
                    if ($token === $phrase || str_contains($phrase, (string) $token) || str_contains((string) $token, $phrase)) {
                        $matched = true;
                        break 2;
                    }
                }
            }
            if (! $matched) {
                continue;
            }
            $confidence = (float) $word['confidence'];
            $lowest = $lowest === null ? $confidence : min($lowest, $confidence);
        }

        return $lowest;
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
            'resume' => $this->wantsResume($latin),
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
        if (! empty($draft['resume']) && ($surah['status'] ?? '') === 'absent') {
            return [
                'ok' => true,
                'command' => [
                    'resume' => true,
                    'mode' => $draft['mode'] ?? 'memorise',
                    'goal' => $this->goalFor($draft['mode'] ?? 'memorise'),
                ],
            ];
        }
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
                'options' => array_map(fn (array $row) => [
                    'id' => $row['id'],
                    'name' => $row['name'],
                    'name_ar' => self::RECITER_ARABIC[$row['id']] ?? null,
                ], $reciters),
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
        $words = is_array($draft['words'] ?? null) ? $draft['words'] : [];

        if (empty($draft['locks']['surah'])) {
            $surahConfidence = $this->mentionConfidence($surahId, $words, 'surah');
            if ($surahConfidence !== null && $surahConfidence < 0.42) {
                return $this->failure('low_confidence', 'surah', $draft, [
                    'options' => [[
                        'id' => $surahId,
                        'name' => (string) QuranMetadata::name($surahId),
                        'name_ar' => self::ARABIC_SURAHS[$surahId] ?? null,
                    ]],
                ], $surahId, $range);
            }
        }
        if ($reciter && empty($draft['locks']['reciter'])) {
            $reciterConfidence = $this->mentionConfidence((string) $reciter['id'], $words, 'reciter');
            if ($reciterConfidence !== null && $reciterConfidence < 0.42) {
                return $this->failure('low_confidence', 'reciter', $draft, [
                    'options' => [[
                        'id' => $reciter['id'],
                        'name' => $reciter['name'],
                        'name_ar' => self::RECITER_ARABIC[$reciter['id']] ?? null,
                    ]],
                ], $surahId, $range, $speed['value'] ?? null);
            }
        }

        return [
            'ok' => true,
            'command' => [
                'mode' => $mode,
                'goal' => $this->goalFor($mode),
                'surah' => $surahId,
                'surah_name' => QuranMetadata::name($surahId),
                'surah_name_ar' => self::ARABIC_SURAHS[$surahId] ?? null,
                'start_ayah' => $range['start'],
                'end_ayah' => $range['end'],
                'reciter' => $reciter['id'] ?? null,
                'reciter_label' => $reciter['name'] ?? null,
                'reciter_label_ar' => isset($reciter['id']) ? (self::RECITER_ARABIC[$reciter['id']] ?? null) : null,
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
                'surah_name_ar' => $surahId ? (self::ARABIC_SURAHS[$surahId] ?? null) : null,
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

    private function wantsResume(string $latin): bool
    {
        return (bool) preg_match('/\b(?:continue|resume|pick up)\b.{0,24}\b(?:left off|session|memorising|memorizing|revising)\b|\bwhere i left off\b/', $latin);
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

        $hits = [];
        foreach ($this->latinSurahPhrases() as $row) {
            if ($row['needs_cue'] && ! $this->hasSurahCueBefore($latin, $row['phrase'])) {
                continue;
            }
            if ($this->blockedByReciterContext($latin, $row['phrase'])) {
                continue;
            }
            if (! preg_match_all('/(?<![a-z0-9])'.preg_quote($row['phrase'], '/').'(?![a-z0-9])/', $latin, $found, PREG_OFFSET_CAPTURE)) {
                continue;
            }
            foreach ($found[0] as $match) {
                $hits[] = ['id' => $row['id'], 'at' => (int) $match[1], 'score' => 100 + mb_strlen($row['phrase'])];
            }
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
                    $hits[] = ['id' => $id, 'at' => 0, 'score' => 100 + mb_strlen($phrase)];
                }
            }
        }

        if ($hits === []) {
            foreach ((new SessionVoiceNames())->surahHits($latin) as $hit) {
                $spoken = $this->foldLatin((string) QuranMetadata::name((int) $hit['id']));
                $stripped = (string) preg_replace('/^(al|ar|as|ash|at|an|ad|adh|az|the)\s+/', '', $spoken);
                if ($this->blockedByReciterContext($latin, $spoken) || $this->blockedByReciterContext($latin, $stripped)) {
                    continue;
                }
                $hits[] = ['id' => (int) $hit['id'], 'at' => $hit['at'], 'score' => 80];
            }
        }

        return $this->chooseSurahHits($hits, $cue);
    }

    /**
     * The latest clear mention wins, so a correction later in the sentence
     * replaces an earlier Surah. Two names in the same spot stay ambiguous.
     *
     * @param  list<array{id: int, at: int, score: int}>  $hits
     * @return array{status: string, id?: int, options?: list<array{id: int, name: string}>}
     */
    private function chooseSurahHits(array $hits, bool $cue): array
    {
        if ($hits === []) {
            return ['status' => $cue ? 'unknown' : 'absent'];
        }

        $bestAt = max(array_column($hits, 'at'));
        $latest = array_values(array_filter($hits, fn (array $hit) => $hit['at'] === $bestAt));
        $bestScore = max(array_column($latest, 'score'));
        $winners = [];
        foreach ($latest as $hit) {
            if ($hit['score'] === $bestScore) {
                $winners[$hit['id']] = true;
            }
        }
        $ids = array_map('intval', array_keys($winners));
        if (count($ids) > 1) {
            return [
                'status' => 'ambiguous',
                'options' => array_map(fn (int $id) => [
                    'id' => $id,
                    'name' => (string) QuranMetadata::name($id),
                    'name_ar' => self::ARABIC_SURAHS[$id] ?? null,
                ], $ids),
            ];
        }

        return ['status' => 'match', 'id' => $ids[0]];
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

        if (! empty($range['last'])) {
            $length = (int) $range['last'];
            if ($length < 1 || $length > $count) {
                return ['start' => 1, 'end' => $length, 'reason' => 'invalid_range'];
            }

            return ['start' => $count - $length + 1, 'end' => $count];
        }

        if (! empty($range['from_onwards'])) {
            $start = (int) $range['from_onwards'];
            if ($start < 1 || $start > $count) {
                return ['start' => $start, 'end' => $count, 'reason' => 'invalid_range'];
            }

            return ['start' => $start, 'end' => $count];
        }

        return ['start' => 1, 'end' => min(self::DEFAULT_RANGE_END, $count)];
    }

    /**
     * @return array<string, mixed>
     */
    private function parseRange(string $latin, string $arabic): array
    {
        $latin = $this->softenRangeSpeech($latin);
        $found = [];
        $latinPatterns = [
            '/\b(?:from|starting(?:\s+at)?|between)\s+(?:ayah\s+)?(\d{1,3})(?:\s+ayah)?\s+(?:to|through|until|and|-)\s+(?:ayah\s+)?(\d{1,3})\b/',
            '/\b(?:ayah|verse|ayat)s?\s+(\d{1,3})\s+(?:to|through|-)\s+(?:ayah|verse|ayat)?\s*(\d{1,3})\b/',
        ];
        $arabicPatterns = [
            '/من\s+(?:ال)?ايه\s*(\d{1,3})\s+ال[ىي]\s+(?:ال)?ايه\s*(\d{1,3})/u',
            '/من\s+(\d{1,3})\s+ال[ىي]\s+(\d{1,3})/u',
        ];
        foreach ($latinPatterns as $pattern) {
            if (preg_match_all($pattern, $latin, $matches, PREG_OFFSET_CAPTURE)) {
                foreach ($matches[0] as $index => $match) {
                    $found[] = [
                        'at' => (int) $match[1],
                        'len' => strlen((string) $match[0]),
                        'range' => ['explicit' => true, 'start' => (int) $matches[1][$index][0], 'end' => (int) $matches[2][$index][0]],
                    ];
                }
            }
        }
        foreach ($arabicPatterns as $pattern) {
            if (preg_match_all($pattern, $arabic, $matches, PREG_OFFSET_CAPTURE)) {
                foreach ($matches[0] as $index => $match) {
                    $found[] = [
                        'at' => (int) $match[1],
                        'len' => strlen((string) $match[0]),
                        'range' => ['explicit' => true, 'start' => (int) $matches[1][$index][0], 'end' => (int) $matches[2][$index][0]],
                    ];
                }
            }
        }
        if (preg_match_all('/\b(?:from\s+)?(?:ayah|verse|ayat)\s+(\d{1,3})\s+(?:onwards|onward|and\s+on|to\s+the\s+end)\b/', $latin, $matches, PREG_OFFSET_CAPTURE)) {
            foreach ($matches[0] as $index => $match) {
                $found[] = [
                    'at' => (int) $match[1],
                    'len' => strlen((string) $match[0]),
                    'range' => ['explicit' => false, 'from_onwards' => (int) $matches[1][$index][0]],
                ];
            }
        }
        if (preg_match_all('/\blast\s+(\d{1,3})\s+ayah\b/', $latin, $matches, PREG_OFFSET_CAPTURE)) {
            foreach ($matches[0] as $index => $match) {
                $found[] = [
                    'at' => (int) $match[1],
                    'len' => strlen((string) $match[0]),
                    'range' => ['explicit' => false, 'last' => (int) $matches[1][$index][0]],
                ];
            }
        }
        if (preg_match_all('/\bfirst\s+(\d{1,3})\s+(?:ayahs?|verses?|ayat)\b/', $latin, $matches, PREG_OFFSET_CAPTURE)
            || preg_match_all('/اول\s+(\d{1,3})\s+ايات/u', $arabic, $matches, PREG_OFFSET_CAPTURE)) {
            foreach ($matches[0] as $index => $match) {
                $found[] = [
                    'at' => (int) $match[1],
                    'len' => strlen((string) $match[0]),
                    'range' => ['explicit' => true, 'start' => 1, 'end' => (int) $matches[1][$index][0]],
                ];
            }
        }
        if (preg_match_all('/\b(?:whole|entire|full|complete)\b|\ball of\b/', $latin, $matches, PREG_OFFSET_CAPTURE)
            || preg_match_all('/كامل|كلها|كامله/u', $arabic, $matches, PREG_OFFSET_CAPTURE)) {
            foreach ($matches[0] as $match) {
                $found[] = ['at' => (int) $match[1], 'len' => strlen((string) $match[0]), 'range' => ['explicit' => false, 'full' => true]];
            }
        }
        if (preg_match_all('/\b(\d{1,3})\s+(?:ayahs?|verses?|ayat)\b/', $latin, $matches, PREG_OFFSET_CAPTURE)
            || preg_match_all('/(\d{1,3})\s+ايات/u', $arabic, $matches, PREG_OFFSET_CAPTURE)) {
            foreach ($matches[0] as $index => $match) {
                $found[] = [
                    'at' => (int) $match[1],
                    'len' => strlen((string) $match[0]),
                    'range' => ['explicit' => true, 'start' => 1, 'end' => (int) $matches[1][$index][0]],
                ];
            }
        }
        if (preg_match_all('/\b(?:ayah|verse|ayat)\s+(\d{1,3})\b/', $latin, $matches, PREG_OFFSET_CAPTURE)) {
            foreach ($matches[0] as $index => $match) {
                $ayah = (int) $matches[1][$index][0];
                $found[] = ['at' => (int) $match[1], 'len' => strlen((string) $match[0]), 'range' => ['explicit' => true, 'start' => $ayah, 'end' => $ayah]];
            }
        }

        $found = array_values(array_filter($found, function (array $hit) use ($found) {
            foreach ($found as $other) {
                if ($other['at'] === $hit['at'] && $other['len'] === $hit['len']) {
                    continue;
                }
                $startsInside = $hit['at'] >= $other['at'] && $hit['at'] < $other['at'] + $other['len'];
                if ($startsInside && $other['len'] > $hit['len']) {
                    return false;
                }
            }

            return true;
        }));

        if ($found === []) {
            return ['explicit' => false];
        }
        usort($found, fn (array $left, array $right) => $left['at'] <=> $right['at']);

        return $found[array_key_last($found)]['range'];
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

        if ($kept === []) {
            $phonetic = (new SessionVoiceNames())->reciterHits($latin);
            $latestAt = null;
            foreach ($phonetic as $hit) {
                $latestAt = $latestAt === null ? $hit['at'] : max($latestAt, $hit['at']);
            }
            $ids = [];
            foreach ($phonetic as $hit) {
                if ($hit['at'] !== $latestAt || isset($ids[$hit['id']])) {
                    continue;
                }
                $ids[$hit['id']] = [
                    'id' => $hit['id'],
                    'name' => CommandValidator::RECITERS[$hit['id']] ?? $hit['id'],
                    'phrase' => (string) $hit['id'],
                ];
            }
            $kept = array_values($ids);
        }

        return $kept;
    }

    /**
     * @return array{requested: float|null, source: string}|null
     */
    private function parseSpeed(string $latin, string $arabic): ?array
    {
        $found = [];
        $record = function (int $at, float $value, string $source) use (&$found) {
            $found[] = ['at' => $at, 'requested' => $value, 'source' => $source];
        };
        if (preg_match_all('/(?<![\d.])(\d+(?:\.\d+)?)\s*(?:x|speed)\b/', $latin, $matches, PREG_OFFSET_CAPTURE)) {
            foreach ($matches[0] as $index => $match) {
                $record((int) $match[1], (float) $matches[1][$index][0], 'number');
            }
        }
        if (preg_match_all('/\b(?:very\s+fast|fastest)\b/', $latin, $matches, PREG_OFFSET_CAPTURE)) {
            foreach ($matches[0] as $match) {
                $record((int) $match[1], 2.0, 'word');
            }
        }
        if (preg_match_all('/\b(?:half(?:\s+|-)?speed|slow|slowly)\b/', $latin, $matches, PREG_OFFSET_CAPTURE)
            || preg_match_all('/بطيء|بطيئ|ببطء|بطيئه/u', $arabic, $matches, PREG_OFFSET_CAPTURE)) {
            foreach ($matches[0] as $match) {
                $record((int) $match[1], 0.5, 'word');
            }
        }
        if (preg_match_all('/\b(?:normal|regular)\b/', $latin, $matches, PREG_OFFSET_CAPTURE)
            || preg_match_all('/عادي/u', $arabic, $matches, PREG_OFFSET_CAPTURE)) {
            foreach ($matches[0] as $match) {
                $record((int) $match[1], 1.0, 'word');
            }
        }
        if (preg_match_all('/(?<!very\s)\b(?:fast|quickly)\b/', $latin, $matches, PREG_OFFSET_CAPTURE)
            || preg_match_all('/سريع/u', $arabic, $matches, PREG_OFFSET_CAPTURE)) {
            foreach ($matches[0] as $match) {
                $record((int) $match[1], 1.5, 'word');
            }
        }
        if ($found === []) {
            return null;
        }
        usort($found, fn (array $left, array $right) => $left['at'] <=> $right['at']);
        $last = $found[array_key_last($found)];

        return ['requested' => $last['requested'], 'source' => $last['source']];
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
        $found = [];
        $add = function (int $at, int $value) use (&$found) {
            $found[] = ['at' => $at, 'requested' => $value];
        };
        if (preg_match_all('/\btwice\b/', $latin, $matches, PREG_OFFSET_CAPTURE) || preg_match_all('/مرتين/u', $arabic, $matches, PREG_OFFSET_CAPTURE)) {
            foreach ($matches[0] as $match) {
                $add((int) $match[1], 2);
            }
        }
        if (preg_match_all('/\bonce\b/', $latin, $matches, PREG_OFFSET_CAPTURE)) {
            foreach ($matches[0] as $match) {
                $add((int) $match[1], 1);
            }
        }
        $counted = [
            '/\brepeat(?:ed|s|ing)?\s+(\d{1,2})\b/',
            '/(?<![\d.])(\d{1,2})\s*(?:times|repetitions)\b/',
        ];
        foreach ($counted as $pattern) {
            if (! preg_match_all($pattern, $latin, $matches, PREG_OFFSET_CAPTURE)) {
                continue;
            }
            foreach ($matches[0] as $index => $match) {
                $add((int) $match[1], (int) $matches[1][$index][0]);
            }
        }
        if (preg_match_all('/كرر(?:ها)?\s*(\d{1,2})/u', $arabic, $matches, PREG_OFFSET_CAPTURE)
            || preg_match_all('/(\d{1,2})\s*مرات/u', $arabic, $matches, PREG_OFFSET_CAPTURE)) {
            foreach ($matches[0] as $index => $match) {
                $add((int) $match[1], (int) $matches[1][$index][0]);
            }
        }
        if ($found !== [] && preg_match_all('/\b(?:actually|make it)\s+(?<![\d.])(\d{1,2})\b/', $latin, $matches, PREG_OFFSET_CAPTURE)) {
            $first = min(array_column($found, 'at'));
            foreach ($matches[0] as $index => $match) {
                if ((int) $match[1] > $first) {
                    $add((int) $match[1], (int) $matches[1][$index][0]);
                }
            }
        }
        if ($found === []) {
            return null;
        }
        usort($found, fn (array $left, array $right) => $left['at'] <=> $right['at']);

        return ['requested' => $found[array_key_last($found)]['requested']];
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
        if ($value < self::MIN_REPETITIONS) {
            $value = self::MIN_REPETITIONS;
        }
        if ($value > self::MAX_REPETITIONS) {
            $value = self::MAX_REPETITIONS;
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
    private function softenRangeSpeech(string $latin): string
    {
        $text = preg_replace('/\b(?:airs?|ayahs?|ayat|verses?|ayas?)\b/', 'ayah', $latin) ?: $latin;
        $text = preg_replace('/\bin\s+to\b/', 'to', $text) ?: $text;
        $ordinals = [
            'first' => '1', 'second' => '2', 'third' => '3', 'fourth' => '4', 'fifth' => '5',
            'sixth' => '6', 'seventh' => '7', 'eighth' => '8', 'ninth' => '9', 'tenth' => '10',
        ];
        foreach ($ordinals as $word => $digit) {
            $text = preg_replace('/\b'.$word.'\b(?=\s+ayah\b)/', $digit, $text) ?: $text;
        }
        $text = preg_replace('/\b(between|from|to|and)\s+(?:the|a)\s+/', '$1 ', $text) ?: $text;
        $text = preg_replace('/\ba\s+(?=\d)/', '', $text) ?: $text;

        return trim((string) preg_replace('/\s+/', ' ', $text));
    }

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

    private function stripFillers(string $latin): string
    {
        $text = (string) preg_replace('/\b(?:um+|uh+|erm|er|please|you know|kind of|sort of)\b/', ' ', $latin);

        return trim((string) preg_replace('/\s+/', ' ', $text));
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

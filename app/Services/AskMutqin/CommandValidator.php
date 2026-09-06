<?php

namespace App\Services\AskMutqin;

use App\Support\QuranMetadata;

final class CommandValidator
{
    public const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

    public const RECITERS = [
        'ar.alafasy' => 'Mishari Rashid al-Afasy',
        'ar.abdulbasitmurattal' => 'Abdul Basit (Murattal)',
        'ar.abdurrahmaansudais' => 'Abdur-Rahman as-Sudais',
        'ar.hanirifai' => 'Hani ar-Rifai',
        'ar.husary' => 'Mahmoud Khalil Al-Husary',
        'ar.minshawi' => 'Mohamed Siddiq al-Minshawi',
        'ar.saoodshuraym' => "Sa'ud ash-Shuraym",
        'ar.shaatree' => 'Abu Bakr ash-Shatri',
        'ar.mahermuaiqly' => 'Maher Al Muaiqly',
        'ar.hudhaify' => 'Ali Al-Hudhaify',
        'ar.abdullahbasfar' => 'Abdullah Basfar',
        'ar.muhammadayyoub' => 'Muhammad Ayyoub',
        'ar.muhammadjibreel' => 'Muhammad Jibreel',
        'ar.ahmedajamy' => 'Ahmed ibn Ali al-Ajamy',
        'ar.husarymujawwad' => 'Husary (Mujawwad)',
        'ar.minshawimujawwad' => 'Minshawi (Mujawwad)',
        'ar.abdulsamad' => 'Abdul Basit (Mujawwad)',
        'ar.ibrahimakhbar' => 'Ibrahim Akhdar',
        'ar.parhizgar' => 'Shahriar Parhizgar',
        'ar.aymanswoaid' => 'Ayman Sowaid',
    ];

    /**
     * @param  array<string, mixed>  $command
     * @return array{ok: bool, reason?: string, command?: array<string, mixed>, range?: array<string, mixed>}
     */
    public function validate(array $command, int $surah, int $ayahStart): array
    {
        if (! QuranMetadata::isValidAyah($surah, $ayahStart)) {
            return ['ok' => false, 'reason' => 'invalid_ayah'];
        }

        $intent = $this->normalizeIntent($command['intent'] ?? null);
        $justThis = (bool) ($command['just_this'] ?? false);
        $afterThis = (bool) ($command['after_this'] ?? false);
        $count = $this->optionalPositiveInt($command['count'] ?? null, 1, 286);
        $untilAyah = $this->optionalPositiveInt($command['until_ayah'] ?? null, 1, 286);
        $reciter = $this->resolveReciter($command['reciter'] ?? $command['reciter_id'] ?? null);
        $speed = $this->snapSpeed($command['speed'] ?? null);
        $repetitions = $this->optionalPositiveInt($command['repetitions'] ?? null, 1, 50);

        if (($command['reciter'] ?? $command['reciter_id'] ?? null) && $reciter === null) {
            return ['ok' => false, 'reason' => 'invalid_reciter'];
        }
        if (array_key_exists('speed', $command) && $command['speed'] !== null && $speed === null) {
            return ['ok' => false, 'reason' => 'invalid_speed'];
        }
        if (array_key_exists('repetitions', $command) && $command['repetitions'] !== null && $repetitions === null) {
            return ['ok' => false, 'reason' => 'invalid_repetitions'];
        }

        $range = $this->resolveRange($surah, $ayahStart, $count, $afterThis, $untilAyah, $justThis, $intent);
        if (! ($range['ok'] ?? false)) {
            return ['ok' => false, 'reason' => $range['reason'] ?? 'invalid_range'];
        }

        $autoplay = $intent === 'play' || (bool) ($command['autoplay'] ?? false);
        $sessionMode = $intent === 'memorize' ? 'new_learning' : 'new_learning';

        return [
            'ok' => true,
            'command' => [
                'intent' => $intent,
                'count' => $count,
                'until_ayah' => $untilAyah,
                'after_this' => $afterThis,
                'just_this' => $justThis,
                'reciter' => $reciter['id'] ?? null,
                'reciter_label' => $reciter['name'] ?? null,
                'speed' => $speed,
                'repetitions' => $repetitions,
                'autoplay' => $autoplay,
                'session_mode' => $sessionMode,
            ],
            'range' => [
                'surah' => $range['surah'],
                'ayah_start' => $range['ayah_start'],
                'ayah_end' => $range['ayah_end'],
                'open_ended' => $range['open_ended'],
            ],
        ];
    }

    /**
     * @return array{ok: bool, reason?: string, surah?: int, ayah_start?: int, ayah_end?: int, open_ended?: bool}
     */
    public function resolveRange(
        int $surah,
        int $ayahStart,
        ?int $count,
        bool $afterThis,
        ?int $untilAyah,
        bool $justThis,
        string $intent = 'open',
    ): array {
        $max = QuranMetadata::ayahCount($surah);
        if ($max === null || ! QuranMetadata::isValidAyah($surah, $ayahStart)) {
            return ['ok' => false, 'reason' => 'invalid_ayah'];
        }

        if ($justThis) {
            return [
                'ok' => true,
                'surah' => $surah,
                'ayah_start' => $ayahStart,
                'ayah_end' => $ayahStart,
                'open_ended' => false,
            ];
        }

        if ($untilAyah !== null) {
            if ($untilAyah < $ayahStart || $untilAyah > $max) {
                return ['ok' => false, 'reason' => 'invalid_range'];
            }

            return [
                'ok' => true,
                'surah' => $surah,
                'ayah_start' => $ayahStart,
                'ayah_end' => $untilAyah,
                'open_ended' => false,
            ];
        }

        if ($count !== null) {
            $from = $afterThis ? $ayahStart + 1 : $ayahStart;
            if ($from > $max) {
                return ['ok' => false, 'reason' => 'invalid_range'];
            }

            return [
                'ok' => true,
                'surah' => $surah,
                'ayah_start' => $from,
                'ayah_end' => min($max, $from + $count - 1),
                'open_ended' => false,
            ];
        }

        return [
            'ok' => true,
            'surah' => $surah,
            'ayah_start' => $ayahStart,
            'ayah_end' => $ayahStart,
            'open_ended' => in_array($intent, ['open', 'play', 'memorize'], true),
        ];
    }

    public function normalizeIntent(mixed $intent): string
    {
        $value = strtolower(trim((string) $intent));

        return match ($value) {
            'play' => 'play',
            'memorize', 'memorise', 'memorising' => 'memorize',
            default => 'open',
        };
    }

    /**
     * @return array{id: string, name: string}|null
     */
    public function resolveReciter(mixed $value): ?array
    {
        $raw = trim((string) $value);
        if ($raw === '') {
            return null;
        }
        if (isset(self::RECITERS[$raw])) {
            return ['id' => $raw, 'name' => self::RECITERS[$raw]];
        }

        $folded = $this->fold($raw);
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
            'minshawi' => 'ar.minshawi',
            'sudais' => 'ar.abdurrahmaansudais',
            'as sudais' => 'ar.abdurrahmaansudais',
            'shatri' => 'ar.shaatree',
            'ash shatri' => 'ar.shaatree',
            'muaiqly' => 'ar.mahermuaiqly',
            'maher' => 'ar.mahermuaiqly',
            'hudhaify' => 'ar.hudhaify',
            'basfar' => 'ar.abdullahbasfar',
            'ayyoub' => 'ar.muhammadayyoub',
            'jibreel' => 'ar.muhammadjibreel',
            'ajamy' => 'ar.ahmedajamy',
            'rifai' => 'ar.hanirifai',
            'shuraym' => 'ar.saoodshuraym',
            'abdul basit' => 'ar.abdulbasitmurattal',
            'abdulbasit' => 'ar.abdulbasitmurattal',
        ];
        if (isset($aliases[$folded])) {
            $id = $aliases[$folded];

            return ['id' => $id, 'name' => self::RECITERS[$id]];
        }

        foreach (self::RECITERS as $id => $name) {
            $foldedName = $this->fold($name);
            if ($foldedName === $folded || str_contains($foldedName, $folded) || str_contains($folded, $foldedName)) {
                return ['id' => $id, 'name' => $name];
            }
        }

        return null;
    }

    public function snapSpeed(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }
        $number = is_numeric($value) ? (float) $value : null;
        if ($number === null || $number <= 0) {
            return null;
        }

        $best = self::SPEEDS[0];
        $bestDelta = abs($number - $best);
        foreach (self::SPEEDS as $option) {
            $delta = abs($number - $option);
            if ($delta < $bestDelta) {
                $best = $option;
                $bestDelta = $delta;
            }
        }

        return $best;
    }

    public function stepSpeed(mixed $current, int $direction): float
    {
        $now = $this->snapSpeed($current) ?? 1.0;
        $index = array_search($now, self::SPEEDS, true);
        if ($index === false) {
            $index = 2;
        }
        $next = $index + ($direction < 0 ? -1 : 1);

        return self::SPEEDS[max(0, min(count(self::SPEEDS) - 1, $next))];
    }

    private function optionalPositiveInt(mixed $value, int $min, int $max): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (! is_numeric($value)) {
            return null;
        }
        $number = (int) round((float) $value);
        if ($number < $min || $number > $max) {
            return null;
        }

        return $number;
    }

    private function fold(string $value): string
    {
        $folded = strtolower($value);
        $folded = (string) preg_replace('/[^a-z0-9]+/', ' ', $folded);

        return trim((string) preg_replace('/\s+/', ' ', $folded));
    }
}

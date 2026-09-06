<?php

namespace App\Services\AskMutqin;

final class CommandInterpreter
{
    public function __construct(private readonly CommandValidator $validator) {}

    /**
     * Convert conversational speech into a validated structured command.
     *
     * @param  array<string, mixed>  $previous
     * @return array{ok: bool, reason?: string, command?: array<string, mixed>, range?: array<string, mixed>}
     */
    public function interpret(
        string $transcript,
        int $surah,
        int $ayahStart,
        ?float $currentSpeed = 1.0,
        ?string $currentReciter = null,
        array $previous = [],
    ): array {
        $parsed = $this->parseDeterministically($transcript, $currentSpeed);
        $merged = $this->mergeCommands($previous, $parsed);

        return $this->validator->validate($merged, $surah, $ayahStart);
    }

    /**
     * @return array<string, mixed>
     */
    public function parseDeterministically(string $transcript, ?float $currentSpeed = 1.0): array
    {
        $text = $this->normalizeUtterance($transcript);
        $command = [
            'intent' => 'open',
            'count' => null,
            'until_ayah' => null,
            'after_this' => false,
            'just_this' => false,
            'reciter' => null,
            'speed' => null,
            'repetitions' => null,
            'autoplay' => false,
        ];

        if ($text === '') {
            return $command;
        }

        if ($this->matches($text, '/\b(play|listen|start (?:playing|audio))\b/')) {
            $command['intent'] = 'play';
            $command['autoplay'] = true;
        } elseif ($this->matches($text, '/\b(memorh?[iy]s|hif[zd]|start memor)/')) {
            $command['intent'] = 'memorize';
        }

        if ($this->matches($text, '/\b(just this|only this|this ayah only|this verse only|this one only)\b/')) {
            $command['just_this'] = true;
        }

        if (preg_match('/\buntil(?:\s+ayah)?\s+(\d{1,3})\b/', $text, $match)
            || preg_match('/\b(?:up to|till|to ayah)\s+(\d{1,3})\b/', $text, $match)) {
            $command['until_ayah'] = (int) $match[1];
        }

        $afterThis = $this->matches($text, '/\b(next|after this|following)\b/');
        if (preg_match('/\b(?:give me|open|read|take|show)?\s*(?:the\s+)?(?:next\s+)?(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|a couple|a few)\s+(?:ayahs?|verses?|ayat)\b/', $text, $match)
            || preg_match('/\b(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:ayahs?|verses?|ayat)\b/', $text, $match)
            || preg_match('/\b(?:give me|next)\s+(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten)\b/', $text, $match)) {
            $command['count'] = $this->parseCount($match[1]);
            $command['after_this'] = $afterThis && ! $this->matches($text, '/\bfrom here\b/');
        }

        if (preg_match('/\brepeat(?:\s+each(?:\s+ayah)?)?\s+(\d{1,2})\s*(?:times|x)?\b/', $text, $match)
            || preg_match('/\b(\d{1,2})\s*(?:x|times)\s+(?:each|repeat)\b/', $text, $match)
            || preg_match('/\b(?:each|every)\s+(?:ayah|verse)?\s*(\d{1,2})\s*(?:times|x)\b/', $text, $match)) {
            $command['repetitions'] = (int) $match[1];
        }

        if (preg_match('/\b(?:at|speed)\s*(0(?:\.\d+)?|1(?:\.\d+)?|2(?:\.\d+)?)\s*(?:x|speed)?\b/', $text, $match)
            || preg_match('/\b(0(?:\.\d+)?|1(?:\.\d+)?|2(?:\.\d+)?)\s*(?:x|times(?:\s+speed)?)\b/', $text, $match)) {
            $command['speed'] = $this->validator->snapSpeed($match[1]);
        } elseif ($this->matches($text, '/\b(slower|slow it|slow down|a bit slow)\b/')) {
            $command['speed'] = $this->validator->stepSpeed($currentSpeed ?? 1, -1);
        } elseif ($this->matches($text, '/\b(faster|quicker|speed up)\b/')) {
            $command['speed'] = $this->validator->stepSpeed($currentSpeed ?? 1, 1);
        }

        $command['reciter'] = $this->extractReciter($text);

        return $command;
    }

    /**
     * @param  array<string, mixed>  $base
     * @param  array<string, mixed>  $incoming
     * @return array<string, mixed>
     */
    public function mergeCommands(array $base, array $incoming): array
    {
        $merged = $base;
        foreach (['intent', 'count', 'until_ayah', 'reciter', 'reciter_id', 'speed', 'repetitions'] as $key) {
            if (array_key_exists($key, $incoming) && $incoming[$key] !== null && $incoming[$key] !== '') {
                $merged[$key] = $incoming[$key];
            }
        }
        foreach (['after_this', 'just_this', 'autoplay'] as $key) {
            if (! empty($incoming[$key])) {
                $merged[$key] = true;
            }
        }
        if (($incoming['intent'] ?? null) === 'play') {
            $merged['autoplay'] = true;
        }

        return $merged;
    }

    private function extractReciter(string $text): ?string
    {
        if (preg_match('/\bwith\s+([a-z][a-z\s\-]{1,40}?)(?:\s+(?:at|and|then|please|speed)|$)/', $text, $match)) {
            $resolved = $this->validator->resolveReciter(trim($match[1]));
            if ($resolved) {
                return $resolved['id'];
            }
        }

        foreach (array_keys(CommandValidator::RECITERS) as $id) {
            $name = CommandValidator::RECITERS[$id];
            $needles = array_filter([
                strtolower($name),
                preg_replace('/\s*\(.*\)/', '', strtolower($name)),
            ]);
            foreach ($needles as $needle) {
                $needle = trim((string) $needle);
                if ($needle !== '' && str_contains($text, $needle)) {
                    return $id;
                }
            }
        }

        foreach (['mishary', 'mishari', 'alafasy', 'husary', 'minshawi', 'sudais', 'shatri', 'maher'] as $alias) {
            if (str_contains($text, $alias)) {
                $resolved = $this->validator->resolveReciter($alias);

                return $resolved['id'] ?? null;
            }
        }

        return null;
    }

    private function parseCount(string $raw): ?int
    {
        $words = [
            'one' => 1,
            'two' => 2,
            'three' => 3,
            'four' => 4,
            'five' => 5,
            'six' => 6,
            'seven' => 7,
            'eight' => 8,
            'nine' => 9,
            'ten' => 10,
            'a couple' => 2,
            'a few' => 3,
        ];
        $key = strtolower(trim($raw));
        if (isset($words[$key])) {
            return $words[$key];
        }

        return is_numeric($key) ? (int) $key : null;
    }

    private function normalizeUtterance(string $transcript): string
    {
        $text = strtolower(trim($transcript));
        $text = str_replace(['×', 'x speed'], ['x', 'x'], $text);
        $text = (string) preg_replace('/[^\p{L}\p{N}\s.\-]/u', ' ', $text);

        return trim((string) preg_replace('/\s+/', ' ', $text));
    }

    private function matches(string $text, string $pattern): bool
    {
        return (bool) preg_match($pattern, $text);
    }
}

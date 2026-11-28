<?php

namespace App\Services\MrMutqin;

use App\Services\AskMutqin\CommandInterpreter;

/**
 * Layer 1 — fast deterministic intent resolution.
 *
 * @phpstan-import-type MrMutqinContextShape from MrMutqinContext
 */
final class DeterministicIntentResolver
{
    public function __construct(private readonly CommandInterpreter $workspaceCommands) {}

    /**
     * @param  MrMutqinContextShape  $context
     * @return array{intent: string, entities: array<string, mixed>, transcript: string}
     */
    public function resolve(string $transcript, array $context): array
    {
        $text = $this->normalize($transcript);
        $entities = [];

        if ($text === '') {
            return ['intent' => 'unknown', 'entities' => [], 'transcript' => $transcript];
        }

        if ($context['role'] === 'teacher') {
            return $this->resolveTeacher($text, $entities, $transcript);
        }

        if ($context['shell'] === 'memorisation' || $context['surah']) {
            $playback = $this->workspacePlaybackIntent($text);
            if ($playback !== null) {
                return ['intent' => 'quran.workspace.control', 'entities' => $playback, 'transcript' => $transcript];
            }
        }

        if ($this->looksLikeSessionSetup($text)) {
            return ['intent' => 'quran.session.setup', 'entities' => [], 'transcript' => $transcript];
        }

        return $this->resolveStudent($text, $entities, $transcript);
    }

    /**
     * @param  array<string, mixed>  $entities
     * @return array{intent: string, entities: array<string, mixed>, transcript: string}
     */
    private function resolveTeacher(string $text, array $entities, string $raw): array
    {
        if (preg_match('/\bhow many students\b/', $text)) {
            return ['intent' => 'teacher.students.count', 'entities' => $entities, 'transcript' => $raw];
        }

        if (preg_match('/\b(show|open|see)\s+(my\s+)?students\b/', $text)) {
            return ['intent' => 'teacher.students.list', 'entities' => $entities, 'transcript' => $raw];
        }

        if (preg_match('/\b(pending|show)\s+(my\s+)?reviews\b|\breviews?\s+(to\s+)?review\b/', $text)) {
            return ['intent' => 'teacher.reviews.pending', 'entities' => $entities, 'transcript' => $raw];
        }

        if (preg_match('/\b(unread|any)\s+messages?\b|\bopen\s+messages\b/', $text)) {
            return ['intent' => 'teacher.messages.unread', 'entities' => $entities, 'transcript' => $raw];
        }

        if (preg_match('/\b(homework|assignment).*(who|which|hasn\'?t|not done)/', $text)
            || preg_match('/\bwho hasn\'?t done\b/', $text)) {
            return ['intent' => 'teacher.assignments.overdue', 'entities' => $entities, 'transcript' => $raw];
        }

        if (preg_match('/\b(today\'?s?\s+)?attendance\b/', $text)) {
            return ['intent' => 'teacher.attendance.today', 'entities' => $entities, 'transcript' => $raw];
        }

        if (preg_match('/\bwhat do i need to do\b|\bpriorities\b|\btoday\b/', $text)) {
            return ['intent' => 'teacher.overview.priorities', 'entities' => $entities, 'transcript' => $raw];
        }

        if (preg_match('/\b(open|show)\s+([a-z][a-z\s\-]{1,40})\'?s?\s+(profile|progress|homework)\b/', $text, $match)) {
            $entities['student_name'] = trim($match[2]);
            $entities['student_section'] = match (true) {
                str_contains($match[3], 'homework') => 'tasks',
                str_contains($match[3], 'progress') => 'plan',
                default => 'ai',
            };

            return ['intent' => 'teacher.student.open', 'entities' => $entities, 'transcript' => $raw];
        }

        if (preg_match('/\b(show|open)\s+([a-z][a-z\s\-]{1,40})\b/', $text, $match)) {
            $entities['student_name'] = trim($match[2]);

            return ['intent' => 'teacher.student.open', 'entities' => $entities, 'transcript' => $raw];
        }

        return ['intent' => 'unknown', 'entities' => $entities, 'transcript' => $raw];
    }

    /**
     * @param  array<string, mixed>  $entities
     * @return array{intent: string, entities: array<string, mixed>, transcript: string}
     */
    private function resolveStudent(string $text, array $entities, string $raw): array
    {
        if (preg_match('/\b(do i have|any)\s+homework\b|\bhow much homework\b/', $text)) {
            return ['intent' => 'student.homework.status', 'entities' => $entities, 'transcript' => $raw];
        }

        if (preg_match('/\b(show|open)\s+(my\s+)?homework\b|\bmy assignments\b/', $text)) {
            return ['intent' => 'student.homework.open', 'entities' => $entities, 'transcript' => $raw];
        }

        if (preg_match('/\b(show|open)\s+(my\s+)?progress\b/', $text)) {
            return ['intent' => 'student.progress.open', 'entities' => $entities, 'transcript' => $raw];
        }

        if (preg_match('/\b(show|open)\s+(my\s+)?learning\b|\bcontinue\s+(my\s+)?lesson\b/', $text)) {
            return ['intent' => 'student.learning.open', 'entities' => $entities, 'transcript' => $raw];
        }

        if (preg_match('/\b(message|talk to)\s+(my\s+)?teacher\b|\bopen\s+messages\b/', $text)) {
            return ['intent' => 'student.messages.open', 'entities' => $entities, 'transcript' => $raw];
        }

        if (preg_match('/\b(open|resume|continue)\s+(memorisation|memorization|mushaf|qur\'?an)\b/', $text)) {
            return ['intent' => 'student.memorisation.continue', 'entities' => $entities, 'transcript' => $raw];
        }

        if ($this->looksLikeSessionSetup($text)) {
            return ['intent' => 'quran.session.setup', 'entities' => $entities, 'transcript' => $raw];
        }

        return ['intent' => 'unknown', 'entities' => $entities, 'transcript' => $raw];
    }

    private function looksLikeSessionSetup(string $text): bool
    {
        return (bool) preg_match(
            '/\b(surah|play|recite|memor[iy]se|open)\b.*\b(ayah|verse|fatiha|mulk|yasin|baqarah)\b/',
            $text
        );
    }

    /**
     * @return array<string, mixed>|null
     */
    private function workspacePlaybackIntent(string $text): ?array
    {
        if (preg_match('/\b(pause|stop)\b/', $text)) {
            return ['control' => 'pause'];
        }
        if (preg_match('/\b(continue|resume)\s+(playing|playback)?\b/', $text)) {
            return ['control' => 'resume'];
        }

        $parsed = $this->workspaceCommands->parseDeterministically($text);
        if (($parsed['intent'] ?? '') === 'play' || ($parsed['speed'] ?? null) !== null || ($parsed['repetitions'] ?? null) !== null) {
            return ['workspace_command' => $parsed];
        }

        return null;
    }

    private function normalize(string $transcript): string
    {
        $text = strtolower(trim($transcript));
        $text = preg_replace('/\s+/', ' ', $text) ?? $text;

        return $text;
    }
}
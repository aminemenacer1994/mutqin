<?php

namespace App\Services\MrMutqin;

use Illuminate\Support\Facades\Cache;

/**
 * Short-lived conversational context for follow-up references (Phase 6).
 */
final class MrMutqinConversationStore
{
    private const TTL_SECONDS = 900;

  public function remember(int $userId, array $payload): void
    {
        $key = $this->key($userId);
        $existing = $this->read($userId);
        $merged = array_merge($existing, array_filter([
            'last_intent' => $payload['intent'] ?? null,
            'last_student_id' => $payload['navigation']['student_id'] ?? null,
            'last_student_name' => $payload['visible']['name'] ?? null,
            'last_surah' => $payload['tool_config']['session_command']['surah'] ?? null,
            'updated_at' => now()->toIso8601String(),
        ], fn ($value) => $value !== null && $value !== ''));

        Cache::put($key, $merged, self::TTL_SECONDS);
    }

    /**
     * @return array<string, mixed>
     */
    public function read(int $userId): array
    {
        $value = Cache::get($this->key($userId));

        return is_array($value) ? $value : [];
    }

    public function clear(int $userId): void
    {
        Cache::forget($this->key($userId));
    }

    /**
     * @param  array<string, mixed>  $context
     * @param  array<string, mixed>  $entities
     * @return array<string, mixed>
     */
    public function applyReferences(array $context, array $entities): array
    {
        $thread = $this->read((int) ($context['user_id'] ?? 0));
        if ($thread === []) {
            return $entities;
        }

        $text = strtolower((string) ($entities['_transcript'] ?? ''));

        if (($entities['student_name'] ?? '') === '' && preg_match('/\b(him|her|them)\b/', $text)) {
            if (! empty($thread['last_student_id'])) {
                $entities['student_id'] = (int) $thread['last_student_id'];
            }
        }

        return $entities;
    }

    private function key(int $userId): string
    {
        return 'mr_mutqin.thread.'.$userId;
    }
}
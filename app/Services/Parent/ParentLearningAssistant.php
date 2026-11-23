<?php

namespace App\Services\Parent;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ParentLearningAssistant
{
    public function __construct(
        private readonly ParentAccessAuthorizer $access,
        private readonly ParentAssistantBrief $brief,
        private readonly ParentAssistantComposer $composer,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function ask(User $parent, ?int $childId, ?string $question, ?string $prompt): array
    {
        $this->consumeQuestion($parent);
        $started = hrtime(true);
        $child = $this->child($parent, $childId);
        $intent = $this->intent($prompt, $question);
        $collected = $this->brief->collect($parent, $child);

        try {
            $composed = $this->composer->compose($collected, $intent);
            $fallback = false;
        } catch (\Throwable $exception) {
            report($exception);
            $composed = [
                'short' => __('parent.assistant_unavailable'),
                'expanded' => __('parent.assistant_disclaimer'),
                'sources' => [],
            ];
            $fallback = true;
        }

        Log::info('parent_assistant.ask', [
            'parent_id' => (int) $parent->id,
            'child_count' => count($collected['children']),
            'intent' => $intent,
            'fallback' => $fallback,
            'ms' => (int) ((hrtime(true) - $started) / 1_000_000),
        ]);

        return [
            'scope' => $child instanceof User ? 'child' : 'family',
            'child_id' => $child instanceof User ? (int) $child->id : null,
            'short' => $composed['short'],
            'expanded' => $composed['expanded'],
            'sources' => $composed['sources'],
            'links' => $this->links($collected['children']),
            'prompts' => $this->prompts(),
            'provider' => 'local',
            'fallback' => $fallback,
        ];
    }

    private function consumeQuestion(User $parent): void
    {
        $limit = max(1, (int) config('mutqin.parent_assistant.daily_questions', 20));
        $key = 'parent-assistant:'.$parent->id.':'.now('UTC')->toDateString();
        if (! Cache::has($key)) {
            Cache::put($key, 0, now('UTC')->endOfDay());
        }
        $count = (int) Cache::increment($key);
        abort_if($count > $limit, 429, __('parent.assistant_limit'));
    }

    private function child(User $parent, ?int $childId): ?User
    {
        if ($childId === null) {
            return null;
        }

        $student = User::query()->find($childId);
        abort_unless($student instanceof User && $this->access->allows($parent, $student), 404);

        return $student;
    }

    private function intent(?string $prompt, ?string $question): string
    {
        $known = [
            'progress' => 'progress',
            'practice' => 'practice',
            'homework' => 'homework',
            'feedback' => 'feedback',
            'routine' => 'practice',
            'month' => 'month',
            'wording' => 'wording',
        ];
        if (is_string($prompt) && isset($known[$prompt])) {
            return $known[$prompt];
        }

        $text = strtolower(trim((string) $question));
        if (preg_match('/tajweed|wording|word match/', $text) === 1) {
            return 'wording';
        }
        if (preg_match('/feedback|teacher said|explain the teacher/', $text) === 1) {
            return 'feedback';
        }
        if (preg_match('/homework|assignment|attention|overdue|deadline/', $text) === 1) {
            return 'homework';
        }
        if (preg_match('/practise|practice|this week|revision|routine/', $text) === 1) {
            return 'practice';
        }
        if (preg_match('/month|changed/', $text) === 1) {
            return 'month';
        }

        return 'progress';
    }

    /**
     * @param  list<array<string, mixed>>  $children
     * @return list<array{label: string, view: string, child_id: int}>
     */
    private function links(array $children): array
    {
        $named = count($children) > 1;
        $links = [];
        foreach (array_slice($children, 0, 4) as $child) {
            $id = (int) $child['id'];
            $name = trim((string) ($child['name'] ?? ''));
            $prefix = $named && $name !== '' ? $name.' · ' : '';
            if ($child['assignments'] !== null) {
                $links[] = ['label' => $prefix.'Homework', 'view' => 'learning', 'child_id' => $id];
            }
            if ($child['progress'] !== null) {
                $links[] = ['label' => $prefix.'Progress', 'view' => 'progress', 'child_id' => $id];
            }
            if ($child['feedback'] !== null) {
                $links[] = ['label' => $prefix.'Teacher feedback', 'view' => 'messages', 'child_id' => $id];
            }
        }

        return array_slice($links, 0, 12);
    }

    /**
     * @return list<array{id: string, label: string}>
     */
    private function prompts(): array
    {
        return [
            ['id' => 'progress', 'label' => __('parent.assistant_prompt_progress')],
            ['id' => 'practice', 'label' => __('parent.assistant_prompt_practice')],
            ['id' => 'homework', 'label' => __('parent.assistant_prompt_homework')],
            ['id' => 'feedback', 'label' => __('parent.assistant_prompt_feedback')],
            ['id' => 'routine', 'label' => __('parent.assistant_prompt_routine')],
            ['id' => 'month', 'label' => __('parent.assistant_prompt_month')],
        ];
    }
}

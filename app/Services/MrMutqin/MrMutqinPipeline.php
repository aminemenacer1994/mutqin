<?php

namespace App\Services\MrMutqin;

use App\Enums\MrMutqinResponseMode;
use App\Models\User;
use App\Services\MrMutqin\Handlers\SessionSetupHandler;
use App\Services\MrMutqin\Handlers\StudentCommandHandler;
use App\Services\MrMutqin\Handlers\TeacherCommandHandler;
use App\Support\MutqinLog;

final class MrMutqinPipeline
{
    public function __construct(
        private readonly DeterministicIntentResolver $resolver,
        private readonly ResponseDecisionEngine $decision,
        private readonly CommandRegistry $registry,
        private readonly TeacherCommandHandler $teacher,
        private readonly StudentCommandHandler $student,
        private readonly SessionSetupHandler $session,
        private readonly MrMutqinConversationStore $conversation,
    ) {}

    /**
     * @param  array<string, mixed>  $clientContext
     * @return array<string, mixed>
     */
    public function interpret(User $user, string $transcript, array $clientContext = []): array
    {
        $text = trim($transcript);
        if ($text === '') {
            return $this->clarify('empty_transcript', __('mr_mutqin.clarify_empty'));
        }

        $context = MrMutqinContext::fromRequest($user, $clientContext);
        $context['user_id'] = (int) $user->id;

        $thread = $this->conversation->read((int) $user->id);
        if (! empty($thread['last_student_id']) && empty($context['student_id'])) {
            $context['student_id'] = (int) $thread['last_student_id'];
        }

        $utterancePrefs = $this->decision->utterancePreferences($text);
        $resolved = $this->resolver->resolve($text, $context);
        $intent = (string) ($resolved['intent'] ?? 'unknown');
        $entities = is_array($resolved['entities'] ?? null) ? $resolved['entities'] : [];
        $entities['_transcript'] = $text;
        $entities = $this->conversation->applyReferences($context, $entities);

        if (! empty($entities['student_id']) && empty($entities['student_name'])) {
            $context['student_id'] = (int) $entities['student_id'];
        }

        $handler = $this->registry->definitions()[$intent]['handler'] ?? 'none';
        $result = match ($handler) {
            'teacher' => $this->teacher->handle($user, $intent, $context, $entities, $text),
            'student' => $this->student->handle($user, $intent, $context, $entities, $text),
            'session' => $this->session->handle($user, $intent, $context, $entities, $text),
            default => null,
        };

        if ($result === null) {
            return $this->clarify('unsupported', __('mr_mutqin.clarify_unsupported'));
        }

        if (! ($result['ok'] ?? false)) {
            $mode = MrMutqinResponseMode::Clarify;
            $result['response_mode'] = $mode->value;

            return $result;
        }

        $requiresConfirm = isset($result['confirmation']);
        $mode = $this->decision->resolve($intent, $context, $utterancePrefs, $requiresConfirm);
        $result = $this->decision->apply($mode, $result, $context);
        $result['intent'] = $intent;
        $result['context'] = [
            'role' => $context['role'],
            'shell' => $context['shell'],
            'view' => $context['view'],
        ];

        $this->conversation->remember((int) $user->id, $result);

        MutqinLog::info('mr_mutqin.interpret', [
            'user_id' => $user->id,
            'intent' => $intent,
            'response_mode' => $result['response_mode'] ?? null,
            'ok' => true,
        ]);

        return $result;
    }

    /**
     * @return array<string, mixed>
     */
    private function clarify(string $reason, string $message): array
    {
        return [
            'ok' => false,
            'intent' => 'unknown',
            'reason' => $reason,
            'response_mode' => MrMutqinResponseMode::Clarify->value,
            'clarify' => $message,
        ];
    }
}
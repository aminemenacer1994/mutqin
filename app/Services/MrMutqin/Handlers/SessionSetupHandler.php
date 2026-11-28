<?php

namespace App\Services\MrMutqin\Handlers;

use App\Models\User;
use App\Services\AskMutqin\CommandInterpreter;
use App\Services\AskMutqin\SessionVoiceInterpreter;

final class SessionSetupHandler
{
    public function __construct(
        private readonly SessionVoiceInterpreter $sessionVoice,
        private readonly CommandInterpreter $workspaceCommands,
    ) {}

    /**
     * @param  array<string, mixed>  $context
     * @param  array<string, mixed>  $entities
     * @return array<string, mixed>|null
     */
    public function handle(User $user, string $intent, array $context, array $entities, string $transcript): ?array
    {
        if ($intent === 'quran.workspace.control') {
            return $this->workspaceControl($entities, $context, $transcript);
        }

        if ($intent === 'quran.session.setup') {
            return $this->sessionSetup($transcript, $context);
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $entities
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    private function workspaceControl(array $entities, array $context, string $transcript): array
    {
        if (isset($entities['control'])) {
            return [
                'ok' => true,
                'intent' => 'quran.workspace.control',
                'tool_config' => [
                    'control' => (string) $entities['control'],
                ],
                'spoken' => null,
                'visible' => null,
                'navigation' => null,
            ];
        }

        $surah = (int) ($context['surah'] ?? 1);
        $ayah = (int) ($context['ayah_start'] ?? 1);
        $parsed = $entities['workspace_command'] ?? $this->workspaceCommands->parseDeterministically($transcript);
        $validated = $this->workspaceCommands->interpret(
            $transcript,
            $surah,
            $ayah,
            null,
            null,
            [],
        );

        if (! ($validated['ok'] ?? false)) {
            return [
                'ok' => false,
                'intent' => 'quran.workspace.control',
                'reason' => $validated['reason'] ?? 'invalid_command',
                'clarify' => __('mr_mutqin.clarify_workspace_command'),
            ];
        }

        return [
            'ok' => true,
            'intent' => 'quran.workspace.control',
            'tool_config' => [
                'workspace_command' => $validated['command'] ?? $parsed,
                'range' => $validated['range'] ?? null,
            ],
            'spoken' => null,
            'visible' => [
                'kind' => 'quran',
                'command' => $validated['command'] ?? [],
            ],
            'navigation' => null,
        ];
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    private function sessionSetup(string $transcript, array $context): array
    {
        $result = $this->sessionVoice->interpret($transcript);

        if (! ($result['ok'] ?? false)) {
            return [
                'ok' => false,
                'intent' => 'quran.session.setup',
                'reason' => $result['reason'] ?? 'clarify',
                'clarify' => __('mr_mutqin.clarify_session'),
                'clarification' => $result['clarification'] ?? null,
            ];
        }

        $command = $result['command'] ?? [];

        return [
            'ok' => true,
            'intent' => 'quran.session.setup',
            'spoken' => __('mr_mutqin.session_ready'),
            'visible' => [
                'kind' => 'quran',
                'command' => $command,
            ],
            'navigation' => [
                'shell' => 'memorisation',
                'href' => route('memorisation'),
                'query' => $this->sessionQuery($command),
            ],
            'tool_config' => [
                'session_command' => $command,
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $command
     * @return array<string, string|int|float>
     */
    private function sessionQuery(array $command): array
    {
        $query = [
            'surah' => (int) ($command['surah'] ?? 1),
            'from' => (int) ($command['start_ayah'] ?? 1),
            'to' => (int) ($command['end_ayah'] ?? ($command['start_ayah'] ?? 1)),
            'goal' => (string) ($command['goal'] ?? 'memorise'),
        ];
        if (! empty($command['reciter'])) {
            $query['reciter'] = (string) $command['reciter'];
        }
        if (isset($command['speed'])) {
            $query['speed'] = $command['speed'];
        }
        if (isset($command['repetitions'])) {
            $query['repetitions'] = (int) $command['repetitions'];
        }

        return $query;
    }
}
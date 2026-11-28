<?php

namespace App\Support;

use App\Models\User;
use App\Services\AskMutqin\SessionVoiceInterpreter;

final class MrMutqinAuthPayload
{
    /**
     * @return array{mr_mutqin_enabled: bool, session_voice_enabled: bool, session_voice_hints: list<array<string, mixed>>}
     */
    public static function forUser(?User $user): array
    {
        $visible = MrMutqinAccess::visible($user);

        return [
            'mr_mutqin_enabled' => $visible,
            'session_voice_enabled' => $visible,
            'session_voice_hints' => $visible && $user instanceof User
                ? app(SessionVoiceInterpreter::class)->recognitionVocabulary(MrMutqinAccess::vocabularyLanguage($user))
                : [],
        ];
    }
}
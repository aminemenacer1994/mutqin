<?php

namespace App\Services\MrMutqin;

use App\Enums\MrMutqinResponseMode;

final class ResponseDecisionEngine
{
    public function __construct(private readonly CommandRegistry $registry) {}

    /**
     * @param  MrMutqinContextShape  $context
     * @param  array<string, mixed>  $utterancePreferences
     */
    public function resolve(
        string $intent,
        array $context,
        array $utterancePreferences = [],
        bool $requiresConfirmation = false,
    ): MrMutqinResponseMode {
        if ($requiresConfirmation) {
            return MrMutqinResponseMode::PrepareAndConfirm;
        }

        $mode = $this->registry->defaultMode($intent);

        $answerOnly = ($context['preferences']['answer_only'] ?? false)
            || ($utterancePreferences['answer_only'] ?? false);
        $navigateOnly = ($context['preferences']['navigate_only'] ?? false)
            || ($utterancePreferences['navigate_only'] ?? false);
        $noSpeech = ($context['preferences']['no_speech'] ?? false)
            || ($utterancePreferences['no_speech'] ?? false);
        $stayOnPage = ($context['preferences']['stay_on_page'] ?? false)
            || ($utterancePreferences['stay_on_page'] ?? false);

        if ($stayOnPage || $answerOnly) {
            if ($mode === MrMutqinResponseMode::NavigateOnly) {
                return MrMutqinResponseMode::AnswerOnly;
            }
            if ($mode === MrMutqinResponseMode::AnswerAndNavigate) {
                return MrMutqinResponseMode::AnswerOnly;
            }
        }

        if ($navigateOnly || $noSpeech) {
            if ($mode === MrMutqinResponseMode::AnswerOnly) {
                return MrMutqinResponseMode::NavigateOnly;
            }
            if ($mode === MrMutqinResponseMode::AnswerAndNavigate) {
                return MrMutqinResponseMode::NavigateOnly;
            }
        }

        return $mode;
    }

    /**
     * @return array{answer_only?: bool, navigate_only?: bool, no_speech?: bool, stay_on_page?: bool}
     */
    public function utterancePreferences(string $transcript): array
    {
        $text = strtolower(trim($transcript));
        if ($text === '') {
            return [];
        }

        $prefs = [];

        if (preg_match('/\b(just tell me|don\'?t open|do not open|stay on this page|answer only)\b/', $text)) {
            $prefs['answer_only'] = true;
            $prefs['stay_on_page'] = true;
        }
        if (preg_match('/\b(open (it )?without speaking|navigate only|take me there|don\'?t speak)\b/', $text)) {
            $prefs['navigate_only'] = true;
            $prefs['no_speech'] = true;
        }
        if (preg_match('/\b(read it aloud|tell me aloud|speak)\b/', $text) && ! ($prefs['navigate_only'] ?? false)) {
            $prefs['answer_only'] = false;
        }

        return $prefs;
    }

    /**
     * @param  MrMutqinResponseMode  $mode
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function apply(MrMutqinResponseMode $mode, array $payload, array $context): array
    {
        $noSpeech = ($context['preferences']['no_speech'] ?? false);

        if ($noSpeech) {
            $payload['spoken'] = null;
        }

        if ($mode === MrMutqinResponseMode::NavigateOnly) {
            $payload['spoken'] = null;
        }

        if ($mode === MrMutqinResponseMode::AnswerOnly) {
            $payload['navigation'] = null;
        }

        if ($mode === MrMutqinResponseMode::ExecuteAction) {
            $payload['navigation'] = null;
            $payload['spoken'] = null;
        }

        $payload['response_mode'] = $mode->value;

        return $payload;
    }
}
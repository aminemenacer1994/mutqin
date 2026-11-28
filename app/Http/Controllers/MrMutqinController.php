<?php

namespace App\Http\Controllers;

use App\Http\Requests\MrMutqinInterpretRequest;
use App\Models\User;
use App\Services\AskMutqin\SessionVoiceInterpreter;
use App\Services\MrMutqin\MrMutqinContext;
use App\Services\MrMutqin\MrMutqinPipeline;
use App\Services\MrMutqin\MrMutqinSuggestionService;
use App\Support\MrMutqinAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MrMutqinController extends Controller
{
    public function interpret(MrMutqinInterpretRequest $request, MrMutqinPipeline $pipeline): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! MrMutqinAccess::visible($user)) {
            abort(403);
        }

        $validated = $request->validated();
        $context = is_array($validated['context'] ?? null) ? $validated['context'] : [];

        $result = $pipeline->interpret(
            $user,
            (string) $validated['transcript'],
            $context,
        );

        $status = ($result['ok'] ?? false) ? 200 : 422;

        return response()->json($result, $status);
    }

    public function suggestions(Request $request, MrMutqinSuggestionService $suggestions, SessionVoiceInterpreter $vocabulary): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! MrMutqinAccess::visible($user)) {
            abort(403);
        }

        $context = MrMutqinContext::fromRequest($user, $request->validate([
            'role' => ['nullable', 'string', 'max:24'],
            'shell' => ['nullable', 'string', 'max:32'],
            'view' => ['nullable', 'string', 'max:48'],
            'pane' => ['nullable', 'string', 'max:48'],
        ]));

        $rows = $suggestions->forContext($context);

        return response()->json([
            'ok' => true,
            'suggestions' => array_map(static function (array $row): array {
                return [
                    'id' => $row['id'],
                    'label_key' => $row['label'],
                    'sample' => $row['sample'],
                ];
            }, $rows),
            'vocabulary' => $vocabulary->recognitionVocabulary(MrMutqinAccess::vocabularyLanguage($user)),
        ]);
    }
}
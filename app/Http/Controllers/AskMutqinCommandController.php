<?php

namespace App\Http\Controllers;

use App\Http\Requests\InterpretAskMutqinCommandRequest;
use App\Http\Requests\InterpretSessionVoiceCommandRequest;
use App\Models\User;
use App\Services\AskMutqin\CommandInterpreter;
use App\Services\AskMutqin\SessionVoiceInterpreter;
use App\Support\MutqinLog;
use App\Support\SessionVoiceAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AskMutqinCommandController extends Controller
{
    public function interpret(InterpretAskMutqinCommandRequest $request, CommandInterpreter $interpreter): JsonResponse
    {
        $validated = $request->validated();
        $result = $interpreter->interpret(
            (string) $validated['transcript'],
            (int) $validated['surah'],
            (int) $validated['ayah_start'],
            isset($validated['current_speed']) ? (float) $validated['current_speed'] : 1.0,
            $validated['current_reciter'] ?? null,
            is_array($validated['previous_command'] ?? null) ? $validated['previous_command'] : [],
        );

        if (! ($result['ok'] ?? false)) {
            return response()->json([
                'ok' => false,
                'reason' => $result['reason'] ?? 'invalid_command',
            ], 422);
        }

        return response()->json($result);
    }

    public function interpretSession(InterpretSessionVoiceCommandRequest $request, SessionVoiceInterpreter $interpreter): JsonResponse
    {
        $validated = $request->validated();
        $result = $interpreter->interpret(
            (string) $validated['transcript'],
            is_array($validated['overrides'] ?? null) ? $validated['overrides'] : [],
            is_array($validated['words'] ?? null) ? $validated['words'] : [],
        );

        return response()->json($result);
    }

    public function recordVoiceMetrics(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! SessionVoiceAccess::visible($user)) {
            abort(403);
        }

        $data = $request->validate([
            'duration_ms' => ['required', 'integer', 'min:0', 'max:180000'],
            'first_partial_ms' => ['nullable', 'integer', 'min:0', 'max:180000'],
            'final_latency_ms' => ['nullable', 'integer', 'min:0', 'max:180000'],
            'language' => ['nullable', 'string', 'max:12'],
            'provider' => ['nullable', 'string', 'in:speechmatics,webspeech'],
            'outcome' => ['nullable', 'string', 'max:32'],
        ]);

        MutqinLog::info('session_voice.recognition', [
            'user_id' => $user->id,
            'duration_ms' => $data['duration_ms'],
            'first_partial_ms' => $data['first_partial_ms'] ?? null,
            'final_latency_ms' => $data['final_latency_ms'] ?? null,
            'language' => $data['language'] ?? 'en',
            'provider' => $data['provider'] ?? 'speechmatics',
            'outcome' => $data['outcome'] ?? null,
        ]);

        return response()->json(['ok' => true]);
    }
}

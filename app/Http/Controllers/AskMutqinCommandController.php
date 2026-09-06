<?php

namespace App\Http\Controllers;

use App\Http\Requests\InterpretAskMutqinCommandRequest;
use App\Services\AskMutqin\CommandInterpreter;
use Illuminate\Http\JsonResponse;

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
}

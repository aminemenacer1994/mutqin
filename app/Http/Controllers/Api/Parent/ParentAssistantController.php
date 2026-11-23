<?php

namespace App\Http\Controllers\Api\Parent;

use App\Http\Controllers\Controller;
use App\Http\Requests\Parent\AskParentAssistantRequest;
use App\Models\User;
use App\Services\Parent\ParentLearningAssistant;
use App\Support\ParentFeatures;
use Illuminate\Http\JsonResponse;

class ParentAssistantController extends Controller
{
    public function ask(AskParentAssistantRequest $request, ParentLearningAssistant $assistant): JsonResponse
    {
        ParentFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User && $user->isParent(), 403);

        $childId = $request->filled('child_id') ? (int) $request->input('child_id') : null;

        return response()->json($assistant->ask(
            $user,
            $childId,
            $request->string('question')->toString(),
            $request->filled('prompt') ? $request->string('prompt')->toString() : null,
        ));
    }
}

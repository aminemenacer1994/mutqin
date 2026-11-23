<?php

namespace App\Http\Controllers\Api\Parent;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Parent\ParentAccessAuthorizer;
use App\Services\Parent\ParentFamilyDashboardService;
use App\Support\ParentFeatures;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParentDashboardController extends Controller
{
    public function shell(Request $request, ParentFamilyDashboardService $dashboard): JsonResponse
    {
        ParentFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User && $user->isParent(), 403);

        return response()->json($dashboard->present($user));
    }

    public function showChild(Request $request, User $student, ParentAccessAuthorizer $access, ParentFamilyDashboardService $dashboard): JsonResponse
    {
        ParentFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User && $access->allows($user, $student), 404);

        $child = collect($dashboard->present($user)['children'])
            ->first(fn (array $row) => (int) $row['id'] === (int) $student->id);
        abort_if($child === null, 404);

        return response()->json(['child' => $child]);
    }
}

<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Learning\StudentCircleService;
use App\Support\TeacherFeatures;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LearnerCircleController extends Controller
{
    public function show(Request $request, StudentCircleService $circle): JsonResponse
    {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return response()->json([
            'circle' => $circle->present($user),
        ])->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }
}

<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Models\ParentStudentLink;
use App\Models\User;
use App\Services\Parent\ParentStudentLinkService;
use App\Services\Teacher\TeacherDashboardService;
use App\Support\ParentFeatures;
use App\Support\TeacherFeatures;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class LearnerGuardianController extends Controller
{
    public function approve(
        Request $request,
        ParentStudentLink $link,
        ParentStudentLinkService $links,
        TeacherDashboardService $dashboard,
    ): JsonResponse {
        ParentFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        Gate::forUser($user)->authorize('approve', $link);
        $links->approve($link, $user, null, $request);

        return $this->responseFor($user, $dashboard);
    }

    public function reject(
        Request $request,
        ParentStudentLink $link,
        ParentStudentLinkService $links,
        TeacherDashboardService $dashboard,
    ): JsonResponse {
        ParentFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        Gate::forUser($user)->authorize('reject', $link);
        $links->reject($link, $user, $request);

        return $this->responseFor($user, $dashboard);
    }

    private function responseFor(User $user, TeacherDashboardService $dashboard): JsonResponse
    {
        if (TeacherFeatures::enabled() && TeacherFeatures::learnerSectionEnabled()) {
            return response()->json($dashboard->learnerSupport($user))
                ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
        }

        return response()->json(['ok' => true])
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }
}

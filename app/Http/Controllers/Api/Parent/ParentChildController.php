<?php

namespace App\Http\Controllers\Api\Parent;

use App\Http\Controllers\Controller;
use App\Models\TeacherAssignmentRecipient;
use App\Models\User;
use App\Services\Parent\ParentAccessAuthorizer;
use App\Services\Parent\ParentChildLearningService;
use App\Support\ParentFeatures;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParentChildController extends Controller
{
    public function assignments(
        Request $request,
        User $student,
        ParentAccessAuthorizer $access,
        ParentChildLearningService $learning,
    ): JsonResponse {
        ParentFeatures::abortUnlessEnabled();
        $parent = $request->user();
        abort_unless($parent instanceof User && $access->allows($parent, $student), 404);

        return response()->json($learning->assignments($parent, $student, [
            'activity' => $request->query('activity'),
            'status' => $request->query('status'),
            'from' => $request->query('from'),
            'to' => $request->query('to'),
        ]));
    }

    public function progress(
        Request $request,
        User $student,
        ParentAccessAuthorizer $access,
        ParentChildLearningService $learning,
    ): JsonResponse {
        ParentFeatures::abortUnlessEnabled();
        $parent = $request->user();
        abort_unless($parent instanceof User && $access->allows($parent, $student), 404);

        return response()->json($learning->progress($parent, $student, (string) $request->query('window', 'week')));
    }

    public function profile(
        Request $request,
        User $student,
        ParentAccessAuthorizer $access,
        ParentChildLearningService $learning,
    ): JsonResponse {
        ParentFeatures::abortUnlessEnabled();
        $parent = $request->user();
        abort_unless($parent instanceof User && $access->allows($parent, $student), 404);

        return response()->json($learning->profile($parent, $student));
    }

    public function acknowledgeSupervision(
        Request $request,
        User $student,
        TeacherAssignmentRecipient $recipient,
        ParentAccessAuthorizer $access,
        ParentChildLearningService $learning,
    ): JsonResponse {
        ParentFeatures::abortUnlessEnabled();
        $parent = $request->user();
        abort_unless($parent instanceof User && $access->allows($parent, $student), 404);

        return response()->json($learning->acknowledgeSupervision($parent, $student, $recipient));
    }

    public function attendance(
        Request $request,
        User $student,
        ParentAccessAuthorizer $access,
        ParentChildLearningService $learning,
    ): JsonResponse {
        ParentFeatures::abortUnlessEnabled();
        $parent = $request->user();
        abort_unless($parent instanceof User && $access->allows($parent, $student), 404);

        return response()->json($learning->attendance($parent, $student, [
            'from' => $request->query('from'),
            'to' => $request->query('to'),
            'group_id' => $request->query('group_id'),
        ]));
    }
}

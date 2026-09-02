<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Feedback;
use App\Services\FeedbackService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class FeedbackController extends Controller
{
    public function index(Request $request, FeedbackService $service): JsonResponse
    {
        $this->admin($request);

        return response()
            ->json($service->adminList($request->query()))
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function show(Request $request, Feedback $feedback, FeedbackService $service): JsonResponse
    {
        $this->admin($request);

        return response()
            ->json(['feedback' => $service->adminShow($feedback)])
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function update(Request $request, Feedback $feedback, FeedbackService $service): JsonResponse
    {
        $this->admin($request);

        $validated = $request->validate([
            'status' => ['sometimes', 'required', 'string', Rule::in(Feedback::STATUSES)],
            'admin_note' => ['nullable', 'string', 'max:5000'],
            'user_id' => ['prohibited'],
            'type' => ['prohibited'],
            'message' => ['prohibited'],
            'ai_check_id' => ['prohibited'],
        ]);

        return response()->json([
            'feedback' => $service->updateAdmin($feedback, $validated),
        ]);
    }

    public function destroy(Request $request, Feedback $feedback, FeedbackService $service): JsonResponse
    {
        $this->admin($request);

        $service->destroyAdmin($feedback);

        return response()->json([
            'message' => __('admin.feedback.deleted'),
        ]);
    }

    public function screenshot(Request $request, Feedback $feedback, FeedbackService $service): Response
    {
        $this->admin($request);

        $file = $service->screenshotContents($feedback);
        abort_if($file === null, 404);

        return response($file['contents'], 200, [
            'Content-Type' => $file['mime'],
            'Cache-Control' => 'private, no-store',
        ]);
    }

    public function metrics(Request $request, FeedbackService $service): JsonResponse
    {
        $this->admin($request);

        return response()->json([
            'ai_complaints' => $service->aiComplaintMetrics(),
        ]);
    }

    private function admin(Request $request): void
    {
        abort_unless($request->user()?->can('access-admin'), 403);
    }
}

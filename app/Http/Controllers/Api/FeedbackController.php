<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Feedback;
use App\Services\FeedbackService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FeedbackController extends Controller
{
    public function store(Request $request, FeedbackService $service): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'string', Rule::in(Feedback::TYPES)],
            'message' => ['required', 'string', 'min:3', 'max:5000'],
            'ai_check_id' => ['nullable', 'integer', 'min:1'],
            'ai_check_source' => ['nullable', 'string', Rule::in([
                Feedback::AI_CHECK_ASSESSMENT,
                Feedback::AI_CHECK_AI_RECITE,
            ])],
            'ai_reason' => ['nullable', 'string', Rule::in(Feedback::AI_REASONS)],
            'context' => ['nullable', 'array'],
            'context.route' => ['nullable', 'string', 'max:255'],
            'context.page' => ['nullable', 'string', 'max:255'],
            'context.device' => ['nullable', 'string', 'max:255'],
            'context.browser' => ['nullable', 'string', 'max:255'],
            'context.language' => ['nullable', 'string', 'max:32'],
            'context.theme' => ['nullable', 'string', 'max:32'],
            'context.mushaf_layout' => ['nullable', 'string', 'max:64'],
            'context.recommendation_id' => ['nullable', 'integer', 'min:1'],
            'screenshot' => ['nullable', 'file', 'max:5120', 'mimes:jpg,jpeg,png,webp,gif'],
            // Reject forged ownership / status fields.
            'user_id' => ['prohibited'],
            'status' => ['prohibited'],
            'admin_note' => ['prohibited'],
        ], [
            'message.required' => __('feedback.message_required'),
            'message.min' => __('feedback.message_min'),
            'type.required' => __('feedback.type_required'),
            'type.in' => __('feedback.type_invalid'),
        ]);

        if (! empty($validated['ai_check_id']) && empty($validated['ai_check_source'])) {
            return response()->json([
                'message' => __('feedback.ai_check_source_invalid'),
                'errors' => ['ai_check_source' => [__('feedback.ai_check_source_invalid')]],
            ], 422);
        }

        $feedback = $service->store(
            $request->user(),
            $validated,
            $request->file('screenshot')
        );

        return response()->json([
            'message' => __('feedback.sent'),
            'data' => [
                'id' => (int) $feedback->id,
                'type' => $feedback->type,
                'status' => $feedback->status,
                'created_at' => $feedback->created_at?->toIso8601String(),
            ],
        ], 201);
    }
}

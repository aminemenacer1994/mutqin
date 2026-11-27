<?php

namespace App\Http\Controllers\Api\Hifz;

use App\Http\Controllers\Controller;
use App\Models\HifzExaminationAttempt;
use App\Models\HifzExaminationQuestion;
use App\Models\TeacherAssignmentRecipient;
use App\Models\User;
use App\Services\Hifz\HifzExaminationService;
use App\Services\Teacher\TeacherAssignmentService;
use App\Support\TeacherFeatures;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class HifzExaminationController extends Controller
{
    public function show(
        Request $request,
        TeacherAssignmentRecipient $recipient,
        HifzExaminationService $examinations,
        TeacherAssignmentService $assignments,
    ): JsonResponse {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        abort_unless((int) $recipient->student_id === (int) $user->id, 403);

        $payload = $examinations->ensureAttempt($user, $recipient);
        $recipient->loadMissing('assignment');

        return response()->json([
            'examination' => $examinations->presentAttempt($payload['attempt']),
            'assignment' => $recipient->assignment
                ? $assignments->presentRecipient($recipient, false, null, null, null, (int) $user->id)
                : null,
        ])->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function answerQuestion(
        Request $request,
        HifzExaminationQuestion $question,
        HifzExaminationService $examinations,
    ): JsonResponse {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $data = $request->validate([
            'wording_result' => ['nullable', 'string', Rule::in(['correct', 'minor', 'major', 'incomplete', 'unknown'])],
            'hesitation' => ['nullable', 'boolean'],
            'prompts_used' => ['nullable', 'integer', 'min:0', 'max:20'],
            'completed' => ['nullable', 'boolean'],
            'fluency' => ['nullable', 'string', Rule::in(['strong', 'sound', 'needs_work'])],
            'memorisation_assessment_id' => ['nullable', 'integer', 'exists:memorisation_assessments,id'],
            'ai_recite_attempt_id' => ['nullable', 'integer', 'exists:ai_recite_attempts,id'],
        ]);

        $updated = $examinations->recordQuestionOutcome($user, $question, $data);

        return response()->json([
            'question' => $examinations->presentQuestion($updated),
        ]);
    }

    public function submit(
        Request $request,
        TeacherAssignmentRecipient $recipient,
        HifzExaminationService $examinations,
    ): JsonResponse {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        abort_unless((int) $recipient->student_id === (int) $user->id, 403);

        $attempt = HifzExaminationAttempt::query()
            ->where('teacher_assignment_recipient_id', $recipient->id)
            ->firstOrFail();

        $submitted = $examinations->submitAttempt($user, $attempt);

        return response()->json([
            'examination' => $examinations->presentAttempt($submitted),
        ]);
    }

    public function teacherMarkQuestion(
        Request $request,
        HifzExaminationQuestion $question,
        HifzExaminationService $examinations,
    ): JsonResponse {
        TeacherFeatures::abortUnlessEnabled();
        $teacher = $request->user();
        abort_unless($teacher instanceof User, 401);

        $attempt = $question->attempt()->with('recipient.assignment')->firstOrFail();
        abort_unless($attempt->recipient?->assignment?->teacher_id === $teacher->id, 403);

        $data = $request->validate([
            'wording_result' => ['nullable', 'string', Rule::in(['correct', 'minor', 'major', 'incomplete', 'unknown'])],
            'hesitation' => ['nullable', 'boolean'],
            'fluency' => ['nullable', 'string', Rule::in(['strong', 'sound', 'needs_work'])],
            'teacher_feedback' => ['nullable', 'string', 'max:2000'],
            'teacher_score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'completed' => ['nullable', 'boolean'],
        ]);

        $question->forceFill([
            'wording_result' => $data['wording_result'] ?? $question->wording_result,
            'hesitation' => array_key_exists('hesitation', $data) ? $data['hesitation'] : $question->hesitation,
            'fluency' => $data['fluency'] ?? $question->fluency,
            'teacher_feedback' => $data['teacher_feedback'] ?? $question->teacher_feedback,
            'teacher_score' => $data['teacher_score'] ?? $question->teacher_score,
            'completed' => array_key_exists('completed', $data) ? $data['completed'] : $question->completed,
        ])->save();

        return response()->json([
            'question' => array_merge($examinations->presentQuestion($question->fresh()), [
                'teacher_feedback' => $question->teacher_feedback,
                'teacher_score' => $question->teacher_score,
            ]),
        ]);
    }

    public function teacherShowAttempt(Request $request, TeacherAssignmentRecipient $recipient, HifzExaminationService $examinations): JsonResponse
    {
        TeacherFeatures::abortUnlessEnabled();
        $teacher = $request->user();
        abort_unless($teacher instanceof User, 401);

        $recipient->loadMissing('assignment');
        abort_unless($recipient->assignment?->teacher_id === $teacher->id, 403);

        $attempt = HifzExaminationAttempt::query()
            ->where('teacher_assignment_recipient_id', $recipient->id)
            ->with('questions')
            ->first();

        return response()->json([
            'examination' => $attempt ? $examinations->presentAttempt($attempt) : null,
        ]);
    }
}
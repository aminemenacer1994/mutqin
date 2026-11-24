<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\AiReciteAttempt;
use App\Models\TeacherRecitationFeedbackSegment;
use App\Models\TeacherWordCoachingCorrection;
use App\Models\User;
use App\Services\Teacher\TeacherRecitationPlaybackService;
use App\Services\Teacher\TeacherRecitationFeedbackSegmentAudioService;
use App\Services\Teacher\TeacherWordCoachingAudioService;
use App\Support\TeacherFeatures;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeacherRecitationPlaybackController extends Controller
{
    public function show(Request $request, User $student, AiReciteAttempt $attempt, TeacherRecitationPlaybackService $playback): JsonResponse
    {
        return $this->json($playback->show($this->teacher($request), $student, $attempt));
    }

    public function review(Request $request, User $student, AiReciteAttempt $attempt, TeacherRecitationPlaybackService $playback): JsonResponse
    {
        return $this->json($playback->markReviewed($this->teacher($request), $student, $attempt));
    }

    public function feedback(Request $request, User $student, AiReciteAttempt $attempt, TeacherRecitationPlaybackService $playback): JsonResponse
    {
        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:2000'],
            'client_message_id' => ['nullable', 'uuid'],
            'audio' => ['nullable', 'file', 'max:8192'],
            'duration_ms' => ['nullable', 'integer', 'between:1,120000'],
        ]);

        return $this->json($playback->storeFeedback(
            $this->teacher($request),
            $student,
            $attempt,
            (string) ($data['body'] ?? ''),
            $request->file('audio'),
            isset($data['duration_ms']) ? (int) $data['duration_ms'] : null,
            $data['client_message_id'] ?? null,
        ), 201);
    }

    public function privateNote(Request $request, User $student, AiReciteAttempt $attempt, TeacherRecitationPlaybackService $playback): JsonResponse
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'max:4000'],
        ]);

        return $this->json($playback->storePrivateNote(
            $this->teacher($request),
            $student,
            $attempt,
            $data['body'],
        ), 201);
    }

    public function revision(Request $request, User $student, AiReciteAttempt $attempt, TeacherRecitationPlaybackService $playback): JsonResponse
    {
        $data = $request->validate([
            'due_at' => ['required', 'date', 'after_or_equal:today'],
            'feedback' => ['nullable', 'string', 'max:2000'],
        ]);

        return $this->json($playback->assignRevision(
            $this->teacher($request),
            $student,
            $attempt,
            $data,
        ), 201);
    }

    public function word(Request $request, User $student, AiReciteAttempt $attempt, TeacherRecitationPlaybackService $playback): JsonResponse
    {
        $data = $request->validate([
            'ayah' => ['required', 'integer', 'min:1', 'max:300'],
            'word_index' => ['required', 'integer', 'min:0', 'max:400'],
            'action' => ['required', 'string', 'in:reviewed,confirm,dismiss,correct,retry,practice,status'],
            'body' => ['nullable', 'string', 'max:2000'],
            'focus' => ['nullable', 'string', 'in:makharij,sifaat,madd,ghunnah,noon_meem,qalqalah,waqf,pronunciation,memorisation,other'],
            'finding' => ['nullable', 'string', 'in:strength,difficulty,correction'],
            'audio' => ['nullable', 'file', 'max:8192'],
            'duration_ms' => ['nullable', 'integer', 'between:1,120000'],
            'review_status' => ['required_if:action,status', 'nullable', 'string', 'in:awaiting_retry,needs_practice,improved,resolved'],
            'due_at' => ['required_if:action,practice', 'nullable', 'date', 'after_or_equal:today'],
            'correction_id' => ['nullable', 'integer', 'min:1'],
        ]);

        return $this->json($playback->coachWord(
            $this->teacher($request),
            $student,
            $attempt,
            $data,
            $request->file('audio'),
        ), $data['action'] === 'correct' ? 201 : 200);
    }

    public function deleteWordAudio(
        Request $request,
        User $student,
        AiReciteAttempt $attempt,
        TeacherWordCoachingCorrection $correction,
        TeacherRecitationPlaybackService $playback,
    ): JsonResponse {
        return $this->json($playback->deleteCoachingAudio(
            $this->teacher($request),
            $student,
            $attempt,
            $correction,
        ));
    }

    public function storeSegment(Request $request, User $student, AiReciteAttempt $attempt, TeacherRecitationPlaybackService $playback): JsonResponse
    {
        $data = $request->validate([
            'start_ms' => ['required', 'integer', 'min:0'],
            'end_ms' => ['required', 'integer', 'min:1'],
            'body' => ['nullable', 'string', 'max:2000'],
            'client_message_id' => ['nullable', 'uuid'],
            'audio' => ['nullable', 'file', 'max:8192'],
            'duration_ms' => ['nullable', 'integer', 'between:1,120000'],
        ]);

        return $this->json($playback->storeSegment(
            $this->teacher($request),
            $student,
            $attempt,
            $data,
            $request->file('audio'),
            isset($data['duration_ms']) ? (int) $data['duration_ms'] : null,
        ), 201);
    }

    public function updateSegment(
        Request $request,
        User $student,
        AiReciteAttempt $attempt,
        TeacherRecitationFeedbackSegment $segment,
        TeacherRecitationPlaybackService $playback,
    ): JsonResponse {
        $data = $request->validate([
            'start_ms' => ['sometimes', 'integer', 'min:0'],
            'end_ms' => ['sometimes', 'integer', 'min:1'],
            'body' => ['nullable', 'string', 'max:2000'],
            'audio' => ['nullable', 'file', 'max:8192'],
            'duration_ms' => ['nullable', 'integer', 'between:1,120000'],
        ]);

        return $this->json($playback->updateSegment(
            $this->teacher($request),
            $student,
            $attempt,
            $segment,
            $data,
            $request->file('audio'),
            isset($data['duration_ms']) ? (int) $data['duration_ms'] : null,
        ));
    }

    public function deleteSegment(
        Request $request,
        User $student,
        AiReciteAttempt $attempt,
        TeacherRecitationFeedbackSegment $segment,
        TeacherRecitationPlaybackService $playback,
    ): JsonResponse {
        return $this->json($playback->deleteSegment(
            $this->teacher($request),
            $student,
            $attempt,
            $segment,
        ));
    }

    public function deleteSegmentAudio(
        Request $request,
        User $student,
        AiReciteAttempt $attempt,
        TeacherRecitationFeedbackSegment $segment,
        TeacherRecitationPlaybackService $playback,
    ): JsonResponse {
        return $this->json($playback->deleteSegmentAudio(
            $this->teacher($request),
            $student,
            $attempt,
            $segment,
        ));
    }

    public function segmentAudio(
        Request $request,
        TeacherRecitationFeedbackSegment $segment,
        TeacherRecitationFeedbackSegmentAudioService $audio,
    ): mixed {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $response = $audio->stream($user, $segment);
        abort_unless($response !== null, 404);

        return $response;
    }

    public function correctionAudio(
        Request $request,
        TeacherWordCoachingCorrection $correction,
        TeacherWordCoachingAudioService $audio,
    ): mixed {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $response = $audio->stream($user, $correction);
        abort_unless($response !== null, 404);

        return $response;
    }

    private function teacher(Request $request): User
    {
        TeacherFeatures::abortUnlessEnabled();

        $user = $request->user();
        abort_unless($user instanceof User && $user->isTeacher(), 403);

        return $user;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function json(array $payload, int $status = 200): JsonResponse
    {
        return response()->json($payload, $status)
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }
}

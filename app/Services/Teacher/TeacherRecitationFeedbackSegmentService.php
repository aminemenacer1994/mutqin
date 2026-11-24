<?php

namespace App\Services\Teacher;

use App\Models\AiReciteAttempt;
use App\Models\TeacherRecitationFeedbackSegment;
use App\Models\TeacherRecitationReview;
use App\Models\TeacherWordCoaching;
use App\Models\User;
use App\Services\Learning\AiReciteAttemptAudioService;
use App\Support\TeacherRecitationWordEvidence;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TeacherRecitationFeedbackSegmentService
{
    public function __construct(
        private readonly AiReciteAttemptAudioService $attemptAudio,
        private readonly TeacherRecitationFeedbackSegmentAudioService $audio,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function forAttempt(User $teacher, AiReciteAttempt $attempt, bool $includeTeacherMeta = true): array
    {
        $rows = TeacherRecitationFeedbackSegment::query()
            ->where('teacher_id', $teacher->id)
            ->where('ai_recite_attempt_id', $attempt->id)
            ->orderBy('start_ms')
            ->orderBy('id')
            ->get();

        return $rows->map(fn (TeacherRecitationFeedbackSegment $row) => $this->presentRow($row, $includeTeacherMeta))->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function forStudentAttempt(AiReciteAttempt $attempt): array
    {
        $rows = TeacherRecitationFeedbackSegment::query()
            ->where('ai_recite_attempt_id', $attempt->id)
            ->where('student_id', $attempt->user_id)
            ->orderBy('start_ms')
            ->orderBy('id')
            ->with('teacher:id,name')
            ->get();

        $visible = $rows->filter(fn (TeacherRecitationFeedbackSegment $row) => $this->visibleToStudent($row));

        return $visible->map(fn (TeacherRecitationFeedbackSegment $row) => $this->presentRow($row, false))->values()->all();
    }

    /**
     * @param  array<string, mixed>  $input
     */
    public function store(
        User $teacher,
        User $student,
        AiReciteAttempt $attempt,
        array $input,
        ?UploadedFile $audio = null,
        ?int $durationMs = null,
    ): TeacherRecitationFeedbackSegment {
        $this->assertRecordingAvailable($attempt);
        $startMs = (int) ($input['start_ms'] ?? 0);
        $endMs = (int) ($input['end_ms'] ?? 0);
        $this->validateBounds($attempt, $startMs, $endMs);

        $clientMessageId = isset($input['client_message_id']) ? (string) $input['client_message_id'] : null;
        if ($clientMessageId !== '') {
            $existing = TeacherRecitationFeedbackSegment::query()
                ->where('teacher_id', $teacher->id)
                ->where('ai_recite_attempt_id', $attempt->id)
                ->where('client_message_id', $clientMessageId)
                ->first();
            if ($existing instanceof TeacherRecitationFeedbackSegment) {
                return $existing;
            }
        }

        $body = trim((string) ($input['body'] ?? ''));
        if ($body === '' && $audio === null) {
            throw ValidationException::withMessages([
                'body' => 'Write feedback or add a voice note for this segment.',
            ]);
        }

        return DB::transaction(function () use ($teacher, $student, $attempt, $startMs, $endMs, $body, $audio, $durationMs, $clientMessageId) {
            $reviewId = TeacherRecitationReview::query()
                ->where('teacher_id', $teacher->id)
                ->where('ai_recite_attempt_id', $attempt->id)
                ->value('id');

            $segment = new TeacherRecitationFeedbackSegment;
            $segment->forceFill([
                'teacher_id' => $teacher->id,
                'student_id' => $student->id,
                'ai_recite_attempt_id' => $attempt->id,
                'teacher_recitation_review_id' => $reviewId ? (int) $reviewId : null,
                'start_ms' => $startMs,
                'end_ms' => $endMs,
                'body' => $body !== '' ? $body : null,
                'client_message_id' => $clientMessageId !== '' ? $clientMessageId : null,
            ])->save();

            if ($audio !== null && ! $this->audio->store($segment, $audio, $durationMs)) {
                throw ValidationException::withMessages([
                    'audio' => 'We could not save that voice note.',
                ]);
            }

            return $segment->refresh();
        });
    }

    /**
     * @param  array<string, mixed>  $input
     */
    public function update(
        User $teacher,
        User $student,
        AiReciteAttempt $attempt,
        TeacherRecitationFeedbackSegment $segment,
        array $input,
        ?UploadedFile $audio = null,
        ?int $durationMs = null,
    ): TeacherRecitationFeedbackSegment {
        $this->assertOwnsSegment($teacher, $student, $attempt, $segment);
        $this->assertRecordingAvailable($attempt);

        if (isset($input['start_ms'], $input['end_ms'])) {
            $startMs = (int) $input['start_ms'];
            $endMs = (int) $input['end_ms'];
            $this->validateBounds($attempt, $startMs, $endMs);
            $segment->start_ms = $startMs;
            $segment->end_ms = $endMs;
        }

        if (array_key_exists('body', $input)) {
            $body = trim((string) ($input['body'] ?? ''));
            $segment->body = $body !== '' ? $body : null;
        }

        if ($audio !== null) {
            $this->audio->deleteStored($segment);
            if (! $this->audio->store($segment, $audio, $durationMs)) {
                throw ValidationException::withMessages([
                    'audio' => 'We could not save that voice note.',
                ]);
            }
        }

        $hasBody = trim((string) $segment->body) !== '';
        $hasAudio = $segment->audio_path !== null && $segment->audio_path !== '';
        if (! $hasBody && ! $hasAudio) {
            throw ValidationException::withMessages([
                'body' => 'Leave text or a voice note on this segment.',
            ]);
        }

        $segment->save();

        return $segment->refresh();
    }

    public function delete(
        User $teacher,
        User $student,
        AiReciteAttempt $attempt,
        TeacherRecitationFeedbackSegment $segment,
    ): void {
        $this->assertOwnsSegment($teacher, $student, $attempt, $segment);
        $this->audio->deleteStored($segment);
        $segment->delete();
    }

    public function deleteAudio(
        User $teacher,
        User $student,
        AiReciteAttempt $attempt,
        TeacherRecitationFeedbackSegment $segment,
    ): TeacherRecitationFeedbackSegment {
        $this->assertOwnsSegment($teacher, $student, $attempt, $segment);
        $this->audio->deleteStored($segment);

        return $segment->refresh();
    }

    /**
     * @param  list<array<string, mixed>>  $coachings
     * @param  list<array<string, mixed>>  $segments
     * @param  array<string, mixed>|null  $review
     * @return array<string, mixed>
     */
    public function buildReviewSummary(
        array $words,
        array $coachings,
        array $segments,
        ?array $review,
        ?array $suggestedRevision,
    ): array {
        $aiAttention = 0;
        foreach ($words as $word) {
            $status = strtolower(trim((string) ($word['status'] ?? '')));
            $type = strtoupper(trim((string) ($word['type'] ?? '')));
            $needs = in_array($status, ['wrong', 'incorrect', 'partial', 'omitted', 'skipped'], true)
                || in_array($type, ['SUBSTITUTION', 'DELETION'], true);
            if ($needs) {
                $aiAttention += 1;
            }
        }

        $confirmed = 0;
        $dismissed = 0;
        foreach ($coachings as $coaching) {
            $decision = (string) ($coaching['decision'] ?? '');
            if ($decision === TeacherWordCoaching::DECISION_CONFIRMED) {
                $confirmed++;
            } elseif ($decision === TeacherWordCoaching::DECISION_DISMISSED) {
                $dismissed++;
            }
        }

        $segmentLines = [];
        foreach ($segments as $segment) {
            $line = [
                'id' => (int) ($segment['id'] ?? 0),
                'start_ms' => (int) ($segment['start_ms'] ?? 0),
                'end_ms' => (int) ($segment['end_ms'] ?? 0),
                'body' => $segment['body'] ?? null,
                'has_audio' => (bool) ($segment['audio']['available'] ?? false),
            ];
            if ($line['body'] !== null || $line['has_audio']) {
                $segmentLines[] = $line;
            }
        }

        $revision = $review['revision'] ?? null;
        $passageFeedback = $review['feedback']['body'] ?? null;

        return [
            'ai_flags' => [
                'unverified_suggestions' => $aiAttention,
                'teacher_confirmed' => $confirmed,
                'teacher_dismissed' => $dismissed,
            ],
            'segment_comments' => $segmentLines,
            'passage_feedback' => $passageFeedback,
            'revision' => $revision ? [
                'id' => (int) ($revision['id'] ?? 0),
                'title' => $revision['title'] ?? null,
                'due_at' => $revision['due_at'] ?? null,
                'surah_name' => $revision['surah_name'] ?? null,
                'ayah_start' => $revision['ayah_start'] ?? null,
                'ayah_end' => $revision['ayah_end'] ?? null,
            ] : null,
            'suggested_revision' => $suggestedRevision,
            'actionable' => $confirmed > 0
                || $segmentLines !== []
                || $revision !== null
                || ($suggestedRevision['focused'] ?? false),
        ];
    }

    private function assertOwnsSegment(
        User $teacher,
        User $student,
        AiReciteAttempt $attempt,
        TeacherRecitationFeedbackSegment $segment,
    ): void {
        abort_unless(
            (int) $segment->teacher_id === (int) $teacher->id
            && (int) $segment->student_id === (int) $student->id
            && (int) $segment->ai_recite_attempt_id === (int) $attempt->id,
            404,
        );
    }

    private function assertRecordingAvailable(AiReciteAttempt $attempt): void
    {
        $payload = $this->attemptAudio->payload($attempt);
        if (! ($payload['available'] ?? false)) {
            throw ValidationException::withMessages([
                'audio' => 'No student recording is available for timestamped feedback.',
            ]);
        }
    }

    private function validateBounds(AiReciteAttempt $attempt, int $startMs, int $endMs): void
    {
        $duration = $this->recordingDurationMs($attempt);
        if ($startMs < 0 || $endMs <= $startMs) {
            throw ValidationException::withMessages([
                'start_ms' => 'Choose a valid start and end time.',
            ]);
        }
        if ($duration !== null && $endMs > $duration) {
            throw ValidationException::withMessages([
                'end_ms' => 'The segment end must be within the recording.',
            ]);
        }
    }

    private function recordingDurationMs(AiReciteAttempt $attempt): ?int
    {
        $audio = $this->attemptAudio->payload($attempt);
        $duration = $audio['duration_ms'] ?? null;
        if ($duration && (int) $duration > 0) {
            return (int) $duration;
        }
        if ((int) $attempt->audio_duration_ms > 0) {
            return (int) $attempt->audio_duration_ms;
        }
        if ((int) $attempt->duration_ms > 0) {
            return (int) $attempt->duration_ms;
        }

        $words = TeacherRecitationWordEvidence::fromAttempt($attempt, TeacherRecitationWordEvidence::PLAYBACK_LIMIT);
        $maxEnd = 0;
        foreach ($words as $word) {
            if (isset($word['end'])) {
                $maxEnd = max($maxEnd, (int) round((float) $word['end'] * 1000));
            }
        }

        return $maxEnd > 0 ? $maxEnd : null;
    }

    /**
     * @return array<string, mixed>
     */
    private function presentRow(TeacherRecitationFeedbackSegment $segment, bool $includeTeacherMeta): array
    {
        $audio = $this->audio->payload($segment);
        $row = [
            'id' => (int) $segment->id,
            'start_ms' => (int) $segment->start_ms,
            'end_ms' => (int) $segment->end_ms,
            'start' => round($segment->start_ms / 1000, 3),
            'end' => round($segment->end_ms / 1000, 3),
            'body' => $segment->body,
            'audio' => $audio,
            'created_at' => $segment->created_at?->toIso8601String(),
            'authority' => 'teacher',
            'ai_wording_flag' => false,
        ];
        if ($includeTeacherMeta) {
            $row['client_message_id'] = $segment->client_message_id;
        } else {
            $row['teacher_name'] = $segment->relationLoaded('teacher') ? $segment->teacher?->name : null;
        }

        return $row;
    }

    private function visibleToStudent(TeacherRecitationFeedbackSegment $segment): bool
    {
        $body = trim((string) $segment->body);

        return $body !== '' || ($segment->audio_path !== null && $segment->audio_path !== '');
    }
}
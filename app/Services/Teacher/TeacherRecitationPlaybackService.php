<?php

namespace App\Services\Teacher;

use App\Enums\AssignmentKind;
use App\Enums\AssignmentStatus;
use App\Enums\TeacherNoteKind;
use App\Enums\TeacherPrivateNoteCategory;
use App\Models\AiReciteAttempt;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherNote;
use App\Models\TeacherPrivateNote;
use App\Models\TeacherRecitationAssessment;
use App\Models\TeacherRecitationReview;
use App\Models\TeacherRecitationFeedbackSegment;
use App\Models\TeacherWordCoachingCorrection;
use App\Models\User;
use App\Services\Learning\AiReciteAttemptAudioService;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Support\QuranMetadata;
use App\Support\RecitationAlignmentStatus;
use App\Support\TeacherFeatures;
use App\Support\TeacherOverviewCache;
use App\Support\TeacherRecitationWordEvidence;
use App\Support\TeacherAcousticTajweedEvidence;
use App\Support\TeacherTajweedPracticeEvidence;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TeacherRecitationPlaybackService
{
    public function __construct(
        private readonly StudentAccessAuthorizer $access,
        private readonly AiReciteAttemptAudioService $audio,
        private readonly TeacherDashboardService $dashboard,
        private readonly TeacherAssignmentService $assignments,
        private readonly TeacherPrivateNoteService $privateNotes,
        private readonly TeacherWordCoachingService $coachings,
        private readonly TeacherRecitationFeedbackSegmentService $segments,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function show(User $teacher, User $student, AiReciteAttempt $attempt): array
    {
        $attempt = $this->authorisedAttempt($teacher, $student, $attempt);

        return $this->present($teacher, $student, $attempt);
    }

    /**
     * @return array<string, mixed>
     */
    public function markReviewed(User $teacher, User $student, AiReciteAttempt $attempt): array
    {
        $attempt = $this->authorisedAttempt($teacher, $student, $attempt);
        $this->saveReview($teacher, $student, $attempt, ['status' => TeacherRecitationReview::REVIEWED]);
        $this->rememberTaskReview($attempt);
        TeacherOverviewCache::forget((int) $teacher->id);

        return $this->present($teacher, $student, $attempt);
    }

    /**
     * @return array<string, mixed>
     */
    public function storeFeedback(
        User $teacher,
        User $student,
        AiReciteAttempt $attempt,
        string $body,
        ?UploadedFile $audio = null,
        ?int $durationMs = null,
        ?string $clientMessageId = null,
    ): array {
        $attempt = $this->authorisedAttempt($teacher, $student, $attempt);
        DB::transaction(function () use ($teacher, $student, $attempt, $body, $audio, $durationMs, $clientMessageId) {
            AiReciteAttempt::query()->whereKey($attempt->id)->lockForUpdate()->firstOrFail();
            if ($clientMessageId !== null) {
                $existing = TeacherNote::query()->where('teacher_id', $teacher->id)
                    ->where('student_id', $student->id)->where('client_message_id', $clientMessageId)->first();
                if ($existing) {
                    $this->saveReview($teacher, $student, $attempt, ['feedback_note_id' => (int) $existing->id]);
                    return;
                }
            }
            $attempt->loadMissing('assignmentRecipient.assignment');
            $recipient = $attempt->assignmentRecipient;
            $note = $recipient instanceof TeacherAssignmentRecipient
                ? $this->assignments->addTeacherMessage($teacher, $recipient, $body, $audio, $durationMs, $clientMessageId)
                : $this->dashboard->addNote(
                    $teacher,
                    $student,
                    TeacherNoteKind::Feedback->value,
                    $body,
                    $audio,
                    $durationMs,
                    $this->surahNumber($attempt),
                    $this->ayahStart($attempt),
                    $this->ayahEnd($attempt),
                    null,
                );

            if ($clientMessageId !== null && $note->client_message_id !== $clientMessageId) {
                $note->forceFill(['client_message_id' => $clientMessageId])->save();
            }
            $this->saveReview($teacher, $student, $attempt, ['feedback_note_id' => (int) $note->id]);
        });

        return $this->present($teacher, $student, $attempt);
    }

    /**
     * @return array<string, mixed>
     */
    public function storePrivateNote(User $teacher, User $student, AiReciteAttempt $attempt, string $body): array
    {
        $attempt = $this->authorisedAttempt($teacher, $student, $attempt);
        $assignment = $attempt->assignmentRecipient?->assignment;
        $note = $this->privateNotes->create($teacher, $student, [
            'category' => TeacherPrivateNoteCategory::LessonObservations->value,
            'body' => $body,
            'surah_number' => $this->surahNumber($attempt),
            'ayah_start' => $this->ayahStart($attempt),
            'ayah_end' => $this->ayahEnd($attempt),
            'teacher_assignment_id' => $assignment && (int) $assignment->teacher_id === (int) $teacher->id
                ? (int) $assignment->id
                : null,
        ]);
        $this->saveReview($teacher, $student, $attempt, ['private_note_id' => (int) $note->id]);

        return $this->present($teacher, $student, $attempt);
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function assignRevision(User $teacher, User $student, AiReciteAttempt $attempt, array $input): array
    {
        $attempt = $this->authorisedAttempt($teacher, $student, $attempt);
        $range = $this->revisionRange($attempt);
        if ($range === null) {
            throw ValidationException::withMessages([
                'assignment' => 'This recitation has no passage to assign.',
            ]);
        }

        DB::transaction(function () use ($teacher, $student, $attempt, $range, $input) {
            // Serialize retries even before a review row exists.
            AiReciteAttempt::query()->whereKey($attempt->id)->lockForUpdate()->firstOrFail();
            $review = TeacherRecitationReview::query()
                ->where('teacher_id', $teacher->id)
                ->where('ai_recite_attempt_id', $attempt->id)
                ->first();
            if ($review?->teacher_assignment_id && TeacherAssignment::query()->whereKey($review->teacher_assignment_id)->exists()) {
                return;
            }
            $assignment = $this->assignments->create($teacher, [
                'kind' => AssignmentKind::AiRecite->value,
                'hifz_category' => 'sabqi',
                'activity' => 'revision',
                'recording_required' => true,
                'surah_number' => $range['surah_number'],
                'ayah_start' => $range['ayah_start'],
                'ayah_end' => $range['ayah_end'],
                'due_at' => $input['due_at'],
                'priority' => 'high',
                'feedback' => $input['feedback'] ?? null,
                'student_id' => $student->id,
                'source_ai_recite_attempt_id' => (int) $attempt->id,
            ]);
            $this->saveReview($teacher, $student, $attempt, ['teacher_assignment_id' => (int) $assignment->id]);
        });

        return $this->present($teacher, $student, $attempt);
    }

    /**
     * Teacher observations stay on their own record. They never alter the
     * checker's wording flags or invent a Tajweed result from word matching.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function storeAssessment(User $teacher, User $student, AiReciteAttempt $attempt, array $input): array
    {
        $attempt = $this->authorisedAttempt($teacher, $student, $attempt);
        $structured = $this->hasStructuredObservation($input);
        if (! $structured && ! isset($input['tajweed_score']) && trim((string) ($input['annotation'] ?? '')) === '') {
            throw ValidationException::withMessages([
                'assessment' => 'Record an observation before saving.',
            ]);
        }

        DB::transaction(function () use ($teacher, $student, $attempt, $input, $structured) {
            AiReciteAttempt::query()->whereKey($attempt->id)->lockForUpdate()->firstOrFail();
            $row = TeacherRecitationAssessment::query()
                ->where('teacher_id', $teacher->id)
                ->where('ai_recite_attempt_id', $attempt->id)
                ->lockForUpdate()
                ->first() ?: new TeacherRecitationAssessment;

            $previous = is_array($row->observations) ? $row->observations : [];
            if ($structured) {
                $observations = $this->normaliseObservations($input, $attempt);
                $general = $observations['general'];
                $tajweedRating = $observations['tajweed']['rating'] ?? null;
                $row->forceFill([
                    'teacher_id' => $teacher->id,
                    'student_id' => $student->id,
                    'ai_recite_attempt_id' => $attempt->id,
                    'tajweed_score' => $this->tajweedScoreFromRating(is_string($tajweedRating) ? $tajweedRating : null),
                    'annotation' => $general,
                    'observations' => $observations,
                ])->save();
                $this->publishGeneralFeedback($teacher, $student, $attempt, $row, $previous, (string) $general);
            } else {
                $row->forceFill([
                    'teacher_id' => $teacher->id,
                    'student_id' => $student->id,
                    'ai_recite_attempt_id' => $attempt->id,
                    'tajweed_score' => (int) $input['tajweed_score'],
                    'annotation' => $this->nullableAssessmentText($input['annotation'] ?? null),
                ])->save();
            }
        });

        TeacherOverviewCache::forget((int) $teacher->id);
        $presented = $this->present($teacher, $student, $attempt);

        return [
            'assessment' => $presented['assessment'],
            'playback' => $presented,
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function coachWord(
        User $teacher,
        User $student,
        AiReciteAttempt $attempt,
        array $input,
        ?UploadedFile $audio = null,
    ): array {
        $attempt = $this->authorisedAttempt($teacher, $student, $attempt);
        $this->coachings->apply($teacher, $student, $attempt, $input, $audio);

        return $this->present($teacher, $student, $attempt);
    }

    /**
     * @return array<string, mixed>
     */
    public function deleteCoachingAudio(
        User $teacher,
        User $student,
        AiReciteAttempt $attempt,
        TeacherWordCoachingCorrection $correction,
    ): array {
        $attempt = $this->authorisedAttempt($teacher, $student, $attempt);
        $this->coachings->deleteCorrectionAudio($teacher, $student, $attempt, $correction);

        return $this->present($teacher, $student, $attempt);
    }

    /**
     * @return array<string, mixed>
     */
    public function deleteCoaching(
        User $teacher,
        User $student,
        AiReciteAttempt $attempt,
        TeacherWordCoachingCorrection $correction,
    ): array {
        $attempt = $this->authorisedAttempt($teacher, $student, $attempt);
        $this->coachings->deleteCorrection($teacher, $student, $attempt, $correction);

        return $this->present($teacher, $student, $attempt);
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function storeSegment(
        User $teacher,
        User $student,
        AiReciteAttempt $attempt,
        array $input,
        ?UploadedFile $audio = null,
        ?int $durationMs = null,
    ): array {
        $attempt = $this->authorisedAttempt($teacher, $student, $attempt);
        $this->segments->store($teacher, $student, $attempt, $input, $audio, $durationMs);

        return $this->present($teacher, $student, $attempt);
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function updateSegment(
        User $teacher,
        User $student,
        AiReciteAttempt $attempt,
        TeacherRecitationFeedbackSegment $segment,
        array $input,
        ?UploadedFile $audio = null,
        ?int $durationMs = null,
    ): array {
        $attempt = $this->authorisedAttempt($teacher, $student, $attempt);
        $this->segments->update($teacher, $student, $attempt, $segment, $input, $audio, $durationMs);

        return $this->present($teacher, $student, $attempt);
    }

    /**
     * @return array<string, mixed>
     */
    public function deleteSegment(
        User $teacher,
        User $student,
        AiReciteAttempt $attempt,
        TeacherRecitationFeedbackSegment $segment,
    ): array {
        $attempt = $this->authorisedAttempt($teacher, $student, $attempt);
        $this->segments->delete($teacher, $student, $attempt, $segment);

        return $this->present($teacher, $student, $attempt);
    }

    /**
     * @return array<string, mixed>
     */
    public function deleteSegmentAudio(
        User $teacher,
        User $student,
        AiReciteAttempt $attempt,
        TeacherRecitationFeedbackSegment $segment,
    ): array {
        $attempt = $this->authorisedAttempt($teacher, $student, $attempt);
        $this->segments->deleteAudio($teacher, $student, $attempt, $segment);

        return $this->present($teacher, $student, $attempt);
    }

    private function authorisedAttempt(User $teacher, User $student, AiReciteAttempt $attempt): AiReciteAttempt
    {
        TeacherFeatures::abortUnlessEnabled();
        abort_unless($teacher->isTeacher(), 403);
        if (! $this->access->allows($teacher, $student) || (int) $attempt->user_id !== (int) $student->id) {
            abort(404);
        }

        $attempt->loadMissing(['assessment:id,status,recognition_data', 'assignmentRecipient.assignment', 'user:id,name']);

        return $attempt;
    }

    /**
     * @param  array<string, mixed>  $changes
     */
    private function saveReview(User $teacher, User $student, AiReciteAttempt $attempt, array $changes): TeacherRecitationReview
    {
        return DB::transaction(function () use ($teacher, $student, $attempt, $changes) {
            $review = TeacherRecitationReview::query()
                ->where('teacher_id', $teacher->id)
                ->where('ai_recite_attempt_id', $attempt->id)
                ->first();
            if (! $review instanceof TeacherRecitationReview) {
                $review = new TeacherRecitationReview;
                $review->forceFill([
                    'teacher_id' => $teacher->id,
                    'student_id' => $student->id,
                    'ai_recite_attempt_id' => $attempt->id,
                    'status' => TeacherRecitationReview::PENDING,
                ]);
            }
            $updates = [];
            if (($changes['status'] ?? null) === TeacherRecitationReview::REVIEWED) {
                $updates['status'] = TeacherRecitationReview::REVIEWED;
                $updates['reviewed_at'] = $review->reviewed_at ?? now();
            }
            if (isset($changes['feedback_note_id'])) {
                $this->assertFeedbackNote($teacher, $student, (int) $changes['feedback_note_id']);
                $updates['feedback_note_id'] = (int) $changes['feedback_note_id'];
            }
            if (isset($changes['private_note_id'])) {
                $this->assertPrivateNote($teacher, $student, (int) $changes['private_note_id']);
                $updates['private_note_id'] = (int) $changes['private_note_id'];
            }
            if (isset($changes['teacher_assignment_id'])) {
                $this->assertAssignment($teacher, $student, (int) $changes['teacher_assignment_id']);
                $updates['teacher_assignment_id'] = (int) $changes['teacher_assignment_id'];
            }
            if ($updates !== []) {
                $review->forceFill($updates);
            }
            $review->save();

            return $review;
        });
    }

    private function assertFeedbackNote(User $teacher, User $student, int $noteId): void
    {
        $owns = TeacherNote::query()
            ->whereKey($noteId)
            ->where('teacher_id', $teacher->id)
            ->where('student_id', $student->id)
            ->where('kind', TeacherNoteKind::Feedback->value)
            ->exists();
        abort_unless($owns, 404);
    }

    private function assertPrivateNote(User $teacher, User $student, int $noteId): void
    {
        $owns = TeacherPrivateNote::query()
            ->whereKey($noteId)
            ->where('teacher_id', $teacher->id)
            ->where('student_id', $student->id)
            ->exists();
        abort_unless($owns, 404);
    }

    private function assertAssignment(User $teacher, User $student, int $assignmentId): void
    {
        $owns = TeacherAssignment::query()
            ->whereKey($assignmentId)
            ->where('teacher_id', $teacher->id)
            ->whereHas('recipients', fn ($query) => $query->where('student_id', $student->id))
            ->exists();
        abort_unless($owns, 404);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(User $teacher, User $student, AiReciteAttempt $attempt): array
    {
        $words = TeacherRecitationWordEvidence::fromAttempt($attempt, TeacherRecitationWordEvidence::PLAYBACK_LIMIT);
        $audio = $this->audio->payload($attempt);
        $range = $this->presentRange($attempt);
        $assignment = $this->presentLinkedAssignment($attempt);
        $review = TeacherRecitationReview::query()
            ->where('teacher_id', $teacher->id)
            ->where('ai_recite_attempt_id', $attempt->id)
            ->with(['feedbackNote', 'privateNote', 'assignment.recipients'])
            ->first();

        $timed = 0;
        foreach ($words as $word) {
            if (isset($word['start'])) {
                $timed++;
            }
        }

        $accuracy = null;
        if ($attempt->accuracy_percent !== null && in_array($attempt->band, ['strong', 'mixed', 'weak'], true)) {
            $accuracy = (int) $attempt->accuracy_percent;
        }

        $duration = $audio['duration_ms'] ?? null;
        if (! $duration && (int) $attempt->audio_duration_ms > 0) {
            $duration = (int) $attempt->audio_duration_ms;
        }
        if (! $duration && (int) $attempt->duration_ms > 0) {
            $duration = (int) $attempt->duration_ms;
        }

        $coachings = $this->coachings->forAttempt($teacher, $attempt, $words);
        $feedbackSegments = $this->segments->forAttempt($teacher, $attempt);
        $presentedReview = $this->presentReview($review);
        $suggestedRevision = $this->revisionRange($attempt, $words);

        return [
            'attempt_id' => (int) $attempt->id,
            'student' => [
                'id' => (int) $student->id,
                'name' => (string) $student->name,
            ],
            'submitted_at' => $attempt->created_at?->toIso8601String(),
            'duration_ms' => $duration ? (int) $duration : null,
            'accuracy_percent' => $accuracy,
            'range' => $range,
            'assignment' => $assignment,
            'audio' => $audio,
            'words' => $words,
            'timing' => [
                'timed_words' => $timed,
                'total_words' => count($words),
            ],
            'suggested_revision' => $suggestedRevision,
            'review' => $presentedReview,
            'review_summary' => $this->segments->buildReviewSummary(
                $words,
                $coachings,
                $feedbackSegments,
                $presentedReview,
                $suggestedRevision,
            ),
            'feedback_segments' => $feedbackSegments,
            'assessment' => $this->presentAssessment($teacher, $attempt),
            'history' => $this->presentHistory($teacher, $student, $attempt),
            'coachings' => $coachings,
            'transcript' => $this->transcript($attempt),
            'tajweed_practice_suggestion' => TeacherTajweedPracticeEvidence::fromAttempt($attempt),
            'acoustic_tajweed_experiment' => TeacherAcousticTajweedEvidence::fromAttempt($attempt),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function presentReview(?TeacherRecitationReview $review): array
    {
        $feedback = $review?->feedbackNote;
        $private = $review?->privateNote;
        $revision = $review?->assignment;

        return [
            'status' => $review?->status === TeacherRecitationReview::REVIEWED
                ? TeacherRecitationReview::REVIEWED
                : TeacherRecitationReview::PENDING,
            'reviewed_at' => $review?->reviewed_at?->toIso8601String(),
            'feedback' => $feedback ? [
                'id' => (int) $feedback->id,
                'body' => $feedback->body !== '' ? $feedback->body : null,
                'has_audio' => $feedback->audio_path !== null && $feedback->audio_path !== '',
                'created_at' => $feedback->created_at?->toIso8601String(),
            ] : null,
            'private_note' => $private ? [
                'id' => (int) $private->id,
                'body' => $private->body,
                'created_at' => $private->created_at?->toIso8601String(),
            ] : null,
            'revision' => $revision ? [
                'id' => (int) $revision->id,
                'title' => trim((string) $revision->feedback) !== '' ? trim((string) $revision->feedback) : null,
                'surah_name' => QuranMetadata::name((int) $revision->surah_number),
                'ayah_start' => (int) $revision->ayah_start,
                'ayah_end' => (int) $revision->ayah_end,
                'due_at' => $revision->due_at?->toIso8601String(),
                'source_attempt_id' => $revision->source_ai_recite_attempt_id ? (int) $revision->source_ai_recite_attempt_id : null,
                'recording_required' => (bool) $revision->recording_required,
                'follow_up' => $this->presentFollowUp($revision, (int) ($review?->student_id ?? 0)),
            ] : null,
        ];
    }

    /**
     * @return array{surah: int|null, surah_name: string|null, from: int|null, to: int|null}
     */
    private function presentRange(AiReciteAttempt $attempt): array
    {
        $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
        $assessment = $attempt->assessment;
        $surah = (int) ($range['surah'] ?? $range['surah_number'] ?? $assessment?->surah_number ?? 0) ?: null;
        $from = (int) ($range['from'] ?? $range['start'] ?? $assessment?->start_ayah ?? 0) ?: null;
        $to = (int) ($range['to'] ?? $range['end'] ?? $assessment?->end_ayah ?? 0) ?: null;

        return [
            'surah' => $surah,
            'surah_name' => $surah ? ($range['surah_name'] ?? QuranMetadata::name($surah)) : null,
            'from' => $from,
            'to' => $to ? max($from ?? $to, $to) : null,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function presentLinkedAssignment(AiReciteAttempt $attempt): ?array
    {
        $assignment = $attempt->assignmentRecipient?->assignment;
        if (! $assignment instanceof TeacherAssignment) {
            return null;
        }
        $title = trim((string) ($assignment->feedback ?? ''));

        return [
            'id' => (int) $assignment->id,
            'recipient_id' => (int) $attempt->teacher_assignment_recipient_id,
            'title' => $title !== '' ? mb_substr($title, 0, 200) : null,
            'kind' => $assignment->kind instanceof \App\Enums\AssignmentKind ? $assignment->kind->value : (string) $assignment->kind,
            'activity' => $assignment->activity,
            'hifz_category' => (string) $assignment->hifz_category,
            'surah_name' => QuranMetadata::name((int) $assignment->surah_number),
            'ayah_start' => (int) $assignment->ayah_start,
            'ayah_end' => (int) $assignment->ayah_end,
        ];
    }

    /**
     * Narrow a follow-up task to ayahs the checker marked for attention.
     * The passage stays inside the stored attempt range.
     *
     * @param  list<array<string, mixed>>|null  $words
     * @return array<string, mixed>|null
     */
    private function revisionRange(AiReciteAttempt $attempt, ?array $words = null): ?array
    {
        $range = $this->presentRange($attempt);
        $surah = (int) ($range['surah'] ?? 0);
        $from = (int) ($range['from'] ?? 0);
        $to = (int) ($range['to'] ?? $from);
        if ($surah < 1 || $from < 1) {
            return null;
        }
        $to = max($from, $to);
        $words ??= TeacherRecitationWordEvidence::fromAttempt($attempt, TeacherRecitationWordEvidence::PLAYBACK_LIMIT);
        $attention = [];
        foreach ($words as $word) {
            if (! is_array($word)) {
                continue;
            }
            $state = RecitationAlignmentStatus::classify($word);
            if (! in_array($state, [
                RecitationAlignmentStatus::MISMATCH,
                RecitationAlignmentStatus::UNCERTAIN,
                RecitationAlignmentStatus::SKIPPED,
            ], true)) {
                continue;
            }
            $ayah = (int) ($word['ayah'] ?? 0);
            if ($ayah >= $from && $ayah <= $to) {
                $attention[] = $ayah;
            }
        }
        $focused = $attention !== [];
        if ($focused) {
            $from = min($attention);
            $to = max($attention);
        }

        return [
            'surah_number' => $surah,
            'surah_name' => $range['surah_name'] ?: QuranMetadata::name($surah),
            'ayah_start' => $from,
            'ayah_end' => $to,
            'hifz_category' => 'sabqi',
            'focused' => $focused,
        ];
    }

    private function transcript(AiReciteAttempt $attempt): ?string
    {
        $recognition = is_array($attempt->assessment?->recognition_data)
            ? $attempt->assessment->recognition_data
            : [];
        foreach ([
            data_get($recognition, 'raw.transcript'),
            data_get($recognition, 'normalised.transcript'),
            $recognition['transcript'] ?? null,
        ] as $candidate) {
            $value = trim((string) $candidate);
            if ($value !== '') {
                return mb_substr($value, 0, 5000);
            }
        }

        return null;
    }

    private function rememberTaskReview(AiReciteAttempt $attempt): void
    {
        $recipient = $attempt->assignmentRecipient;
        if (! $recipient instanceof TeacherAssignmentRecipient) {
            return;
        }
        $evidence = is_array($recipient->completion_evidence) ? $recipient->completion_evidence : [];
        if ((int) ($evidence['teacher_reviewed_attempt_id'] ?? 0) === (int) $attempt->id
            && ! empty($evidence['teacher_reviewed_at'])) {
            return;
        }
        $evidence['teacher_reviewed_at'] = now()->toIso8601String();
        $evidence['teacher_reviewed_attempt_id'] = (int) $attempt->id;
        $recipient->forceFill(['completion_evidence' => $evidence])->save();
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private function hasStructuredObservation(array $input): bool
    {
        foreach ([...TeacherRecitationAssessment::AREAS, 'general'] as $key) {
            if (array_key_exists($key, $input)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    private function normaliseObservations(array $input, AiReciteAttempt $attempt): array
    {
        $observations = [];
        $filled = false;
        foreach (TeacherRecitationAssessment::AREAS as $area) {
            $value = is_array($input[$area] ?? null) ? $input[$area] : [];
            $rating = isset($value['rating']) && in_array($value['rating'], TeacherRecitationAssessment::RATINGS, true)
                ? (string) $value['rating']
                : null;
            $note = $this->nullableAssessmentText($value['note'] ?? null);
            if ($rating !== null || $note !== null) {
                $filled = true;
            }
            $observations[$area] = ['rating' => $rating, 'note' => $note];
        }
        $general = $this->nullableAssessmentText($input['general'] ?? null);
        if ($general !== null) {
            $filled = true;
        }
        if (! $filled) {
            throw ValidationException::withMessages([
                'assessment' => 'Record an observation before saving.',
            ]);
        }
        $observations['general'] = $general;
        $heardLive = filter_var($input['heard_live'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $audio = $this->audio->payload($attempt);
        $playable = (bool) ($audio['available'] ?? false);
        if (! $playable && ! $heardLive) {
            $missing = [];
            foreach (['tajweed', 'pronunciation'] as $area) {
                if (($observations[$area]['rating'] ?? null) !== null) {
                    $missing[$area] = 'A recording or a live hearing is required before this rating can be saved.';
                }
            }
            if ($missing !== []) {
                throw ValidationException::withMessages($missing);
            }
        }
        $observations['heard_live'] = $heardLive;
        $observations['evidence'] = $playable ? 'recording' : ($heardLive ? 'heard_live' : 'unverified');

        return $observations;
    }

    private function nullableAssessmentText(mixed $value): ?string
    {
        $text = trim((string) $value);

        return $text === '' ? null : mb_substr($text, 0, 2000);
    }

    private function tajweedScoreFromRating(?string $rating): ?int
    {
        return match ($rating) {
            'needs_work' => 2,
            'sound' => 4,
            'strong' => 5,
            default => null,
        };
    }

    /**
     * @param  array<string, mixed>  $previous
     */
    private function publishGeneralFeedback(
        User $teacher,
        User $student,
        AiReciteAttempt $attempt,
        TeacherRecitationAssessment $row,
        array $previous,
        string $body,
    ): void {
        $body = trim($body);
        if ($body === '') {
            return;
        }

        $review = TeacherRecitationReview::query()
            ->where('teacher_id', $teacher->id)
            ->where('ai_recite_attempt_id', $attempt->id)
            ->first();
        $note = $review?->feedback_note_id
            ? TeacherNote::query()->whereKey($review->feedback_note_id)->where('teacher_id', $teacher->id)->first()
            : null;
        $published = trim((string) ($previous['published_feedback'] ?? ''));
        if ($note instanceof TeacherNote && $published !== '' && trim((string) $note->body) === $published) {
            if (trim((string) $note->body) !== $body) {
                $note->forceFill(['body' => $body])->save();
            }
        } elseif (! $note instanceof TeacherNote) {
            $attempt->loadMissing('assignmentRecipient.assignment');
            $recipient = $attempt->assignmentRecipient;
            $note = $recipient instanceof TeacherAssignmentRecipient
                ? $this->assignments->addTeacherMessage($teacher, $recipient, $body)
                : $this->dashboard->addNote(
                    $teacher,
                    $student,
                    TeacherNoteKind::Feedback->value,
                    $body,
                    null,
                    null,
                    $this->surahNumber($attempt),
                    $this->ayahStart($attempt),
                    $this->ayahEnd($attempt),
                    null,
                );
            $this->saveReview($teacher, $student, $attempt, ['feedback_note_id' => (int) $note->id]);
        } else {
            return;
        }

        $observations = is_array($row->observations) ? $row->observations : [];
        $observations['published_feedback'] = $body;
        $row->forceFill(['observations' => $observations])->save();
    }

    /**
     * @return array<string, mixed>|null
     */
    private function presentAssessment(User $teacher, AiReciteAttempt $attempt): ?array
    {
        $row = TeacherRecitationAssessment::query()
            ->where('teacher_id', $teacher->id)
            ->where('ai_recite_attempt_id', $attempt->id)
            ->first();
        if (! $row instanceof TeacherRecitationAssessment) {
            return null;
        }

        $observations = is_array($row->observations) ? $row->observations : null;
        if (is_array($observations)) {
            unset($observations['published_feedback']);
        }

        return [
            'source' => 'teacher',
            'score' => $row->tajweed_score !== null ? (int) $row->tajweed_score : null,
            'annotation' => $row->annotation,
            'observations' => $observations,
            'updated_at' => $row->updated_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function presentHistory(User $teacher, User $student, AiReciteAttempt $attempt): array
    {
        $range = $this->presentRange($attempt);
        $surah = (int) ($range['surah'] ?? 0);
        $attempts = [];
        if ($surah > 0) {
            $rows = AiReciteAttempt::query()
                ->validScored()
                ->where('user_id', $student->id)
                ->where('id', '!=', $attempt->id)
                ->latest('created_at')
                ->latest('id')
                ->limit(12)
                ->get();
            foreach ($rows as $row) {
                if (! $row instanceof AiReciteAttempt || ! $this->samePassage($row, $range)) {
                    continue;
                }
                $attempts[] = [
                    'attempt_id' => (int) $row->id,
                    'submitted_at' => $row->created_at?->toIso8601String(),
                    'accuracy_percent' => (int) $row->accuracy_percent,
                    'wording_only' => true,
                ];
                if (count($attempts) >= 5) {
                    break;
                }
            }
        }

        return [
            'previous_review' => $this->previousReview($teacher, $attempt),
            'attempts' => $attempts,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function previousReview(User $teacher, AiReciteAttempt $attempt): ?array
    {
        $sourceId = (int) ($attempt->assignmentRecipient?->assignment?->source_ai_recite_attempt_id ?? 0);
        if ($sourceId < 1 || $sourceId === (int) $attempt->id) {
            return null;
        }
        $source = AiReciteAttempt::query()->whereKey($sourceId)->where('user_id', $attempt->user_id)->first();
        if (! $source instanceof AiReciteAttempt) {
            return null;
        }
        $review = TeacherRecitationReview::query()
            ->where('teacher_id', $teacher->id)
            ->where('ai_recite_attempt_id', $source->id)
            ->with('feedbackNote')
            ->first();
        $assessment = $this->presentAssessment($teacher, $source);
        $feedback = $review?->feedbackNote;

        return [
            'attempt_id' => (int) $source->id,
            'submitted_at' => $source->created_at?->toIso8601String(),
            'accuracy_percent' => $source->accuracy_percent !== null && in_array($source->band, ['strong', 'mixed', 'weak'], true)
                ? (int) $source->accuracy_percent
                : null,
            'wording_only' => true,
            'feedback' => $feedback && trim((string) $feedback->body) !== '' ? trim((string) $feedback->body) : null,
            'observations' => $assessment['observations'] ?? null,
        ];
    }

    /**
     * @param  array{surah: int|null, surah_name: string|null, from: int|null, to: int|null}  $range
     */
    private function samePassage(AiReciteAttempt $attempt, array $range): bool
    {
        $other = $this->presentRange($attempt);

        return (int) ($other['surah'] ?? 0) === (int) ($range['surah'] ?? 0)
            && (int) ($other['from'] ?? 0) === (int) ($range['from'] ?? 0)
            && (int) ($other['to'] ?? 0) === (int) ($range['to'] ?? 0);
    }

    /**
     * @return array{status: string|null, submitted: bool, approved: bool, submitted_at: string|null}|null
     */
    private function presentFollowUp(TeacherAssignment $revision, int $studentId): ?array
    {
        if ($studentId < 1) {
            return null;
        }
        $recipient = $revision->relationLoaded('recipients')
            ? $revision->recipients->firstWhere('student_id', $studentId)
            : $revision->recipients()->where('student_id', $studentId)->first();
        if (! $recipient instanceof TeacherAssignmentRecipient) {
            return null;
        }
        $status = $recipient->status instanceof AssignmentStatus
            ? $recipient->status->value
            : (string) $recipient->status;

        return [
            'status' => $status,
            'submitted' => $recipient->student_completed_at !== null,
            'approved' => $status === AssignmentStatus::Completed->value,
            'submitted_at' => $recipient->student_completed_at?->toIso8601String(),
        ];
    }

    private function surahNumber(AiReciteAttempt $attempt): ?int
    {
        return $this->presentRange($attempt)['surah'];
    }

    private function ayahStart(AiReciteAttempt $attempt): ?int
    {
        return $this->presentRange($attempt)['from'];
    }

    private function ayahEnd(AiReciteAttempt $attempt): ?int
    {
        return $this->presentRange($attempt)['to'];
    }
}

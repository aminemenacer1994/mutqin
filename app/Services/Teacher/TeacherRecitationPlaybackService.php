<?php

namespace App\Services\Teacher;

use App\Enums\AssignmentKind;
use App\Enums\TeacherNoteKind;
use App\Enums\TeacherPrivateNoteCategory;
use App\Models\AiReciteAttempt;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherNote;
use App\Models\TeacherPrivateNote;
use App\Models\TeacherRecitationReview;
use App\Models\TeacherWordCoachingCorrection;
use App\Models\User;
use App\Services\Learning\AiReciteAttemptAudioService;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Support\QuranMetadata;
use App\Support\RecitationAlignmentStatus;
use App\Support\TeacherFeatures;
use App\Support\TeacherRecitationWordEvidence;
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
    ): array {
        $attempt = $this->authorisedAttempt($teacher, $student, $attempt);
        $attempt->loadMissing('assignmentRecipient.assignment');
        $recipient = $attempt->assignmentRecipient;
        $note = $recipient instanceof TeacherAssignmentRecipient
            ? $this->assignments->addTeacherMessage($teacher, $recipient, $body, $audio, $durationMs)
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

        $this->saveReview($teacher, $student, $attempt, ['feedback_note_id' => (int) $note->id]);

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

        $assignment = $this->assignments->create($teacher, [
            'kind' => AssignmentKind::AiRecite->value,
            'hifz_category' => 'sabqi',
            'surah_number' => $range['surah_number'],
            'ayah_start' => $range['ayah_start'],
            'ayah_end' => $range['ayah_end'],
            'due_at' => $input['due_at'],
            'priority' => 'high',
            'feedback' => $input['feedback'] ?? null,
            'student_id' => $student->id,
        ]);
        $this->saveReview($teacher, $student, $attempt, ['teacher_assignment_id' => (int) $assignment->id]);

        return $this->present($teacher, $student, $attempt);
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
            ->with(['feedbackNote', 'privateNote', 'assignment'])
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
            'suggested_revision' => $this->revisionRange($attempt, $words),
            'review' => $this->presentReview($review),
            'coachings' => $this->coachings->forAttempt($teacher, $attempt, $words),
            'transcript' => $this->transcript($attempt),
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

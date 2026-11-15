<?php

namespace App\Services\Teacher;

use App\Enums\AssignmentKind;
use App\Models\AiReciteAttempt;
use App\Models\TeacherAssignment;
use App\Models\TeacherWordCoaching;
use App\Models\TeacherWordCoachingCorrection;
use App\Models\TeacherWordCoachingRetry;
use App\Models\User;
use App\Services\Learning\AiReciteAttemptAudioService;
use App\Support\QuranMetadata;
use App\Support\RecitationAlignmentStatus;
use App\Support\TeacherRecitationWordEvidence;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TeacherWordCoachingService
{
    public function __construct(
        private readonly TeacherWordCoachingAudioService $audio,
        private readonly TeacherAssignmentService $assignments,
        private readonly AiReciteAttemptAudioService $attemptAudio,
    ) {}

    /**
     * @param  list<array<string, mixed>>  $words
     * @return list<array<string, mixed>>
     */
    public function forAttempt(User $teacher, AiReciteAttempt $attempt, array $words): array
    {
        $rows = TeacherWordCoaching::query()
            ->where('teacher_id', $teacher->id)
            ->where('ai_recite_attempt_id', $attempt->id)
            ->with([
                'corrections' => fn ($query) => $query->orderBy('id'),
                'retries' => fn ($query) => $query->orderBy('id')->with('attempt'),
                'practiceAssignment.recipients' => fn ($query) => $query->where('student_id', $attempt->user_id),
            ])
            ->orderBy('ayah_number')
            ->orderBy('word_index')
            ->get();

        return $rows
            ->map(fn (TeacherWordCoaching $coaching) => $this->present($coaching, $words, forStudent: false))
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function forStudent(User $student): array
    {
        $rows = TeacherWordCoaching::query()
            ->where('student_id', $student->id)
            ->where(function ($query) {
                $query->where('retry_requested', true)
                    ->orWhereNotNull('practice_assignment_id')
                    ->orWhereHas('corrections', function ($corrections) {
                        $corrections->where(function ($inner) {
                            $inner->whereNotNull('audio_path')
                                ->orWhere(function ($body) {
                                    $body->whereNotNull('body')->where('body', '!=', '');
                                });
                        });
                    });
            })
            ->with([
                'teacher:id,name',
                'attempt',
                'corrections' => fn ($query) => $query->orderBy('id'),
                'retries' => fn ($query) => $query->orderBy('id')->with('attempt'),
                'practiceAssignment.recipients' => fn ($query) => $query->where('student_id', $student->id),
            ])
            ->latest('updated_at')
            ->limit(12)
            ->get();

        return $rows
            ->map(function (TeacherWordCoaching $coaching) {
                $words = $coaching->attempt instanceof AiReciteAttempt
                    ? TeacherRecitationWordEvidence::fromAttempt($coaching->attempt, TeacherRecitationWordEvidence::PLAYBACK_LIMIT)
                    : [];

                return $this->present($coaching, $words, forStudent: true);
            })
            ->filter(fn (array $row) => $row['visible_to_student'])
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $input
     */
    public function apply(User $teacher, User $student, AiReciteAttempt $attempt, array $input, ?UploadedFile $audio = null): TeacherWordCoaching
    {
        $ayah = (int) $input['ayah'];
        $index = (int) $input['word_index'];
        $this->assertAyahInAttempt($attempt, $ayah);

        return DB::transaction(function () use ($teacher, $student, $attempt, $input, $audio, $ayah, $index) {
            $coaching = $this->lockCoaching($teacher, $student, $attempt, $ayah, $index);
            $action = (string) $input['action'];

            if ($action === 'reviewed') {
                $coaching->forceFill(['reviewed_at' => $coaching->reviewed_at ?? now()])->save();
            } elseif ($action === 'confirm') {
                $coaching->forceFill([
                    'decision' => TeacherWordCoaching::DECISION_CONFIRMED,
                    'reviewed_at' => $coaching->reviewed_at ?? now(),
                ])->save();
            } elseif ($action === 'dismiss') {
                $coaching->forceFill([
                    'decision' => TeacherWordCoaching::DECISION_DISMISSED,
                    'reviewed_at' => $coaching->reviewed_at ?? now(),
                ])->save();
            } elseif ($action === 'correct') {
                $this->addCorrection($teacher, $coaching, (string) ($input['body'] ?? ''), $audio, isset($input['duration_ms']) ? (int) $input['duration_ms'] : null);
                $coaching->forceFill(['reviewed_at' => $coaching->reviewed_at ?? now()])->save();
            } elseif ($action === 'retry') {
                $coaching->forceFill([
                    'retry_requested' => true,
                    'review_status' => TeacherWordCoaching::AWAITING_RETRY,
                    'improvement_basis' => null,
                    'reviewed_at' => $coaching->reviewed_at ?? now(),
                ])->save();
            } elseif ($action === 'practice') {
                $assignment = $coaching->practice_assignment_id
                    ? TeacherAssignment::query()->find($coaching->practice_assignment_id)
                    : null;
                if (! $assignment instanceof TeacherAssignment) {
                    $assignment = $this->assignPractice($teacher, $student, $coaching, $input);
                }
                $coaching->forceFill([
                    'practice_assignment_id' => (int) $assignment->id,
                    'review_status' => TeacherWordCoaching::NEEDS_PRACTICE,
                    'improvement_basis' => null,
                    'reviewed_at' => $coaching->reviewed_at ?? now(),
                ])->save();
            } elseif ($action === 'status') {
                $status = (string) $input['review_status'];
                $coaching->forceFill([
                    'review_status' => $status,
                    'improvement_basis' => in_array($status, [TeacherWordCoaching::IMPROVED, TeacherWordCoaching::RESOLVED], true)
                        ? TeacherWordCoaching::BASIS_TEACHER
                        : null,
                    'reviewed_at' => $coaching->reviewed_at ?? now(),
                ])->save();
            }

            return $coaching->refresh();
        });
    }

    public function deleteCorrectionAudio(User $teacher, User $student, AiReciteAttempt $attempt, TeacherWordCoachingCorrection $correction): void
    {
        $correction->loadMissing('coaching');
        $coaching = $correction->coaching;
        abort_unless(
            $coaching instanceof TeacherWordCoaching
            && (int) $coaching->teacher_id === (int) $teacher->id
            && (int) $coaching->student_id === (int) $student->id
            && (int) $coaching->ai_recite_attempt_id === (int) $attempt->id
            && (int) $correction->teacher_id === (int) $teacher->id,
            404
        );

        $this->audio->deleteStored($correction);
    }

    public function attachRetry(User $student, int $coachingId, int $attemptId): bool
    {
        if ($coachingId < 1 || $attemptId < 1) {
            return false;
        }

        return (bool) DB::transaction(function () use ($student, $coachingId, $attemptId) {
            $coaching = TeacherWordCoaching::query()
                ->whereKey($coachingId)
                ->where('student_id', $student->id)
                ->lockForUpdate()
                ->first();
            $attempt = AiReciteAttempt::query()
                ->whereKey($attemptId)
                ->where('user_id', $student->id)
                ->first();
            if (! $coaching instanceof TeacherWordCoaching || ! $attempt instanceof AiReciteAttempt) {
                return false;
            }
            if ((int) $attempt->id === (int) $coaching->ai_recite_attempt_id || ! $this->attemptCoversAyah($attempt, (int) $coaching->ayah_number, (int) $coaching->surah_number)) {
                return false;
            }

            $word = $this->wordOnAttempt($attempt, (int) $coaching->ayah_number, (int) $coaching->word_index);
            $retryState = is_array($word) ? RecitationAlignmentStatus::classify($word) : null;
            $originalState = RecitationAlignmentStatus::classify([
                'status' => $coaching->ai_status,
                'confidence' => $coaching->ai_confidence,
                'type' => $coaching->ai_error_type,
            ]);
            $comparable = $retryState !== null
                && $retryState !== RecitationAlignmentStatus::UNASSESSED
                && $originalState !== RecitationAlignmentStatus::UNASSESSED;
            $better = $comparable
                && RecitationAlignmentStatus::isFlagged($originalState)
                && $retryState === RecitationAlignmentStatus::MATCHED;

            $retry = TeacherWordCoachingRetry::query()
                ->where('teacher_word_coaching_id', $coaching->id)
                ->where('ai_recite_attempt_id', $attempt->id)
                ->first();
            if (! $retry instanceof TeacherWordCoachingRetry) {
                $retry = new TeacherWordCoachingRetry;
            }
            $retry->forceFill([
                'teacher_word_coaching_id' => $coaching->id,
                'ai_recite_attempt_id' => $attempt->id,
                'comparable_status' => $comparable ? $retryState : null,
                'improved' => $better,
            ])->save();

            $updates = ['latest_retry_attempt_id' => (int) $attempt->id];
            if ($coaching->review_status !== TeacherWordCoaching::RESOLVED) {
                if ($better) {
                    $updates['review_status'] = TeacherWordCoaching::IMPROVED;
                    $updates['improvement_basis'] = TeacherWordCoaching::BASIS_COMPARABLE;
                } elseif ($comparable && $coaching->improvement_basis !== TeacherWordCoaching::BASIS_TEACHER && $coaching->review_status === TeacherWordCoaching::IMPROVED) {
                    $updates['review_status'] = TeacherWordCoaching::NEEDS_PRACTICE;
                    $updates['improvement_basis'] = null;
                } elseif ($comparable && $coaching->review_status === TeacherWordCoaching::AWAITING_RETRY) {
                    $updates['review_status'] = TeacherWordCoaching::NEEDS_PRACTICE;
                    $updates['improvement_basis'] = null;
                }
            }
            $coaching->forceFill($updates)->save();

            return true;
        });
    }

    /**
     * @param  list<array<string, mixed>>  $words
     * @return array<string, mixed>
     */
    private function present(TeacherWordCoaching $coaching, array $words, bool $forStudent): array
    {
        $key = $coaching->ayah_number.':'.$coaching->word_index;
        $originalWord = $this->matchingWord($words, (int) $coaching->ayah_number, (int) $coaching->word_index);
        $corrections = $coaching->corrections
            ->map(function (TeacherWordCoachingCorrection $correction) {
                $body = trim((string) $correction->body);

                return [
                    'id' => (int) $correction->id,
                    'body' => $body !== '' ? $body : null,
                    'audio' => $this->audio->payload($correction),
                    'created_at' => $correction->created_at?->toIso8601String(),
                ];
            })
            ->filter(fn (array $row) => $row['body'] !== null || ($row['audio']['available'] ?? false) || ! $forStudent)
            ->values()
            ->all();

        $retries = [];
        if ($coaching->relationLoaded('retries')) {
            foreach ($coaching->retries as $retry) {
                if (! $retry instanceof TeacherWordCoachingRetry || ! $retry->attempt instanceof AiReciteAttempt) {
                    continue;
                }
                $retries[] = $this->presentRetry($retry->attempt, $coaching);
            }
        }
        $latest = null;
        foreach ($retries as $retry) {
            if ((int) ($retry['attempt_id'] ?? 0) === (int) $coaching->latest_retry_attempt_id) {
                $latest = $retry;
            }
        }
        if ($latest === null && $retries !== []) {
            $latest = $retries[array_key_last($retries)];
        }

        $practice = null;
        $assignment = $coaching->relationLoaded('practiceAssignment') ? $coaching->practiceAssignment : null;
        if ($assignment instanceof TeacherAssignment) {
            $recipient = $assignment->relationLoaded('recipients') ? $assignment->recipients->first() : null;
            $practice = [
                'id' => (int) $assignment->id,
                'recipient_id' => $recipient ? (int) $recipient->id : null,
                'surah_name' => QuranMetadata::name((int) $assignment->surah_number),
                'ayah_start' => (int) $assignment->ayah_start,
                'ayah_end' => (int) $assignment->ayah_end,
                'due_at' => $assignment->due_at?->toIso8601String(),
            ];
        }

        $improved = $coaching->review_status === TeacherWordCoaching::IMPROVED
            && in_array($coaching->improvement_basis, [TeacherWordCoaching::BASIS_COMPARABLE, TeacherWordCoaching::BASIS_TEACHER], true);
        $visible = $coaching->retry_requested
            || $practice !== null
            || collect($corrections)->contains(fn (array $row) => $row['body'] !== null || ($row['audio']['available'] ?? false));

        $payload = [
            'id' => (int) $coaching->id,
            'key' => $key,
            'surah_number' => (int) $coaching->surah_number,
            'surah_name' => QuranMetadata::name((int) $coaching->surah_number),
            'ayah' => (int) $coaching->ayah_number,
            'word_index' => (int) $coaching->word_index,
            'ai' => [
                'status' => (string) $coaching->ai_status,
                'recognised' => $coaching->ai_recognised,
                'confidence' => $coaching->ai_confidence !== null ? (float) $coaching->ai_confidence : null,
                'error_type' => $coaching->ai_error_type,
            ],
            'segment' => [
                'start' => isset($originalWord['start']) ? $originalWord['start'] : null,
                'end' => isset($originalWord['end']) ? $originalWord['end'] : null,
            ],
            'review_status' => (string) $coaching->review_status,
            'improvement_basis' => $coaching->improvement_basis,
            'retry_requested' => (bool) $coaching->retry_requested,
            'corrections' => $corrections,
            'practice' => $practice,
            'comparison' => [
                'original_status' => (string) $coaching->ai_status,
                'latest_retry' => $latest,
                'retries' => $retries,
                'comparable' => (bool) ($latest['comparable'] ?? false),
                'improved' => $improved,
            ],
            'practise_again' => [
                'href' => '/memorisation?'.http_build_query(array_filter([
                    'surah' => (int) $coaching->surah_number,
                    'from' => (int) $coaching->ayah_number,
                    'to' => (int) $coaching->ayah_number,
                    'ai_check' => 1,
                    'return' => 'dashboard',
                    'word_coaching' => (int) $coaching->id,
                    'assignment_recipient' => $practice['recipient_id'] ?? null,
                ])),
            ],
            'visible_to_student' => $visible,
        ];

        if (! $forStudent) {
            $payload['decision'] = $coaching->decision;
            $payload['reviewed_at'] = $coaching->reviewed_at?->toIso8601String();
        } else {
            $payload['teacher_name'] = $coaching->relationLoaded('teacher') ? $coaching->teacher?->name : null;
            $originalAudio = $coaching->attempt instanceof AiReciteAttempt
                ? $this->attemptAudio->payload($coaching->attempt)
                : ['available' => false, 'url' => null];
            $payload['original_audio'] = [
                'available' => (bool) ($originalAudio['available'] ?? false),
                'url' => $originalAudio['url'] ?? null,
                'duration_ms' => $originalAudio['duration_ms'] ?? null,
            ];
        }

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    /**
     * @return array<string, mixed>
     */
    private function presentRetry(AiReciteAttempt $attempt, TeacherWordCoaching $coaching): array
    {
        $word = $this->wordOnAttempt($attempt, (int) $coaching->ayah_number, (int) $coaching->word_index);
        $state = is_array($word) ? RecitationAlignmentStatus::classify($word) : null;
        $originalState = RecitationAlignmentStatus::classify([
            'status' => $coaching->ai_status,
            'confidence' => $coaching->ai_confidence,
            'type' => $coaching->ai_error_type,
        ]);
        $comparable = $state !== null
            && $state !== RecitationAlignmentStatus::UNASSESSED
            && $originalState !== RecitationAlignmentStatus::UNASSESSED;
        $audio = $this->attemptAudio->payload($attempt);

        return [
            'attempt_id' => (int) $attempt->id,
            'submitted_at' => $attempt->created_at?->toIso8601String(),
            'status' => $comparable ? $state : null,
            'recognised' => is_array($word) ? ($word['recognised'] ?? $word['detected'] ?? null) : null,
            'accuracy_percent' => in_array($attempt->band, ['strong', 'mixed', 'weak'], true) && $attempt->accuracy_percent !== null
                ? (int) $attempt->accuracy_percent
                : null,
            'start' => is_array($word) && isset($word['start']) ? $word['start'] : null,
            'end' => is_array($word) && isset($word['end']) ? $word['end'] : null,
            'audio' => [
                'available' => (bool) ($audio['available'] ?? false),
                'url' => $audio['url'] ?? null,
                'duration_ms' => $audio['duration_ms'] ?? null,
            ],
            'comparable' => $comparable,
            'improved' => $comparable
                && RecitationAlignmentStatus::isFlagged($originalState)
                && $state === RecitationAlignmentStatus::MATCHED,
        ];
    }

    private function lockCoaching(User $teacher, User $student, AiReciteAttempt $attempt, int $ayah, int $index): TeacherWordCoaching
    {
        $coaching = TeacherWordCoaching::query()
            ->where('teacher_id', $teacher->id)
            ->where('ai_recite_attempt_id', $attempt->id)
            ->where('ayah_number', $ayah)
            ->where('word_index', $index)
            ->lockForUpdate()
            ->first();
        if ($coaching instanceof TeacherWordCoaching) {
            return $coaching;
        }

        $evidence = $this->matchingWord(
            TeacherRecitationWordEvidence::fromAttempt($attempt, TeacherRecitationWordEvidence::PLAYBACK_LIMIT),
            $ayah,
            $index,
        );
        $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
        $surah = (int) ($range['surah'] ?? $range['surah_number'] ?? 0);
        $coaching = new TeacherWordCoaching;
        $coaching->forceFill([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'ai_recite_attempt_id' => $attempt->id,
            'surah_number' => $surah,
            'ayah_number' => $ayah,
            'word_index' => $index,
            'ai_status' => is_array($evidence) ? (string) ($evidence['status'] ?? 'unassessed') : 'unassessed',
            'ai_recognised' => is_array($evidence) ? ($evidence['recognised'] ?? null) : null,
            'ai_confidence' => is_array($evidence) && isset($evidence['confidence']) ? (float) $evidence['confidence'] : null,
            'ai_error_type' => is_array($evidence) ? ($evidence['error_type'] ?? null) : null,
            'review_status' => TeacherWordCoaching::OPEN,
        ])->save();

        return $coaching;
    }

    private function addCorrection(User $teacher, TeacherWordCoaching $coaching, string $body, ?UploadedFile $audio, ?int $durationMs): void
    {
        $body = trim($body);
        if ($body === '' && $audio === null) {
            throw ValidationException::withMessages([
                'body' => 'Write a correction or record a demonstration.',
            ]);
        }

        $correction = new TeacherWordCoachingCorrection;
        $correction->forceFill([
            'teacher_word_coaching_id' => $coaching->id,
            'teacher_id' => $teacher->id,
            'body' => $body !== '' ? $body : null,
        ])->save();

        if ($audio === null) {
            return;
        }

        if (! $this->audio->store($correction, $audio, $durationMs)) {
            $correction->delete();
            throw ValidationException::withMessages([
                'audio' => 'Use a supported voice recording smaller than 8 MB.',
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private function assignPractice(User $teacher, User $student, TeacherWordCoaching $coaching, array $input): TeacherAssignment
    {
        $note = trim((string) ($input['body'] ?? ''));
        $where = QuranMetadata::name((int) $coaching->surah_number).', ayah '.(int) $coaching->ayah_number;

        return $this->assignments->create($teacher, [
            'kind' => AssignmentKind::AiRecite->value,
            'hifz_category' => 'sabqi',
            'surah_number' => (int) $coaching->surah_number,
            'ayah_start' => (int) $coaching->ayah_number,
            'ayah_end' => (int) $coaching->ayah_number,
            'due_at' => $input['due_at'],
            'priority' => 'high',
            'feedback' => $note !== '' ? $note : 'Practise the selected word in '.$where.'.',
            'student_id' => $student->id,
        ]);
    }

    private function assertAyahInAttempt(AiReciteAttempt $attempt, int $ayah): void
    {
        $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
        $surah = (int) ($range['surah'] ?? $range['surah_number'] ?? 0);
        $from = (int) ($range['from'] ?? $range['start'] ?? 0);
        $to = (int) ($range['to'] ?? $range['end'] ?? $from);
        if ($surah < 1 || $from < 1 || $ayah < $from || $ayah > max($from, $to)) {
            throw ValidationException::withMessages([
                'ayah' => 'That ayah is outside this recitation.',
            ]);
        }
    }

    private function attemptCoversAyah(AiReciteAttempt $attempt, int $ayah, int $surah): bool
    {
        $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
        $attemptSurah = (int) ($range['surah'] ?? $range['surah_number'] ?? 0);
        $from = (int) ($range['from'] ?? $range['start'] ?? 0);
        $to = (int) ($range['to'] ?? $range['end'] ?? $from);

        return $attemptSurah === $surah && $from >= 1 && $ayah >= $from && $ayah <= max($from, $to);
    }

    /**
     * @param  list<array<string, mixed>>  $words
     * @return array<string, mixed>|null
     */
    private function matchingWord(array $words, int $ayah, int $index): ?array
    {
        foreach ($words as $word) {
            if (! is_array($word)) {
                continue;
            }
            if ((int) ($word['ayah'] ?? 0) === $ayah && (int) ($word['word_index'] ?? -1) === $index) {
                return $word;
            }
        }

        return null;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function wordOnAttempt(AiReciteAttempt $attempt, int $ayah, int $index): ?array
    {
        return $this->matchingWord(
            TeacherRecitationWordEvidence::fromAttempt($attempt, TeacherRecitationWordEvidence::PLAYBACK_LIMIT),
            $ayah,
            $index,
        );
    }
}

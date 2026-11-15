<?php

namespace App\Services\Teacher;

use App\Models\AiReciteAttempt;
use App\Models\MemorisationWeakSpot;
use App\Models\MemorisationWeakSpotOccurrence;
use App\Models\User;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Support\QuranMetadata;
use App\Support\TeacherFeatures;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Validation\ValidationException;

class RecitationDifficultyService
{
    public function __construct(
        private readonly StudentAccessAuthorizer $access,
    ) {}

    /**
     * Compact review queue of students with recurring AI-flagged difficulties.
     *
     * @return list<array<string, mixed>>
     */
    public function reviewQueue(User $teacher, int $limit = 12): array
    {
        TeacherFeatures::abortUnlessEnabled();
        $ids = $this->access->authorizedStudentIds($teacher)->all();
        if ($ids === []) {
            return [];
        }

        $rows = MemorisationWeakSpot::query()
            ->selectRaw('user_id, COUNT(*) as difficulty_count, MAX(last_identified_at) as last_at')
            ->whereIn('user_id', $ids)
            ->where('status', MemorisationWeakSpot::STATUS_ACTIVE)
            ->where('affected_attempt_count', '>=', 2)
            ->where(function ($query) {
                $query->whereNull('teacher_review_status')
                    ->orWhere('teacher_review_status', MemorisationWeakSpot::REVIEW_CONFIRMED);
            })
            ->groupBy('user_id')
            ->orderByDesc('last_at')
            ->limit(max(1, min(40, $limit)))
            ->get();

        if ($rows->isEmpty()) {
            return [];
        }

        $students = User::query()
            ->whereIn('id', $rows->pluck('user_id'))
            ->get(['id', 'name', 'email'])
            ->keyBy('id');

        return $rows->map(function ($row) use ($students) {
            $student = $students->get((int) $row->user_id);

            return [
                'student_id' => (int) $row->user_id,
                'student_name' => $student?->name,
                'student_email' => $student?->email,
                'difficulty_count' => (int) $row->difficulty_count,
                'last_identified_at' => $row->last_at
                    ? \Illuminate\Support\Carbon::parse($row->last_at)->toIso8601String()
                    : null,
            ];
        })->values()->all();
    }

    public function listForStudent(
        User $actor,
        User $student,
        int $perPage = 20,
        ?string $state = null,
        ?string $review = null,
        bool $asTeacher = false,
    ): LengthAwarePaginator {
        if ($asTeacher) {
            TeacherFeatures::abortUnlessEnabled();
            abort_unless($actor->isTeacher() && $this->access->allows($actor, $student), 404);
        } else {
            abort_unless((int) $actor->id === (int) $student->id, 403);
        }

        $query = MemorisationWeakSpot::query()
            ->where('user_id', $student->id)
            ->withCount('occurrences')
            ->orderByDesc('last_identified_at')
            ->orderByDesc('id');

        if ($review === 'pending') {
            $query->whereNull('teacher_review_status');
        } elseif ($review === 'confirmed') {
            $query->where('teacher_review_status', MemorisationWeakSpot::REVIEW_CONFIRMED);
        } elseif ($review === 'dismissed') {
            $query->where('teacher_review_status', MemorisationWeakSpot::REVIEW_DISMISSED);
        } elseif ($review === 'ai_only' || ($review === null && $asTeacher)) {
            // Default teacher list excludes dismissed noise.
            $query->where(function ($builder) {
                $builder->whereNull('teacher_review_status')
                    ->orWhere('teacher_review_status', '!=', MemorisationWeakSpot::REVIEW_DISMISSED);
            });
        }

        if ($state === MemorisationWeakSpot::STATE_RESOLVED) {
            $query->where(function ($builder) {
                $builder->where('status', MemorisationWeakSpot::STATUS_RESOLVED)
                    ->orWhere('teacher_review_status', MemorisationWeakSpot::REVIEW_DISMISSED);
            });
        } elseif ($state === MemorisationWeakSpot::STATE_IMPROVING) {
            $query->where('status', MemorisationWeakSpot::STATUS_IMPROVING);
        } elseif ($state === MemorisationWeakSpot::STATE_RECURRING) {
            $query->where('status', MemorisationWeakSpot::STATUS_ACTIVE)
                ->where('affected_attempt_count', '>=', 2)
                ->where(function ($builder) {
                    $builder->whereNull('teacher_review_status')
                        ->orWhere('teacher_review_status', '!=', MemorisationWeakSpot::REVIEW_DISMISSED);
                });
        } elseif ($state === MemorisationWeakSpot::STATE_INSUFFICIENT) {
            $query->where('status', MemorisationWeakSpot::STATUS_ACTIVE)
                ->where('affected_attempt_count', '<', 2);
        }

        return $query->paginate(max(1, min(50, $perPage)))
            ->through(fn (MemorisationWeakSpot $spot) => $this->present($spot, includeHistory: false));
    }

    public function show(User $actor, User $student, MemorisationWeakSpot $spot, bool $asTeacher = false): array
    {
        abort_unless((int) $spot->user_id === (int) $student->id, 404);
        if ($asTeacher) {
            TeacherFeatures::abortUnlessEnabled();
            abort_unless($actor->isTeacher() && $this->access->allows($actor, $student), 404);
        } else {
            abort_unless((int) $actor->id === (int) $student->id, 403);
        }

        $spot->loadCount('occurrences');

        return $this->present($spot, includeHistory: true);
    }

    /**
     * @param  array{status:string, note?:string|null}  $input
     */
    public function review(User $teacher, User $student, MemorisationWeakSpot $spot, array $input): array
    {
        TeacherFeatures::abortUnlessEnabled();
        abort_unless($teacher->isTeacher() && $this->access->allows($teacher, $student), 404);
        abort_unless((int) $spot->user_id === (int) $student->id, 404);

        $status = (string) ($input['status'] ?? '');
        if (! in_array($status, [MemorisationWeakSpot::REVIEW_CONFIRMED, MemorisationWeakSpot::REVIEW_DISMISSED, 'clear'], true)) {
            throw ValidationException::withMessages([
                'status' => 'Choose confirmed, dismissed, or clear.',
            ]);
        }

        if ($status === 'clear') {
            $spot->forceFill([
                'teacher_review_status' => null,
                'teacher_reviewed_by' => null,
                'teacher_reviewed_at' => null,
                'teacher_review_note' => null,
            ])->save();
        } else {
            $note = trim((string) ($input['note'] ?? ''));
            $spot->forceFill([
                'teacher_review_status' => $status,
                'teacher_reviewed_by' => $teacher->id,
                'teacher_reviewed_at' => now(),
                'teacher_review_note' => $note === '' ? null : mb_substr($note, 0, 500),
            ])->save();
        }

        // Never mutate AI attempt word_statuses / assessments from teacher review.
        $spot->loadCount('occurrences');

        return $this->present($spot->fresh(), includeHistory: true);
    }

    /**
     * @return array<string, mixed>
     */
    public function present(MemorisationWeakSpot $spot, bool $includeHistory = false): array
    {
        $state = $spot->recurrenceState();
        $surah = (int) $spot->surah_number;
        $ayah = (int) $spot->ayah_number;
        $metadata = is_array($spot->metadata) ? $spot->metadata : [];
        $occurrenceCount = (int) ($spot->occurrences_count ?? $spot->occurrences()->count());

        $payload = [
            'id' => (int) $spot->id,
            'spot_type' => $spot->spot_type,
            'surah_number' => $surah,
            'surah_name' => QuranMetadata::name($surah),
            'ayah_number' => $ayah,
            'ayah_label' => QuranMetadata::name($surah).' · '.$ayah,
            'word_index' => $spot->word_index !== null ? (int) $spot->word_index : null,
            'verse_key' => $spot->verse_key,
            'severity' => $spot->severity,
            'mistake_kind' => $spot->mistake_kind,
            'status' => $spot->status,
            'trend' => $spot->trend,
            'recurrence_state' => $state,
            'source' => 'ai',
            'teacher_review' => [
                'status' => $spot->teacher_review_status,
                'reviewed_at' => $spot->teacher_reviewed_at?->toIso8601String(),
                'note' => $spot->teacher_review_note,
                'confirmed' => $spot->teacher_review_status === MemorisationWeakSpot::REVIEW_CONFIRMED,
                'dismissed' => $spot->teacher_review_status === MemorisationWeakSpot::REVIEW_DISMISSED,
            ],
            'occurrence_count' => max($occurrenceCount, (int) $spot->affected_attempt_count),
            'affected_attempt_count' => (int) $spot->affected_attempt_count,
            'first_identified_at' => $spot->first_identified_at?->toIso8601String(),
            'last_identified_at' => $spot->last_identified_at?->toIso8601String(),
            'last_recalled_at' => $spot->last_recalled_at?->toIso8601String(),
            'text' => $metadata['text'] ?? null,
            'detected_token' => $metadata['detected_token'] ?? null,
            'practise_again' => [
                'surah_number' => $surah,
                'ayah_start' => $ayah,
                'ayah_end' => $ayah,
                'assessment_id' => $spot->last_assessment_id ? (int) $spot->last_assessment_id : null,
                'href_params' => [
                    'surah' => $surah,
                    'from' => $ayah,
                    'to' => $ayah,
                    'ai_check' => 1,
                    'return' => 'dashboard',
                    ...(
                        $spot->last_assessment_id
                            ? ['prior_assessment' => (int) $spot->last_assessment_id]
                            : []
                    ),
                    ...(
                        $spot->word_index !== null
                            ? ['weak' => $surah.':'.$ayah.':'.(int) $spot->word_index]
                            : []
                    ),
                ],
            ],
            'assign_revision' => [
                'surah_number' => $surah,
                'ayah_start' => $ayah,
                'ayah_end' => $ayah,
                'weak_spot_id' => (int) $spot->id,
                'kind' => 'practice',
                'hifz_category' => 'sabqi',
            ],
        ];

        if ($includeHistory) {
            $payload['history'] = $this->historyForSpot($spot);
            $payload['improvement'] = $this->improvementSummary($spot, $payload['history']);
        }

        return $payload;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function historyForSpot(MemorisationWeakSpot $spot): array
    {
        $occurrences = MemorisationWeakSpotOccurrence::query()
            ->where('weak_spot_id', $spot->id)
            ->with(['attempt:id,accuracy_percent,band,created_at,ayah_range,color_counts', 'assessment:id,overall_accuracy,created_at'])
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->limit(12)
            ->get();

        if ($occurrences->isNotEmpty()) {
            return $occurrences->map(fn (MemorisationWeakSpotOccurrence $row) => [
                'id' => (int) $row->id,
                'occurred_at' => $row->occurred_at?->toIso8601String(),
                'result_type' => $row->result_type,
                'mistake_kind' => $row->mistake_kind,
                'visual_status' => $row->visual_status,
                'confidence' => $row->confidence,
                'detected_token' => $row->detected_token,
                'assessment_id' => (int) $row->assessment_id,
                'attempt_id' => $row->ai_recite_attempt_id ? (int) $row->ai_recite_attempt_id : null,
                'accuracy_percent' => $row->attempt?->accuracy_percent !== null
                    ? (int) $row->attempt->accuracy_percent
                    : ($row->assessment?->overall_accuracy !== null ? (int) $row->assessment->overall_accuracy : null),
                'band' => $row->attempt?->band,
                'source' => 'ai',
            ])->all();
        }

        // Fallback for spots recorded before occurrence tracking.
        $assessmentIds = collect([$spot->last_assessment_id, $spot->source_assessment_id])
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();
        if ($assessmentIds->isEmpty()) {
            return [];
        }

        return AiReciteAttempt::query()
            ->whereIn('memorisation_assessment_id', $assessmentIds)
            ->orderByDesc('created_at')
            ->limit(8)
            ->get()
            ->map(fn (AiReciteAttempt $attempt) => [
                'id' => null,
                'occurred_at' => $attempt->created_at?->toIso8601String(),
                'result_type' => null,
                'mistake_kind' => $spot->mistake_kind,
                'visual_status' => null,
                'confidence' => null,
                'detected_token' => null,
                'assessment_id' => $attempt->memorisation_assessment_id ? (int) $attempt->memorisation_assessment_id : null,
                'attempt_id' => (int) $attempt->id,
                'accuracy_percent' => $attempt->accuracy_percent !== null ? (int) $attempt->accuracy_percent : null,
                'band' => $attempt->band,
                'source' => 'ai',
            ])->all();
    }

    /**
     * @param  list<array<string, mixed>>  $history
     * @return array{label:string, delta:int|null}
     */
    private function improvementSummary(MemorisationWeakSpot $spot, array $history): array
    {
        if ($spot->recurrenceState() === MemorisationWeakSpot::STATE_RESOLVED) {
            return ['label' => 'resolved', 'delta' => null];
        }
        if ($spot->recurrenceState() === MemorisationWeakSpot::STATE_IMPROVING) {
            return ['label' => 'improving', 'delta' => null];
        }
        if ($spot->recurrenceState() === MemorisationWeakSpot::STATE_INSUFFICIENT) {
            return ['label' => 'insufficient_data', 'delta' => null];
        }

        $scores = array_values(array_filter(array_map(
            fn ($row) => isset($row['accuracy_percent']) ? (int) $row['accuracy_percent'] : null,
            $history
        ), fn ($score) => $score !== null));

        if (count($scores) < 2) {
            return ['label' => 'stable', 'delta' => null];
        }

        $newest = $scores[0];
        $oldest = $scores[count($scores) - 1];
        $delta = $newest - $oldest;

        return [
            'label' => $delta >= 5 ? 'improving' : ($delta <= -5 ? 'regressing' : 'stable'),
            'delta' => $delta,
        ];
    }

    /**
     * Summary cards for a student profile section.
     *
     * @return array<string, mixed>
     */
    public function studentSummary(User $teacher, User $student): array
    {
        TeacherFeatures::abortUnlessEnabled();
        abort_unless($this->access->allows($teacher, $student), 404);

        $base = MemorisationWeakSpot::query()->where('user_id', $student->id);
        $active = (clone $base)->where('status', MemorisationWeakSpot::STATUS_ACTIVE);
        $recurring = (clone $active)
            ->where('affected_attempt_count', '>=', 2)
            ->where(function ($query) {
                $query->whereNull('teacher_review_status')
                    ->orWhere('teacher_review_status', '!=', MemorisationWeakSpot::REVIEW_DISMISSED);
            })
            ->count();
        $improving = (clone $base)->where('status', MemorisationWeakSpot::STATUS_IMPROVING)->count();
        $resolved = (clone $base)->where(function ($query) {
            $query->where('status', MemorisationWeakSpot::STATUS_RESOLVED)
                ->orWhere('teacher_review_status', MemorisationWeakSpot::REVIEW_DISMISSED);
        })->count();
        $insufficient = (clone $active)->where('affected_attempt_count', '<', 2)->count();
        $pendingReview = (clone $active)
            ->where('affected_attempt_count', '>=', 2)
            ->whereNull('teacher_review_status')
            ->count();

        $page = $this->listForStudent($teacher, $student, 8, MemorisationWeakSpot::STATE_RECURRING, null, true);

        return [
            'counts' => [
                'recurring' => $recurring,
                'improving' => $improving,
                'resolved' => $resolved,
                'insufficient_data' => $insufficient,
                'pending_review' => $pendingReview,
            ],
            'items' => collect($page->items())->values()->all(),
        ];
    }
}

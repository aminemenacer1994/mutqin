<?php

namespace App\Services\Teacher;

use App\Enums\AssignmentStatus;
use App\Enums\LearningPlanItemStatus;
use App\Enums\LearningPlanStatus;
use App\Enums\RevisionRecommendationStatus;
use App\Enums\TeacherNoteKind;
use App\Models\LearningPlan;
use App\Models\MemorisationWeakSpot;
use App\Models\RevisionRecommendation;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherNote;
use App\Models\TeacherWordCoaching;
use App\Models\TeacherWordCoachingCorrection;
use App\Models\User;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Support\QuranMetadata;
use App\Support\TeacherFeatures;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Deterministic revision recommendations. Nothing here calls an AI API,
 * and repeated word-match misses are never treated as Tajweed or pronunciation.
 */
class RevisionRecommendationService
{
    /** @var list<string> */
    private const TAJWEED_FOCI = [
        'makharij', 'sifaat', 'madd', 'ghunnah', 'noon_meem', 'qalqalah', 'waqf', 'pronunciation',
    ];

    /** @var list<string> */
    private const ACTIVITIES = ['nazra', 'hifz', 'tajweed', 'revision'];

    public function __construct(
        private readonly StudentAccessAuthorizer $access,
        private readonly TeacherAssignmentService $assignments,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function syncAndList(User $teacher, User $student): array
    {
        $this->assertTeacher($teacher, $student);
        $this->sync($teacher, $student);

        return $this->list($teacher, (int) $student->id, openOnly: true);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function list(User $teacher, ?int $studentId = null, bool $openOnly = true): array
    {
        TeacherFeatures::abortUnlessEnabled();
        $query = RevisionRecommendation::query()
            ->where('teacher_id', $teacher->id)
            ->latest('id');
        if ($studentId) {
            $this->assertTeacher($teacher, User::query()->findOrFail($studentId));
            $query->where('student_id', $studentId);
        }
        if ($openOnly) {
            $query->whereIn('status', [
                RevisionRecommendationStatus::Pending->value,
                RevisionRecommendationStatus::Accepted->value,
            ]);
        }

        return $query->limit(40)->get()
            ->map(fn (RevisionRecommendation $row) => $this->present($row))
            ->all();
    }

    public function sync(User $teacher, User $student): void
    {
        $this->assertTeacher($teacher, $student);
        $existing = RevisionRecommendation::query()
            ->where('teacher_id', $teacher->id)
            ->where('student_id', $student->id)
            ->get();
        $bySource = $existing->keyBy('source_key');
        $openByPassage = [];
        foreach ($existing as $row) {
            $status = $row->status instanceof RevisionRecommendationStatus ? $row->status->value : (string) $row->status;
            if ($status === RevisionRecommendationStatus::Dismissed->value) {
                continue;
            }
            $openByPassage[$this->passageKey($row->activity, (int) $row->surah_number, (int) $row->ayah_start, (int) $row->ayah_end)] = $row;
        }

        foreach ($this->candidates($teacher, $student) as $candidate) {
            $this->consider($teacher, $student, $candidate, $bySource, $openByPassage);
        }
    }

    /**
     * @param  array<string, mixed>  $input
     */
    public function update(User $teacher, RevisionRecommendation $row, array $input): RevisionRecommendation
    {
        $this->assertOwns($teacher, $row);
        $this->assertOpen($row);
        $activity = (string) ($input['activity'] ?? $row->activity);
        if (! in_array($activity, self::ACTIVITIES, true)) {
            throw ValidationException::withMessages(['activity' => 'Choose Nazra, Hifz, Tajweed practice, or Revision.']);
        }
        $surah = (int) ($input['surah_number'] ?? $row->surah_number);
        $start = (int) ($input['ayah_start'] ?? $row->ayah_start);
        $end = (int) ($input['ayah_end'] ?? $row->ayah_end);
        $this->assertRange($surah, $start, $end);
        $row->forceFill([
            'activity' => $activity,
            'surah_number' => $surah,
            'ayah_start' => $start,
            'ayah_end' => $end,
            'due_on' => array_key_exists('due_on', $input)
                ? ($input['due_on'] ? Carbon::parse((string) $input['due_on'])->toDateString() : null)
                : $row->due_on,
            'instructions' => array_key_exists('instructions', $input)
                ? $this->nullable($input['instructions'])
                : $row->instructions,
        ])->save();

        return $row->fresh() ?? $row;
    }

    public function accept(User $teacher, RevisionRecommendation $row): RevisionRecommendation
    {
        $this->assertOwns($teacher, $row);
        $this->assertOpen($row);
        $row->forceFill([
            'status' => RevisionRecommendationStatus::Accepted->value,
            'accepted_at' => $row->accepted_at ?? now(),
        ])->save();

        return $row->fresh() ?? $row;
    }

    public function dismiss(User $teacher, RevisionRecommendation $row): RevisionRecommendation
    {
        $this->assertOwns($teacher, $row);
        if ($this->status($row) === RevisionRecommendationStatus::Assigned->value) {
            throw ValidationException::withMessages(['recommendation' => 'Assigned recommendations stay in the learning history.']);
        }
        $row->forceFill([
            'status' => RevisionRecommendationStatus::Dismissed->value,
            'dismissed_at' => now(),
        ])->save();

        return $row->fresh() ?? $row;
    }

    public function assign(User $teacher, RevisionRecommendation $row): RevisionRecommendation
    {
        $this->assertOwns($teacher, $row);
        if ($this->status($row) === RevisionRecommendationStatus::Dismissed->value) {
            throw ValidationException::withMessages(['recommendation' => 'Dismissed recommendations are not assigned.']);
        }
        if ($this->status($row) === RevisionRecommendationStatus::Assigned->value && $row->teacher_assignment_id) {
            return $row;
        }

        $assignment = $row->teacher_assignment_id
            ? TeacherAssignment::query()->find($row->teacher_assignment_id)
            : null;
        if ($assignment === null) {
            $assignment = $this->openMatch($teacher, $row) ?? $this->createAssignment($teacher, $row);
        }

        $row->forceFill([
            'status' => RevisionRecommendationStatus::Assigned->value,
            'teacher_assignment_id' => $assignment->id,
            'assigned_at' => now(),
            'accepted_at' => $row->accepted_at ?? now(),
        ])->save();

        return $row->fresh() ?? $row;
    }

    private function nextAction(RevisionRecommendation $row): string
    {
        $evidence = is_array($row->evidence) ? $row->evidence : [];
        $status = $this->status($row);
        $assignmentId = (int) ($row->teacher_assignment_id ?: ($evidence['teacher_assignment_id'] ?? $evidence['practice_assignment_id'] ?? 0));
        if ($assignmentId > 0 && $status !== RevisionRecommendationStatus::Dismissed->value) {
            return 'view_task';
        }
        if (! empty($evidence['attempt_id']) && $status === RevisionRecommendationStatus::Pending->value && in_array($row->reason_code, ['previous_revision', 'previous_feedback'], true)) {
            return 'review_recitation';
        }
        if ($status === RevisionRecommendationStatus::Accepted->value) {
            return 'assign_revision';
        }

        return 'review_recommendation';
    }

    /**
     * @return array<string, mixed>
     */
    public function present(RevisionRecommendation $row): array
    {
        $evidence = is_array($row->evidence) ? $row->evidence : [];
        $surah = (int) $row->surah_number;

        return [
            'id' => (int) $row->id,
            'student_id' => (int) $row->student_id,
            'status' => $this->status($row),
            'activity' => $row->activity,
            'surah_number' => $surah,
            'surah_name' => QuranMetadata::name($surah),
            'ayah_start' => (int) $row->ayah_start,
            'ayah_end' => (int) $row->ayah_end,
            'label' => QuranMetadata::name($surah).' · '.(int) $row->ayah_start.'–'.(int) $row->ayah_end,
            'due_on' => $row->due_on?->toDateString(),
            'instructions' => $row->instructions,
            'reason_code' => $row->reason_code,
            'reason' => $row->reason,
            'evidence' => $evidence,
            'is_tajweed_assessment' => false,
            'teacher_assignment_id' => $row->teacher_assignment_id ? (int) $row->teacher_assignment_id : null,
            'published' => $this->status($row) === RevisionRecommendationStatus::Assigned->value,
            'next_action' => $this->nextAction($row),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function candidates(User $teacher, User $student): array
    {
        $rows = [];
        $rows = array_merge($rows, $this->fromTeacherFindings($teacher, $student));
        $rows = array_merge($rows, $this->fromConfirmedSpots($student));
        $rows = array_merge($rows, $this->fromOpenCoaching($teacher, $student));
        $rows = array_merge($rows, $this->fromFeedback($teacher, $student));
        $rows = array_merge($rows, $this->fromPlanGoals($teacher, $student));
        $rows = array_merge($rows, $this->fromOutstandingRevision($teacher, $student));
        $rows = array_merge($rows, $this->fromWordMatches($student));

        return $rows;
    }

    /**
     * @param  array<string, mixed>  $candidate
     * @param  Collection<string, RevisionRecommendation>  $bySource
     * @param  array<string, RevisionRecommendation>  $openByPassage
     */
    private function consider(User $teacher, User $student, array $candidate, $bySource, array &$openByPassage): void
    {
        $sourceKey = (string) $candidate['source_key'];
        if ($bySource->has($sourceKey)) {
            return;
        }
        $passage = $this->passageKey(
            (string) $candidate['activity'],
            (int) $candidate['surah_number'],
            (int) $candidate['ayah_start'],
            (int) $candidate['ayah_end'],
        );
        $open = $openByPassage[$passage] ?? null;
        if ($open instanceof RevisionRecommendation) {
            if ($this->status($open) !== RevisionRecommendationStatus::Pending->value) {
                return;
            }
            if ($this->rank((string) $open->reason_code) <= $this->rank((string) $candidate['reason_code'])) {
                return;
            }
            $open->forceFill([
                'activity' => $candidate['activity'],
                'reason_code' => $candidate['reason_code'],
                'reason' => $candidate['reason'],
                'evidence' => $candidate['evidence'],
                'source_key' => $sourceKey,
                'instructions' => $candidate['instructions'] ?? $open->instructions,
                'due_on' => $candidate['due_on'] ?? $open->due_on,
                'teacher_assignment_id' => $candidate['teacher_assignment_id'] ?? $open->teacher_assignment_id,
                'learning_plan_item_id' => $candidate['learning_plan_item_id'] ?? $open->learning_plan_item_id,
                'weak_spot_id' => $candidate['weak_spot_id'] ?? $open->weak_spot_id,
            ])->save();
            $bySource->put($sourceKey, $open);

            return;
        }

        $row = new RevisionRecommendation;
        $row->forceFill([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'organisation_id' => $teacher->organisation_id,
            'status' => RevisionRecommendationStatus::Pending->value,
            'activity' => $candidate['activity'],
            'surah_number' => (int) $candidate['surah_number'],
            'ayah_start' => (int) $candidate['ayah_start'],
            'ayah_end' => (int) $candidate['ayah_end'],
            'due_on' => $candidate['due_on'] ?? null,
            'instructions' => $candidate['instructions'] ?? null,
            'reason_code' => $candidate['reason_code'],
            'reason' => $candidate['reason'],
            'evidence' => $candidate['evidence'],
            'source_key' => $sourceKey,
            'learning_plan_id' => $candidate['learning_plan_id'] ?? null,
            'learning_plan_item_id' => $candidate['learning_plan_item_id'] ?? null,
            'teacher_assignment_id' => $candidate['teacher_assignment_id'] ?? null,
            'weak_spot_id' => $candidate['weak_spot_id'] ?? null,
        ])->save();
        $bySource->put($sourceKey, $row);
        $openByPassage[$passage] = $row;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function fromTeacherFindings(User $teacher, User $student): array
    {
        return TeacherWordCoachingCorrection::query()
            ->where('finding', 'difficulty')
            ->where('teacher_id', $teacher->id)
            ->whereHas('coaching', fn ($query) => $query->where('student_id', $student->id)->where('teacher_id', $teacher->id))
            ->with('coaching')
            ->latest('id')
            ->limit(20)
            ->get()
            ->map(function (TeacherWordCoachingCorrection $correction) {
                $coaching = $correction->coaching;
                if ($coaching === null) {
                    return null;
                }
                $focus = (string) ($correction->focus ?? 'other');
                $tajweed = in_array($focus, self::TAJWEED_FOCI, true);
                $activity = $tajweed ? 'tajweed' : 'revision';
                $code = $focus === 'pronunciation'
                    ? 'teacher_pronunciation_finding'
                    : ($tajweed ? 'teacher_tajweed_finding' : 'teacher_memorisation_finding');

                return $this->candidate(
                    'coaching-finding:'.$correction->id,
                    $activity,
                    (int) $coaching->surah_number,
                    (int) $coaching->ayah_number,
                    (int) $coaching->ayah_number,
                    $code,
                    'Teacher confirmed a '.$this->focusLabel($focus).' difficulty on this ayah. This is a teacher finding, not an automated assessment.',
                    [
                        'kind' => 'teacher_finding',
                        'focus' => $focus,
                        'finding' => 'difficulty',
                        'is_tajweed_assessment' => false,
                    ],
                );
            })
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function fromConfirmedSpots(User $student): array
    {
        return MemorisationWeakSpot::query()
            ->where('user_id', $student->id)
            ->where('teacher_review_status', MemorisationWeakSpot::REVIEW_CONFIRMED)
            ->orderByDesc('affected_attempt_count')
            ->limit(12)
            ->get()
            ->map(fn (MemorisationWeakSpot $spot) => $this->candidate(
                'confirmed-spot:'.$spot->id,
                'revision',
                (int) $spot->surah_number,
                (int) $spot->ayah_number,
                (int) $spot->ayah_number,
                'teacher_confirmed_difficulty',
                'Teacher confirmed this ayah needs more practice. This confirmation is not an automated Tajweed or pronunciation assessment.',
                [
                    'kind' => 'teacher_confirmed_difficulty',
                    'weak_spot_id' => (int) $spot->id,
                    'is_tajweed_assessment' => false,
                ],
                weakSpotId: (int) $spot->id,
            ))
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function fromWordMatches(User $student): array
    {
        return MemorisationWeakSpot::query()
            ->where('user_id', $student->id)
            ->whereIn('status', [MemorisationWeakSpot::STATUS_ACTIVE, MemorisationWeakSpot::STATUS_IMPROVING])
            ->where('affected_attempt_count', '>=', 2)
            ->where(function ($query) {
                $query->whereNull('teacher_review_status')
                    ->orWhere('teacher_review_status', '!=', MemorisationWeakSpot::REVIEW_DISMISSED);
            })
            ->orderByDesc('affected_attempt_count')
            ->limit(12)
            ->get()
            ->map(function (MemorisationWeakSpot $spot) {
                $count = (int) $spot->affected_attempt_count;

                return $this->candidate(
                    'word-match:'.(int) $spot->surah_number.':'.(int) $spot->ayah_number,
                    'revision',
                    (int) $spot->surah_number,
                    (int) $spot->ayah_number,
                    (int) $spot->ayah_number,
                    'ai_word_match',
                    'The expected wording did not match in '.$count.' recent checks. Word matching is not a Tajweed or pronunciation assessment.',
                    [
                        'kind' => 'ai_word_match',
                        'count' => $count,
                        'is_tajweed_assessment' => false,
                    ],
                    weakSpotId: (int) $spot->id,
                );
            })
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function fromOpenCoaching(User $teacher, User $student): array
    {
        return TeacherWordCoaching::query()
            ->where('teacher_id', $teacher->id)
            ->where('student_id', $student->id)
            ->whereIn('review_status', [TeacherWordCoaching::NEEDS_PRACTICE, TeacherWordCoaching::AWAITING_RETRY])
            ->latest('id')
            ->limit(8)
            ->get()
            ->map(function (TeacherWordCoaching $coaching) {
                $passage = QuranMetadata::name((int) $coaching->surah_number).' '.(int) $coaching->ayah_number;
                $waiting = $coaching->review_status === TeacherWordCoaching::AWAITING_RETRY
                    ? 'is waiting for another recitation'
                    : 'still needs practice';
                $attemptId = $coaching->latest_retry_attempt_id ?: $coaching->ai_recite_attempt_id;

                return $this->candidate(
                    'coaching-open:'.$coaching->id,
                    'revision',
                    (int) $coaching->surah_number,
                    (int) $coaching->ayah_number,
                    (int) $coaching->ayah_number,
                    'previous_revision',
                    $passage.' '.$waiting.' after your review. This follow-up is not a Tajweed or pronunciation assessment.',
                    [
                        'kind' => 'previous_revision',
                        'coaching_id' => (int) $coaching->id,
                        'attempt_id' => $attemptId ? (int) $attemptId : null,
                        'practice_assignment_id' => $coaching->practice_assignment_id ? (int) $coaching->practice_assignment_id : null,
                        'is_tajweed_assessment' => false,
                    ],
                    assignmentId: $coaching->practice_assignment_id ? (int) $coaching->practice_assignment_id : null,
                );
            })
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function fromFeedback(User $teacher, User $student): array
    {
        return TeacherNote::query()
            ->where('teacher_id', $teacher->id)
            ->where('student_id', $student->id)
            ->where('kind', TeacherNoteKind::Feedback->value)
            ->with('assignment.recipients')
            ->latest('id')
            ->limit(8)
            ->get()
            ->map(function (TeacherNote $note) use ($student) {
                $assignment = $note->assignment;
                $surah = (int) ($note->surah_number ?: $assignment?->surah_number ?: 0);
                $start = (int) ($note->ayah_start ?: $assignment?->ayah_start ?: 0);
                $end = (int) ($note->ayah_end ?: $assignment?->ayah_end ?: $start);
                if ($surah < 1 || $start < 1) {
                    return null;
                }
                $recipient = $assignment?->recipients?->firstWhere('student_id', $student->id);
                $status = $recipient?->status instanceof AssignmentStatus
                    ? $recipient->status->value
                    : (string) ($recipient?->status ?? '');
                if ($status === AssignmentStatus::Completed->value) {
                    return null;
                }
                $activity = $this->activityFromAssignment($assignment) ?? 'revision';
                $passage = QuranMetadata::name($surah).' '.$start.($end !== $start ? '–'.$end : '');
                $reason = $assignment
                    ? 'Written feedback on '.$passage.' for '.$student->name.' is still attached to an unfinished task.'
                    : 'Written feedback on '.$passage.' for '.$student->name.' has not been turned into a task yet.';

                return $this->candidate(
                    'feedback-note:'.$note->id,
                    $activity,
                    $surah,
                    $start,
                    $end,
                    'previous_feedback',
                    $reason,
                    [
                        'kind' => 'teacher_feedback',
                        'teacher_note_id' => (int) $note->id,
                        'is_tajweed_assessment' => false,
                    ],
                    assignmentId: $assignment?->id ? (int) $assignment->id : null,
                );
            })
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function fromPlanGoals(User $teacher, User $student): array
    {
        $plans = LearningPlan::query()
            ->where('teacher_id', $teacher->id)
            ->where('student_id', $student->id)
            ->where('status', LearningPlanStatus::Active->value)
            ->with('items.assignment.recipients')
            ->limit(4)
            ->get();

        $rows = [];
        foreach ($plans as $plan) {
            foreach ($plan->items as $item) {
                if ($item->origin === 'suggested') {
                    continue;
                }
                if ($item->item_status === LearningPlanItemStatus::Skipped) {
                    continue;
                }
                $recipient = $item->assignment?->recipients?->first();
                $taskStatus = $recipient?->status instanceof AssignmentStatus
                    ? $recipient->status->value
                    : (string) ($recipient?->status ?? '');
                if ($taskStatus === AssignmentStatus::Completed->value) {
                    continue;
                }
                $due = $item->due_on;
                $outstanding = $item->teacher_assignment_id === null
                    || ($due && $due->copy()->endOfDay()->isPast());
                if (! $outstanding) {
                    continue;
                }
                $activity = in_array((string) $item->activity, self::ACTIVITIES, true)
                    ? (string) $item->activity
                    : 'revision';
                $rows[] = $this->candidate(
                    'plan-item:'.$item->id,
                    $activity,
                    (int) $item->surah_number,
                    (int) $item->ayah_start,
                    (int) $item->ayah_end,
                    'plan_goal',
                    'This learning-plan goal is still outstanding.',
                    [
                        'kind' => 'plan_goal',
                        'learning_plan_item_id' => (int) $item->id,
                        'is_tajweed_assessment' => false,
                    ],
                    dueOn: $due?->toDateString(),
                    instructions: $item->instructions,
                    planId: (int) $plan->id,
                    planItemId: (int) $item->id,
                    assignmentId: $item->teacher_assignment_id ? (int) $item->teacher_assignment_id : null,
                );
                if (count($rows) >= 6) {
                    return $rows;
                }
            }
        }

        return $rows;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function fromOutstandingRevision(User $teacher, User $student): array
    {
        return TeacherAssignmentRecipient::query()
            ->where('student_id', $student->id)
            ->whereIn('status', [
                AssignmentStatus::Pending->value,
                AssignmentStatus::InProgress->value,
                AssignmentStatus::Overdue->value,
            ])
            ->whereHas('assignment', function ($query) use ($teacher) {
                $query->where('teacher_id', $teacher->id)
                    ->where(function ($inner) {
                        $inner->where('activity', 'revision')
                            ->orWhere(function ($legacy) {
                                $legacy->whereNull('activity')->whereIn('hifz_category', ['sabqi', 'manzil']);
                            });
                    })
                    ->whereNotNull('due_at')
                    ->where('due_at', '<', now());
            })
            ->with('assignment')
            ->limit(8)
            ->get()
            ->map(function (TeacherAssignmentRecipient $recipient) {
                $assignment = $recipient->assignment;
                if ($assignment === null) {
                    return null;
                }

                return $this->candidate(
                    'outstanding-assignment:'.$assignment->id,
                    'revision',
                    (int) $assignment->surah_number,
                    (int) $assignment->ayah_start,
                    (int) $assignment->ayah_end,
                    'outstanding_assignment',
                    'Revision for '.QuranMetadata::name((int) $assignment->surah_number).' '.(int) $assignment->ayah_start.'–'.(int) $assignment->ayah_end.' is past its due date.',
                    [
                        'kind' => 'outstanding_assignment',
                        'teacher_assignment_id' => (int) $assignment->id,
                        'is_tajweed_assessment' => false,
                    ],
                    dueOn: $assignment->due_at?->toDateString(),
                    assignmentId: (int) $assignment->id,
                );
            })
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $evidence
     * @return array<string, mixed>
     */
    private function candidate(
        string $sourceKey,
        string $activity,
        int $surah,
        int $start,
        int $end,
        string $reasonCode,
        string $reason,
        array $evidence,
        ?string $dueOn = null,
        ?string $instructions = null,
        ?int $planId = null,
        ?int $planItemId = null,
        ?int $assignmentId = null,
        ?int $weakSpotId = null,
    ): array {
        return [
            'source_key' => $sourceKey,
            'activity' => $activity,
            'surah_number' => $surah,
            'ayah_start' => $start,
            'ayah_end' => max($start, $end),
            'reason_code' => $reasonCode,
            'reason' => mb_substr($reason, 0, 500),
            'evidence' => $evidence,
            'due_on' => $dueOn,
            'instructions' => $instructions,
            'learning_plan_id' => $planId,
            'learning_plan_item_id' => $planItemId,
            'teacher_assignment_id' => $assignmentId,
            'weak_spot_id' => $weakSpotId,
        ];
    }

    private function createAssignment(User $teacher, RevisionRecommendation $row): TeacherAssignment
    {
        $mapped = $this->activityPayload($row->activity);
        try {
            return $this->assignments->create($teacher, [
                'student_id' => $row->student_id,
                'kind' => $mapped['kind'],
                'hifz_category' => $mapped['hifz_category'],
                'activity' => $row->activity,
                'recording_required' => $mapped['recording_required'],
                'surah_number' => $row->surah_number,
                'ayah_start' => $row->ayah_start,
                'ayah_end' => $row->ayah_end,
                'due_at' => $row->due_on?->toDateString() ?: now()->addDays(3)->toDateString(),
                'feedback' => $row->instructions,
                'learning_plan_id' => $row->learning_plan_id,
                'learning_plan_item_id' => $row->learning_plan_item_id,
            ]);
        } catch (ValidationException $exception) {
            $existing = $this->openMatch($teacher, $row);
            if ($existing) {
                return $existing;
            }
            throw $exception;
        }
    }

    private function openMatch(User $teacher, RevisionRecommendation $row): ?TeacherAssignment
    {
        $recipient = TeacherAssignmentRecipient::query()
            ->where('student_id', $row->student_id)
            ->where('status', '!=', AssignmentStatus::Completed->value)
            ->whereHas('assignment', function ($query) use ($teacher, $row) {
                $query->where('teacher_id', $teacher->id)
                    ->where('activity', $row->activity)
                    ->where('surah_number', $row->surah_number)
                    ->where('ayah_start', $row->ayah_start)
                    ->where('ayah_end', $row->ayah_end);
            })
            ->with('assignment')
            ->first();

        return $recipient?->assignment;
    }

    /**
     * @return array{kind: string, hifz_category: string, recording_required: bool}
     */
    private function activityPayload(string $activity): array
    {
        return match ($activity) {
            'nazra' => ['kind' => 'practice', 'hifz_category' => 'sabqi', 'recording_required' => false],
            'hifz' => ['kind' => 'ai_recite', 'hifz_category' => 'sabaq', 'recording_required' => true],
            'tajweed' => ['kind' => 'ai_recite', 'hifz_category' => 'sabqi', 'recording_required' => true],
            default => ['kind' => 'practice', 'hifz_category' => 'sabqi', 'recording_required' => false],
        };
    }

    private function activityFromAssignment(?TeacherAssignment $assignment): ?string
    {
        if ($assignment === null) {
            return null;
        }
        $activity = (string) ($assignment->activity ?? '');
        if (in_array($activity, self::ACTIVITIES, true)) {
            return $activity;
        }
        if (in_array((string) $assignment->hifz_category, ['sabqi', 'manzil'], true)) {
            return 'revision';
        }

        return 'hifz';
    }

    private function rank(string $code): int
    {
        return match ($code) {
            'teacher_tajweed_finding', 'teacher_pronunciation_finding', 'teacher_memorisation_finding' => 1,
            'teacher_confirmed_difficulty' => 2,
            'previous_revision' => 3,
            'previous_feedback' => 4,
            'plan_goal' => 5,
            'outstanding_assignment' => 6,
            default => 7,
        };
    }

    private function focusLabel(string $focus): string
    {
        return match ($focus) {
            'makharij' => 'makharij',
            'sifaat' => 'sifaat',
            'madd' => 'madd',
            'ghunnah' => 'ghunnah',
            'noon_meem' => 'noon and meem',
            'qalqalah' => 'qalqalah',
            'waqf' => 'waqf',
            'pronunciation' => 'pronunciation',
            'memorisation' => 'memorisation',
            default => 'recitation',
        };
    }

    private function passageKey(string $activity, int $surah, int $start, int $end): string
    {
        return $activity.':'.$surah.':'.$start.':'.$end;
    }

    private function status(RevisionRecommendation $row): string
    {
        return $row->status instanceof RevisionRecommendationStatus ? $row->status->value : (string) $row->status;
    }

    private function assertOpen(RevisionRecommendation $row): void
    {
        if (! in_array($this->status($row), [
            RevisionRecommendationStatus::Pending->value,
            RevisionRecommendationStatus::Accepted->value,
        ], true)) {
            throw ValidationException::withMessages(['recommendation' => 'This recommendation can no longer be changed.']);
        }
    }

    private function assertRange(int $surah, int $start, int $end): void
    {
        $count = QuranMetadata::ayahCount($surah);
        if ($count === null || $start < 1 || $end < $start || $end > $count) {
            throw ValidationException::withMessages(['ayah_end' => 'Choose a valid surah and ayah range.']);
        }
    }

    private function assertTeacher(User $teacher, User $student): void
    {
        TeacherFeatures::abortUnlessEnabled();
        abort_unless($teacher->isTeacher() && $this->access->allows($teacher, $student), 404);
    }

    private function assertOwns(User $teacher, RevisionRecommendation $row): void
    {
        abort_unless((int) $row->teacher_id === (int) $teacher->id, 404);
        $student = User::query()->find($row->student_id);
        abort_unless($student && $this->access->allows($teacher, $student), 404);
    }

    private function nullable(mixed $value): ?string
    {
        $text = trim((string) $value);

        return $text === '' ? null : mb_substr($text, 0, 2000);
    }
}

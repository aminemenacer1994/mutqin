<?php

namespace App\Services\Parent;

use App\Enums\AssignmentStatus;
use App\Enums\LearningPlanStatus;
use App\Enums\ParentGuardianPermission;
use App\Enums\RevisionRecommendationStatus;
use App\Enums\TeacherNoteKind;
use App\Models\AiReciteAttempt;
use App\Models\LearningPlan;
use App\Models\LearningPlanItem;
use App\Models\MemorisationProgress;
use App\Models\RevisionRecommendation;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherNote;
use App\Models\TeacherRecitationAssessment;
use App\Models\TeacherRecitationReview;
use App\Models\User;
use App\Services\Learning\AiReciteAttemptAudioService;
use App\Services\Teacher\TeacherRecitationFeedbackSegmentService;
use App\Services\Teacher\StudentHifzProgressService;
use App\Services\Teacher\TeacherAssignmentService;
use App\Support\QuranMetadata;
use App\Support\TeacherFeatures;
use Illuminate\Support\Carbon;

/**
 * Read-only learning, homework and progress for an approved guardian.
 * Reuses teacher assignment presentation and student progress services;
 * never exposes private teacher notes or another family's data.
 */
class ParentChildLearningService
{
    public function __construct(
        private readonly ParentAccessAuthorizer $access,
        private readonly ParentFamilyDashboardService $family,
        private readonly TeacherAssignmentService $assignments,
        private readonly StudentHifzProgressService $hifzProgress,
        private readonly AiReciteAttemptAudioService $attemptAudio,
        private readonly TeacherRecitationFeedbackSegmentService $feedbackSegments,
    ) {}

    /**
     * @param  array{activity?: ?string, status?: ?string, from?: ?string, to?: ?string}  $filters
     * @return array<string, mixed>
     */
    public function assignments(User $parent, User $student, array $filters = []): array
    {
        $this->assertPermission($parent, $student, ParentGuardianPermission::ViewAssignments);
        $this->refreshSharedStatuses($student);

        $from = $this->parseDate($filters['from'] ?? null)?->startOfDay();
        $to = $this->parseDate($filters['to'] ?? null)?->endOfDay();
        $activity = $this->normaliseActivity($filters['activity'] ?? null);
        $statusFilter = $this->normaliseStatusFilter($filters['status'] ?? null);
        $studentName = $student->name;

        $windowIds = $this->assignmentWindowIds((int) $student->id);
        $recipients = TeacherAssignmentRecipient::query()
            ->where('student_id', $student->id)
            ->whereIn('id', $windowIds['ids'])
            ->with(['assignment.teacher:id,name'])
            ->when($from, fn ($query) => $query->whereHas(
                'assignment',
                fn ($inner) => $inner->where('due_at', '>=', $from),
            ))
            ->when($to, fn ($query) => $query->whereHas(
                'assignment',
                fn ($inner) => $inner->where('due_at', '<=', $to),
            ))
            ->when($activity !== null, fn ($query) => $query->whereHas(
                'assignment',
                fn ($inner) => $inner->where('activity', $activity),
            ))
            ->get()
            ->sortBy([
                fn (TeacherAssignmentRecipient $row) => $this->isOverdue($row) ? 0 : 1,
                fn (TeacherAssignmentRecipient $row) => $row->assignment?->due_at?->getTimestamp() ?? PHP_INT_MAX,
            ])
            ->values();

        $rows = $recipients
            ->map(fn (TeacherAssignmentRecipient $recipient) => $this->presentAssignmentRow($parent, $recipient, $studentName))
            ->filter(function (array $row) use ($statusFilter) {
                if ($statusFilter === null || $statusFilter === 'all') {
                    return true;
                }
                if ($statusFilter === 'active') {
                    return $row['status'] !== AssignmentStatus::Completed->value;
                }

                return $row['display_status'] === $statusFilter;
            })
            ->values();

        return [
            'child_id' => (int) $student->id,
            'filters' => [
                'activity' => $activity,
                'status' => $statusFilter ?? 'all',
                'from' => $from?->toDateString(),
                'to' => $to?->toDateString(),
            ],
            'assignments' => $rows->all(),
            'truncated' => $windowIds['truncated'],
            'read_only' => true,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function progress(User $parent, User $student, string $window = 'month'): array
    {
        $this->assertPermission($parent, $student, ParentGuardianPermission::ViewProgress);

        $bounds = $this->hifzProgress->periodBounds($window);
        $window = $bounds['window'];
        $from = $bounds['from'];
        $to = $bounds['to'];

        $hifz = $this->hifzProgress->forGuardian($student, $from, $to);

        return [
            'child_id' => (int) $student->id,
            'window' => $window,
            'from' => $from->toIso8601String(),
            'to' => $to->toIso8601String(),
            'coverage' => $hifz['coverage'],
            'wording_match' => $hifz['wording_match'],
            'weak_passages' => $hifz['weak_passages'],
            'validated_memorisation' => $hifz['validated_memorisation'],
            'practice_volume' => $this->practiceVolume($student, $from, $to),
            'assignment_trends' => $this->assignmentTrends($student, $from, $to),
            'assignment_completion' => $this->hifzProgress->assignmentCompletion($student, $from, $to),
            'recommendations' => $this->recommendations($student),
            'assessments' => $this->recentAssessments($parent, $student, $from, $to),
            'read_only' => true,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function profile(User $parent, User $student): array
    {
        $this->assertLinked($parent, $student);

        $shellChild = collect($this->family->present($parent)['children'])
            ->first(fn (array $row) => (int) $row['id'] === (int) $student->id);
        abort_if($shellChild === null, 404);

        $canAssignments = (bool) ($shellChild['permissions']['assignments'] ?? false);
        $canProgress = (bool) ($shellChild['permissions']['progress'] ?? false);
        $canMessages = (bool) ($shellChild['permissions']['messages'] ?? false);

        $plans = $canProgress
            ? LearningPlan::query()
                ->where('student_id', $student->id)
                ->where('status', LearningPlanStatus::Active->value)
                ->orderByDesc('id')
                ->get(['id', 'title', 'student_goal', 'starts_on', 'ends_on', 'cadence'])
                ->map(fn (LearningPlan $plan) => [
                    'id' => (int) $plan->id,
                    'title' => $plan->title,
                    'goal' => $plan->student_goal,
                    'starts_on' => $plan->starts_on,
                    'ends_on' => $plan->ends_on,
                    'cadence' => $plan->cadence,
                ])
                ->values()
                ->all()
            : [];

        $feedback = $canMessages
            ? TeacherNote::query()
                ->where('student_id', $student->id)
                ->where('kind', TeacherNoteKind::Feedback->value)
                ->with('teacher:id,name')
                ->latest('id')
                ->limit(12)
                ->get()
                ->map(fn (TeacherNote $note) => [
                    'id' => (int) $note->id,
                    'teacher_name' => $note->teacher?->name,
                    'body' => trim((string) $note->body),
                    'at' => $note->created_at?->toIso8601String(),
                ])
                ->filter(fn (array $row) => $row['body'] !== '')
                ->values()
                ->all()
            : [];

        $activity = $canProgress ? $this->recentPractice($student) : [];

        $position = $canProgress ? $this->hifzProgress->forGuardian($student, now()->subDays(30)->startOfDay(), now()->endOfDay())['coverage'] : null;

        $assignmentSummary = $canAssignments ? ($shellChild['assignments'] ?? null) : null;

        return [
            'child' => $shellChild,
            'teachers' => $shellChild['teachers'] ?? [],
            'learning_area' => $shellChild['learning'] ?? null,
            'targets' => $plans,
            'curriculum' => $position,
            'assignment_summary' => $assignmentSummary,
            'recent_practice' => $activity,
            'feedback' => $feedback,
            'read_only' => true,
        ];
    }

    private function assertLinked(User $parent, User $student): void
    {
        abort_unless($this->access->allows($parent, $student), 404);
    }

    private function assertPermission(User $parent, User $student, ParentGuardianPermission $permission): void
    {
        abort_unless($this->access->allows($parent, $student, $permission->value), 404);
    }

    private function parseDate(?string $value): ?Carbon
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }

    private function normaliseActivity(?string $activity): ?string
    {
        $activity = strtolower(trim((string) $activity));
        if ($activity === '' || $activity === 'all') {
            return null;
        }

        return in_array($activity, ['nazra', 'hifz', 'tajweed', 'revision'], true) ? $activity : null;
    }

    private function normaliseStatusFilter(?string $status): ?string
    {
        $status = strtolower(trim((string) $status));
        if ($status === '' || $status === 'all') {
            return 'all';
        }

        return in_array($status, ['active', 'completed', 'overdue', 'awaiting_confirmation', 'in_progress', 'pending', 'needs_correction'], true)
            ? $status
            : 'all';
    }

    /**
     * @return array<string, mixed>
     */
    private function presentAssignmentRow(User $parent, TeacherAssignmentRecipient $recipient, string $childName): array
    {
        $assignment = $recipient->assignment;
        abort_if($assignment === null, 500);

        $display = $this->displayStatus($recipient);
        $reviewState = $this->assignments->reviewState($recipient);
        $instructions = LearningPlanItem::query()
            ->where('teacher_assignment_id', $assignment->id)
            ->value('instructions');
        $instructions = is_string($instructions) ? trim($instructions) : null;
        if ($instructions === '') {
            $instructions = null;
        }

        $latestAttempt = AiReciteAttempt::query()
            ->where('user_id', $recipient->student_id)
            ->where('teacher_assignment_recipient_id', $recipient->id)
            ->latest('created_at')
            ->latest('id')
            ->first();

        return [
            'id' => (int) $recipient->id,
            'child_id' => (int) $recipient->student_id,
            'child_name' => $childName,
            'status' => $this->assignments->lifecycleStatus($recipient),
            'review_state' => $reviewState,
            'display_status' => $display,
            'assignment' => $this->assignments->presentAssignment($assignment),
            'teacher_name' => $assignment->teacher?->name,
            'instructions' => $instructions !== '' ? $instructions : null,
            'teacher_feedback' => $assignment->feedback ? trim((string) $assignment->feedback) : null,
            'history' => $this->completionHistory($recipient, $assignment),
            'latest_assessment' => $latestAttempt
                ? $this->presentAssessment($parent, $recipient->student_id, $latestAttempt)
                : null,
            'read_only' => true,
        ];
    }

    /**
     * @return list<array{label: string, at: ?string}>
     */
    private function completionHistory(TeacherAssignmentRecipient $recipient, $assignment): array
    {
        $rows = [
            ['label' => 'assigned', 'at' => $assignment->created_at?->toIso8601String()],
        ];
        if ($recipient->started_at !== null) {
            $rows[] = ['label' => 'started', 'at' => $recipient->started_at->toIso8601String()];
        }
        if ($recipient->student_completed_at !== null) {
            $rows[] = ['label' => 'submitted', 'at' => $recipient->student_completed_at->toIso8601String()];
        }
        if ($recipient->completed_at !== null) {
            $rows[] = ['label' => 'completed', 'at' => $recipient->completed_at->toIso8601String()];
        }

        return $rows;
    }

    /**
     * @return array<string, mixed>
     */
    private function presentAssessment(User $parent, int $studentId, AiReciteAttempt $attempt): array
    {
        if ((int) $attempt->user_id !== $studentId) {
            return [];
        }
        $student = User::query()->find($studentId);
        if (! $student instanceof User || ! $this->access->allows($parent, $student, ParentGuardianPermission::ViewProgress->value)) {
            return [];
        }

        $human = TeacherRecitationAssessment::query()
            ->where('ai_recite_attempt_id', $attempt->id)
            ->first();
        $review = TeacherRecitationReview::query()
            ->where('ai_recite_attempt_id', $attempt->id)
            ->first();
        $reviewed = $review?->status === TeacherRecitationReview::REVIEWED || $human !== null;

        $audioAllowed = $this->attemptAudio->hasPlayableAudio($attempt)
            && $this->attemptAudio->canView($parent, $attempt);

        $segments = $this->feedbackSegments->forStudentAttempt($attempt);

        return [
            'attempt_id' => (int) $attempt->id,
            'source' => $reviewed ? 'teacher_reviewed' : 'ai_prediction',
            'word_match_percent' => $attempt->accuracy_percent !== null ? (int) $attempt->accuracy_percent : null,
            'word_match_is_tajweed' => false,
            'band' => $attempt->band,
            'teacher_score' => $human?->tajweed_score !== null ? (int) $human->tajweed_score : null,
            'teacher_note' => $this->teacherAssessmentNote($human),
            'feedback_segments' => $segments,
            'has_recording' => $audioAllowed,
            'recording_url' => $audioAllowed ? '/api/ai-recite-attempts/'.$attempt->id.'/audio' : null,
            'at' => $attempt->created_at?->toIso8601String(),
        ];
    }

    private function teacherAssessmentNote(?TeacherRecitationAssessment $human): ?string
    {
        if ($human === null) {
            return null;
        }
        $text = trim((string) $human->annotation);
        if ($text !== '') {
            return $text;
        }
        $observations = is_array($human->observations) ? $human->observations : [];
        $published = trim((string) ($observations['published_feedback'] ?? ''));

        return $published !== '' ? $published : null;
    }

    private function displayStatus(TeacherAssignmentRecipient $recipient): string
    {
        $review = $this->assignments->reviewState($recipient);
        if ($review === 'needs_correction') {
            return 'needs_correction';
        }
        if ($review === 'approved') {
            return 'completed';
        }
        if ($review === 'submitted') {
            return 'awaiting_confirmation';
        }
        if ($this->isOverdue($recipient)) {
            return 'overdue';
        }

        return $this->assignments->lifecycleStatus($recipient);
    }

    private function refreshSharedStatuses(User $student): void
    {
        if (! TeacherFeatures::enabled()) {
            return;
        }

        $teacherIds = TeacherAssignment::query()
            ->whereHas('recipients', fn ($query) => $query->where('student_id', $student->id))
            ->pluck('teacher_id')
            ->unique();
        foreach ($teacherIds as $teacherId) {
            $teacher = User::query()->find($teacherId);
            if ($teacher instanceof User && $teacher->isTeacher()) {
                $this->assignments->refreshStatuses($teacher, [(int) $student->id]);
            }
        }
    }

    /**
     * Keep overdue work plus the latest homework so a long history does not load every row.
     *
     * @return array{ids: list<int>, truncated: bool}
     */
    private function assignmentWindowIds(int $studentId): array
    {
        $total = TeacherAssignmentRecipient::query()->where('student_id', $studentId)->count();
        $overdue = TeacherAssignmentRecipient::query()
            ->where('student_id', $studentId)
            ->whereIn('status', [AssignmentStatus::Pending->value, AssignmentStatus::InProgress->value])
            ->whereHas('assignment', fn ($query) => $query->whereNotNull('due_at')->where('due_at', '<', now()))
            ->orderByDesc('id')
            ->limit(40)
            ->pluck('id');
        $recent = TeacherAssignmentRecipient::query()
            ->where('student_id', $studentId)
            ->orderByDesc('id')
            ->limit(80)
            ->pluck('id');
        $ids = $overdue->merge($recent)->unique()->map(fn ($id) => (int) $id)->values()->all();

        return [
            'ids' => $ids === [] ? [0] : $ids,
            'truncated' => $total > count($ids),
        ];
    }

    private function isOverdue(TeacherAssignmentRecipient $recipient): bool
    {
        $due = $recipient->assignment?->due_at;
        if ($due === null || ! $due->isPast()) {
            return false;
        }

        return in_array($recipient->status, [AssignmentStatus::Pending, AssignmentStatus::InProgress], true);
    }

    /**
     * @return array<string, int>
     */
    private function practiceVolume(User $student, Carbon $from, Carbon $to): array
    {
        $count = MemorisationProgress::query()
            ->where('user_id', $student->id)
            ->whereBetween('created_at', [$from, $to])
            ->count();

        return [
            'ayah_rows' => $count,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function assignmentTrends(User $student, Carbon $from, Carbon $to): array
    {
        $recipients = TeacherAssignmentRecipient::query()
            ->where('student_id', $student->id)
            ->whereHas('assignment', fn ($query) => $query->whereBetween('due_at', [$from, $to]))
            ->with('assignment:id,due_at')
            ->get();

        $buckets = [];
        foreach ($recipients as $recipient) {
            $due = $recipient->assignment?->due_at;
            if ($due === null) {
                continue;
            }
            $key = $due->copy()->startOfWeek()->toDateString();
            $buckets[$key] ??= ['week_start' => $key, 'due' => 0, 'completed' => 0, 'overdue' => 0];
            $buckets[$key]['due']++;
            if ($recipient->status === AssignmentStatus::Completed) {
                $buckets[$key]['completed']++;
            } elseif ($this->isOverdue($recipient)) {
                $buckets[$key]['overdue']++;
            }
        }
        ksort($buckets);

        return array_values($buckets);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function recommendations(User $student): array
    {
        return RevisionRecommendation::query()
            ->where('student_id', $student->id)
            ->whereIn('status', [
                RevisionRecommendationStatus::Pending->value,
                RevisionRecommendationStatus::Accepted->value,
            ])
            ->orderBy('due_on')
            ->limit(8)
            ->get()
            ->map(fn (RevisionRecommendation $row) => [
                'id' => (int) $row->id,
                'activity' => $row->activity,
                'surah_name' => QuranMetadata::name((int) $row->surah_number),
                'ayah_start' => (int) $row->ayah_start,
                'ayah_end' => (int) $row->ayah_end,
                'due_on' => $row->due_on,
                'reason' => trim((string) $row->reason),
                'instructions' => trim((string) $row->instructions),
                'status' => $row->status instanceof RevisionRecommendationStatus
                    ? $row->status->value
                    : (string) $row->status,
            ])
            ->filter(fn (array $item) => $item['reason'] !== '' || $item['instructions'] !== '')
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function recentAssessments(User $parent, User $student, Carbon $from, Carbon $to): array
    {
        return AiReciteAttempt::query()
            ->validScored()
            ->where('user_id', $student->id)
            ->whereBetween('created_at', [$from, $to])
            ->latest('created_at')
            ->limit(12)
            ->get()
            ->map(fn (AiReciteAttempt $attempt) => $this->presentAssessment($parent, (int) $student->id, $attempt))
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function recentPractice(User $student): array
    {
        return MemorisationProgress::query()
            ->where('user_id', $student->id)
            ->latest('created_at')
            ->limit(8)
            ->get(['surah_number', 'ayah_number', 'status', 'created_at'])
            ->map(fn (MemorisationProgress $row) => [
                'surah_name' => QuranMetadata::name((int) $row->surah_number),
                'ayah' => (int) $row->ayah_number,
                'status' => (string) $row->status,
                'at' => $row->created_at?->toIso8601String(),
            ])
            ->all();
    }
}

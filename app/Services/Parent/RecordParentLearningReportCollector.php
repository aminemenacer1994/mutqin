<?php

namespace App\Services\Parent;

use App\Enums\AssignmentStatus;
use App\Enums\LearningPlanItemStatus;
use App\Enums\LearningPlanStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\RevisionRecommendationStatus;
use App\Enums\TeacherNoteKind;
use App\Enums\UserSessionStatus;
use App\Models\GroupMembership;
use App\Models\LearningPlan;
use App\Models\MemorisationProgress;
use App\Models\RevisionRecommendation;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherAttendanceRecord;
use App\Models\TeacherNote;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Teacher\StudentHifzProgressService;
use App\Services\Teacher\TeacherAttendanceService;
use App\Support\QuranMetadata;
use Illuminate\Support\Carbon;

/**
 * Builds a period snapshot from existing learning records.
 * The question text of a parent is never involved. Counts come from the database.
 */
class RecordParentLearningReportCollector implements ParentLearningReportCollector
{
    public function __construct(
        private readonly ParentLearningReportPeriods $periods,
        private readonly StudentHifzProgressService $hifz,
    ) {}

    public function collect(User $student, string $cadence, Carbon $from, Carbon $to): array
    {
        $hifz = $this->hifz->forGuardian($student, $from, $to);
        $assignments = $this->assignments($student, $from, $to);
        $activity = $this->activity($student, $from, $to, is_array($hifz['coverage'] ?? null) ? $hifz['coverage'] : []);
        $goals = $this->goals($student, $from, $to);
        $feedback = $this->feedback($student, $from, $to);
        $attendance = $this->attendance($student, $from, $to);
        $wording = $this->wording($hifz);
        [$previousFrom, $previousTo] = $this->periods->previous($cadence, $from);
        $previousAssignments = $this->assignmentCounts($student, $previousFrom, $previousTo);
        $previousPractice = $this->practiceCount($student, $previousFrom, $previousTo);
        $comparison = $this->comparison($cadence, $assignments, $activity, $previousAssignments, $previousPractice);
        $improve = $this->improve($hifz);
        $attention = $this->attention($assignments, $feedback, $wording, $improve);

        $insufficient = $assignments['assigned'] === 0
            && $activity['practice_rows'] === 0
            && $activity['revision_sessions'] === 0
            && $activity['memorised_in_period'] === 0
            && $goals['plans'] === []
            && $feedback['notes'] === []
            && $feedback['recommendations'] === []
            && $improve['items'] === []
            && ($wording['direction'] ?? 'insufficient') === 'insufficient'
            && (int) ($activity['current_memorised'] ?? 0) === 0
            && (int) ($attendance['total'] ?? 0) === 0;

        return [
            'assignments' => $assignments,
            'activity' => $activity,
            'goals' => $goals,
            'feedback' => $feedback,
            'attendance' => $attendance,
            'home_practice' => $this->homePractice($assignments, $feedback),
            'comparison' => $comparison,
            'attention' => $attention,
            'wording' => $wording,
            'improve' => $improve,
            'insufficient' => $insufficient,
            'sources' => $this->sources($assignments, $activity, $goals, $feedback, $wording, $attendance, $improve),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function assignments(User $student, Carbon $from, Carbon $to): array
    {
        $counts = $this->assignmentCounts($student, $from, $to);
        $rows = $this->assignmentQuery($student, $from, $to)
            ->with('assignment:id,surah_number,ayah_start,ayah_end,due_at,activity')
            ->orderByDesc('id')
            ->limit(6)
            ->get();

        $items = [];
        foreach ($rows as $recipient) {
            $assignment = $recipient->assignment;
            if ($assignment === null) {
                continue;
            }
            $status = $recipient->status instanceof AssignmentStatus ? $recipient->status->value : (string) $recipient->status;
            $due = $assignment->due_at;
            $open = in_array($status, [AssignmentStatus::Pending->value, AssignmentStatus::InProgress->value], true);
            $items[] = [
                'label' => $this->passageLabel((int) $assignment->surah_number, (int) $assignment->ayah_start, (int) $assignment->ayah_end),
                'status' => $status,
                'overdue' => $open && $due !== null && $due->lte($to),
            ];
        }

        return [
            'assigned' => $counts['assigned'],
            'completed' => $counts['completed'],
            'overdue' => $counts['overdue'],
            'items' => $items,
            'plain' => $this->homeworkPlain($counts['assigned'], $counts['completed'], $counts['overdue']),
        ];
    }

    /**
     * @return array{assigned: int, completed: int, overdue: int}
     */
    private function assignmentCounts(User $student, Carbon $from, Carbon $to): array
    {
        $base = $this->assignmentQuery($student, $from, $to);

        return [
            'assigned' => (clone $base)->count(),
            'completed' => (clone $base)->where('status', AssignmentStatus::Completed->value)->count(),
            'overdue' => (clone $base)
                ->whereIn('status', [AssignmentStatus::Pending->value, AssignmentStatus::InProgress->value])
                ->whereHas('assignment', function ($query) use ($to) {
                    $query->whereNotNull('due_at')->where('due_at', '<=', $to);
                })
                ->count(),
        ];
    }

    private function assignmentQuery(User $student, Carbon $from, Carbon $to)
    {
        return TeacherAssignmentRecipient::query()
            ->where('student_id', $student->id)
            ->whereHas('assignment', function ($query) use ($from, $to) {
                $query->where(function ($window) use ($from, $to) {
                    $window->whereBetween('created_at', [$from, $to])
                        ->orWhereBetween('due_at', [$from, $to]);
                });
            });
    }

    /**
     * @param  array<string, mixed>  $coverage
     * @return array<string, mixed>
     */
    private function activity(User $student, Carbon $from, Carbon $to, array $coverage): array
    {
        $counts = MemorisationProgress::query()
            ->where('user_id', $student->id)
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');
        $practice = (int) $counts->sum();
        $memorised = (int) ($counts['memorised'] ?? 0) + (int) ($counts['mastered'] ?? 0);
        $learning = (int) ($counts['learning'] ?? 0);
        $revision = UserSession::query()
            ->where('user_id', $student->id)
            ->where('is_onboarding_example', false)
            ->where('status', UserSessionStatus::Completed->value)
            ->whereBetween('last_activity_at', [$from, $to])
            ->where(function ($mode) {
                $mode->where('memorisation_mode', 'revision')
                    ->orWhere('metadata->config->sessionMode', 'revision')
                    ->orWhere('metadata->config->mode', 'revision')
                    ->orWhere('metadata->session_mode', 'revision');
            })
            ->count();

        $current = array_key_exists('memorised_ayahs', $coverage) ? (int) $coverage['memorised_ayahs'] : null;

        return [
            'practice_rows' => $practice,
            'memorised_in_period' => $memorised,
            'learning_in_period' => $learning,
            'revision_sessions' => $revision,
            'current_memorised' => $current,
            'plain' => $this->activityPlain($practice, $memorised, $learning, $revision, $current),
        ];
    }

    private function practiceCount(User $student, Carbon $from, Carbon $to): int
    {
        return MemorisationProgress::query()
            ->where('user_id', $student->id)
            ->whereBetween('created_at', [$from, $to])
            ->count();
    }

    /**
     * @return array<string, mixed>
     */
    private function goals(User $student, Carbon $from, Carbon $to): array
    {
        $plans = LearningPlan::query()
            ->where('student_id', $student->id)
            ->where('status', LearningPlanStatus::Active->value)
            ->where(function ($query) use ($to) {
                $query->whereNull('starts_on')->orWhere('starts_on', '<=', $to->toDateString());
            })
            ->where(function ($query) use ($from) {
                $query->whereNull('ends_on')->orWhere('ends_on', '>=', $from->toDateString());
            })
            ->withCount([
                'items',
                'items as released_count' => fn ($query) => $query->where('item_status', LearningPlanItemStatus::Released->value),
                'items as planned_count' => fn ($query) => $query->where('item_status', LearningPlanItemStatus::Planned->value),
            ])
            ->orderByDesc('id')
            ->limit(4)
            ->get();

        $rows = $plans->map(fn (LearningPlan $plan) => [
            'title' => trim((string) $plan->title),
            'goal' => trim((string) $plan->student_goal),
            'released' => (int) $plan->released_count,
            'planned' => (int) $plan->planned_count,
        ])->filter(fn (array $row) => $row['title'] !== '')->values()->all();

        $plain = $rows === []
            ? 'No learning plan overlapped this period.'
            : implode(' ', array_map(function (array $row): string {
                $sentence = $row['title'].' was active. '.$row['released'].' '.($row['released'] === 1 ? 'step was' : 'steps were').' released and '.$row['planned'].' '.($row['planned'] === 1 ? 'is' : 'are').' still planned.';
                if ($row['goal'] !== '') {
                    $sentence .= ' Goal: '.rtrim($this->plain($row['goal'], 120), '. ').'.';
                }

                return $sentence;
            }, $rows));

        return ['plans' => $rows, 'plain' => $plain];
    }

    /**
     * @return array<string, mixed>
     */
    private function feedback(User $student, Carbon $from, Carbon $to): array
    {
        $notes = TeacherNote::query()
            ->where('student_id', $student->id)
            ->where('kind', TeacherNoteKind::Feedback->value)
            ->whereBetween('created_at', [$from, $to])
            ->with('teacher:id,name')
            ->latest('id')
            ->limit(3)
            ->get()
            ->map(fn (TeacherNote $note) => [
                'teacher' => $this->firstName($note->teacher) ?: 'Teacher',
                'excerpt' => $this->plain((string) $note->body, 160),
                'at' => $note->created_at?->toIso8601String(),
            ])
            ->filter(fn (array $row) => $row['excerpt'] !== '')
            ->values()
            ->all();

        // Published revision targets only — pending teacher review stays off parent reports.
        $recommendations = RevisionRecommendation::query()
            ->where('student_id', $student->id)
            ->where('status', RevisionRecommendationStatus::Assigned->value)
            ->where(function ($query) use ($from, $to) {
                $query->whereBetween('assigned_at', [$from, $to])
                    ->orWhereBetween('due_on', [$from->toDateString(), $to->toDateString()])
                    ->orWhereBetween('updated_at', [$from, $to]);
            })
            ->orderBy('due_on')
            ->limit(3)
            ->get()
            ->map(function (RevisionRecommendation $row) {
                $text = trim((string) ($row->instructions ?: $row->reason));

                return [
                    'label' => $this->passageLabel((int) $row->surah_number, (int) $row->ayah_start, (int) $row->ayah_end),
                    'text' => $this->plain($text, 160),
                    'status' => 'assigned',
                ];
            })
            ->filter(fn (array $row) => $row['text'] !== '')
            ->values()
            ->all();

        return ['notes' => $notes, 'recommendations' => $recommendations];
    }

    /**
     * @return array<string, mixed>
     */
    private function attendance(User $student, Carbon $from, Carbon $to): array
    {
        $teacherIds = $this->linkedTeacherIds($student);

        if ($teacherIds === []) {
            return [
                'counts' => ['present' => 0, 'absent' => 0, 'late' => 0, 'excused' => 0],
                'total' => 0,
                'rate_percent' => null,
                'source' => 'teacher_recorded',
                'plain' => 'No attendance was recorded in this period.',
            ];
        }

        $counts = TeacherAttendanceRecord::query()
            ->where('student_id', $student->id)
            ->whereIn('teacher_id', $teacherIds)
            ->whereBetween('attendance_date', [$from->toDateString(), $to->toDateString()])
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');
        $payload = app(TeacherAttendanceService::class)->presentCounts($counts->all());
        $plain = $payload['total'] === 0
            ? 'No attendance was recorded in this period.'
            : sprintf(
                'Attendance was marked on %d %s: %d present, %d late, %d absent, %d excused.',
                $payload['total'],
                $payload['total'] === 1 ? 'day' : 'days',
                $payload['present'],
                $payload['late'],
                $payload['absent'],
                $payload['excused'],
            );
        if ($payload['rate_percent'] !== null) {
            $plain .= sprintf(' Present or on-time rate: %d%%.', (int) $payload['rate_percent']);
        }

        return [
            'counts' => [
                'present' => $payload['present'],
                'absent' => $payload['absent'],
                'late' => $payload['late'],
                'excused' => $payload['excused'],
            ],
            'total' => $payload['total'],
            'rate_percent' => $payload['rate_percent'],
            'source' => 'teacher_recorded',
            'plain' => $plain,
        ];
    }

    /**
     * @param  array<string, mixed>  $assignments
     * @param  array<string, mixed>  $feedback
     * @return array{items: list<array{kind: string, label: string, text: string}>, plain: string}
     */
    private function homePractice(array $assignments, array $feedback): array
    {
        $items = [];
        foreach ($assignments['items'] as $item) {
            $status = (string) ($item['status'] ?? '');
            if (! in_array($status, [AssignmentStatus::Pending->value, AssignmentStatus::InProgress->value], true)) {
                continue;
            }
            $items[] = [
                'kind' => 'assignment',
                'label' => (string) ($item['label'] ?? 'Homework'),
                'text' => ($item['overdue'] ?? false) === true
                    ? 'This teacher-set task was still open after the due date.'
                    : 'This teacher-set task is still open.',
            ];
            if (count($items) >= 4) {
                break;
            }
        }
        foreach ($feedback['recommendations'] as $recommendation) {
            $items[] = [
                'kind' => 'recommendation',
                'label' => (string) ($recommendation['label'] ?? 'Revision'),
                'text' => (string) ($recommendation['text'] ?? ''),
            ];
            if (count($items) >= 6) {
                break;
            }
        }

        $plain = $items === []
            ? 'No teacher-set homework or revision tasks are open for home practice in this period.'
            : $this->noun(count($items), 'teacher-approved item is', 'teacher-approved items are').' listed for home practice.';

        return ['items' => $items, 'plain' => $plain];
    }

    /**
     * Teacher-confirmed weak areas and recurring mistakes (no pending AI flags).
     *
     * @param  array<string, mixed>  $hifz
     * @return array{items: list<array<string, mixed>>, plain: string}
     */
    private function improve(array $hifz): array
    {
        $items = [];
        foreach (array_slice(is_array($hifz['weak_passages'] ?? null) ? $hifz['weak_passages'] : [], 0, 4) as $row) {
            if (! is_array($row) || (string) ($row['label'] ?? '') === '') {
                continue;
            }
            $items[] = [
                'kind' => 'teacher_confirmed_weak',
                'label' => (string) $row['label'],
                'count' => (int) ($row['count'] ?? 0),
                'ai_wording_flag' => false,
            ];
        }
        foreach (array_slice(is_array($hifz['recurring_mistakes'] ?? null) ? $hifz['recurring_mistakes'] : [], 0, 4) as $row) {
            if (! is_array($row) || (string) ($row['label'] ?? '') === '') {
                continue;
            }
            $items[] = [
                'kind' => 'recurring_mistake',
                'label' => (string) $row['label'],
                'count' => (int) ($row['count'] ?? 0),
                'category' => (string) ($row['category'] ?? 'other'),
                'ai_wording_flag' => (bool) ($row['ai_wording_flag'] ?? false),
                'is_tajweed_assessment' => (bool) ($row['is_tajweed_assessment'] ?? false),
            ];
        }
        $items = array_slice($items, 0, 6);
        $plain = $items === []
            ? 'No teacher-confirmed recurring difficulties were listed for this period.'
            : $this->noun(count($items), 'teacher-supported practice area is', 'teacher-supported practice areas are').' listed for continued care.';

        return ['items' => $items, 'plain' => $plain];
    }

    /**
     * @param  array<string, mixed>  $hifz
     * @return array<string, mixed>
     */
    private function wording(array $hifz): array
    {
        $trend = is_array($hifz['wording_match'] ?? null) ? $hifz['wording_match'] : [];
        $direction = is_string($trend['direction'] ?? null) ? $trend['direction'] : 'insufficient';
        $passage = is_array($trend['passages'][0] ?? null) ? $trend['passages'][0] : null;
        $latest = is_array($passage) && isset($passage['latest']) ? $passage['latest'] : null;
        $label = is_array($passage) ? (string) ($passage['label'] ?? '') : '';
        $weak = array_values(array_filter(
            array_slice(is_array($hifz['weak_passages'] ?? null) ? $hifz['weak_passages'] : [], 0, 2),
            fn ($row) => is_array($row) && ($row['label'] ?? '') !== '',
        ));
        $plain = $direction === 'insufficient' || $direction === ''
            ? 'There is no automatic wording check in this period. A wording check compares words only. It is not a Tajweed grade.'
            : 'The automatic wording check is '.$this->direction($direction).'.'
                .($latest !== null && $label !== '' ? ' Words matched on the latest check of '.$label.': '.$latest.'%.' : '')
                .' This compares words only. It is not a Tajweed grade.';

        return [
            'source' => 'ai_word_match',
            'is_tajweed' => false,
            'direction' => $direction,
            'latest' => $latest,
            'label' => $label !== '' ? $label : null,
            'plain' => $plain,
            'weak' => $weak,
        ];
    }

    /**
     * @param  array<string, mixed>  $assignments
     * @param  array<string, mixed>  $activity
     * @param  array{assigned: int, completed: int, overdue: int}  $previousAssignments
     * @return array<string, mixed>
     */
    private function comparison(string $cadence, array $assignments, array $activity, array $previousAssignments, int $previousPractice): array
    {
        $period = $cadence === 'month' ? 'month' : 'week';
        $practiceDelta = (int) $activity['practice_rows'] - $previousPractice;
        $completedDelta = (int) $assignments['completed'] - (int) $previousAssignments['completed'];

        return [
            'period' => $period,
            'practice_current' => (int) $activity['practice_rows'],
            'practice_previous' => $previousPractice,
            'practice_delta' => $practiceDelta,
            'completed_current' => (int) $assignments['completed'],
            'completed_previous' => (int) $previousAssignments['completed'],
            'completed_delta' => $completedDelta,
            'plain' => $this->deltaPlain('Practice records', $practiceDelta, $period).' '.$this->deltaPlain('Finished tasks', $completedDelta, $period),
        ];
    }

    /**
     * @param  array<string, mixed>  $assignments
     * @param  array<string, mixed>  $feedback
     * @param  array<string, mixed>  $wording
     * @return list<array{kind: string, label: string}>
     */
    private function attention(array $assignments, array $feedback, array $wording, array $improve): array
    {
        $items = [];
        foreach ($assignments['items'] as $item) {
            if (($item['overdue'] ?? false) !== true) {
                continue;
            }
            $items[] = ['kind' => 'overdue', 'label' => $item['label'].' was still open after the deadline.'];
            if (count($items) >= 3) {
                break;
            }
        }
        foreach ($wording['weak'] ?? [] as $weak) {
            if (! is_array($weak) || ($weak['label'] ?? '') === '') {
                continue;
            }
            $items[] = ['kind' => 'weak', 'label' => 'Teacher-confirmed: '.$weak['label'].'.'];
        }
        foreach ($improve['items'] ?? [] as $row) {
            if (! is_array($row) || ($row['kind'] ?? '') !== 'recurring_mistake' || ($row['label'] ?? '') === '') {
                continue;
            }
            $count = (int) ($row['count'] ?? 0);
            $items[] = [
                'kind' => 'recurring_mistake',
                'label' => $row['label'].($count > 1 ? ' (noted '.$count.' times)' : '').'.',
            ];
            if (count($items) >= 6) {
                break;
            }
        }
        foreach ($feedback['recommendations'] as $recommendation) {
            $items[] = ['kind' => 'recommendation', 'label' => $recommendation['label'].': '.$recommendation['text']];
            if (count($items) >= 6) {
                break;
            }
        }

        return array_slice($items, 0, 6);
    }

    /**
     * @param  array<string, mixed>  $assignments
     * @param  array<string, mixed>  $activity
     * @param  array<string, mixed>  $goals
     * @param  array<string, mixed>  $feedback
     * @param  array<string, mixed>  $wording
     * @return list<array{kind: string, label: string}>
     */
    private function sources(array $assignments, array $activity, array $goals, array $feedback, array $wording, array $attendance, array $improve): array
    {
        $sources = [
            ['kind' => 'assignments', 'label' => 'Homework records'],
            ['kind' => 'memorisation', 'label' => 'Memorisation records'],
            ['kind' => 'revision', 'label' => 'Revision sessions'],
        ];
        if ((int) ($attendance['total'] ?? 0) > 0) {
            $sources[] = ['kind' => 'attendance', 'label' => 'Teacher attendance marks'];
        }
        if ($goals['plans'] !== []) {
            $sources[] = ['kind' => 'plans', 'label' => 'Learning plans'];
        }
        if ($feedback['notes'] !== []) {
            $sources[] = ['kind' => 'teacher_feedback', 'label' => 'Teacher feedback'];
        }
        if ($feedback['recommendations'] !== []) {
            $sources[] = ['kind' => 'teacher_recommendation', 'label' => 'Published revision target'];
        }
        if ($improve['items'] !== []) {
            $sources[] = ['kind' => 'teacher_confirmed_practice', 'label' => 'Teacher-confirmed practice areas'];
        }
        if (($wording['direction'] ?? 'insufficient') !== 'insufficient') {
            $sources[] = ['kind' => 'ai_word_match', 'label' => 'Automatic wording check'];
        }

        return $sources;
    }

    private function homeworkPlain(int $assigned, int $completed, int $overdue): string
    {
        if ($assigned === 0) {
            return 'No homework was set in this period.';
        }

        $finished = $completed === 0 ? 'None were finished.' : $this->noun($completed, 'was', 'were').' finished.';
        $open = $overdue === 0 ? 'None were still open after the deadline.' : $this->noun($overdue, 'was', 'were').' still open after the deadline.';

        return $this->noun($assigned, 'task was', 'tasks were').' set in this period. '.$finished.' '.$open;
    }

    private function activityPlain(int $practice, int $memorised, int $learning, int $revision, ?int $current): string
    {
        $parts = [];
        $parts[] = $practice === 0
            ? 'No practice records were saved in this period.'
            : $this->noun($practice, 'practice record was', 'practice records were').' saved in this period. '.$memorised.' '.($memorised === 1 ? 'was' : 'were').' marked memorised and '.$learning.' '.($learning === 1 ? 'was' : 'were').' still being learned.';
        $parts[] = $revision === 0
            ? 'No revision sessions were recorded.'
            : $this->noun($revision, 'revision session was', 'revision sessions were').' recorded.';
        if ($current !== null && $current > 0) {
            $parts[] = 'Across all saved records, '.$current.' '.($current === 1 ? 'ayah is' : 'ayahs are').' marked memorised. That total is not limited to this period.';
        }

        return implode(' ', $parts);
    }

    private function deltaPlain(string $subject, int $delta, string $period): string
    {
        if ($delta === 0) {
            return $subject.' are the same as the previous '.$period.'.';
        }
        $count = abs($delta);

        return $subject.' are '.$count.' '.($delta > 0 ? 'higher' : 'lower').' than the previous '.$period.'.';
    }

    private function noun(int $count, string $singular, string $plural): string
    {
        return $count.' '.($count === 1 ? $singular : $plural);
    }

    private function direction(string $direction): string
    {
        return match ($direction) {
            'improving', 'up' => 'improving',
            'slipping', 'down' => 'needs another look',
            'mixed' => 'mixed',
            'steady' => 'steady',
            default => 'not ready to judge yet',
        };
    }

    private function passageLabel(int $surah, int $start, int $end): string
    {
        if ($surah < 1 || $start < 1) {
            return 'A set passage';
        }
        $name = QuranMetadata::name($surah);

        return $end > $start ? $name.' '.$start.'–'.$end : $name.' '.$start;
    }

    private function firstName(?User $user): string
    {
        $name = trim((string) ($user?->name ?? ''));
        if ($name === '') {
            return '';
        }
        $first = strtok($name, ' ');

        return is_string($first) ? $first : $name;
    }

    private function plain(string $value, int $limit): string
    {
        $value = trim(preg_replace('/\s+/u', ' ', strip_tags($value)) ?? '');
        if (mb_strlen($value) <= $limit) {
            return $value;
        }

        return rtrim(mb_substr($value, 0, $limit - 1)).'…';
    }

    /**
     * @return list<int>
     */
    private function linkedTeacherIds(User $student): array
    {
        $ids = collect();
        $groupIds = GroupMembership::query()
            ->where('user_id', $student->id)
            ->where('membership_role', MembershipRole::Student->value)
            ->where('status', MembershipStatus::Approved->value)
            ->pluck('learning_group_id');
        if ($groupIds->isNotEmpty()) {
            $ids = $ids->merge(
                GroupMembership::query()
                    ->whereIn('learning_group_id', $groupIds)
                    ->where('membership_role', MembershipRole::Teacher->value)
                    ->where('status', MembershipStatus::Approved->value)
                    ->pluck('user_id')
            );
        }

        $ids = $ids->merge(
            TeacherAssignmentRecipient::query()
                ->where('student_id', $student->id)
                ->whereHas('assignment')
                ->with('assignment:id,teacher_id')
                ->get()
                ->map(fn (TeacherAssignmentRecipient $recipient) => $recipient->assignment?->teacher_id)
        );

        return $ids
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }
}

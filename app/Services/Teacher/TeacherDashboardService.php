<?php

namespace App\Services\Teacher;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\AssignmentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\OrganisationType;
use App\Enums\TeacherNoteKind;
use App\Enums\UserSessionStatus;
use App\Models\AiReciteAttempt;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\MemorisationPracticePlan;
use App\Models\MemorisationProgress;
use App\Models\MemorisationWeakSpot;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherNote;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Memorisation\RecitationScoringThresholds;
use App\Services\Organisations\GroupMembershipService;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Support\QuranMetadata;
use App\Support\Registration\OrganisationName;
use App\Support\TeacherFeatures;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TeacherDashboardService
{
    public function __construct(
        private readonly StudentAccessAuthorizer $access,
        private readonly TeacherAssignmentService $assignments,
        private readonly GroupMembershipService $memberships,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function overview(User $teacher, int $days): array
    {
        TeacherFeatures::abortUnlessEnabled();

        $days = in_array($days, [7, 30, 90], true) ? $days : 30;
        $ids = $this->access->authorizedStudentIds($teacher)->all();
        $this->assignments->refreshStatuses($teacher, $ids);
        $metrics = $this->metricsFor($teacher, $ids);
        $start = now()->subDays($days - 1)->startOfDay();

        $chart = $this->activityChart($ids, $start, $days);
        $rates = collect($metrics)->pluck('ai_success_rate')->filter(fn ($rate) => $rate !== null);
        $attention = collect($metrics)->filter(fn (array $row) => $row['needs_attention'])->count();
        $active7 = collect($metrics)->filter(fn (array $row) => $row['active_7'])->count();
        $active30 = collect($metrics)->filter(fn (array $row) => $row['active_30'])->count();

        $recent = $this->activityLists($metrics);
        $assignments = $this->assignmentCounts($teacher, $ids);

        return [
            'teacher' => $this->teacherProfile($teacher),
            'days' => $days,
            'kpis' => [
                'authorised_students' => count($ids),
                'active_7_days' => $active7,
                'active_30_days' => $active30,
                'ai_success_rate' => $rates->isEmpty() ? null : round((float) $rates->avg(), 1),
                'ai_success_students' => $rates->count(),
                'needs_attention' => $attention,
                'overdue_revisions' => collect($metrics)->sum('revision_overdue'),
                'outstanding_assignments' => $assignments['outstanding'],
                'overdue_assignments' => $assignments['overdue'],
            ],
            'chart' => $chart,
            'recently_active' => $recent['active'],
            'inactive' => $recent['inactive'],
            'recent_ai' => $this->recentAi($ids),
            'assignments' => $assignments,
            'surahs' => $this->surahCatalog(),
            'roster' => $this->organisationRoster($teacher, $ids),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function students(User $teacher, array $filters): array
    {
        TeacherFeatures::abortUnlessEnabled();

        $ids = $this->access->authorizedStudentIds($teacher)->all();
        $this->assignments->refreshStatuses($teacher, $ids);
        $metrics = $this->metricsFor($teacher, $ids);
        $users = User::query()->whereIn('id', $ids)->orderBy('name')->get()->keyBy('id');
        $groups = $this->sharedGroups($teacher, $ids);

        $rows = collect($ids)->map(function (int $id) use ($users, $metrics, $groups) {
            $user = $users->get($id);
            if ($user === null) {
                return null;
            }
            $metric = $metrics[$id];

            return [
                'id' => $id,
                'name' => $user->name,
                'groups' => $groups->get($id, collect())->map(fn (LearningGroup $group) => [
                    'id' => (int) $group->id,
                    'name' => $group->name,
                ])->values()->all(),
                'sessions' => $metric['sessions'],
                'active_days' => $metric['active_days'],
                'ayahs_practised' => $metric['ayahs_practised'],
                'last_activity_at' => $metric['last_activity_at'],
                'ai_success_rate' => $metric['ai_success_rate'],
                'weak_count' => $metric['weak_count'],
                'weak_example' => $metric['weak_example'],
                'revision_overdue' => $metric['revision_overdue'],
                'revision_upcoming' => $metric['revision_upcoming'],
                'assignments' => $metric['assignments'],
                'needs_attention' => $metric['needs_attention'],
            ];
        })->filter()->values();

        $query = trim((string) ($filters['q'] ?? ''));
        if ($query !== '') {
            $needle = mb_strtolower($query);
            $rows = $rows->filter(fn (array $row) => str_contains(mb_strtolower($row['name']), $needle))->values();
        }

        $groupId = (int) ($filters['group_id'] ?? 0);
        if ($groupId > 0) {
            $rows = $rows->filter(function (array $row) use ($groupId) {
                return collect($row['groups'])->contains(fn (array $group) => (int) $group['id'] === $groupId);
            })->values();
        }

        $activity = (string) ($filters['activity'] ?? '');
        if ($activity === 'active_7') {
            $rows = $rows->filter(fn (array $row) => ($metrics[$row['id']]['active_7'] ?? false))->values();
        } elseif ($activity === 'active_30') {
            $rows = $rows->filter(fn (array $row) => ($metrics[$row['id']]['active_30'] ?? false))->values();
        } elseif ($activity === 'inactive_7') {
            $rows = $rows->filter(fn (array $row) => ! ($metrics[$row['id']]['active_7'] ?? false))->values();
        }

        $performance = (string) ($filters['performance'] ?? '');
        if ($performance === 'strong') {
            $rows = $rows->filter(fn (array $row) => $row['ai_success_rate'] !== null && $row['ai_success_rate'] >= RecitationScoringThresholds::STRONG_ACCURACY_MIN)->values();
        } elseif ($performance === 'developing') {
            $rows = $rows->filter(fn (array $row) => $row['ai_success_rate'] !== null && $row['ai_success_rate'] < RecitationScoringThresholds::STRONG_ACCURACY_MIN)->values();
        } elseif ($performance === 'none') {
            $rows = $rows->filter(fn (array $row) => $row['ai_success_rate'] === null)->values();
        }

        if ((string) ($filters['attention'] ?? '') === '1') {
            $rows = $rows->filter(fn (array $row) => $row['needs_attention'])->values();
        }

        $perPage = min(50, max(1, (int) ($filters['per_page'] ?? 20)));
        $page = max(1, (int) ($filters['page'] ?? 1));
        $total = $rows->count();

        return [
            'data' => $rows->slice(($page - 1) * $perPage, $perPage)->values()->all(),
            'meta' => [
                'current_page' => $page,
                'last_page' => max(1, (int) ceil($total / $perPage)),
                'per_page' => $perPage,
                'total' => $total,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function profile(User $teacher, User $student, string $section): array
    {
        TeacherFeatures::abortUnlessEnabled();

        $this->assertAuthorised($teacher, $student);
        $this->assignments->refreshStatuses($teacher, [(int) $student->id]);
        $section = in_array($section, ['overview', 'practice', 'weak', 'ai', 'revision'], true) ? $section : 'overview';
        $metrics = $this->metricsFor($teacher, [(int) $student->id])[(int) $student->id];
        $groups = $this->sharedGroups($teacher, [(int) $student->id])->get($student->id, collect());

        $base = [
            'student' => [
                'id' => (int) $student->id,
                'name' => $student->name,
                'email' => $student->email,
                'organisation' => $student->organisation?->name,
                'groups' => $groups->map(fn (LearningGroup $group) => [
                    'id' => (int) $group->id,
                    'name' => $group->name,
                ])->values()->all(),
            ],
            'section' => $section,
        ];

        $base['payload'] = match ($section) {
            'practice' => $this->practiceSection($student),
            'weak' => $this->weakSection($student),
            'ai' => $this->aiSection($student),
            'revision' => $this->revisionSection($teacher, $student),
            default => $this->overviewSection($teacher, $student, $metrics),
        };

        return $base;
    }

    public function createGroup(User $teacher, string $name): LearningGroup
    {
        TeacherFeatures::abortUnlessEnabled();

        $organisation = $teacher->organisation;
        if ($organisation === null) {
            throw ValidationException::withMessages([
                'name' => 'Join an organisation before creating a group.',
            ]);
        }

        if (! $teacher->can('createGroup', $organisation)) {
            abort(403);
        }

        $display = OrganisationName::display($name);
        $canonical = OrganisationName::canonical($name);
        if (mb_strlen($canonical) < 2) {
            throw ValidationException::withMessages([
                'name' => 'Enter a group name.',
            ]);
        }

        return DB::transaction(function () use ($teacher, $organisation, $display, $canonical) {
            $existing = LearningGroup::query()
                ->where('organisation_id', $organisation->id)
                ->where('name_canonical', $canonical)
                ->lockForUpdate()
                ->first();

            if ($existing) {
                throw ValidationException::withMessages([
                    'name' => 'A group with this name already exists.',
                ]);
            }

            $group = new LearningGroup;
            $group->forceFill([
                'organisation_id' => $organisation->id,
                'name' => $display,
                'name_canonical' => $canonical,
            ])->save();

            $this->memberships->joinAsTeacher($teacher, $group);

            return $group->refresh();
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function groups(User $teacher): array
    {
        TeacherFeatures::abortUnlessEnabled();

        if ($teacher->organisation_id === null) {
            return ['data' => []];
        }

        $groups = LearningGroup::query()
            ->where('organisation_id', $teacher->organisation_id)
            ->orderBy('name')
            ->get();

        $teacherGroups = $this->access->teacherGroupIds($teacher);
        $authorized = $this->access->authorizedStudentIds($teacher);

        return [
            'data' => $groups->map(function (LearningGroup $group) use ($teacher, $teacherGroups, $authorized) {
                return $this->presentGroup($teacher, $group, $teacherGroups->contains((int) $group->id), $authorized);
            })->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function group(User $teacher, LearningGroup $group): array
    {
        TeacherFeatures::abortUnlessEnabled();

        if ((int) $group->organisation_id !== (int) $teacher->organisation_id || ! $teacher->isTeacher()) {
            abort(404);
        }

        $teaches = $this->access->teacherGroupIds($teacher)->contains((int) $group->id);

        return $this->presentGroup($teacher, $group, $teaches, $this->access->authorizedStudentIds($teacher), true);
    }

    public function addNote(User $teacher, User $student, string $kind, string $body): TeacherNote
    {
        TeacherFeatures::abortUnlessEnabled();

        $this->assertAuthorised($teacher, $student);
        $noteKind = TeacherNoteKind::tryFrom($kind);
        $body = trim($body);
        if ($noteKind === null || $body === '' || mb_strlen($body) > 2000) {
            throw ValidationException::withMessages([
                'body' => 'Enter a note of up to 2000 characters.',
            ]);
        }

        $note = new TeacherNote;
        $note->forceFill([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'organisation_id' => $teacher->organisation_id,
            'kind' => $noteKind->value,
            'body' => $body,
        ])->save();

        return $note;
    }

    /**
     * @return array<string, mixed>
     */
    public function learnerSupport(User $user): array
    {
        TeacherFeatures::abortUnlessEnabled();

        $assignments = TeacherAssignmentRecipient::query()
            ->where('student_id', $user->id)
            ->with(['assignment.teacher:id,name'])
            ->latest('id')
            ->limit(30)
            ->get();

        if ($assignments->isNotEmpty()) {
            $teacherIds = $assignments->map(fn (TeacherAssignmentRecipient $recipient) => $recipient->assignment?->teacher_id)->filter()->unique();
            foreach ($teacherIds as $teacherId) {
                $teacher = User::query()->find($teacherId);
                if ($teacher) {
                    $this->assignments->refreshStatuses($teacher, [(int) $user->id]);
                }
            }
            $assignments = TeacherAssignmentRecipient::query()
                ->where('student_id', $user->id)
                ->with(['assignment.teacher:id,name'])
                ->latest('id')
                ->limit(30)
                ->get();
        }

        $feedback = TeacherNote::query()
            ->where('student_id', $user->id)
            ->where('kind', TeacherNoteKind::Feedback->value)
            ->with('teacher:id,name')
            ->latest('id')
            ->limit(20)
            ->get()
            ->map(fn (TeacherNote $note) => [
                'id' => (int) $note->id,
                'body' => $note->body,
                'teacher_name' => $note->teacher?->name,
                'created_at' => $note->created_at?->toIso8601String(),
            ])->all();

        return [
            'account_role' => $user->account_role?->value,
            'teacher_dashboard_url' => $user->isTeacher() ? route('teacher.dashboard') : null,
            'assignments' => $assignments->map(function (TeacherAssignmentRecipient $recipient) {
                $payload = $this->assignments->presentRecipient($recipient);
                $payload['teacher_name'] = $recipient->assignment?->teacher?->name;

                return $payload;
            })->all(),
            'feedback' => $feedback,
            'groups' => $user->isStudent() ? $this->studentGroups($user) : [],
        ];
    }

    /**
     * @param  list<int>  $ids
     * @return array<int, array<string, mixed>>
     */
    private function metricsFor(User $teacher, array $ids): array
    {
        $metrics = [];
        foreach ($ids as $id) {
            $metrics[$id] = [
                'sessions' => 0,
                'practice_seconds' => null,
                'active_days' => 0,
                'ayahs_practised' => 0,
                'memorised_ayahs' => 0,
                'learning_ayahs' => 0,
                'last_activity_at' => null,
                'ai_success_rate' => null,
                'ai_attempts' => 0,
                'weak_count' => 0,
                'recurring_weak' => 0,
                'weak_example' => null,
                'revision_overdue' => 0,
                'revision_upcoming' => 0,
                'assignments' => ['pending' => 0, 'in_progress' => 0, 'completed' => 0, 'overdue' => 0],
                'active_7' => false,
                'active_30' => false,
                'needs_attention' => false,
            ];
        }

        if ($ids === []) {
            return $metrics;
        }

        $sessions = UserSession::query()
            ->whereIn('user_id', $ids)
            ->where('is_onboarding_example', false)
            ->selectRaw('user_id, COUNT(*) as sessions, SUM(session_duration_seconds) as seconds, MAX(last_activity_at) as last_activity_at')
            ->groupBy('user_id')
            ->get();

        foreach ($sessions as $row) {
            $id = (int) $row->user_id;
            $metrics[$id]['sessions'] = (int) $row->sessions;
            $metrics[$id]['practice_seconds'] = (int) $row->sessions > 0 ? (int) $row->seconds : null;
            if ($row->last_activity_at) {
                $metrics[$id]['last_activity_at'] = Carbon::parse($row->last_activity_at)->toIso8601String();
            }
        }

        $dayRows = UserSession::query()
            ->whereIn('user_id', $ids)
            ->where('is_onboarding_example', false)
            ->whereNotNull('last_activity_at')
            ->get(['user_id', 'last_activity_at']);
        $aiDays = AiReciteAttempt::query()->whereIn('user_id', $ids)->get(['user_id', 'created_at']);
        $days = [];
        foreach ($dayRows as $row) {
            $days[(int) $row->user_id][$row->last_activity_at->toDateString()] = true;
        }
        foreach ($aiDays as $row) {
            if ($row->created_at) {
                $days[(int) $row->user_id][$row->created_at->toDateString()] = true;
            }
        }
        foreach ($days as $id => $set) {
            if (isset($metrics[$id])) {
                $metrics[$id]['active_days'] = count($set);
            }
        }

        $progress = MemorisationProgress::query()
            ->whereIn('user_id', $ids)
            ->get(['user_id', 'status']);
        foreach ($progress as $row) {
            $id = (int) $row->user_id;
            if (! isset($metrics[$id])) {
                continue;
            }
            $metrics[$id]['ayahs_practised']++;
            if (in_array($row->status, ['memorised', 'mastered'], true)) {
                $metrics[$id]['memorised_ayahs']++;
            } else {
                $metrics[$id]['learning_ayahs']++;
            }
        }

        $ai = AiReciteAttempt::query()->validScored()->whereIn('user_id', $ids)->get(['user_id', 'accuracy_percent', 'created_at']);
        $aiBuckets = [];
        foreach ($ai as $attempt) {
            $id = (int) $attempt->user_id;
            $aiBuckets[$id][] = (int) $attempt->accuracy_percent;
            if ($attempt->created_at) {
                $current = $metrics[$id]['last_activity_at'] ?? null;
                $at = $attempt->created_at->toIso8601String();
                if ($current === null || $at > $current) {
                    $metrics[$id]['last_activity_at'] = $at;
                }
            }
        }
        foreach ($aiBuckets as $id => $scores) {
            $metrics[$id]['ai_attempts'] = count($scores);
            $metrics[$id]['ai_success_rate'] = round(array_sum($scores) / count($scores), 1);
        }

        $spots = MemorisationWeakSpot::query()
            ->whereIn('user_id', $ids)
            ->where('status', MemorisationWeakSpot::STATUS_ACTIVE)
            ->orderByDesc('affected_attempt_count')
            ->get(['user_id', 'surah_number', 'ayah_number', 'spot_type', 'affected_attempt_count', 'word_index']);
        foreach ($spots as $spot) {
            $id = (int) $spot->user_id;
            if (! isset($metrics[$id])) {
                continue;
            }
            $metrics[$id]['weak_count']++;
            if ((int) $spot->affected_attempt_count >= 2) {
                $metrics[$id]['recurring_weak']++;
            }
            if ($metrics[$id]['weak_example'] === null) {
                $metrics[$id]['weak_example'] = [
                    'surah_name' => QuranMetadata::name((int) $spot->surah_number),
                    'surah_number' => (int) $spot->surah_number,
                    'ayah_number' => (int) $spot->ayah_number,
                    'spot_type' => $spot->spot_type,
                    'word_index' => $spot->word_index,
                ];
            }
        }

        $plans = MemorisationPracticePlan::query()
            ->whereIn('user_id', $ids)
            ->where('status', MemorisationPracticePlan::STATUS_ACTIVE)
            ->whereNotNull('recommended_review_at')
            ->get(['user_id', 'recommended_review_at']);
        foreach ($plans as $plan) {
            $id = (int) $plan->user_id;
            if (! isset($metrics[$id]) || $plan->recommended_review_at === null) {
                continue;
            }
            if ($plan->recommended_review_at->isPast()) {
                $metrics[$id]['revision_overdue']++;
            } else {
                $metrics[$id]['revision_upcoming']++;
            }
        }

        $recipients = TeacherAssignmentRecipient::query()
            ->whereIn('student_id', $ids)
            ->whereHas('assignment', fn ($query) => $query->where('teacher_id', $teacher->id))
            ->with('assignment:id,due_at')
            ->get();
        foreach ($recipients as $recipient) {
            $id = (int) $recipient->student_id;
            $status = $recipient->status instanceof AssignmentStatus ? $recipient->status->value : (string) $recipient->status;
            $overdue = $status !== AssignmentStatus::Completed->value
                && $recipient->assignment?->due_at !== null
                && $recipient->assignment->due_at->isPast();
            if ($overdue) {
                $metrics[$id]['assignments']['overdue']++;
            } elseif (isset($metrics[$id]['assignments'][$status])) {
                $metrics[$id]['assignments'][$status]++;
            }
        }

        $cutoff7 = now()->subDays(7);
        $cutoff30 = now()->subDays(30);
        foreach ($metrics as $id => $row) {
            $last = $row['last_activity_at'] ? Carbon::parse($row['last_activity_at']) : null;
            $metrics[$id]['active_7'] = $last !== null && $last->gte($cutoff7);
            $metrics[$id]['active_30'] = $last !== null && $last->gte($cutoff30);
            $metrics[$id]['needs_attention'] = ! $metrics[$id]['active_7']
                || $row['revision_overdue'] > 0
                || $row['assignments']['overdue'] > 0
                || $row['recurring_weak'] > 0;
        }

        return $metrics;
    }

    /**
     * @param  list<int>  $ids
     * @return array<string, mixed>
     */
    private function activityChart(array $ids, Carbon $start, int $days): array
    {
        $counts = [];
        if ($ids !== []) {
            $sessions = UserSession::query()
                ->whereIn('user_id', $ids)
                ->where('is_onboarding_example', false)
                ->where('last_activity_at', '>=', $start)
                ->get(['last_activity_at']);
            foreach ($sessions as $session) {
                if ($session->last_activity_at === null) {
                    continue;
                }
                $key = $session->last_activity_at->toDateString();
                $counts[$key] = ($counts[$key] ?? 0) + 1;
            }
        }

        $points = [];
        $total = 0;
        for ($offset = 0; $offset < $days; $offset++) {
            $date = $start->copy()->addDays($offset)->toDateString();
            $value = (int) ($counts[$date] ?? 0);
            $total += $value;
            $points[] = ['date' => $date, 'sessions' => $value];
        }

        return [
            'days' => $days,
            'metric' => 'practice_sessions',
            'points' => $points,
            'total' => $total,
            'is_empty' => $total === 0,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $metrics
     * @return array{active: list<array<string, mixed>>, inactive: list<array<string, mixed>>}
     */
    private function activityLists(array $metrics): array
    {
        $users = User::query()->whereIn('id', array_keys($metrics))->get()->keyBy('id');
        $rows = collect($metrics)->map(function (array $metric, int $id) use ($users) {
            return [
                'id' => $id,
                'name' => $users->get($id)?->name,
                'last_activity_at' => $metric['last_activity_at'],
                'active_7' => $metric['active_7'],
            ];
        })->filter(fn (array $row) => $row['name']);

        return [
            'active' => $rows->filter(fn (array $row) => $row['active_7'])
                ->sortByDesc('last_activity_at')->take(6)->values()->all(),
            'inactive' => $rows->filter(fn (array $row) => ! $row['active_7'])
                ->sortBy('last_activity_at')->take(6)->values()->all(),
        ];
    }

    /**
     * @param  list<int>  $ids
     * @return list<array<string, mixed>>
     */
    private function recentAi(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        return AiReciteAttempt::query()
            ->validScored()
            ->whereIn('user_id', $ids)
            ->with('user:id,name')
            ->latest('created_at')
            ->limit(8)
            ->get()
            ->map(function (AiReciteAttempt $attempt) {
                $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];

                return [
                    'id' => (int) $attempt->id,
                    'student_id' => (int) $attempt->user_id,
                    'student_name' => $attempt->user?->name,
                    'accuracy_percent' => (int) $attempt->accuracy_percent,
                    'band' => $attempt->band,
                    'surah_number' => (int) ($range['surah'] ?? $range['surah_number'] ?? 0) ?: null,
                    'surah_name' => $range['surah_name'] ?? QuranMetadata::name((int) ($range['surah'] ?? 0)),
                    'ayah_start' => isset($range['from']) ? (int) $range['from'] : null,
                    'ayah_end' => isset($range['to']) ? (int) $range['to'] : null,
                    'created_at' => $attempt->created_at?->toIso8601String(),
                ];
            })->all();
    }

    /**
     * @param  list<int>  $ids
     * @return array<string, int>
     */
    private function assignmentCounts(User $teacher, array $ids): array
    {
        $counts = ['pending' => 0, 'in_progress' => 0, 'completed' => 0, 'overdue' => 0, 'outstanding' => 0];
        if ($ids === []) {
            return $counts;
        }

        $recipients = TeacherAssignmentRecipient::query()
            ->whereIn('student_id', $ids)
            ->whereHas('assignment', fn ($query) => $query->where('teacher_id', $teacher->id))
            ->with('assignment:id,due_at')
            ->get();

        foreach ($recipients as $recipient) {
            $status = $recipient->status instanceof AssignmentStatus ? $recipient->status->value : (string) $recipient->status;
            $overdue = $status !== AssignmentStatus::Completed->value
                && $recipient->assignment?->due_at !== null
                && $recipient->assignment->due_at->isPast();
            if ($overdue) {
                $counts['overdue']++;
                $counts['outstanding']++;
            } elseif (isset($counts[$status])) {
                $counts[$status]++;
                if ($status !== AssignmentStatus::Completed->value) {
                    $counts['outstanding']++;
                }
            }
        }

        return $counts;
    }

    /**
     * @param  list<int>  $ids
     * @return Collection<int, Collection<int, LearningGroup>>
     */
    private function sharedGroups(User $teacher, array $ids): Collection
    {
        $groupIds = $this->access->teacherGroupIds($teacher);
        if ($ids === [] || $groupIds->isEmpty()) {
            return collect();
        }

        return GroupMembership::query()
            ->whereIn('user_id', $ids)
            ->whereIn('learning_group_id', $groupIds)
            ->where('membership_role', MembershipRole::Student->value)
            ->where('status', MembershipStatus::Approved->value)
            ->where('analytics_consent_status', AnalyticsConsentStatus::Granted->value)
            ->where('analytics_consent_version', GroupMembership::ANALYTICS_CONSENT_VERSION)
            ->whereColumn('analytics_consent_user_id', 'user_id')
            ->with('learningGroup:id,name')
            ->get()
            ->groupBy('user_id')
            ->map(fn (Collection $rows) => $rows->map(fn (GroupMembership $membership) => $membership->learningGroup)->filter()->unique('id')->values());
    }

    /**
     * @param  array<string, mixed>  $metrics
     * @return array<string, mixed>
     */
    private function overviewSection(User $teacher, User $student, array $metrics): array
    {
        $notes = TeacherNote::query()
            ->where('teacher_id', $teacher->id)
            ->where('student_id', $student->id)
            ->latest('id')
            ->limit(20)
            ->get()
            ->map(fn (TeacherNote $note) => [
                'id' => (int) $note->id,
                'kind' => $note->kind instanceof TeacherNoteKind ? $note->kind->value : (string) $note->kind,
                'body' => $note->body,
                'created_at' => $note->created_at?->toIso8601String(),
            ])->all();

        return [
            'metrics' => [
                'sessions' => $metrics['sessions'],
                'practice_seconds' => $metrics['practice_seconds'],
                'active_days' => $metrics['active_days'],
                'memorised_ayahs' => $metrics['memorised_ayahs'],
                'learning_ayahs' => $metrics['learning_ayahs'],
                'ayahs_practised' => $metrics['ayahs_practised'],
                'last_activity_at' => $metrics['last_activity_at'],
            ],
            'calendar' => $this->calendar((int) $student->id),
            'notes' => $notes,
        ];
    }

    /**
     * @return list<array{date: string, active: bool}>
     */
    private function calendar(int $studentId): array
    {
        $start = now()->subDays(34)->startOfDay();
        $active = [];
        UserSession::query()
            ->where('user_id', $studentId)
            ->where('is_onboarding_example', false)
            ->where('last_activity_at', '>=', $start)
            ->get(['last_activity_at'])
            ->each(function (UserSession $session) use (&$active) {
                if ($session->last_activity_at) {
                    $active[$session->last_activity_at->toDateString()] = true;
                }
            });
        AiReciteAttempt::query()
            ->where('user_id', $studentId)
            ->where('created_at', '>=', $start)
            ->get(['created_at'])
            ->each(function (AiReciteAttempt $attempt) use (&$active) {
                if ($attempt->created_at) {
                    $active[$attempt->created_at->toDateString()] = true;
                }
            });

        $days = [];
        for ($i = 0; $i < 35; $i++) {
            $date = $start->copy()->addDays($i)->toDateString();
            $days[] = ['date' => $date, 'active' => isset($active[$date])];
        }

        return $days;
    }

    /**
     * @return array<string, mixed>
     */
    private function practiceSection(User $student): array
    {
        $sessions = UserSession::query()
            ->where('user_id', $student->id)
            ->where('is_onboarding_example', false)
            ->latest('last_activity_at')
            ->limit(30)
            ->get()
            ->map(fn (UserSession $session) => $this->presentSession($session))
            ->all();

        $saved = UserSession::query()
            ->where('user_id', $student->id)
            ->where('is_onboarding_example', false)
            ->whereIn('status', UserSessionStatus::unfinishedDatabaseValues())
            ->latest('last_activity_at')
            ->first();

        return [
            'sessions' => $sessions,
            'latest_saved' => $saved ? $this->presentSession($saved) : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function presentSession(UserSession $session): array
    {
        $meta = is_array($session->metadata) ? $session->metadata : [];
        $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
        $status = $session->status instanceof UserSessionStatus ? $session->status->value : (string) $session->status;

        return [
            'id' => (int) $session->id,
            'status' => $status,
            'surah_number' => $session->surah_number ? (int) $session->surah_number : null,
            'surah_name' => $session->surah_number ? QuranMetadata::name((int) $session->surah_number) : null,
            'ayah_number' => $session->ayah_number ? (int) $session->ayah_number : null,
            'ayah_start' => isset($config['rangeStart']) ? (int) $config['rangeStart'] : (isset($meta['range_start']) ? (int) $meta['range_start'] : null),
            'ayah_end' => isset($config['rangeEnd']) ? (int) $config['rangeEnd'] : (isset($meta['range_end']) ? (int) $meta['range_end'] : null),
            'duration_seconds' => (int) $session->session_duration_seconds,
            'started_at' => $session->started_at?->toIso8601String(),
            'ended_at' => $session->ended_at?->toIso8601String(),
            'last_activity_at' => $session->last_activity_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function weakSection(User $student): array
    {
        $items = MemorisationWeakSpot::query()
            ->where('user_id', $student->id)
            ->orderByDesc('affected_attempt_count')
            ->limit(40)
            ->get()
            ->map(fn (MemorisationWeakSpot $spot) => [
                'id' => (int) $spot->id,
                'spot_type' => $spot->spot_type,
                'surah_number' => (int) $spot->surah_number,
                'surah_name' => QuranMetadata::name((int) $spot->surah_number),
                'ayah_number' => (int) $spot->ayah_number,
                'word_index' => $spot->word_index,
                'severity' => $spot->severity,
                'status' => $spot->status,
                'trend' => $spot->trend,
                'affected_attempt_count' => (int) $spot->affected_attempt_count,
                'first_identified_at' => $spot->first_identified_at?->toIso8601String(),
                'last_identified_at' => $spot->last_identified_at?->toIso8601String(),
            ])->all();

        return ['items' => $items];
    }

    /**
     * @return array<string, mixed>
     */
    private function aiSection(User $student): array
    {
        $attempts = AiReciteAttempt::query()
            ->where('user_id', $student->id)
            ->with('assessment:id,status')
            ->latest('created_at')
            ->limit(30)
            ->get();

        $scored = $attempts->filter(fn (AiReciteAttempt $attempt) => $attempt->accuracy_percent !== null && in_array($attempt->band, ['strong', 'mixed', 'weak'], true));
        $rate = $scored->isEmpty() ? null : round((float) $scored->avg('accuracy_percent'), 1);

        return [
            'success_rate' => $rate,
            'attempts' => $attempts->map(fn (AiReciteAttempt $attempt) => [
                'id' => (int) $attempt->id,
                'accuracy_percent' => $attempt->accuracy_percent === null ? null : (int) $attempt->accuracy_percent,
                'band' => $attempt->band,
                'created_at' => $attempt->created_at?->toIso8601String(),
                'range' => is_array($attempt->ayah_range) ? [
                    'surah_number' => (int) ($attempt->ayah_range['surah'] ?? $attempt->ayah_range['surah_number'] ?? 0) ?: null,
                    'surah_name' => $attempt->ayah_range['surah_name'] ?? QuranMetadata::name((int) ($attempt->ayah_range['surah'] ?? 0)),
                    'from' => isset($attempt->ayah_range['from']) ? (int) $attempt->ayah_range['from'] : null,
                    'to' => isset($attempt->ayah_range['to']) ? (int) $attempt->ayah_range['to'] : null,
                ] : null,
                'issues' => $this->wordIssues($attempt),
                'assessment_status' => $attempt->assessment?->status,
            ])->all(),
            'trend' => $scored->sortBy('created_at')->map(fn (AiReciteAttempt $attempt) => [
                'at' => $attempt->created_at?->toIso8601String(),
                'accuracy_percent' => (int) $attempt->accuracy_percent,
                'band' => $attempt->band,
            ])->values()->all(),
        ];
    }

    /**
     * @return array<string, int|null>
     */
    private function wordIssues(AiReciteAttempt $attempt): array
    {
        $statuses = is_array($attempt->word_statuses) ? $attempt->word_statuses : null;
        $counts = is_array($attempt->color_counts) ? $attempt->color_counts : null;
        if ($statuses === null && $counts === null) {
            return ['wrong' => null, 'skipped' => null, 'extra' => null, 'repeated' => null];
        }

        $wrong = 0;
        $skipped = 0;
        $extra = 0;
        $repeated = 0;
        foreach ($statuses ?? [] as $status) {
            if (! is_array($status)) {
                continue;
            }
            $tone = strtolower((string) ($status['status'] ?? $status['result'] ?? $status['tone'] ?? ''));
            if (in_array($tone, ['wrong', 'error', 'incorrect', 'red'], true)) {
                $wrong++;
            } elseif (in_array($tone, ['missed', 'missing', 'omitted', 'skipped', 'black'], true)) {
                $skipped++;
            } elseif (in_array($tone, ['extra', 'grey', 'gray'], true)) {
                $extra++;
            } elseif (in_array($tone, ['repeated', 'repeat', 'duplicate'], true)) {
                $repeated++;
            }
        }

        if ($statuses === null || ($wrong === 0 && $skipped === 0 && $extra === 0 && $repeated === 0)) {
            $wrong = (int) ($counts['red'] ?? 0);
            $skipped = (int) ($counts['black'] ?? 0);
            $extra = (int) ($counts['gray'] ?? $counts['grey'] ?? 0);
        }

        return compact('wrong', 'skipped', 'extra', 'repeated');
    }

    /**
     * @return array<string, mixed>
     */
    private function revisionSection(User $teacher, User $student): array
    {
        $plans = MemorisationPracticePlan::query()
            ->where('user_id', $student->id)
            ->latest('id')
            ->limit(20)
            ->get()
            ->map(function (MemorisationPracticePlan $plan) {
                return [
                    'id' => (int) $plan->id,
                    'title' => $plan->title,
                    'status' => $plan->status,
                    'surah_number' => (int) $plan->surah_number,
                    'surah_name' => QuranMetadata::name((int) $plan->surah_number),
                    'ayah_start' => (int) $plan->start_ayah,
                    'ayah_end' => (int) $plan->end_ayah,
                    'recommended_review_at' => $plan->recommended_review_at?->toIso8601String(),
                    'overdue' => $plan->status === MemorisationPracticePlan::STATUS_ACTIVE
                        && $plan->recommended_review_at !== null
                        && $plan->recommended_review_at->isPast(),
                    'retest_metrics' => $plan->retest_metrics,
                ];
            })->all();

        $revisit = MemorisationWeakSpot::query()
            ->where('user_id', $student->id)
            ->where('status', MemorisationWeakSpot::STATUS_ACTIVE)
            ->orderByDesc('affected_attempt_count')
            ->limit(12)
            ->get()
            ->map(fn (MemorisationWeakSpot $spot) => [
                'surah_name' => QuranMetadata::name((int) $spot->surah_number),
                'surah_number' => (int) $spot->surah_number,
                'ayah_number' => (int) $spot->ayah_number,
                'spot_type' => $spot->spot_type,
                'affected_attempt_count' => (int) $spot->affected_attempt_count,
            ])->all();

        $assignments = TeacherAssignmentRecipient::query()
            ->where('student_id', $student->id)
            ->whereHas('assignment', fn ($query) => $query->where('teacher_id', $teacher->id))
            ->with('assignment')
            ->latest('id')
            ->limit(20)
            ->get()
            ->map(fn (TeacherAssignmentRecipient $recipient) => $this->assignments->presentRecipient($recipient, true))
            ->all();

        return [
            'plans' => $plans,
            'revisit' => $revisit,
            'assignments' => $assignments,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    /**
     * Organisation discovery for teachers plus learners this teacher may already access.
     *
     * @param  list<int>  $authorizedStudentIds
     * @return array<string, mixed>
     */
    private function organisationRoster(User $teacher, array $authorizedStudentIds): array
    {
        $teacher->loadMissing('organisation');
        $organisation = $teacher->organisation;

        if ($organisation === null) {
            return [
                'organisation' => null,
                'teachers' => [],
                'students' => [],
            ];
        }

        $teachers = User::query()
            ->where('organisation_id', $organisation->id)
            ->where('account_role', AccountRole::Teacher->value)
            ->orderBy('name')
            ->get(['id', 'name', 'email'])
            ->map(fn (User $user) => [
                'id' => (int) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_you' => (int) $user->id === (int) $teacher->id,
            ])
            ->values()
            ->all();

        $students = [];
        if ($authorizedStudentIds !== []) {
            $students = User::query()
                ->whereIn('id', $authorizedStudentIds)
                ->orderBy('name')
                ->get(['id', 'name', 'email'])
                ->map(fn (User $user) => [
                    'id' => (int) $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ])
                ->values()
                ->all();
        }

        return [
            'organisation' => [
                'id' => (int) $organisation->id,
                'name' => $organisation->name,
                'type' => $organisation->type instanceof OrganisationType
                    ? $organisation->type->value
                    : (string) $organisation->type,
            ],
            'teachers' => $teachers,
            'students' => $students,
        ];
    }

    private function teacherProfile(User $teacher): array
    {
        $teacher->loadMissing('organisation');

        return [
            'id' => (int) $teacher->id,
            'name' => $teacher->name,
            'email' => $teacher->email,
            'organisation' => $teacher->organisation ? [
                'id' => (int) $teacher->organisation->id,
                'name' => $teacher->organisation->name,
                'type' => $teacher->organisation->type instanceof OrganisationType
                    ? $teacher->organisation->type->value
                    : (string) $teacher->organisation->type,
            ] : null,
            'practice_url' => route('dashboard'),
            'profile_url' => route('profile.show'),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function surahCatalog(): array
    {
        $surahs = [];
        for ($number = 1; $number <= 114; $number++) {
            $surahs[] = [
                'number' => $number,
                'name' => QuranMetadata::name($number),
                'ayah_count' => QuranMetadata::ayahCount($number),
            ];
        }

        return $surahs;
    }

    /**
     * @return array<string, mixed>
     */
    private function presentGroup(User $teacher, LearningGroup $group, bool $teaches, Collection $authorized, bool $withPerformance = false): array
    {
        $memberships = $teaches
            ? GroupMembership::query()->where('learning_group_id', $group->id)->with('user:id,name,account_role')->get()
            : collect();

        $requests = $memberships
            ->filter(fn (GroupMembership $membership) => $membership->membership_role === MembershipRole::Student && $membership->status === MembershipStatus::Pending)
            ->map(fn (GroupMembership $membership) => $this->presentMembership($membership))
            ->values()
            ->all();

        $students = $memberships
            ->filter(fn (GroupMembership $membership) => $membership->membership_role === MembershipRole::Student && $membership->status === MembershipStatus::Approved)
            ->map(fn (GroupMembership $membership) => $this->presentMembership($membership))
            ->values()
            ->all();

        $visibleIds = collect($students)
            ->filter(fn (array $row) => $row['sharing'])
            ->pluck('user_id')
            ->map(fn ($id) => (int) $id)
            ->intersect($authorized)
            ->values()
            ->all();

        $payload = [
            'id' => (int) $group->id,
            'name' => $group->name,
            'teaches' => $teaches,
            'pending_requests' => $teaches ? count($requests) : GroupMembership::query()
                ->where('learning_group_id', $group->id)
                ->where('membership_role', MembershipRole::Student->value)
                ->where('status', MembershipStatus::Pending->value)
                ->count(),
            'authorised_students' => count($visibleIds),
            'requests' => $teaches ? $requests : [],
            'students' => $teaches ? $students : [],
        ];

        if ($withPerformance) {
            $this->assignments->refreshStatuses($teacher, $visibleIds);
            $metrics = $this->metricsFor($teacher, $visibleIds);
            $rates = collect($metrics)->pluck('ai_success_rate')->filter(fn ($rate) => $rate !== null);
            $payload['performance'] = [
                'students' => count($visibleIds),
                'ai_success_rate' => $rates->isEmpty() ? null : round((float) $rates->avg(), 1),
                'needs_attention' => collect($metrics)->filter(fn (array $row) => $row['needs_attention'])->count(),
                'sessions' => collect($metrics)->sum('sessions'),
                'overdue_revisions' => collect($metrics)->sum('revision_overdue'),
            ];
        }

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    private function presentMembership(GroupMembership $membership): array
    {
        $sharing = $membership->analytics_consent_status === AnalyticsConsentStatus::Granted
            && $membership->analytics_consent_version === GroupMembership::ANALYTICS_CONSENT_VERSION
            && (int) $membership->analytics_consent_user_id === (int) $membership->user_id;

        return [
            'id' => (int) $membership->id,
            'user_id' => (int) $membership->user_id,
            'name' => $membership->user?->name,
            'status' => $membership->status instanceof MembershipStatus ? $membership->status->value : (string) $membership->status,
            'sharing' => $sharing,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function studentGroups(User $student): array
    {
        if ($student->organisation_id === null) {
            return [];
        }

        $groups = LearningGroup::query()
            ->where('organisation_id', $student->organisation_id)
            ->orderBy('name')
            ->get();
        $memberships = GroupMembership::query()
            ->where('user_id', $student->id)
            ->whereIn('learning_group_id', $groups->pluck('id'))
            ->get()
            ->keyBy('learning_group_id');

        return $groups->map(function (LearningGroup $group) use ($memberships) {
            $membership = $memberships->get($group->id);
            $sharing = $membership
                && $membership->analytics_consent_status === AnalyticsConsentStatus::Granted
                && $membership->analytics_consent_version === GroupMembership::ANALYTICS_CONSENT_VERSION
                && (int) $membership->analytics_consent_user_id === (int) $membership->user_id;

            return [
                'id' => (int) $group->id,
                'name' => $group->name,
                'membership_id' => $membership ? (int) $membership->id : null,
                'status' => $membership ? ($membership->status instanceof MembershipStatus ? $membership->status->value : (string) $membership->status) : null,
                'sharing' => (bool) $sharing,
            ];
        })->all();
    }

    private function assertAuthorised(User $teacher, User $student): void
    {
        if (! $this->access->allows($teacher, $student)) {
            abort(404);
        }
    }
}

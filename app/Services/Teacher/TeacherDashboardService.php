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
use App\Models\TeacherAttendanceRecord;
use App\Models\TeacherRecitationAssessment;
use App\Models\TeacherNote;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Learning\AiReciteAttemptAudioService;
use App\Services\Memorisation\RecitationScoringThresholds;
use App\Services\Organisations\GroupMembershipService;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Support\QuranMetadata;
use App\Support\Registration\OrganisationName;
use App\Support\TeacherFeatures;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TeacherDashboardService
{
    public function __construct(
        private readonly StudentAccessAuthorizer $access,
        private readonly TeacherAssignmentService $assignments,
        private readonly GroupMembershipService $memberships,
        private readonly AiReciteAttemptAudioService $audio,
        private readonly TeacherAttendanceService $attendance,
        private readonly TeacherDirectMessageService $directMessages,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function overview(User $teacher, int $days): array
    {
        TeacherFeatures::abortUnlessEnabled();

        $days = in_array($days, [7, 30, 90], true) ? $days : 30;
        $cacheKey = sprintf('teacher.overview.%d.%d', (int) $teacher->id, $days);

        return Cache::remember($cacheKey, 60, function () use ($teacher, $days) {
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
            $completed = (int) ($assignments['completed'] ?? 0);
            $outstanding = (int) ($assignments['outstanding'] ?? 0);
            $totalTasks = $completed + $outstanding;
            $completionRate = $totalTasks > 0 ? round(($completed / $totalTasks) * 100, 1) : null;

            $strong = collect($metrics)->filter(fn (array $row) => $row['ai_success_rate'] !== null && $row['ai_success_rate'] >= RecitationScoringThresholds::STRONG_ACCURACY_MIN)->count();
            $developing = collect($metrics)->filter(fn (array $row) => $row['ai_success_rate'] !== null && $row['ai_success_rate'] < RecitationScoringThresholds::STRONG_ACCURACY_MIN)->count();

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
                    'outstanding_assignments' => $outstanding,
                    'overdue_assignments' => $assignments['overdue'],
                    'completion_rate' => $completionRate,
                ],
                'stage_distribution' => $this->stageDistribution($metrics),
                'filter_counts' => [
                    'attention' => $attention,
                    'active' => $active7,
                    'inactive' => max(0, count($ids) - $active7),
                    'strong' => $strong,
                    'developing' => $developing,
                ],
                'chart' => $chart,
                'recently_active' => $recent['active'],
                'inactive' => $recent['inactive'],
                'recent_ai' => $this->recentAi($ids),
                'assignments' => $assignments,
                'surahs' => $this->surahCatalog(),
                'roster' => $this->organisationRoster($teacher, $ids),
            ];
        });
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
                'ai_attempts' => $metric['ai_attempts'],
                'weak_count' => $metric['weak_count'],
                'recurring_weak' => $metric['recurring_weak'],
                'weak_example' => $metric['weak_example'],
                'revision_overdue' => $metric['revision_overdue'],
                'revision_upcoming' => $metric['revision_upcoming'],
                'assignments' => $metric['assignments'],
                'needs_attention' => $metric['needs_attention'],
                'repeated_absence' => $metric['repeated_absence'],
                'active_7' => (bool) ($metric['active_7'] ?? false),
                'recommendation' => $metric['recommendation'],
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

        $scoreMin = $filters['score_min'] ?? null;
        if ($scoreMin !== null && $scoreMin !== '') {
            $min = (float) $scoreMin;
            $rows = $rows->filter(fn (array $row) => $row['ai_success_rate'] !== null && $row['ai_success_rate'] >= $min)->values();
        }

        $scoreMax = $filters['score_max'] ?? null;
        if ($scoreMax !== null && $scoreMax !== '') {
            $max = (float) $scoreMax;
            $rows = $rows->filter(fn (array $row) => $row['ai_success_rate'] !== null && $row['ai_success_rate'] <= $max)->values();
        }

        $sort = (string) (($filters['sort'] ?? null)
            ?: ((string) ($filters['attention'] ?? '') === '1' ? 'attention' : 'name'));
        $rows = match ($sort) {
            'score' => $rows->sortByDesc(fn (array $row) => $row['ai_success_rate'] ?? -1)->values(),
            'last_seen' => $rows->sortByDesc(fn (array $row) => $row['last_activity_at'] ?? '')->values(),
            'attention' => $rows->sortBy(fn (array $row) => [
                -((int) ($row['assignments']['overdue'] ?? 0)),
                -((int) $row['revision_overdue']),
                $row['ai_success_rate'] === null ? 100 : $row['ai_success_rate'],
                -((int) $row['recurring_weak']),
                $row['last_activity_at'] ?? '',
            ])->values(),
            default => $rows->sortBy(fn (array $row) => mb_strtolower($row['name']))->values(),
        };

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
        $section = in_array($section, ['overview', 'analytics', 'practice', 'focus', 'weak', 'ai', 'revision', 'tasks', 'messages'], true) ? $section : 'overview';
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
            'focus' => $this->focusSection($teacher, $student),
            'weak' => $this->weakSection($student),
            'ai' => $this->aiSection($teacher, $student),
            'revision' => $this->revisionSection($teacher, $student),
            'tasks' => $this->tasksSection($teacher, $student),
            'messages' => ['messages' => $this->directMessages->thread($teacher, $student, $teacher)],
            'analytics' => $this->analyticsSection($teacher, $student, $metrics),
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
            ->whereHas('assignment')
            ->with(['assignment.teacher:id,name,organisation_id', 'assignment.organisation:id,name', 'assignment.notes.teacher:id,name'])
            ->latest('id')
            ->limit(50)
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
                ->whereHas('assignment')
                ->with(['assignment.teacher:id,name,organisation_id', 'assignment.organisation:id,name', 'assignment.notes.teacher:id,name'])
                ->latest('id')
                ->limit(50)
                ->get();
        }

        $completedSessions = UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->where('status', UserSessionStatus::Completed->value)
            ->get();
        $scoredAttempts = AiReciteAttempt::query()
            ->validScored()
            ->where('user_id', $user->id)
            ->get();
        $unfinishedSessions = UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->whereIn('status', UserSessionStatus::unfinishedDatabaseValues())
            ->orderByDesc('last_activity_at')
            ->orderByDesc('id')
            ->get();

        $feedback = TeacherNote::query()
            ->where('student_id', $user->id)
            ->where('kind', TeacherNoteKind::Feedback->value)
            ->whereNull('teacher_assignment_id')
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
            'assignments' => $assignments
                ->map(function (TeacherAssignmentRecipient $recipient) use ($completedSessions, $scoredAttempts, $unfinishedSessions, $user) {
                    $payload = $this->assignments->presentRecipient(
                        $recipient,
                        false,
                        $completedSessions,
                        $scoredAttempts,
                        $unfinishedSessions,
                        (int) $user->id,
                    );
                    $payload['teacher_name'] = $recipient->assignment?->teacher?->name;
                    $payload['organisation_name'] = $recipient->assignment?->organisation?->name;

                    return $payload;
                })
                ->sort(fn (array $a, array $b) => $this->sortLearnerAssignments($a, $b))
                ->values()
                ->all(),
            'feedback' => $feedback,
            'direct_threads' => $this->directMessages->threadsForStudent($user),
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
                'repeated_absence' => false,
                'absence_weeks' => 0,
                'recommendation' => [
                    'type' => 'insufficient_data',
                    'reason' => 'No authorised practice or recitation evidence is available yet.',
                    'advisory' => true,
                    'requires_teacher_approval' => true,
                ],
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
                $id = (int) $row->user_id;
                $days[$id][$row->created_at->toDateString()] = true;
                // A recorded check still counts as activity when scoring failed.
                // Keep Last seen and active-window filters on the same source.
                $at = $row->created_at->toIso8601String();
                if (isset($metrics[$id]) && ($metrics[$id]['last_activity_at'] === null || $at > $metrics[$id]['last_activity_at'])) {
                    $metrics[$id]['last_activity_at'] = $at;
                }
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

        $ai = AiReciteAttempt::query()->validScored()->whereIn('user_id', $ids)->get([
            'id', 'user_id', 'user_session_id', 'memorisation_assessment_id', 'teacher_assignment_recipient_id',
            'session_recommendation_id', 'attempt_number', 'ayah_range', 'accuracy_percent', 'band', 'created_at',
        ]);
        $ai = $this->dedupeScoredAttempts($ai);
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
        $seenSpots = [];
        $seenRecurringAyahs = [];
        foreach ($spots as $spot) {
            $id = (int) $spot->user_id;
            if (! isset($metrics[$id])) {
                continue;
            }
            // Retries can write an exact duplicate. Word-level findings for
            // different words remain separate, rather than disappearing into a
            // generic ayah issue.
            $spotKey = implode(':', [
                $id,
                (int) $spot->surah_number,
                (int) $spot->ayah_number,
                (string) ($spot->spot_type ?: 'unknown'),
                $spot->word_index === null ? 'ayah' : (string) $spot->word_index,
            ]);
            if (isset($seenSpots[$spotKey])) {
                continue;
            }
            $seenSpots[$spotKey] = true;
            $ayahKey = implode(':', [$id, (int) $spot->surah_number, (int) $spot->ayah_number]);
            if ((int) $spot->affected_attempt_count >= 2 && ! isset($seenRecurringAyahs[$ayahKey])) {
                $seenRecurringAyahs[$ayahKey] = true;
                $metrics[$id]['weak_count']++;
                $metrics[$id]['recurring_weak']++;
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
        }

        $plans = MemorisationPracticePlan::query()
            ->whereIn('user_id', $ids)
            ->where('status', MemorisationPracticePlan::STATUS_ACTIVE)
            ->whereNotNull('recommended_review_at')
            ->get(['id', 'user_id', 'surah_number', 'start_ayah', 'end_ayah', 'practice_scope', 'recommended_review_at'])
            ->unique(fn (MemorisationPracticePlan $plan) => implode('|', [
                (int) $plan->user_id,
                (int) $plan->surah_number,
                (int) $plan->start_ayah,
                (int) $plan->end_ayah,
                (string) ($plan->practice_scope ?: 'legacy'),
                $plan->recommended_review_at?->toIso8601String() ?: 'unscheduled',
            ]));
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
            ->with('assignment:id,teacher_id,learning_group_id,due_at')
            ->get();
        foreach ($recipients as $recipient) {
            $id = (int) $recipient->student_id;
            $status = $recipient->status instanceof AssignmentStatus ? $recipient->status->value : (string) $recipient->status;
            if ($status === AssignmentStatus::AwaitingConfirmation->value) {
                $status = AssignmentStatus::InProgress->value;
            }
            if (isset($metrics[$id]['assignments'][$status])) {
                $metrics[$id]['assignments'][$status]++;
            }
        }

        $absenceRows = TeacherAttendanceRecord::query()
            ->where('teacher_id', $teacher->id)
            ->whereIn('student_id', $ids)
            ->whereIn('learning_group_id', $this->access->teacherGroupIds($teacher))
            ->where('status', 'absent')
            ->whereDate('attendance_date', '>=', now()->subWeeks(2)->startOfWeek(Carbon::MONDAY)->toDateString())
            ->get(['student_id', 'attendance_date'])
            ->groupBy('student_id');
        foreach ($absenceRows as $studentId => $records) {
            $weeks = $records->map(fn (TeacherAttendanceRecord $record) => $record->attendance_date
                ->copy()->startOfWeek(Carbon::MONDAY)->toDateString())->unique()->sortDesc()->values();
            $consecutive = $weeks->sliding(2)->contains(function (Collection $pair): bool {
                if ($pair->count() !== 2) return false;

                return (int) Carbon::parse($pair[1])->diffInDays(Carbon::parse($pair[0])) === 7;
            });
            if (isset($metrics[(int) $studentId])) {
                $metrics[(int) $studentId]['absence_weeks'] = $weeks->count();
                $metrics[(int) $studentId]['repeated_absence'] = $consecutive;
            }
        }

        $humanAssessments = TeacherRecitationAssessment::query()
            ->where('teacher_id', $teacher->id)
            ->whereIn('student_id', $ids)
            ->latest('updated_at')
            ->latest('id')
            ->get(['id', 'student_id', 'tajweed_score', 'annotation', 'updated_at'])
            ->unique('student_id')
            ->keyBy('student_id');

        $cutoff7 = now()->subDays(7);
        $cutoff30 = now()->subDays(30);
        foreach ($metrics as $id => $row) {
            $last = $row['last_activity_at'] ? Carbon::parse($row['last_activity_at']) : null;
            $metrics[$id]['active_7'] = $last !== null && $last->gte($cutoff7);
            $metrics[$id]['active_30'] = $last !== null && $last->gte($cutoff30);
            $metrics[$id]['needs_attention'] = ! $metrics[$id]['active_7']
                || $row['repeated_absence']
                || $row['revision_overdue'] > 0
                || $row['assignments']['overdue'] > 0
                || $row['recurring_weak'] > 0
                || ($row['ai_attempts'] >= 2 && $row['ai_success_rate'] !== null && $row['ai_success_rate'] < 65);
            $metrics[$id]['recommendation'] = $this->recommendationFor(
                $metrics[$id],
                $humanAssessments->get($id),
            );
        }

        return $metrics;
    }

    /**
     * Recommendations are advisory summaries of evidence the teacher may inspect.
     * AI word matching can flag recall risk, but never establishes tajweed quality.
     *
     * @param  array<string, mixed>  $metric
     * @return array<string, mixed>
     */
    private function recommendationFor(array $metric, ?TeacherRecitationAssessment $humanAssessment): array
    {
        $base = [
            'advisory' => true,
            'requires_teacher_approval' => true,
            'ai_word_match_is_tajweed' => false,
        ];

        if ((int) $metric['recurring_weak'] > 0) {
            return $base + [
                'type' => 'focus',
                'reason' => sprintf(
                    '%d recurring ayah finding%s across scored recitation evidence.',
                    (int) $metric['recurring_weak'],
                    (int) $metric['recurring_weak'] === 1 ? '' : 's',
                ),
                'evidence' => ['recurring_findings' => (int) $metric['recurring_weak']],
            ];
        }

        if ((int) $metric['revision_overdue'] > 0) {
            return $base + [
                'type' => 'needs_help',
                'reason' => sprintf('%d scheduled review%s overdue.', (int) $metric['revision_overdue'], (int) $metric['revision_overdue'] === 1 ? ' is' : 's are'),
                'evidence' => ['overdue_reviews' => (int) $metric['revision_overdue']],
            ];
        }

        if ((int) ($metric['assignments']['overdue'] ?? 0) > 0) {
            return $base + [
                'type' => 'needs_help',
                'reason' => sprintf('%d teacher-assigned task%s overdue.', (int) $metric['assignments']['overdue'], (int) $metric['assignments']['overdue'] === 1 ? ' is' : 's are'),
                'evidence' => ['overdue_tasks' => (int) $metric['assignments']['overdue']],
            ];
        }

        if ($metric['repeated_absence']) {
            return $base + [
                'type' => 'needs_help',
                'reason' => 'Teacher-recorded absences occurred in consecutive weeks.',
                'evidence' => ['attendance_source' => 'teacher_recorded', 'absence_weeks' => (int) $metric['absence_weeks']],
            ];
        }

        if ((int) $metric['ai_attempts'] >= 2 && $metric['ai_success_rate'] !== null && (float) $metric['ai_success_rate'] < 65) {
            return $base + [
                'type' => 'needs_help',
                'reason' => sprintf(
                    'AI word match averages %s%% across %d checks; this indicates recall evidence, not a tajweed assessment.',
                    rtrim(rtrim(number_format((float) $metric['ai_success_rate'], 1), '0'), '.'),
                    (int) $metric['ai_attempts'],
                ),
                'evidence' => ['word_match_average' => (float) $metric['ai_success_rate'], 'scored_checks' => (int) $metric['ai_attempts']],
            ];
        }

        if ($humanAssessment !== null && (int) $humanAssessment->tajweed_score >= 4 && $metric['active_30']) {
            return $base + [
                'type' => 'ready_next',
                'reason' => sprintf(
                    'Recent teacher assessment: %d/5, with authorised practice activity in the last 30 days.',
                    (int) $humanAssessment->tajweed_score,
                ),
                'evidence' => [
                    'teacher_assessment_score' => (int) $humanAssessment->tajweed_score,
                    'teacher_assessed_at' => $humanAssessment->updated_at?->toIso8601String(),
                    'active_30_days' => true,
                ],
            ];
        }

        $reason = (int) $metric['ai_attempts'] > 0
            ? 'Recitation evidence is available, but a teacher assessment is still needed before advancing.'
            : 'No scored recitation evidence is available yet.';

        return $base + [
            'type' => 'insufficient_data',
            'reason' => $reason,
            'evidence' => ['scored_checks' => (int) $metric['ai_attempts']],
        ];
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
                'needs_attention' => $metric['needs_attention'],
                'repeated_absence' => $metric['repeated_absence'],
                'ai_success_rate' => $metric['ai_success_rate'],
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
    /**
     * @param  array<int, array<string, mixed>>  $metrics
     * @return array{learning: int, practising: int, revising: int, mastered: int}
     */
    private function stageDistribution(array $metrics): array
    {
        $dist = ['learning' => 0, 'practising' => 0, 'revising' => 0, 'mastered' => 0];
        foreach ($metrics as $row) {
            if (($row['memorised_ayahs'] ?? 0) > 0 && ($row['ai_success_rate'] ?? 0) >= RecitationScoringThresholds::STRONG_ACCURACY_MIN) {
                $dist['mastered']++;
            } elseif (($row['revision_overdue'] ?? 0) > 0 || ($row['revision_upcoming'] ?? 0) > 0) {
                $dist['revising']++;
            } elseif ($row['active_7'] ?? false) {
                $dist['practising']++;
            } else {
                $dist['learning']++;
            }
        }

        return $dist;
    }

    private function assignmentCounts(User $teacher, array $ids): array
    {
        $counts = ['pending' => 0, 'in_progress' => 0, 'completed' => 0, 'overdue' => 0, 'outstanding' => 0];
        if ($ids === []) {
            return $counts;
        }

        $recipients = TeacherAssignmentRecipient::query()
            ->whereIn('student_id', $ids)
            ->whereHas('assignment', fn ($query) => $query->where('teacher_id', $teacher->id))
            ->with('assignment:id,teacher_id,learning_group_id,due_at')
            ->get();

        foreach ($recipients as $recipient) {
            $status = $recipient->status instanceof AssignmentStatus ? $recipient->status->value : (string) $recipient->status;
            if ($status === AssignmentStatus::AwaitingConfirmation->value) {
                $status = AssignmentStatus::InProgress->value;
            }
            if (isset($counts[$status])) {
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
        $saved = UserSession::query()
            ->where('user_id', $student->id)
            ->where('is_onboarding_example', false)
            ->whereIn('status', UserSessionStatus::unfinishedDatabaseValues())
            ->latest('last_activity_at')
            ->first();

        return [
            'metrics' => [
                'sessions' => $metrics['sessions'],
                'practice_seconds' => $metrics['practice_seconds'],
                'active_days' => $metrics['active_days'],
                'memorised_ayahs' => $metrics['memorised_ayahs'],
                'learning_ayahs' => $metrics['learning_ayahs'],
                'ayahs_practised' => $metrics['ayahs_practised'],
                'last_activity_at' => $metrics['last_activity_at'],
                'needs_attention' => (bool) ($metrics['needs_attention'] ?? false),
                'ai_success_rate' => $metrics['ai_success_rate'] ?? null,
                'ai_attempts' => (int) ($metrics['ai_attempts'] ?? 0),
                'active_7' => (bool) ($metrics['active_7'] ?? false),
                'weak_count' => (int) ($metrics['weak_count'] ?? 0),
                'revision_overdue' => (int) ($metrics['revision_overdue'] ?? 0),
                'assignments' => $metrics['assignments'],
                'recommendation' => $metrics['recommendation'],
            ],
            'calendar' => $this->calendar((int) $student->id),
            'attendance' => $this->attendance->recentForStudent($teacher, $student),
            'hifz_this_week' => $this->hifzThisWeek($teacher, $student),
            'latest_saved' => $saved ? $this->presentSession($saved) : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function analyticsSection(User $teacher, User $student, array $metrics): array
    {
        $overview = $this->overviewSection($teacher, $student, $metrics);
        $practice = $this->practiceSection($student);
        $weak = $this->weakSection($student);
        $ai = $this->aiSection($teacher, $student);
        $revision = $this->revisionSection($teacher, $student);

        return [
            'metrics' => $overview['metrics'],
            'calendar' => $overview['calendar'],
            'latest_saved' => $practice['latest_saved'] ?? $overview['latest_saved'],
            'sessions' => array_slice($practice['sessions'] ?? [], 0, 6),
            'weak' => array_slice($weak['items'] ?? [], 0, 6),
            'success_rate' => $ai['success_rate'] ?? null,
            'attempts' => array_slice($ai['attempts'] ?? [], 0, 6),
            'revisit' => array_slice($revision['revisit'] ?? [], 0, 6),
            'plans' => array_slice($revision['plans'] ?? [], 0, 6),
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

    /** @return array{sabaq: int, sabqi: int, manzil: int, total: int, manzil_neglected: bool} */
    private function hifzThisWeek(User $teacher, User $student): array
    {
        $start = now()->startOfWeek(Carbon::MONDAY);
        $counts = ['sabaq' => 0, 'sabqi' => 0, 'manzil' => 0];
        $assignmentMatch = fn ($query) => $query->where('teacher_id', $teacher->id)->whereNotNull('hifz_category');

        $sessions = UserSession::query()
            ->where('user_id', $student->id)
            ->where('is_onboarding_example', false)
            ->where('status', UserSessionStatus::Completed->value)
            ->where('last_activity_at', '>=', $start)
            ->whereHas('assignmentRecipient.assignment', $assignmentMatch)
            ->with('assignmentRecipient.assignment')
            ->get();
        foreach ($sessions as $session) {
            if ($session->assignmentRecipient?->assignment?->kind !== \App\Enums\AssignmentKind::Practice) continue;
            $category = $session->assignmentRecipient->assignment->hifz_category;
            if (isset($counts[$category])) $counts[$category]++;
        }

        $attempts = AiReciteAttempt::query()
            ->validScored()
            ->where('user_id', $student->id)
            ->where('created_at', '>=', $start)
            ->whereHas('assignmentRecipient.assignment', $assignmentMatch)
            ->with('assignmentRecipient.assignment')
            ->get();
        foreach ($this->dedupeScoredAttempts($attempts) as $attempt) {
            if ($attempt->assignmentRecipient?->assignment?->kind !== \App\Enums\AssignmentKind::AiRecite) continue;
            $category = $attempt->assignmentRecipient->assignment->hifz_category;
            if (isset($counts[$category])) $counts[$category]++;
        }

        $total = array_sum($counts);

        return $counts + ['total' => $total, 'manzil_neglected' => $total >= 2 && $counts['manzil'] === 0];
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
            ->latest('id')
            ->limit(30)
            ->get();

        $attemptsBySession = $sessions->isEmpty()
            ? collect()
            : AiReciteAttempt::query()
                ->where('user_id', $student->id)
                ->whereIn('user_session_id', $sessions->pluck('id'))
                ->with('assessment:id,status,recognition_data')
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->get()
                ->groupBy('user_session_id');

        $presented = $sessions
            ->map(function (UserSession $session) use ($attemptsBySession) {
                $attempt = $attemptsBySession->get($session->id)?->first();

                return $this->presentSession(
                    $session,
                    $attempt instanceof AiReciteAttempt ? $this->presentAttemptEvidence($attempt) : null,
                );
            })
            ->all();

        $saved = UserSession::query()
            ->where('user_id', $student->id)
            ->where('is_onboarding_example', false)
            ->whereIn('status', UserSessionStatus::unfinishedDatabaseValues())
            ->latest('last_activity_at')
            ->first();

        return [
            'sessions' => $presented,
            'latest_saved' => $saved ? $this->presentSession($saved) : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function presentSession(UserSession $session, ?array $evidence = null): array
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
            'evidence' => $evidence,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function weakSection(User $student): array
    {
        $spots = MemorisationWeakSpot::query()
            ->where('user_id', $student->id)
            ->where('status', MemorisationWeakSpot::STATUS_ACTIVE)
            ->where('affected_attempt_count', '>=', 2)
            ->orderByDesc('last_identified_at')
            ->orderByDesc('id')
            ->orderByDesc('affected_attempt_count')
            ->get()
            ->unique(fn (MemorisationWeakSpot $spot) => implode(':', [
                (int) $spot->user_id,
                (int) $spot->surah_number,
                (int) $spot->ayah_number,
                (string) ($spot->spot_type ?: 'unknown'),
                $spot->word_index === null ? 'ayah' : (string) $spot->word_index,
            ]))
            ->take(40)
            ->values();

        $evidenceAttempts = $this->attemptsForWeakSpots($student, $spots);
        $items = $spots->map(fn (MemorisationWeakSpot $spot) => [
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
            'evidence_url' => $this->memorisationEvidenceUrl((int) $spot->surah_number, (int) $spot->ayah_number, (int) $spot->ayah_number, true),
            'evidence' => ($attempt = $this->attemptForWeakSpot($spot, $evidenceAttempts))
                ? $this->presentAttemptEvidence($attempt)
                : null,
        ])->all();

        return ['items' => $items];
    }

    /**
     * @return array<string, mixed>
     */
    private function aiSection(User $teacher, User $student): array
    {
        $attempts = AiReciteAttempt::query()
            ->where('user_id', $student->id)
            ->with('assessment:id,status,recognition_data')
            ->latest('created_at')
            ->latest('id')
            ->limit(30)
            ->get();
        $attempts = $this->dedupeScoredAttempts($attempts);
        $humanAssessments = TeacherRecitationAssessment::query()
            ->where('teacher_id', $teacher->id)
            ->whereIn('ai_recite_attempt_id', $attempts->pluck('id'))
            ->get()
            ->keyBy('ai_recite_attempt_id');

        // Directory and profile use the same full-history denominator. The
        // visible history remains limited to the most recent 30 checks.
        $scored = AiReciteAttempt::query()
            ->validScored()
            ->where('user_id', $student->id)
            ->get([
                'id', 'user_session_id', 'memorisation_assessment_id', 'teacher_assignment_recipient_id',
                'session_recommendation_id', 'attempt_number', 'ayah_range', 'accuracy_percent', 'created_at', 'band',
            ]);
        $scored = $this->dedupeScoredAttempts($scored);
        $rate = $scored->isEmpty() ? null : round((float) $scored->avg('accuracy_percent'), 1);

        return [
            'success_rate' => $rate,
            'score_count' => $scored->count(),
            'score_window_start' => $scored->min('created_at')?->toIso8601String(),
            'score_window_end' => $scored->max('created_at')?->toIso8601String(),
            'attempts' => $attempts->map(fn (AiReciteAttempt $attempt) => [
                'id' => (int) $attempt->id,
                'teacher_assessment' => ($human = $humanAssessments->get($attempt->id)) ? [
                    'score' => (int) $human->tajweed_score,
                    'annotation' => $human->annotation,
                    'updated_at' => $human->updated_at?->toIso8601String(),
                ] : null,
                'accuracy_percent' => $attempt->accuracy_percent !== null && in_array($attempt->band, ['strong', 'mixed', 'weak'], true)
                    ? (int) $attempt->accuracy_percent : null,
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
                'evidence' => $this->presentAttemptEvidence($attempt),
            ])->all(),
            'trend' => $scored->sortByDesc('created_at')->take(30)->sortBy('created_at')->map(fn (AiReciteAttempt $attempt) => [
                'at' => $attempt->created_at?->toIso8601String(),
                'accuracy_percent' => (int) $attempt->accuracy_percent,
                'band' => $attempt->band,
            ])->values()->all(),
        ];
    }

    /**
     * @param  Collection<int, MemorisationWeakSpot>  $spots
     * @return Collection<int, AiReciteAttempt>
     */
    private function attemptsForWeakSpots(User $student, Collection $spots): Collection
    {
        if ($spots->isEmpty()) {
            return collect();
        }

        return AiReciteAttempt::query()
            ->where('user_id', $student->id)
            ->with('assessment:id,status,recognition_data')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(100)
            ->get();
    }

    /**
     * Prefer the check that created or most recently confirmed this finding,
     * then fall back to the newest check covering the same ayah.
     *
     * @param  Collection<int, AiReciteAttempt>  $attempts
     */
    private function attemptForWeakSpot(MemorisationWeakSpot $spot, Collection $attempts): ?AiReciteAttempt
    {
        $assessmentIds = collect([$spot->last_assessment_id, $spot->source_assessment_id])
            ->filter()
            ->map(fn ($id) => (int) $id);

        $linked = $attempts->first(fn (AiReciteAttempt $attempt) => (
            $attempt->memorisation_assessment_id
            && $assessmentIds->contains((int) $attempt->memorisation_assessment_id)
        ));
        if ($linked instanceof AiReciteAttempt) {
            return $linked;
        }

        return $attempts->first(function (AiReciteAttempt $attempt) use ($spot) {
            $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
            $surah = (int) ($range['surah'] ?? $range['surah_number'] ?? 0);
            $from = (int) ($range['from'] ?? $range['start'] ?? 0);
            $to = (int) ($range['to'] ?? $range['end'] ?? $from);

            return $surah === (int) $spot->surah_number
                && $from > 0
                && (int) $spot->ayah_number >= $from
                && (int) $spot->ayah_number <= max($from, $to);
        });
    }

    /** @return array<string, mixed> */
    private function presentAttemptEvidence(AiReciteAttempt $attempt): array
    {
        $words = collect(is_array($attempt->word_statuses) ? $attempt->word_statuses : [])
            ->filter(fn ($word) => is_array($word))
            ->map(function (array $word): ?array {
                $text = trim((string) ($word['text'] ?? $word['expected'] ?? $word['word'] ?? ''));
                if ($text === '') {
                    return null;
                }

                return [
                    'text' => mb_substr($text, 0, 120),
                    'status' => (string) ($word['status'] ?? 'unknown'),
                    'detected' => trim((string) ($word['detected_token'] ?? $word['detected'] ?? $word['actual'] ?? '')) ?: null,
                    'ayah' => isset($word['ayah']) ? (int) $word['ayah'] : null,
                    'word_index' => isset($word['word_index']) ? (int) $word['word_index'] : null,
                ];
            })
            ->filter()
            ->take(250)
            ->values()
            ->all();

        return [
            'attempt_id' => (int) $attempt->id,
            'audio' => $this->audio->payload($attempt),
            'transcript' => $this->attemptTranscript($attempt),
            'words' => $words,
        ];
    }

    private function attemptTranscript(AiReciteAttempt $attempt): ?string
    {
        $recognition = is_array($attempt->assessment?->recognition_data)
            ? $attempt->assessment->recognition_data
            : [];
        $candidates = [
            data_get($recognition, 'raw.transcript'),
            data_get($recognition, 'normalised.transcript'),
            $recognition['transcript'] ?? null,
        ];
        foreach ($candidates as $candidate) {
            $value = trim((string) $candidate);
            if ($value !== '') {
                return mb_substr($value, 0, 5000);
            }
        }

        $heard = collect(is_array($attempt->word_statuses) ? $attempt->word_statuses : [])
            ->map(function ($word) {
                if (! is_array($word)) {
                    return null;
                }

                return $word['detected_token']
                    ?? $word['detected']
                    ?? $word['actual']
                    ?? $word['recognised']
                    ?? $word['recognized']
                    ?? $word['heard']
                    ?? null;
            })
            ->filter(fn ($word) => is_string($word) && trim($word) !== '')
            ->map(fn (string $word) => trim($word))
            ->values();

        return $heard->isEmpty() ? null : mb_substr($heard->implode(' '), 0, 5000);
    }

    /**
     * Retries can duplicate the same persisted check. Keep the newest row for
     * an identical session/range/score event so averages and history agree.
     */
    private function dedupeScoredAttempts(Collection $attempts): Collection
    {
        return $attempts
            ->sortByDesc('id')
            ->unique(function (AiReciteAttempt $attempt): string {
                $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
                $event = $attempt->user_session_id
                    ? 'session:'.$attempt->user_session_id
                    : ($attempt->memorisation_assessment_id
                        ? 'assessment:'.$attempt->memorisation_assessment_id
                        : ($attempt->teacher_assignment_recipient_id
                            ? 'assignment:'.$attempt->teacher_assignment_recipient_id
                            : ($attempt->session_recommendation_id
                                ? 'recommendation:'.$attempt->session_recommendation_id
                                : 'row:'.$attempt->id)));

                return implode('|', [
                    $event,
                    (string) ($range['surah'] ?? $range['surah_number'] ?? ''),
                    (string) ($range['from'] ?? ''),
                    (string) ($range['to'] ?? ''),
                    (string) ($attempt->attempt_number ?? ''),
                    (string) $attempt->accuracy_percent,
                    (string) $attempt->band,
                ]);
            })
            ->sortByDesc('created_at')
            ->values();
    }

    private function memorisationEvidenceUrl(int $surah, int $from, int $to, bool $review = false): string
    {
        return route('memorisation', array_filter([
            'surah' => $surah,
            'from' => $from,
            'to' => $to,
            'review' => $review ? 1 : null,
        ], static fn ($value) => $value !== null && $value !== ''));
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
    private function tasksSection(User $teacher, User $student): array
    {
        $revision = $this->revisionSection($teacher, $student);
        $assignments = collect($revision['assignments'] ?? [])->map(function (array $recipient) use ($student) {
            $attempt = AiReciteAttempt::query()
                ->where('user_id', $student->id)
                ->where('teacher_assignment_recipient_id', $recipient['id'])
                ->with('assessment:id,status,recognition_data')
                ->latest('created_at')
                ->latest('id')
                ->first();
            $recipient['evidence'] = $attempt ? $this->presentAttemptEvidence($attempt) : null;

            return $recipient;
        })->all();

        return [
            'assignments' => $assignments,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function focusSection(User $teacher, User $student): array
    {
        $weak = $this->weakSection($student);
        $revision = $this->revisionSection($teacher, $student);

        return [
            'items' => $weak['items'] ?? [],
            'plans' => $revision['plans'] ?? [],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function revisionSection(User $teacher, User $student): array
    {
        $plans = MemorisationPracticePlan::query()
            ->where('user_id', $student->id)
            ->where('status', MemorisationPracticePlan::STATUS_ACTIVE)
            ->whereNotNull('recommended_review_at')
            ->latest('id')
            ->get()
            // A retry can create the same scheduled event more than once. Keep
            // separate dates/scopes, but collapse exact event duplicates.
            ->unique(fn (MemorisationPracticePlan $plan) => implode('|', [
                (int) $plan->surah_number,
                (int) $plan->start_ayah,
                (int) $plan->end_ayah,
                (string) ($plan->practice_scope ?: 'legacy'),
                $plan->recommended_review_at?->toIso8601String() ?: 'unscheduled',
            ]))
            ->take(20)
            ->map(function (MemorisationPracticePlan $plan) {
                return [
                    'id' => (int) $plan->id,
                    'title' => $plan->title,
                    'status' => $plan->status,
                    'surah_number' => (int) $plan->surah_number,
                    'surah_name' => QuranMetadata::name((int) $plan->surah_number),
                    'ayah_start' => (int) $plan->start_ayah,
                    'ayah_end' => (int) $plan->end_ayah,
                    'review_type' => $plan->practice_scope ?: 'legacy',
                    'recommended_review_at' => $plan->recommended_review_at?->toIso8601String(),
                    'overdue' => $plan->status === MemorisationPracticePlan::STATUS_ACTIVE
                        && $plan->recommended_review_at !== null
                        && $plan->recommended_review_at->isPast(),
                    'retest_metrics' => $plan->retest_metrics,
                    'evidence_url' => $this->memorisationEvidenceUrl((int) $plan->surah_number, (int) $plan->start_ayah, (int) $plan->end_ayah, true),
                ];
            })->all();

        $revisitSpots = MemorisationWeakSpot::query()
            ->where('user_id', $student->id)
            ->where('status', MemorisationWeakSpot::STATUS_ACTIVE)
            ->where('affected_attempt_count', '>=', 2)
            ->orderByDesc('last_identified_at')
            ->orderByDesc('id')
            ->orderByDesc('affected_attempt_count')
            ->get()
            ->unique(fn (MemorisationWeakSpot $spot) => implode(':', [
                (int) $spot->surah_number,
                (int) $spot->ayah_number,
                (string) ($spot->spot_type ?: 'unknown'),
                $spot->word_index === null ? 'ayah' : (string) $spot->word_index,
            ]))
            ->take(12)
            ->values();
        $revisitAttempts = $this->attemptsForWeakSpots($student, $revisitSpots);
        $revisit = $revisitSpots->map(fn (MemorisationWeakSpot $spot) => [
            'surah_name' => QuranMetadata::name((int) $spot->surah_number),
            'surah_number' => (int) $spot->surah_number,
            'ayah_number' => (int) $spot->ayah_number,
            'spot_type' => $spot->spot_type,
            'word_index' => $spot->word_index,
            'affected_attempt_count' => (int) $spot->affected_attempt_count,
            'last_identified_at' => $spot->last_identified_at?->toIso8601String(),
            'evidence_url' => $this->memorisationEvidenceUrl((int) $spot->surah_number, (int) $spot->ayah_number, (int) $spot->ayah_number, true),
            'evidence' => ($attempt = $this->attemptForWeakSpot($spot, $revisitAttempts))
                ? $this->presentAttemptEvidence($attempt)
                : null,
        ])->all();

        $assignments = TeacherAssignmentRecipient::query()
            ->where('student_id', $student->id)
            ->whereHas('assignment', fn ($query) => $query->where('teacher_id', $teacher->id))
            ->with(['assignment.notes.teacher:id,name'])
            ->latest('id')
            ->limit(20)
            ->get()
            ->map(fn (TeacherAssignmentRecipient $recipient) => $this->assignments->presentRecipient($recipient, true, null, null, null, (int) $teacher->id))
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

    /**
     * @param  array<string, mixed>  $a
     * @param  array<string, mixed>  $b
     */
    private function sortLearnerAssignments(array $a, array $b): int
    {
        $rank = fn (string $status): int => match ($status) {
            AssignmentStatus::Overdue->value => 0,
            AssignmentStatus::Pending->value => 1,
            AssignmentStatus::InProgress->value => 2,
            AssignmentStatus::AwaitingConfirmation->value => 2,
            AssignmentStatus::Completed->value => 4,
            default => 4,
        };

        $statusCompare = $rank((string) ($a['status'] ?? '')) <=> $rank((string) ($b['status'] ?? ''));
        if ($statusCompare !== 0) {
            return $statusCompare;
        }

        $dueA = isset($a['assignment']['due_at']) ? Carbon::parse($a['assignment']['due_at']) : null;
        $dueB = isset($b['assignment']['due_at']) ? Carbon::parse($b['assignment']['due_at']) : null;
        if ($dueA !== null || $dueB !== null) {
            if ($dueA === null) {
                return 1;
            }
            if ($dueB === null) {
                return -1;
            }
            $dueCompare = $dueA->getTimestamp() <=> $dueB->getTimestamp();
            if ($dueCompare !== 0) {
                return $dueCompare;
            }
        }

        $updatedA = isset($a['updated_at']) ? Carbon::parse($a['updated_at']) : null;
        $updatedB = isset($b['updated_at']) ? Carbon::parse($b['updated_at']) : null;
        if ($updatedA !== null && $updatedB !== null) {
            return $updatedB->getTimestamp() <=> $updatedA->getTimestamp();
        }

        return ((int) ($b['id'] ?? 0)) <=> ((int) ($a['id'] ?? 0));
    }

    private function assertAuthorised(User $teacher, User $student): void
    {
        if (! $this->access->allows($teacher, $student)) {
            abort(404);
        }
    }
}

<?php

namespace App\Services;

use App\Enums\UserSessionStatus;
use App\Models\AiReciteAttempt;
use App\Models\AyahNote;
use App\Models\ContactSubmission;
use App\Models\Feedback;
use App\Models\LearningAnalytic;
use App\Models\MemorisationAssessment;
use App\Models\MemorisationProgress;
use App\Models\User;
use App\Models\UserLastPosition;
use App\Models\UserSession;
use App\Services\Memorisation\LearningHistoryRetentionService;
use App\Support\QuranMetadata;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Cross-user aggregates for the Super Admin dashboard.
 * Never accepts a client-supplied admin id — callers must authorize via Gate.
 */
class AdminDashboardService
{
    private const BUILD_CACHE_TTL_SECONDS = 20;

    private const CACHE_VERSION_KEY = 'admin-dashboard:version';

    /**
     * Bust all admin dashboard snapshot caches (KPI / chart payload).
     * Call after user signup, auth, feedback, or admin mutations.
     */
    public static function invalidateCaches(): void
    {
        $current = (int) Cache::get(self::CACHE_VERSION_KEY, 1);
        Cache::forever(self::CACHE_VERSION_KEY, $current + 1);
    }

    /**
     * @return array<string, mixed>
     */
    public function build(User $admin, int $chartDays = 30, bool $fresh = false): array
    {
        $chartDays = in_array($chartDays, [7, 30], true) ? $chartDays : 30;
        if ($fresh || app()->runningUnitTests()) {
            return $this->buildFresh($admin, $chartDays);
        }

        $version = (int) Cache::get(self::CACHE_VERSION_KEY, 1);
        $cacheKey = 'admin-dashboard:v'.$version.':'.$admin->id.':'.$chartDays;

        return Cache::remember($cacheKey, self::BUILD_CACHE_TTL_SECONDS, function () use ($admin, $chartDays) {
            return $this->buildFresh($admin, $chartDays);
        });
    }

    /**
     * @return array<string, mixed>
     */
    private function buildFresh(User $admin, int $chartDays): array
    {
        return [
            'meta' => [
                'owner_id' => (int) $admin->id,
                'generated_at' => now()->toIso8601String(),
                'chart_days' => $chartDays,
                'role' => 'super_admin',
            ],
            'welcome' => [
                'greeting' => 'Assalamu alaikum, '.$this->firstName($admin),
                'first_name' => $this->firstName($admin),
                'eyebrow' => 'Super Admin',
                'supporting_message' => 'Oversee learners, progress, and platform health.',
            ],
            'snapshot' => $this->buildSnapshot(),
            'learning' => $this->buildLearningOverview(),
            'ai_health' => $this->buildAiHealth($chartDays),
            'learners' => $this->buildLearnerRoster(20),
            'top_learners' => $this->buildTopLearners($chartDays),
            'mix' => $this->buildMix(),
            'chart' => $this->buildActivityChart($chartDays),
            'week_summary' => $this->buildWeekSummary(),
            'contacts' => $this->buildPendingContacts(),
            'activity' => $this->buildRecentActivity(5),
        ];
    }

    /**
     * Paginated/filtered user directory for the ops console.
     *
     * @param  array{
     *   limit?: int,
     *   page?: int,
     *   per_page?: int,
     *   q?: string|null,
     *   status?: string|null,
     *   activity?: string|null,
     *   progress?: string|null,
     *   sessions?: string|null,
     *   sort?: string|null,
     *   dir?: string|null
     * }  $filters
     * @return array{users: list<array<string, mixed>>, total: int, page: int, per_page: int, total_pages: int}
     */
    public function users(array $filters = []): array
    {
        $page = max(1, (int) ($filters['page'] ?? 1));
        $perPage = max(1, min(100, (int) ($filters['per_page'] ?? $filters['limit'] ?? 20)));
        $limit = $perPage;
        $search = trim((string) ($filters['q'] ?? ''));
        $status = strtolower(trim((string) ($filters['status'] ?? '')));
        $activity = strtolower(trim((string) ($filters['activity'] ?? '')));
        $progress = strtolower(trim((string) ($filters['progress'] ?? '')));
        $sessions = strtolower(trim((string) ($filters['sessions'] ?? '')));
        $sort = strtolower(trim((string) ($filters['sort'] ?? 'created')));
        $dir = strtolower(trim((string) ($filters['dir'] ?? 'desc'))) === 'asc' ? 'asc' : 'desc';

        if (! in_array($status, ['none', 'trialing', 'active', 'canceled', 'past_due', 'free'], true)) {
            $status = '';
        }
        if ($activity === 'inactive') {
            $activity = 'inactive_30d';
        }
        if (! in_array($activity, ['today', 'active_7d', 'active_30d', 'inactive_30d', 'never'], true)) {
            $activity = '';
        }
        if ($progress !== 'has' && $progress !== 'none') {
            $progress = '';
        }
        if ($sessions !== 'gt0') {
            $sessions = '';
        }
        if (! in_array($sort, ['created', 'last_active', 'memorised', 'sessions', 'learning', 'name', 'email', 'accuracy', 'last_ai'], true)) {
            $sort = 'created';
        }

        $query = User::query()->select([
            'id',
            'name',
            'email',
            'locale',
            'google_id',
            'subscription_status',
            'subscription_tier',
            'subscription_current_period_ends_at',
            'created_at',
            'last_login_at',
        ]);

        if ($search !== '') {
            $like = '%'.$search.'%';
            $query->where(function ($inner) use ($like) {
                $inner->where('name', 'like', $like)
                    ->orWhere('email', 'like', $like);
            });
        }

        if ($status !== '') {
            if ($status === 'none') {
                $query->where(function ($inner) {
                    $inner->whereNull('subscription_status')
                        ->orWhere('subscription_status', '')
                        ->orWhere('subscription_status', 'none')
                        ->orWhere('subscription_status', 'free');
                });
            } else {
                $query->where('subscription_status', $status);
            }
        }

        if ($activity === 'today') {
            $query->where(function ($outer) {
                $outer->where('last_login_at', '>=', now()->startOfDay())
                    ->orWhereIn('id', function ($sub) {
                        $sub->select('user_id')
                            ->from('user_sessions')
                            ->where('is_onboarding_example', false)
                            ->whereNotNull('user_id')
                            ->where('last_activity_at', '>=', now()->startOfDay());
                    });
            });
        } elseif ($activity === 'active_7d') {
            $query->where(function ($outer) {
                $outer->where('last_login_at', '>=', now()->subDays(7))
                    ->orWhereIn('id', function ($sub) {
                        $sub->select('user_id')
                            ->from('user_sessions')
                            ->where('is_onboarding_example', false)
                            ->whereNotNull('user_id')
                            ->where('last_activity_at', '>=', now()->subDays(7));
                    });
            });
        } elseif ($activity === 'active_30d') {
            $query->where(function ($outer) {
                $outer->where('last_login_at', '>=', now()->subDays(30))
                    ->orWhereIn('id', function ($sub) {
                        $sub->select('user_id')
                            ->from('user_sessions')
                            ->where('is_onboarding_example', false)
                            ->whereNotNull('user_id')
                            ->where('last_activity_at', '>=', now()->subDays(30));
                    });
            });
        } elseif ($activity === 'never') {
            $query->whereNull('last_login_at')
                ->whereNotIn('id', function ($sub) {
                    $sub->select('user_id')
                        ->from('user_sessions')
                        ->where('is_onboarding_example', false)
                        ->whereNotNull('user_id');
                });
        } elseif ($activity === 'inactive_30d') {
            $activeIds = UserSession::query()
                ->where('is_onboarding_example', false)
                ->whereNotNull('user_id')
                ->where('last_activity_at', '>=', now()->subDays(30))
                ->distinct()
                ->pluck('user_id')
                ->all();
            $loginActiveIds = User::query()
                ->where('last_login_at', '>=', now()->subDays(30))
                ->pluck('id')
                ->all();
            $query->whereNotIn('id', array_values(array_unique(array_merge($activeIds, $loginActiveIds))));
        }

        if ($progress === 'has') {
            $query->whereIn('id', function ($sub) {
                $sub->select('user_id')->from('memorisation_progress')->distinct();
            });
        } elseif ($progress === 'none') {
            $query->whereNotIn('id', function ($sub) {
                $sub->select('user_id')->from('memorisation_progress')->distinct();
            });
        }

        if ($sessions === 'gt0') {
            $query->whereIn('id', function ($sub) {
                $sub->select('user_id')
                    ->from('user_sessions')
                    ->where('is_onboarding_example', false)
                    ->whereNotNull('user_id')
                    ->where('status', UserSessionStatus::Completed->value)
                    ->distinct();
            });
        }

        $total = (clone $query)->count();
        $totalPages = max(1, (int) ceil($total / $perPage));
        if ($page > $totalPages) {
            $page = $totalPages;
        }

        // Fetch a bounded set then sort in PHP for progress-derived columns.
        $derivedSort = in_array($sort, ['memorised', 'sessions', 'learning', 'last_active', 'accuracy', 'last_ai'], true);
        $fetchLimit = $derivedSort
            ? min(500, max($perPage, $total))
            : min(500, $total > 0 ? $total : $perPage);

        if ($sort === 'created') {
            $query->orderBy('created_at', $dir)->orderBy('id', $dir);
        } elseif ($sort === 'name') {
            $query->orderBy('name', $dir)->orderBy('id', $dir);
        } elseif ($sort === 'email') {
            $query->orderBy('email', $dir)->orderBy('id', $dir);
        } else {
            $query->orderByDesc('created_at')->orderByDesc('id');
        }

        if ($derivedSort) {
            $users = $query->limit($fetchLimit)->get();
        } else {
            $users = $query->forPage($page, $perPage)->get();
        }

        $enriched = $this->enrichUsersWithProgress($users);

        if ($sort === 'memorised') {
            $enriched = $dir === 'asc'
                ? $enriched->sortBy(fn ($row) => [(int) ($row['memorised_ayahs'] ?? 0), (int) $row['id']])
                : $enriched->sortByDesc(fn ($row) => [(int) ($row['memorised_ayahs'] ?? 0), (int) $row['id']]);
        } elseif ($sort === 'sessions') {
            $enriched = $dir === 'asc'
                ? $enriched->sortBy(fn ($row) => [(int) ($row['sessions_completed'] ?? 0), (int) $row['id']])
                : $enriched->sortByDesc(fn ($row) => [(int) ($row['sessions_completed'] ?? 0), (int) $row['id']]);
        } elseif ($sort === 'learning') {
            $enriched = $dir === 'asc'
                ? $enriched->sortBy(fn ($row) => [(int) ($row['learning_ayahs'] ?? 0), (int) $row['id']])
                : $enriched->sortByDesc(fn ($row) => [(int) ($row['learning_ayahs'] ?? 0), (int) $row['id']]);
        } elseif ($sort === 'last_active') {
            $enriched = $dir === 'asc'
                ? $enriched->sortBy(fn ($row) => [$row['last_activity_at'] ?? '1970-01-01', (int) $row['id']])
                : $enriched->sortByDesc(fn ($row) => [$row['last_activity_at'] ?? '1970-01-01', (int) $row['id']]);
        } elseif ($sort === 'accuracy') {
            $enriched = $dir === 'asc'
                ? $enriched->sortBy(fn ($row) => [$row['avg_ai_accuracy'] ?? -1, (int) $row['id']])
                : $enriched->sortByDesc(fn ($row) => [$row['avg_ai_accuracy'] ?? -1, (int) $row['id']]);
        } elseif ($sort === 'last_ai') {
            $enriched = $dir === 'asc'
                ? $enriched->sortBy(fn ($row) => [$row['last_ai_check_at'] ?? '1970-01-01', (int) $row['id']])
                : $enriched->sortByDesc(fn ($row) => [$row['last_ai_check_at'] ?? '1970-01-01', (int) $row['id']]);
        }

        $pageRows = $derivedSort
            ? $enriched->values()->slice(($page - 1) * $perPage, $perPage)->values()->all()
            : $enriched->values()->all();

        return [
            'users' => $pageRows,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => $totalPages,
        ];
    }

    /**
     * @param  list<int>  $userIds
     * @return array{updated: int, deleted: int, skipped: int}
     */
    public function bulkUsers(User $actor, array $userIds, string $action, ?string $subscriptionStatus = null): array
    {
        $ids = collect($userIds)
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->values();

        $updated = 0;
        $deleted = 0;
        $skipped = 0;

        if ($ids->isEmpty()) {
            return compact('updated', 'deleted', 'skipped');
        }

        if ($action === 'update_status') {
            $status = $this->normalizeSubscriptionStatus($subscriptionStatus ?? 'none');
            $updated = User::query()
                ->whereIn('id', $ids->all())
                ->update(['subscription_status' => $status]);

            self::invalidateCaches();

            return [
                'updated' => (int) $updated,
                'deleted' => 0,
                'skipped' => 0,
            ];
        }

        if ($action === 'delete') {
            foreach ($ids as $id) {
                if ((int) $id === (int) $actor->id) {
                    $skipped++;

                    continue;
                }
                $user = User::query()->find($id);
                if (! $user) {
                    $skipped++;

                    continue;
                }
                app(LearningHistoryRetentionService::class)->deleteUserAccount($user, $actor);
                $deleted++;
            }

            self::invalidateCaches();

            return compact('updated', 'deleted', 'skipped');
        }

        abort(422, __('admin.bulk_unsupported'));
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function createUser(array $data): array
    {
        $password = ! empty($data['password'])
            ? (string) $data['password']
            : Str::password(12);

        $user = User::query()->create([
            'name' => trim((string) ($data['name'] ?? '')),
            'email' => strtolower(trim((string) ($data['email'] ?? ''))),
            'password' => $password,
            'password_set_at' => now(),
            'locale' => $this->normalizeLocale($data['locale'] ?? 'en'),
            'subscription_status' => $this->normalizeSubscriptionStatus($data['subscription_status'] ?? 'none'),
            'subscription_tier' => $this->normalizeSubscriptionTier($data['subscription_tier'] ?? 'none'),
        ]);

        self::invalidateCaches();

        return $this->enrichUsersWithProgress(collect([$user]))->first()
            ?? ['id' => (int) $user->id, 'email' => $user->email];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function updateUser(User $user, array $data): array
    {
        $payload = [];

        if (array_key_exists('name', $data)) {
            $payload['name'] = trim((string) $data['name']);
        }
        if (array_key_exists('email', $data)) {
            $payload['email'] = strtolower(trim((string) $data['email']));
        }
        if (array_key_exists('locale', $data)) {
            $payload['locale'] = $this->normalizeLocale($data['locale']);
        }
        if (array_key_exists('subscription_status', $data)) {
            $payload['subscription_status'] = $this->normalizeSubscriptionStatus($data['subscription_status']);
        }
        if (array_key_exists('subscription_tier', $data)) {
            $payload['subscription_tier'] = $this->normalizeSubscriptionTier($data['subscription_tier']);
        }
        if (! empty($data['password'])) {
            $payload['password'] = $data['password'];
            $payload['password_set_at'] = now();
        }

        if ($payload !== []) {
            $user->fill($payload)->save();
            self::invalidateCaches();
        }

        return $this->enrichUsersWithProgress(collect([$user->fresh()]))->first()
            ?? ['id' => (int) $user->id, 'email' => $user->email];
    }

    public function deleteUser(User $actor, User $user): void
    {
        if ((int) $actor->id === (int) $user->id) {
            abort(422, __('admin.cannot_delete_self'));
        }

        app(LearningHistoryRetentionService::class)->deleteUserAccount($user, $actor);
        self::invalidateCaches();
    }

    public function deleteNote(AyahNote $note): void
    {
        $note->delete();
    }

    /**
     * Full oversight profile for a single registered user.
     *
     * @return array<string, mixed>
     */
    public function userDetail(User $user): array
    {
        $profile = $this->enrichUsersWithProgress(collect([$user]))->first();
        if (! is_array($profile)) {
            $profile = [
                'id' => (int) $user->id,
                'name' => (string) $user->name,
                'email' => (string) $user->email,
            ];
        }

        $surahProgress = MemorisationProgress::query()
            ->selectRaw('surah_number, status, COUNT(*) as total')
            ->where('user_id', $user->id)
            ->groupBy('surah_number', 'status')
            ->orderBy('surah_number')
            ->get()
            ->groupBy('surah_number')
            ->map(function ($rows, $surahNumber) {
                $surah = (int) $surahNumber;
                $counts = [
                    'memorised' => 0,
                    'learning' => 0,
                    'reviewing' => 0,
                    'mastered' => 0,
                ];
                foreach ($rows as $row) {
                    $status = strtolower((string) $row->status);
                    if (isset($counts[$status])) {
                        $counts[$status] = (int) $row->total;
                    } elseif (in_array($status, ['memorised', 'mastered'], true)) {
                        $counts['memorised'] += (int) $row->total;
                    }
                }
                $memorised = $counts['memorised'] + $counts['mastered'];
                $inProgress = $counts['learning'] + $counts['reviewing'];
                $totalAyahs = (int) (QuranMetadata::ayahCount($surah) ?? 0);
                $practised = $memorised + $inProgress;
                if ($totalAyahs > 0) {
                    $practised = min($practised, $totalAyahs);
                }
                $percent = $totalAyahs > 0
                    ? (int) round(($practised / $totalAyahs) * 100)
                    : 0;

                return [
                    'surah_number' => $surah,
                    'surah_name' => QuranMetadata::name($surah),
                    'memorised' => $memorised,
                    'in_progress' => $inProgress,
                    'practised' => $practised,
                    'total_ayahs' => $totalAyahs,
                    'percent' => $percent,
                    'total_tracked' => $memorised + $inProgress,
                ];
            })
            ->values()
            ->all();

        $recentSessions = UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->whereIn('status', [
                UserSessionStatus::Completed->value,
                UserSessionStatus::EndedEarly->value,
                UserSessionStatus::Paused->value,
            ])
            ->orderByDesc('last_activity_at')
            ->orderByDesc('id')
            ->limit(12)
            ->get()
            ->map(function (UserSession $session) {
                $meta = is_array($session->metadata) ? $session->metadata : [];
                $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
                $surah = (int) ($session->surah_number ?: ($config['chapterId'] ?? 0));
                $from = (int) ($config['rangeStart'] ?? $session->ayah_number ?? 0);
                $to = (int) ($config['rangeEnd'] ?? $from);
                $status = $session->status instanceof UserSessionStatus
                    ? $session->status->value
                    : (string) $session->status;

                return [
                    'id' => (int) $session->id,
                    'surah_number' => $surah ?: null,
                    'surah_name' => $surah > 0 ? QuranMetadata::name($surah) : null,
                    'ayah_start' => $from > 0 ? $from : null,
                    'ayah_end' => $to > 0 ? $to : null,
                    'status' => $status,
                    'occurred_at' => optional($session->ended_at ?? $session->last_activity_at)->toIso8601String(),
                ];
            })
            ->values()
            ->all();

        $recentAi = AiReciteAttempt::query()
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(12)
            ->get()
            ->map(function (AiReciteAttempt $attempt) {
                $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
                $surah = (int) ($range['surah'] ?? $range['chapterId'] ?? 0);
                $from = (int) ($range['from'] ?? $range['rangeStart'] ?? $range['start'] ?? 0);
                $to = (int) ($range['to'] ?? $range['rangeEnd'] ?? $range['end'] ?? $from);

                return [
                    'id' => (int) $attempt->id,
                    'surah_number' => $surah ?: null,
                    'surah_name' => $surah > 0 ? QuranMetadata::name($surah) : null,
                    'ayah_start' => $from > 0 ? $from : null,
                    'ayah_end' => $to > 0 ? $to : null,
                    'band' => $attempt->band,
                    'accuracy_percent' => $attempt->accuracy_percent,
                    'occurred_at' => optional($attempt->created_at)->toIso8601String(),
                ];
            })
            ->values()
            ->all();

        $recentNotes = AyahNote::query()
            ->where('user_id', $user->id)
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->limit(12)
            ->get()
            ->map(function (AyahNote $note) {
                $body = trim((string) preg_replace('/\s+/u', ' ', (string) $note->body));
                $snippet = $body !== ''
                    ? (mb_strlen($body) > 120 ? mb_substr($body, 0, 120).'…' : $body)
                    : null;

                return [
                    'id' => (int) $note->id,
                    'surah_number' => (int) $note->surah_number,
                    'surah_name' => QuranMetadata::name((int) $note->surah_number),
                    'ayah_number' => (int) $note->ayah_number,
                    'snippet' => $snippet,
                    'updated_at' => optional($note->updated_at ?? $note->created_at)->toIso8601String(),
                ];
            })
            ->values()
            ->all();

        $notesCount = AyahNote::query()->where('user_id', $user->id)->count();
        $assessmentsCount = MemorisationAssessment::query()->where('user_id', $user->id)->count();

        return [
            'user' => $profile,
            'stats' => [
                'sessions_completed' => (int) ($profile['sessions_completed'] ?? 0),
                'memorised_ayahs' => (int) ($profile['memorised_ayahs'] ?? 0),
                'learning_ayahs' => (int) ($profile['learning_ayahs'] ?? 0),
                'ai_checks' => (int) ($profile['ai_checks'] ?? 0),
                'avg_ai_accuracy' => $profile['avg_ai_accuracy'] ?? null,
                'notes' => $notesCount,
                'assessments' => $assessmentsCount,
            ],
            'surah_progress' => $surahProgress,
            'recent_sessions' => $recentSessions,
            'recent_ai_checks' => $recentAi,
            'recent_notes' => $recentNotes,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function activityLog(int $limit = 100): array
    {
        return $this->buildRecentActivity(max(1, min(200, $limit)));
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function sessions(int $limit = 100): array
    {
        $limit = max(1, min(200, $limit));

        return UserSession::query()
            ->with('user:id,name,email')
            ->where('is_onboarding_example', false)
            ->whereIn('status', [
                UserSessionStatus::Completed->value,
                UserSessionStatus::EndedEarly->value,
            ])
            ->orderByDesc('ended_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->map(function (UserSession $session) {
                $meta = is_array($session->metadata) ? $session->metadata : [];
                $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
                $surah = (int) ($session->surah_number ?: ($config['chapterId'] ?? 0));
                $from = (int) ($config['rangeStart'] ?? 0);
                $to = (int) ($config['rangeEnd'] ?? $from);
                $status = $session->status instanceof UserSessionStatus
                    ? $session->status->value
                    : (string) $session->status;

                return [
                    'id' => (int) $session->id,
                    'user_id' => (int) $session->user_id,
                    'user_name' => $session->user?->name,
                    'user_email' => $session->user?->email,
                    'surah_number' => $surah ?: null,
                    'surah_name' => $surah > 0 ? QuranMetadata::name($surah) : null,
                    'ayah_start' => $from > 0 ? $from : null,
                    'ayah_end' => $to > 0 ? $to : null,
                    'status' => $status,
                    'occurred_at' => optional($session->ended_at ?? $session->last_activity_at)->toIso8601String(),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function aiChecks(int $limit = 100): array
    {
        $limit = max(1, min(200, $limit));

        return AiReciteAttempt::query()
            ->with('user:id,name,email')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->map(function (AiReciteAttempt $attempt) {
                $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
                $surah = (int) ($range['surah'] ?? $range['chapterId'] ?? 0);
                $from = (int) ($range['from'] ?? $range['rangeStart'] ?? $range['start'] ?? 0);
                $to = (int) ($range['to'] ?? $range['rangeEnd'] ?? $range['end'] ?? $from);

                return [
                    'id' => (int) $attempt->id,
                    'user_id' => (int) $attempt->user_id,
                    'user_name' => $attempt->user?->name,
                    'user_email' => $attempt->user?->email,
                    'surah_number' => $surah ?: null,
                    'surah_name' => $surah > 0 ? QuranMetadata::name($surah) : null,
                    'ayah_start' => $from > 0 ? $from : null,
                    'ayah_end' => $to > 0 ? $to : null,
                    'band' => $attempt->band,
                    'accuracy_percent' => $attempt->accuracy_percent,
                    'occurred_at' => optional($attempt->created_at)->toIso8601String(),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function notes(int $limit = 100): array
    {
        $limit = max(1, min(200, $limit));

        return AyahNote::query()
            ->with('user:id,name,email')
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->map(function (AyahNote $note) {
                $body = trim((string) preg_replace('/\s+/u', ' ', (string) $note->body));
                $snippet = $body !== ''
                    ? (mb_strlen($body) > 80 ? mb_substr($body, 0, 80).'…' : $body)
                    : null;

                return [
                    'id' => (int) $note->id,
                    'user_id' => (int) $note->user_id,
                    'user_name' => $note->user?->name,
                    'user_email' => $note->user?->email,
                    'surah_number' => (int) $note->surah_number,
                    'surah_name' => QuranMetadata::name((int) $note->surah_number),
                    'ayah_number' => (int) $note->ayah_number,
                    'snippet' => $snippet,
                    'updated_at' => optional($note->updated_at ?? $note->created_at)->toIso8601String(),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function contacts(int $limit = 100, string $status = 'pending'): array
    {
        $limit = max(1, min(200, $limit));
        $status = $status === 'resolved' ? 'resolved' : 'pending';

        return ContactSubmission::query()
            ->where('status', $status)
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn (ContactSubmission $row) => $this->contactPayload($row))
            ->values()
            ->all();
    }

    public function resolveContact(ContactSubmission $contact): array
    {
        $contact->forceFill(['status' => 'resolved'])->save();

        return $this->contactPayload($contact->fresh());
    }

    public function deleteContact(ContactSubmission $contact): void
    {
        $contact->delete();
    }

    /**
     * @return array<string, mixed>
     */
    private function buildSnapshot(): array
    {
        $now = now();
        $usersTotal = User::query()->count();
        $usersNew7d = User::query()->where('created_at', '>=', $now->copy()->subDays(7))->count();
        $usersPrev7d = User::query()
            ->where('created_at', '>=', $now->copy()->subDays(14))
            ->where('created_at', '<', $now->copy()->subDays(7))
            ->count();

        $active7dSessions = (int) UserSession::query()
            ->where('is_onboarding_example', false)
            ->where('last_activity_at', '>=', $now->copy()->subDays(7))
            ->whereNotNull('user_id')
            ->selectRaw('COUNT(DISTINCT user_id) as aggregate')
            ->value('aggregate');
        $active7dLogins = User::query()
            ->where('last_login_at', '>=', $now->copy()->subDays(7))
            ->count();
        // Distinct union approximation: prefer max of session-active and login-active counts
        // when overlap is unknown at query cost; exact distinct via subquery:
        $active7d = (int) User::query()
            ->where(function ($outer) use ($now) {
                $outer->where('last_login_at', '>=', $now->copy()->subDays(7))
                    ->orWhereIn('id', function ($sub) use ($now) {
                        $sub->select('user_id')
                            ->from('user_sessions')
                            ->where('is_onboarding_example', false)
                            ->whereNotNull('user_id')
                            ->where('last_activity_at', '>=', $now->copy()->subDays(7));
                    });
            })
            ->count();
        $activePrev7d = (int) User::query()
            ->where(function ($outer) use ($now) {
                $outer->where(function ($inner) use ($now) {
                    $inner->where('last_login_at', '>=', $now->copy()->subDays(14))
                        ->where('last_login_at', '<', $now->copy()->subDays(7));
                })->orWhereIn('id', function ($sub) use ($now) {
                    $sub->select('user_id')
                        ->from('user_sessions')
                        ->where('is_onboarding_example', false)
                        ->whereNotNull('user_id')
                        ->where('last_activity_at', '>=', $now->copy()->subDays(14))
                        ->where('last_activity_at', '<', $now->copy()->subDays(7));
                });
            })
            ->count();

        $sessionsCompleted = UserSession::query()
            ->where('is_onboarding_example', false)
            ->where('status', UserSessionStatus::Completed->value)
            ->count();
        $sessionsLast7d = UserSession::query()
            ->where('is_onboarding_example', false)
            ->where('status', UserSessionStatus::Completed->value)
            ->where('ended_at', '>=', $now->copy()->subDays(7))
            ->count();
        $sessionsPrev7d = UserSession::query()
            ->where('is_onboarding_example', false)
            ->where('status', UserSessionStatus::Completed->value)
            ->where('ended_at', '>=', $now->copy()->subDays(14))
            ->where('ended_at', '<', $now->copy()->subDays(7))
            ->count();

        $memorisedAyahs = MemorisationProgress::query()
            ->whereIn('status', ['memorised', 'mastered'])
            ->count();
        $memorisedLast7d = MemorisationProgress::query()
            ->whereIn('status', ['memorised', 'mastered'])
            ->where(function ($query) use ($now) {
                $query->where('completed_at', '>=', $now->copy()->subDays(7))
                    ->orWhere(function ($inner) use ($now) {
                        $inner->whereNull('completed_at')
                            ->where('updated_at', '>=', $now->copy()->subDays(7));
                    });
            })
            ->count();
        $memorisedPrev7d = MemorisationProgress::query()
            ->whereIn('status', ['memorised', 'mastered'])
            ->where(function ($query) use ($now) {
                $query->where(function ($inner) use ($now) {
                    $inner->where('completed_at', '>=', $now->copy()->subDays(14))
                        ->where('completed_at', '<', $now->copy()->subDays(7));
                })->orWhere(function ($inner) use ($now) {
                    $inner->whereNull('completed_at')
                        ->where('updated_at', '>=', $now->copy()->subDays(14))
                        ->where('updated_at', '<', $now->copy()->subDays(7));
                });
            })
            ->count();

        $aiChecks = AiReciteAttempt::query()->count();
        $notes = AyahNote::query()->count();
        $pendingContacts = ContactSubmission::query()->where('status', 'pending')->count();
        $pendingLast7d = ContactSubmission::query()
            ->where('created_at', '>=', $now->copy()->subDays(7))
            ->count();
        $pendingPrev7d = ContactSubmission::query()
            ->where('created_at', '>=', $now->copy()->subDays(14))
            ->where('created_at', '<', $now->copy()->subDays(7))
            ->count();

        $feedbackOpen = Feedback::query()
            ->whereIn('status', [Feedback::STATUS_NEW, Feedback::STATUS_REVIEWING])
            ->count();
        $feedbackLast7d = Feedback::query()
            ->where('created_at', '>=', $now->copy()->subDays(7))
            ->count();
        $feedbackPrev7d = Feedback::query()
            ->where('created_at', '>=', $now->copy()->subDays(14))
            ->where('created_at', '<', $now->copy()->subDays(7))
            ->count();
        $feedbackTotal = Feedback::query()->count();

        return [
            'users_total' => [
                'key' => 'users_total',
                'value' => $usersTotal,
                'delta_7d' => $usersNew7d,
                'trend_percent' => $this->trendPercent($usersNew7d, $usersPrev7d),
            ],
            'feedback_open' => [
                'key' => 'feedback_open',
                'value' => $feedbackOpen,
                'total' => $feedbackTotal,
                'trend_percent' => $this->trendPercent($feedbackLast7d, $feedbackPrev7d),
            ],
            'active_users' => [
                'key' => 'active_users',
                'value' => $active7d,
                'share_of_users' => $usersTotal > 0 ? round(($active7d / $usersTotal) * 100, 1) : 0,
                'trend_percent' => $this->trendPercent($active7d, $activePrev7d),
            ],
            'sessions_completed' => [
                'key' => 'sessions_completed',
                'value' => $sessionsCompleted,
                'trend_percent' => $this->trendPercent($sessionsLast7d, $sessionsPrev7d),
            ],
            'memorised_ayahs' => [
                'key' => 'memorised_ayahs',
                'value' => $memorisedAyahs,
                'trend_percent' => $this->trendPercent($memorisedLast7d, $memorisedPrev7d),
            ],
            'ai_recite_attempts' => [
                'key' => 'ai_recite_attempts',
                'value' => $aiChecks,
            ],
            'notes' => [
                'key' => 'notes',
                'value' => $notes,
            ],
            'pending_contacts' => [
                'key' => 'pending_contacts',
                'value' => $pendingContacts,
                'trend_percent' => $this->trendPercent($pendingLast7d, $pendingPrev7d),
            ],
        ];
    }

    private function trendPercent(int $current, int $previous): ?float
    {
        if ($previous <= 0) {
            return null;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }

    /**
     * Top learners by completed sessions in the selected window.
     *
     * @return list<array<string, mixed>>
     */
    private function buildTopLearners(int $days): array
    {
        $days = in_array($days, [7, 30], true) ? $days : 30;
        $since = now()->subDays($days);

        $sessionCounts = UserSession::query()
            ->selectRaw('user_id, COUNT(*) as total')
            ->where('is_onboarding_example', false)
            ->where('status', UserSessionStatus::Completed->value)
            ->whereNotNull('user_id')
            ->where('ended_at', '>=', $since)
            ->groupBy('user_id')
            ->orderByDesc('total')
            ->limit(20)
            ->pluck('total', 'user_id');

        if ($sessionCounts->isEmpty()) {
            return [];
        }

        $ids = $sessionCounts->keys()->all();
        $users = User::query()
            ->whereIn('id', $ids)
            ->get(['id', 'name', 'email'])
            ->keyBy('id');

        $memorised = MemorisationProgress::query()
            ->selectRaw('user_id, COUNT(*) as total')
            ->whereIn('user_id', $ids)
            ->whereIn('status', ['memorised', 'mastered'])
            ->groupBy('user_id')
            ->pluck('total', 'user_id');

        $accuracy = AiReciteAttempt::query()
            ->validScored()
            ->selectRaw('user_id, AVG(accuracy_percent) as avg_accuracy')
            ->whereIn('user_id', $ids)
            ->where('created_at', '>=', $since)
            ->groupBy('user_id')
            ->pluck('avg_accuracy', 'user_id');

        return collect($ids)
            ->map(function ($id) use ($sessionCounts, $users, $memorised, $accuracy) {
                $user = $users->get($id);

                return [
                    'id' => (int) $id,
                    'name' => (string) ($user?->name ?: ''),
                    'email' => (string) ($user?->email ?: ''),
                    'sessions_completed' => (int) ($sessionCounts[$id] ?? 0),
                    'memorised_ayahs' => (int) ($memorised[$id] ?? 0),
                    'avg_ai_accuracy' => isset($accuracy[$id])
                        ? (int) round((float) $accuracy[$id])
                        : null,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function buildLearningOverview(): array
    {
        $memorised = MemorisationProgress::query()
            ->whereIn('status', ['memorised', 'mastered'])
            ->count();
        $learning = MemorisationProgress::query()
            ->whereIn('status', ['learning', 'reviewing'])
            ->count();
        $assessments = MemorisationAssessment::query()->count();
        $avgAccuracy = AiReciteAttempt::query()->validScored()->avg('accuracy_percent');
        $learnersWithProgress = MemorisationProgress::query()
            ->distinct()
            ->count('user_id');

        return [
            'memorised_ayahs' => $memorised,
            'learning_ayahs' => $learning,
            'assessments' => $assessments,
            'learners_with_progress' => $learnersWithProgress,
            'avg_ai_accuracy' => $avgAccuracy !== null ? (int) round((float) $avgAccuracy) : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function buildAiHealth(int $chartDays = 30): array
    {
        $total = AiReciteAttempt::query()->count();
        $bands = AiReciteAttempt::query()
            ->selectRaw("COALESCE(NULLIF(LOWER(band), ''), 'unknown') as bucket, COUNT(*) as total")
            ->groupBy('bucket')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [
                'key' => (string) $row->bucket,
                'value' => (int) $row->total,
            ])
            ->values()
            ->all();

        $avg = AiReciteAttempt::query()->validScored()->avg('accuracy_percent');
        $last7d = AiReciteAttempt::query()
            ->where('created_at', '>=', now()->subDays(7))
            ->count();

        $complaintMetrics = app(FeedbackService::class)->aiComplaintMetrics([
            'days' => $chartDays,
        ]);

        return [
            'total' => $total,
            'last_7d' => $last7d,
            'avg_accuracy' => $avg !== null ? (int) round((float) $avg) : null,
            'bands' => $bands,
            'complaints' => $complaintMetrics['complaints'],
            'valid_scored_checks' => $complaintMetrics['valid_checks'],
            'complaint_rate_percent' => $complaintMetrics['complaint_rate_percent'],
        ];
    }

    /**
     * Active / recent learners with progress for the oversight table.
     *
     * @return list<array<string, mixed>>
     */
    private function buildLearnerRoster(int $limit): array
    {
        $limit = max(1, min(40, $limit));

        $recentUserIds = UserSession::query()
            ->where('is_onboarding_example', false)
            ->whereNotNull('user_id')
            ->orderByDesc('last_activity_at')
            ->limit($limit * 3)
            ->pluck('user_id')
            ->unique()
            ->take($limit)
            ->values();

        if ($recentUserIds->isEmpty()) {
            $users = User::query()
                ->orderByDesc('created_at')
                ->limit($limit)
                ->get([
                    'id', 'name', 'email', 'locale', 'google_id',
                    'subscription_status', 'subscription_tier',
                    'subscription_current_period_ends_at', 'created_at',
                ]);
        } else {
            $users = User::query()
                ->whereIn('id', $recentUserIds->all())
                ->get([
                    'id', 'name', 'email', 'locale', 'google_id',
                    'subscription_status', 'subscription_tier',
                    'subscription_current_period_ends_at', 'created_at',
                ]);
            // Preserve recency order from sessions.
            $order = $recentUserIds->flip();
            $users = $users->sortBy(fn (User $user) => $order[$user->id] ?? 999)->values();
        }

        return $this->enrichUsersWithProgress($users)->values()->all();
    }

    /**
     * @param  Collection<int, User>  $users
     * @return Collection<int, array<string, mixed>>
     */
    private function enrichUsersWithProgress($users)
    {
        $ids = $users->pluck('id')->all();
        if ($ids === []) {
            return collect();
        }

        $sessionCounts = UserSession::query()
            ->selectRaw('user_id, COUNT(*) as total')
            ->whereIn('user_id', $ids)
            ->where('is_onboarding_example', false)
            ->where('status', UserSessionStatus::Completed->value)
            ->groupBy('user_id')
            ->pluck('total', 'user_id');

        $lastActivity = UserSession::query()
            ->selectRaw('user_id, MAX(last_activity_at) as last_at')
            ->whereIn('user_id', $ids)
            ->where('is_onboarding_example', false)
            ->groupBy('user_id')
            ->pluck('last_at', 'user_id');

        $memorisedCounts = MemorisationProgress::query()
            ->selectRaw('user_id, COUNT(*) as total')
            ->whereIn('user_id', $ids)
            ->whereIn('status', ['memorised', 'mastered'])
            ->groupBy('user_id')
            ->pluck('total', 'user_id');

        $learningCounts = MemorisationProgress::query()
            ->selectRaw('user_id, COUNT(*) as total')
            ->whereIn('user_id', $ids)
            ->whereIn('status', ['learning', 'reviewing'])
            ->groupBy('user_id')
            ->pluck('total', 'user_id');

        $aiCounts = AiReciteAttempt::query()
            ->validScored()
            ->selectRaw('user_id, COUNT(*) as total, AVG(accuracy_percent) as avg_accuracy, MAX(created_at) as last_at')
            ->whereIn('user_id', $ids)
            ->groupBy('user_id')
            ->get()
            ->keyBy('user_id');

        $positions = UserLastPosition::query()
            ->whereIn('user_id', $ids)
            ->get(['user_id', 'surah_number', 'ayah_number'])
            ->keyBy('user_id');

        return $users->map(function (User $user) use (
            $sessionCounts,
            $lastActivity,
            $memorisedCounts,
            $learningCounts,
            $aiCounts,
            $positions
        ) {
            $ai = $aiCounts->get($user->id);
            $position = $positions->get($user->id);
            $surah = (int) ($position?->surah_number ?? 0);

            $sessionActivity = isset($lastActivity[$user->id])
                ? Carbon::parse($lastActivity[$user->id])
                : null;
            $loginActivity = $user->last_login_at
                ? Carbon::parse($user->last_login_at)
                : null;
            $bestActivity = null;
            if ($sessionActivity && $loginActivity) {
                $bestActivity = $sessionActivity->greaterThan($loginActivity) ? $sessionActivity : $loginActivity;
            } else {
                $bestActivity = $sessionActivity ?: $loginActivity;
            }

            return [
                'id' => (int) $user->id,
                'name' => (string) $user->name,
                'email' => (string) $user->email,
                'locale' => $user->locale ?: 'en',
                'auth_provider' => $user->google_id ? 'google' : 'email',
                'subscription_status' => $user->subscription_status ?: 'none',
                'subscription_tier' => $user->subscription_tier,
                'subscription_current_period_ends_at' => optional($user->subscription_current_period_ends_at)->toIso8601String(),
                'created_at' => optional($user->created_at)->toIso8601String(),
                'last_login_at' => optional($user->last_login_at)->toIso8601String(),
                'sessions_completed' => (int) ($sessionCounts[$user->id] ?? 0),
                'memorised_ayahs' => (int) ($memorisedCounts[$user->id] ?? 0),
                'learning_ayahs' => (int) ($learningCounts[$user->id] ?? 0),
                'ai_checks' => (int) ($ai?->total ?? 0),
                'avg_ai_accuracy' => $ai?->avg_accuracy !== null
                    ? (int) round((float) $ai->avg_accuracy)
                    : null,
                'last_ai_check_at' => $ai?->last_at
                    ? Carbon::parse($ai->last_at)->toIso8601String()
                    : null,
                'last_activity_at' => $bestActivity?->toIso8601String(),
                'current_surah_number' => $surah ?: null,
                'current_surah_name' => $surah > 0 ? QuranMetadata::name($surah) : null,
                'current_ayah' => $position?->ayah_number ? (int) $position->ayah_number : null,
            ];
        });
    }

    /**
     * @return array<string, mixed>
     */
    private function buildMix(): array
    {
        $subscriptionRows = User::query()
            ->selectRaw("COALESCE(NULLIF(subscription_status, ''), 'none') as bucket, COUNT(*) as total")
            ->groupBy('bucket')
            ->orderByDesc('total')
            ->get();

        $localeRows = User::query()
            ->selectRaw("COALESCE(NULLIF(locale, ''), 'en') as bucket, COUNT(*) as total")
            ->groupBy('bucket')
            ->orderByDesc('total')
            ->limit(6)
            ->get();

        $googleUsers = User::query()->whereNotNull('google_id')->count();
        $emailUsers = User::query()->whereNull('google_id')->count();

        return [
            'subscriptions' => $subscriptionRows->map(fn ($row) => [
                'key' => (string) $row->bucket,
                'value' => (int) $row->total,
            ])->values()->all(),
            'locales' => $localeRows->map(fn ($row) => [
                'key' => (string) $row->bucket,
                'value' => (int) $row->total,
            ])->values()->all(),
            'auth_providers' => [
                ['key' => 'google', 'value' => $googleUsers],
                ['key' => 'email', 'value' => $emailUsers],
            ],
        ];
    }

    /**
     * Platform pulse chart — sessions + AI checks (denser than ayah-only).
     *
     * @return array<string, mixed>
     */
    private function buildActivityChart(int $days): array
    {
        $from = now()->subDays($days - 1)->startOfDay();
        $to = now()->endOfDay();

        $analytics = LearningAnalytic::query()
            ->selectRaw('session_date, SUM(ayahs_memorised) as ayahs_memorised, SUM(COALESCE(ayahs_reviewed, 0)) as ayahs_reviewed, SUM(sessions_completed) as sessions_completed')
            ->whereDate('session_date', '>=', $from->toDateString())
            ->whereDate('session_date', '<=', $to->toDateString())
            ->groupBy('session_date')
            ->orderBy('session_date')
            ->get()
            ->keyBy(fn ($row) => Carbon::parse($row->session_date)->toDateString());

        $completedByDay = UserSession::query()
            ->where('is_onboarding_example', false)
            ->where('status', UserSessionStatus::Completed->value)
            ->where('ended_at', '>=', $from)
            ->where('ended_at', '<=', $to)
            ->selectRaw('DATE(ended_at) as day, COUNT(*) as aggregate')
            ->groupByRaw('DATE(ended_at)')
            ->pluck('aggregate', 'day');

        $aiByDay = AiReciteAttempt::query()
            ->where('created_at', '>=', $from)
            ->where('created_at', '<=', $to)
            ->selectRaw('DATE(created_at) as day, COUNT(*) as aggregate')
            ->groupByRaw('DATE(created_at)')
            ->pluck('aggregate', 'day');

        $signupsByDay = User::query()
            ->where('created_at', '>=', $from)
            ->where('created_at', '<=', $to)
            ->selectRaw('DATE(created_at) as day, COUNT(*) as aggregate')
            ->groupByRaw('DATE(created_at)')
            ->pluck('aggregate', 'day');

        $points = [];
        $cursor = $from->copy();
        while ($cursor->lte($to)) {
            $key = $cursor->toDateString();
            $analytic = $analytics->get($key);
            $ayahs = (int) ($analytic?->ayahs_memorised ?? 0) + (int) ($analytic?->ayahs_reviewed ?? 0);
            $sessions = (int) ($completedByDay[$key] ?? $analytic?->sessions_completed ?? 0);
            $aiChecks = (int) ($aiByDay[$key] ?? 0);
            $signups = (int) ($signupsByDay[$key] ?? 0);
            // Primary = sessions (most actionable ops signal); secondary = AI checks.
            $points[] = [
                'date' => $key,
                'sessions_completed' => $sessions,
                'ai_checks' => $aiChecks,
                'ayahs_practised' => $ayahs,
                'new_users' => $signups,
                'primary' => $sessions,
                'secondary' => $aiChecks,
            ];
            $cursor->addDay();
        }

        $totals = [
            'sessions' => array_sum(array_column($points, 'sessions_completed')),
            'ai_checks' => array_sum(array_column($points, 'ai_checks')),
            'ayahs' => array_sum(array_column($points, 'ayahs_practised')),
            'new_users' => array_sum(array_column($points, 'new_users')),
        ];

        $activeDays = count(array_filter(
            $points,
            fn ($p) => ($p['primary'] ?? 0) > 0
                || ($p['secondary'] ?? 0) > 0
                || ($p['ayahs_practised'] ?? 0) > 0
                || ($p['new_users'] ?? 0) > 0
        ));

        return [
            'days' => $days,
            'points' => $points,
            'totals' => $totals,
            'active_days' => $activeDays,
            'is_empty' => $activeDays === 0,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function buildWeekSummary(): array
    {
        $from = now()->startOfWeek();
        $to = now()->endOfDay();

        $sessions = UserSession::query()
            ->where('is_onboarding_example', false)
            ->where('status', UserSessionStatus::Completed->value)
            ->where('ended_at', '>=', $from)
            ->where('ended_at', '<=', $to)
            ->count();

        $aiChecks = AiReciteAttempt::query()
            ->where('created_at', '>=', $from)
            ->where('created_at', '<=', $to)
            ->count();

        $ayahs = (int) LearningAnalytic::query()
            ->whereDate('session_date', '>=', $from->toDateString())
            ->whereDate('session_date', '<=', $to->toDateString())
            ->sum(DB::raw('COALESCE(ayahs_memorised, 0) + COALESCE(ayahs_reviewed, 0)'));

        $newUsers = User::query()
            ->where('created_at', '>=', $from)
            ->where('created_at', '<=', $to)
            ->count();

        $isEmpty = $sessions === 0 && $aiChecks === 0 && $ayahs === 0 && $newUsers === 0;

        return [
            'sessions' => $sessions,
            'ai_checks' => $aiChecks,
            'ayahs' => $ayahs,
            'new_users' => $newUsers,
            'is_empty' => $isEmpty,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function buildPendingContacts(): array
    {
        $items = ContactSubmission::query()
            ->where('status', 'pending')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (ContactSubmission $row) => $this->contactPayload($row))
            ->values()
            ->all();

        $pendingTotal = ContactSubmission::query()->where('status', 'pending')->count();

        return [
            'items' => $items,
            'pending_total' => $pendingTotal,
            'has_more' => $pendingTotal > count($items),
            'view_all_href' => route('admin.contact-messages.index'),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildRecentActivity(int $limit): array
    {
        $events = collect();

        User::query()
            ->latest('created_at')
            ->limit(min(40, $limit))
            ->get(['id', 'name', 'email', 'created_at'])
            ->each(function (User $user) use ($events) {
                $events->push([
                    'id' => 'user-'.$user->id,
                    'type' => 'user_joined',
                    'outcome_key' => 'user_joined',
                    'user_id' => (int) $user->id,
                    'user_name' => $user->name,
                    'user_email' => $user->email,
                    'title' => $user->name ?: $user->email,
                    'occurred_at' => optional($user->created_at)->toIso8601String(),
                ]);
            });

        UserSession::query()
            ->with('user:id,name,email')
            ->where('is_onboarding_example', false)
            ->whereIn('status', [
                UserSessionStatus::Completed->value,
                UserSessionStatus::EndedEarly->value,
            ])
            ->orderByDesc('ended_at')
            ->limit(min(40, $limit))
            ->get()
            ->each(function (UserSession $session) use ($events) {
                $meta = is_array($session->metadata) ? $session->metadata : [];
                $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
                $surah = (int) ($session->surah_number ?: ($config['chapterId'] ?? 0));
                $from = (int) ($config['rangeStart'] ?? 0);
                $to = (int) ($config['rangeEnd'] ?? $from);
                $status = UserSessionStatus::tryFromMixed($session->status);
                $outcomeKey = $status === UserSessionStatus::EndedEarly
                    ? 'session_ended_early'
                    : 'session_completed';

                $events->push([
                    'id' => 'session-'.$session->id,
                    'type' => 'session',
                    'outcome_key' => $outcomeKey,
                    'user_id' => (int) $session->user_id,
                    'user_name' => $session->user?->name,
                    'user_email' => $session->user?->email,
                    'surah_number' => $surah ?: null,
                    'surah_name' => $surah > 0 ? QuranMetadata::name($surah) : null,
                    'ayah_start' => $from > 0 ? $from : null,
                    'ayah_end' => $to > 0 ? $to : null,
                    'occurred_at' => optional($session->ended_at ?? $session->last_activity_at)->toIso8601String(),
                ]);
            });

        AiReciteAttempt::query()
            ->with('user:id,name,email')
            ->latest('id')
            ->limit(min(40, $limit))
            ->get()
            ->each(function (AiReciteAttempt $attempt) use ($events) {
                $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
                $surah = (int) ($range['surah'] ?? $range['surahId'] ?? 0);
                $from = (int) ($range['from'] ?? $range['start'] ?? 0);
                $to = (int) ($range['to'] ?? $range['end'] ?? $from);
                $band = is_string($attempt->band) ? strtolower($attempt->band) : null;
                $accuracy = $attempt->accuracy_percent !== null ? (int) $attempt->accuracy_percent : null;

                $events->push([
                    'id' => 'ai-'.$attempt->id,
                    'type' => 'ai_check',
                    'outcome_key' => ($band || $accuracy !== null) ? 'ai_result' : 'ai_check',
                    'outcome_params' => array_filter([
                        'band' => $band,
                        'accuracy' => $accuracy,
                    ], fn ($value) => $value !== null && $value !== ''),
                    'user_id' => (int) $attempt->user_id,
                    'user_name' => $attempt->user?->name,
                    'user_email' => $attempt->user?->email,
                    'surah_number' => $surah ?: null,
                    'surah_name' => $surah > 0 ? QuranMetadata::name($surah) : null,
                    'ayah_start' => $from > 0 ? $from : null,
                    'ayah_end' => $to > 0 ? $to : null,
                    'occurred_at' => optional($attempt->created_at)->toIso8601String(),
                ]);
            });

        AyahNote::query()
            ->with('user:id,name,email')
            ->latest('id')
            ->limit(min(40, $limit))
            ->get()
            ->each(function (AyahNote $note) use ($events) {
                $events->push([
                    'id' => 'note-'.$note->id,
                    'type' => 'note',
                    'outcome_key' => 'note_saved',
                    'user_id' => (int) $note->user_id,
                    'user_name' => $note->user?->name,
                    'user_email' => $note->user?->email,
                    'surah_number' => (int) $note->surah_number ?: null,
                    'surah_name' => QuranMetadata::name((int) $note->surah_number),
                    'ayah_start' => (int) $note->ayah_number ?: null,
                    'ayah_end' => (int) $note->ayah_number ?: null,
                    'occurred_at' => optional($note->created_at)->toIso8601String(),
                ]);
            });

        return $events
            ->filter(fn ($event) => ! empty($event['occurred_at']))
            ->sortByDesc('occurred_at')
            ->unique(fn ($event) => ($event['id'] ?? '').'|'.$event['occurred_at'])
            ->take($limit)
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function contactPayload(ContactSubmission $row): array
    {
        return [
            'id' => (int) $row->id,
            'name' => (string) $row->name,
            'email' => (string) $row->email,
            'subject' => (string) ($row->subject ?: ''),
            'message' => (string) ($row->message ?: ''),
            'status' => (string) $row->status,
            'created_at' => optional($row->created_at)->toIso8601String(),
            'updated_at' => optional($row->updated_at)->toIso8601String(),
        ];
    }

    private function firstName(User $user): string
    {
        $name = trim((string) $user->name);
        if ($name === '') {
            return 'Admin';
        }

        return explode(' ', $name)[0] ?: 'Admin';
    }

    private function normalizeLocale(mixed $locale): string
    {
        $value = strtolower(trim((string) $locale));

        return in_array($value, ['en', 'ar', 'fr', 'es', 'tr', 'id', 'ur'], true) ? $value : 'en';
    }

    private function normalizeSubscriptionStatus(mixed $status): string
    {
        $value = strtolower(trim((string) $status));

        return in_array($value, ['none', 'trialing', 'active', 'canceled', 'past_due'], true)
            ? $value
            : 'none';
    }

    private function normalizeSubscriptionTier(mixed $tier): string
    {
        $value = strtolower(trim((string) $tier));

        return in_array($value, ['none', 'free', 'pro'], true)
            ? $value
            : 'none';
    }
}

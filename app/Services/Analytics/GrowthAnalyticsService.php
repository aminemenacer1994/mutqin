<?php

namespace App\Services\Analytics;

use App\Enums\UserSessionStatus;
use App\Models\ProductEvent;
use App\Models\User;
use App\Models\UserAchievement;
use App\Models\UserSession;
use App\Support\Analytics\ProductEventName;
use App\Support\Analytics\RegisteredUsers;
use App\Support\Analytics\SignupSource;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Growth report for one Europe/London date range.
 *
 * Account totals and practice come from users and user_sessions. Feature use
 * comes from product_events after collection started. PostHog is a diagnostic
 * comparison of signup events and never replaces the registered-user count.
 * Nothing is backfilled.
 */
final class GrowthAnalyticsService
{
    public const TIMEZONE = 'Europe/London';

    public function __construct(private readonly PostHogQueryClient $posthog) {}

    /**
     * @return array<string, mixed>
     */
    public function build(Carbon $from, Carbon $to): array
    {
        $from = $from->copy()->timezone(self::TIMEZONE)->startOfDay();
        $to = $to->copy()->timezone(self::TIMEZONE)->endOfDay();
        $today = now(self::TIMEZONE)->startOfDay();
        $days = $this->inclusiveDays($from, $to);
        $previousTo = $from->copy()->subDay()->endOfDay();
        $previousFrom = $from->copy()->subDays($days)->startOfDay();

        $fromUtc = $from->copy()->utc();
        $toUtc = $to->copy()->utc();
        $previousFromUtc = $previousFrom->copy()->utc();
        $previousToUtc = $previousTo->copy()->utc();

        $accounts = RegisteredUsers::query()
            ->whereBetween('created_at', [$previousFromUtc, $toUtc])
            ->get(['id', 'created_at', 'signup_utm_source', 'signup_utm_medium', 'signup_referral_code']);

        $currentCohort = $accounts->filter(fn (User $user) => $this->inRange($user->created_at, $fromUtc, $toUtc))->values();
        $previousCohort = $accounts->filter(fn (User $user) => $this->inRange($user->created_at, $previousFromUtc, $previousToUtc))->values();

        $cohortIds = $currentCohort->pluck('id')->map(fn ($id) => (int) $id)
            ->merge($previousCohort->pluck('id')->map(fn ($id) => (int) $id))
            ->unique()
            ->values()
            ->all();

        $cohortSessions = $cohortIds === []
            ? collect()
            : UserSession::query()
                ->whereIn('user_id', $cohortIds)
                ->where('is_onboarding_example', false)
                ->whereNotNull('started_at')
                ->get(['id', 'user_id', 'status', 'started_at', 'ended_at']);

        $activity = UserSession::query()
            ->where('is_onboarding_example', false)
            ->whereNotNull('user_id')
            ->whereNotNull('started_at')
            ->whereIn('user_id', RegisteredUsers::query()->select('id'))
            ->where(function ($query) use ($previousFromUtc, $toUtc) {
                $query->whereBetween('started_at', [$previousFromUtc, $toUtc])
                    ->orWhereBetween('ended_at', [$previousFromUtc, $toUtc]);
            })
            ->get(['id', 'user_id', 'status', 'started_at', 'ended_at']);

        $currentByUser = $cohortSessions
            ->whereIn('user_id', $currentCohort->pluck('id')->all())
            ->groupBy('user_id');
        $previousByUser = $cohortSessions
            ->whereIn('user_id', $previousCohort->pluck('id')->all())
            ->groupBy('user_id');

        $activation = $this->activation($currentCohort, $currentByUser);
        $previousActivation = $this->activation($previousCohort, $previousByUser);
        $retention = $this->retention($currentCohort, $currentByUser, $today);
        $previousRetention = $this->retention($previousCohort, $previousByUser, $today);
        $practice = $this->practice($activity, $from, $to);
        $previousPractice = $this->practice($activity, $previousFrom, $previousTo);
        $funnel = $this->funnel($currentCohort, $currentByUser, $activation, $today);
        $grain = $days > 31 ? 'week' : 'day';
        $features = $this->features($previousFromUtc, $toUtc, $fromUtc);
        $sources = $this->sources($currentCohort);
        $totalUsers = RegisteredUsers::count();
        $posthog = $this->posthog->registrationComparison($from, $to);
        $consistency = $this->consistency($currentCohort, $fromUtc, $toUtc, $posthog, $totalUsers);
        $generatedAt = now()->toIso8601String();

        $report = [
            'timezone' => self::TIMEZONE,
            'generated_at' => $generatedAt,
            'period' => [
                'from' => $from->toDateString(),
                'to' => $to->copy()->startOfDay()->toDateString(),
                'days' => $days,
                'grain' => $grain,
                'previous_from' => $previousFrom->toDateString(),
                'previous_to' => $previousTo->copy()->startOfDay()->toDateString(),
            ],
            'overview' => $this->overview(
                $totalUsers,
                $currentCohort->count(),
                $previousCohort->count(),
                $activation,
                $previousActivation,
                $practice,
                $previousPractice,
                $retention,
                $previousRetention,
                $days,
            ),
            'acquisition' => [
                'registrations' => [
                    'grain' => $grain,
                    'points' => $this->registrationSeries($currentCohort, $from, $to, $grain),
                ],
                'sources' => $sources,
                'referral' => $this->referral($currentCohort, $fromUtc, $toUtc),
            ],
            'funnel' => $funnel,
            'engagement' => [
                'active_learners' => [
                    'grain' => $grain,
                    'points' => $this->activeSeries($activity, $from, $to, $grain),
                ],
                'practice' => [
                    'grain' => $grain,
                    'points' => $this->practiceSeries($activity, $from, $to, $grain),
                ],
                'features' => $features,
                'achievements' => $this->achievements($fromUtc, $toUtc),
            ],
            'retention' => [
                'definition' => 'Retention uses Europe/London calendar days. A learner is retained on day N when they start a real practice session on the date N days after signup. Only signups old enough to have reached that day are included.',
                'cards' => $retention,
                'cohorts' => $this->cohortTable($currentCohort, $currentByUser, $today, $grain),
            ],
            'insights' => [],
            'consistency' => $consistency,
            'definitions' => $this->definitions(),
        ];
        $report['insights'] = $this->insights($report);

        return $report;
    }

    /**
     * @param  array{activated: int, first_completed: int}  $activation
     * @param  array{activated: int, first_completed: int}  $previousActivation
     * @param  array{started: int, completed: int, abandoned: int, active_users: int}  $practice
     * @param  array{started: int, completed: int, abandoned: int, active_users: int}  $previousPractice
     * @param  array<string, array<string, mixed>>  $retention
     * @param  array<string, array<string, mixed>>  $previousRetention
     * @return list<array<string, mixed>>
     */
    private function overview(
        int $totalUsers,
        int $registrations,
        int $previousRegistrations,
        array $activation,
        array $previousActivation,
        array $practice,
        array $previousPractice,
        array $retention,
        array $previousRetention,
        int $days,
    ): array {
        $completion = $this->rate($practice['completed'], $practice['started']);
        $previousCompletion = $this->rate($previousPractice['completed'], $previousPractice['started']);
        $day7 = $retention['day_7'];
        $previousDay7 = $previousRetention['day_7'];

        return [
            $this->card(
                'total_registered_users',
                'Total registered users',
                $totalUsers,
                (string) $totalUsers,
                null,
                'All time',
                'Every non-deleted account. Same count as the Users total.',
                null,
            ),
            $this->card(
                'new_registrations',
                'New registrations',
                $registrations,
                (string) $registrations,
                null,
                '',
                'Accounts whose signup timestamp falls in the selected Europe/London dates.',
                $this->trend($registrations, $previousRegistrations, true),
            ),
            $this->card(
                'activated_users',
                'Activated users',
                $activation['activated'],
                (string) $activation['activated'],
                null,
                $registrations > 0
                    ? 'of '.$registrations.' new'
                    : 'Started practice',
                'New accounts in this period with at least one real practice session. Example sittings are excluded.',
                $this->trend($activation['activated'], $previousActivation['activated'], true),
            ),
            $this->card(
                'active_learners',
                'Active learners',
                $practice['active_users'],
                (string) $practice['active_users'],
                null,
                '',
                'Distinct non-deleted accounts with a real session started or completed in the selected dates.',
                $this->trend($practice['active_users'], $previousPractice['active_users'], true),
            ),
            $this->card(
                'session_completion_rate',
                'Session completion rate',
                $completion,
                $this->percentLabel($completion),
                $practice['started'] === 0 ? 'No sessions' : null,
                $practice['started'] === 0
                    ? ''
                    : $practice['completed'].' of '.$practice['started'].' started',
                'Completed sittings divided by sittings that started in the period. A sitting still in progress counts as started only.',
                $this->trend($completion, $previousCompletion, $completion !== null && $previousCompletion !== null),
            ),
            $this->card(
                'day_7_retention',
                'Day 7 retention',
                $day7['status'] === 'ready' ? $day7['rate'] : null,
                $day7['status'] === 'ready' ? $this->percentLabel($day7['rate']) : null,
                $day7['status'] === 'ready' ? null : 'Not enough data',
                $day7['status'] === 'ready'
                    ? $day7['retained'].' of '.$day7['eligible']
                    : '',
                'Share of new accounts who started a real session on the 7th London calendar day after signup. Younger signups are excluded.',
                $day7['status'] === 'ready' && $previousDay7['status'] === 'ready'
                    ? $this->trend($day7['rate'], $previousDay7['rate'], true)
                    : null,
            ),
        ];
    }

    /**
     * @param  Collection<int, User>  $cohort
     * @param  Collection<int|string, Collection<int, UserSession>>  $byUser
     * @return array{activated: int, first_completed: int}
     */
    private function activation(Collection $cohort, Collection $byUser): array
    {
        $activated = 0;
        $firstCompleted = 0;
        foreach ($cohort as $user) {
            /** @var Collection<int, UserSession> $rows */
            $rows = $byUser->get($user->id, collect());
            if ($rows->isEmpty()) {
                continue;
            }
            $activated++;
            $first = $rows->sortBy(fn (UserSession $row) => $row->started_at?->getTimestamp() ?? PHP_INT_MAX)->first();
            if ($this->status($first) === UserSessionStatus::Completed) {
                $firstCompleted++;
            }
        }

        return ['activated' => $activated, 'first_completed' => $firstCompleted];
    }

    /**
     * @param  Collection<int, UserSession>  $sessions
     * @return array{started: int, completed: int, abandoned: int, active_users: int}
     */
    private function practice(Collection $sessions, Carbon $from, Carbon $to): array
    {
        $started = 0;
        $completed = 0;
        $abandoned = 0;
        $active = [];
        foreach ($sessions as $session) {
            $status = $this->status($session);
            $startedHere = $session->started_at && $this->londonInRange($session->started_at, $from, $to);
            $completedHere = $status === UserSessionStatus::Completed
                && $session->ended_at
                && $this->londonInRange($session->ended_at, $from, $to);
            if ($startedHere) {
                $started++;
                $active[(int) $session->user_id] = true;
                if ($status === UserSessionStatus::Completed) {
                    $completed++;
                }
                if ($status === UserSessionStatus::Abandoned || $status === UserSessionStatus::EndedEarly) {
                    $abandoned++;
                }
            }
            if ($completedHere) {
                $active[(int) $session->user_id] = true;
            }
        }

        return [
            'started' => $started,
            'completed' => $completed,
            'abandoned' => $abandoned,
            'active_users' => count($active),
        ];
    }

    /**
     * @param  Collection<int, User>  $cohort
     * @param  Collection<int|string, Collection<int, UserSession>>  $byUser
     * @param  array{activated: int, first_completed: int}  $activation
     * @return array<string, mixed>
     */
    private function funnel(Collection $cohort, Collection $byUser, array $activation, Carbon $today): array
    {
        $registered = $cohort->count();
        $started = $activation['activated'];
        $completed = $activation['first_completed'];
        $return = $this->returns($cohort, $byUser, $today);

        $startedConversion = $this->rate($started, $registered);
        $completedConversion = $this->rate($completed, $started);
        $returnedConversion = $return['status'] === 'ready' ? $this->rate($return['returned'], $return['eligible']) : null;

        $stages = [
            [
                'key' => 'registered',
                'label' => 'Registered',
                'status' => 'ready',
                'users' => $registered,
                'conversion' => null,
                'dropoff' => null,
                'bar' => $registered > 0 ? 1 : 0,
                'detail' => 'Accounts created in the selected dates',
            ],
            [
                'key' => 'started_first_session',
                'label' => 'Started first session',
                'status' => 'ready',
                'users' => $started,
                'conversion' => $startedConversion,
                'dropoff' => $this->dropoff($startedConversion),
                'bar' => $registered > 0 ? round($started / $registered, 4) : 0,
                'detail' => 'New accounts with a real practice session',
            ],
            [
                'key' => 'completed_first_session',
                'label' => 'Completed first session',
                'status' => 'ready',
                'users' => $completed,
                'conversion' => $completedConversion,
                'dropoff' => $this->dropoff($completedConversion),
                'bar' => $registered > 0 ? round($completed / $registered, 4) : 0,
                'detail' => 'Those whose earliest session finished its range',
            ],
            [
                'key' => 'returned',
                'label' => 'Returned for another session',
                'status' => $return['status'],
                'users' => $return['status'] === 'ready' ? $return['returned'] : null,
                'eligible' => $return['eligible'],
                'conversion' => $returnedConversion,
                'dropoff' => $this->dropoff($returnedConversion),
                'bar' => $return['status'] === 'ready' && $registered > 0 ? round($return['returned'] / $registered, 4) : null,
                'detail' => $return['status'] === 'ready'
                    ? $return['returned'].' of '.$return['eligible'].' eligible'
                    : 'Not enough historical data yet',
            ],
        ];

        return [
            'return_window' => 'Returned means a real session on a later London calendar day, within 7 days of signup. Accounts younger than 7 days are left out of this stage.',
            'stages' => $stages,
            'biggest_dropoff' => $this->biggestDropoff($stages),
        ];
    }

    /**
     * @param  Collection<int, User>  $cohort
     * @param  Collection<int|string, Collection<int, UserSession>>  $byUser
     * @return array{status: string, eligible: int, returned: int}
     */
    private function returns(Collection $cohort, Collection $byUser, Carbon $today): array
    {
        $eligible = 0;
        $returned = 0;
        $todayDate = $today->toDateString();
        foreach ($cohort as $user) {
            $signup = $user->created_at?->copy()->timezone(self::TIMEZONE)->startOfDay();
            if (! $signup) {
                continue;
            }
            $windowEnd = $signup->copy()->addDays(7)->toDateString();
            if ($windowEnd > $todayDate) {
                continue;
            }
            $eligible++;
            $signupDate = $signup->toDateString();
            /** @var Collection<int, UserSession> $rows */
            $rows = $byUser->get($user->id, collect());
            $hit = $rows->contains(function (UserSession $row) use ($signupDate, $windowEnd) {
                $day = $this->londonDate($row->started_at);

                return $day !== null && $day > $signupDate && $day <= $windowEnd;
            });
            if ($hit) {
                $returned++;
            }
        }

        return [
            'status' => $eligible > 0 ? 'ready' : 'immature',
            'eligible' => $eligible,
            'returned' => $returned,
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $stages
     * @return array{label: string, dropoff: float, keys: list<string>}|null
     */
    private function biggestDropoff(array $stages): ?array
    {
        $best = null;
        $leaders = [];
        foreach ($stages as $stage) {
            if (! is_float($stage['dropoff']) && ! is_int($stage['dropoff'])) {
                continue;
            }
            $dropoff = (float) $stage['dropoff'];
            if ($dropoff <= 0) {
                continue;
            }
            if ($best === null || $dropoff > $best + 0.00001) {
                $best = $dropoff;
                $leaders = [$stage];
                continue;
            }
            if (abs($dropoff - $best) <= 0.00001) {
                $leaders[] = $stage;
            }
        }
        if ($best === null || $leaders === []) {
            return null;
        }

        return [
            'label' => implode(' and ', array_map(fn (array $stage) => (string) $stage['label'], $leaders)),
            'dropoff' => $best,
            'keys' => array_map(fn (array $stage) => (string) $stage['key'], $leaders),
        ];
    }

    /**
     * @param  Collection<int, User>  $cohort
     * @param  Collection<int|string, Collection<int, UserSession>>  $byUser
     * @return array<string, array<string, mixed>>
     */
    private function retention(Collection $cohort, Collection $byUser, Carbon $today): array
    {
        $out = [];
        foreach ([1, 7, 30] as $day) {
            $out['day_'.$day] = $this->retentionDay($cohort, $byUser, $today, $day);
        }

        return $out;
    }

    /**
     * @param  Collection<int, User>  $cohort
     * @param  Collection<int|string, Collection<int, UserSession>>  $byUser
     * @return array{day: int, label: string, eligible: int, retained: int, rate: float|null, status: string}
     */
    private function retentionDay(Collection $cohort, Collection $byUser, Carbon $today, int $day): array
    {
        $eligible = 0;
        $retained = 0;
        $todayDate = $today->toDateString();
        foreach ($cohort as $user) {
            $signup = $user->created_at?->copy()->timezone(self::TIMEZONE)->startOfDay();
            if (! $signup) {
                continue;
            }
            $target = $signup->copy()->addDays($day)->toDateString();
            if ($target > $todayDate) {
                continue;
            }
            $eligible++;
            /** @var Collection<int, UserSession> $rows */
            $rows = $byUser->get($user->id, collect());
            if ($rows->contains(fn (UserSession $row) => $this->londonDate($row->started_at) === $target)) {
                $retained++;
            }
        }

        return [
            'day' => $day,
            'label' => 'Day '.$day,
            'eligible' => $eligible,
            'retained' => $retained,
            'rate' => $eligible > 0 ? round($retained / $eligible, 4) : null,
            'status' => $eligible > 0 ? 'ready' : 'immature',
        ];
    }

    /**
     * @param  Collection<int, User>  $cohort
     * @param  Collection<int|string, Collection<int, UserSession>>  $byUser
     * @return list<array<string, mixed>>
     */
    private function cohortTable(Collection $cohort, Collection $byUser, Carbon $today, string $grain): array
    {
        $groups = [];
        foreach ($cohort as $user) {
            $created = $user->created_at;
            if (! $created) {
                continue;
            }
            $key = $grain === 'week'
                ? $created->copy()->timezone(self::TIMEZONE)->startOfWeek(Carbon::MONDAY)->toDateString()
                : $this->londonDate($created);
            if ($key === null) {
                continue;
            }
            $groups[$key][] = $user;
        }
        ksort($groups);
        $groups = array_slice($groups, -21, 21, true);
        $rows = [];
        foreach ($groups as $date => $users) {
            $collection = collect($users);
            $row = ['date' => $date, 'users' => $collection->count()];
            foreach ([1, 7, 30] as $day) {
                $row['day_'.$day] = $this->retentionDay($collection, $byUser, $today, $day);
            }
            $rows[] = $row;
        }

        return $rows;
    }

    /**
     * @param  Collection<int, User>  $cohort
     * @return list<array{date: string, count: int}>
     */
    private function registrationSeries(Collection $cohort, Carbon $from, Carbon $to, string $grain): array
    {
        $counts = [];
        foreach ($cohort as $user) {
            $bucket = $this->bucket($user->created_at, $grain);
            if ($bucket === null) {
                continue;
            }
            $counts[$bucket] = ($counts[$bucket] ?? 0) + 1;
        }

        return $this->fillBuckets($from, $to, $grain, function (string $bucket) use ($counts) {
            return ['date' => $bucket, 'count' => $counts[$bucket] ?? 0];
        });
    }

    /**
     * @param  Collection<int, UserSession>  $sessions
     * @return list<array{date: string, users: int}>
     */
    private function activeSeries(Collection $sessions, Carbon $from, Carbon $to, string $grain): array
    {
        $sets = [];
        foreach ($sessions as $session) {
            $status = $this->status($session);
            $days = [];
            if ($session->started_at && $this->londonInRange($session->started_at, $from, $to)) {
                $days[] = $this->bucket($session->started_at, $grain);
            }
            if ($status === UserSessionStatus::Completed && $session->ended_at && $this->londonInRange($session->ended_at, $from, $to)) {
                $days[] = $this->bucket($session->ended_at, $grain);
            }
            foreach ($days as $day) {
                if ($day === null) {
                    continue;
                }
                $sets[$day][(int) $session->user_id] = true;
            }
        }

        return $this->fillBuckets($from, $to, $grain, function (string $bucket) use ($sets) {
            return ['date' => $bucket, 'users' => isset($sets[$bucket]) ? count($sets[$bucket]) : 0];
        });
    }

    /**
     * @param  Collection<int, UserSession>  $sessions
     * @return list<array{date: string, started: int, completed: int, abandoned: int}>
     */
    private function practiceSeries(Collection $sessions, Carbon $from, Carbon $to, string $grain): array
    {
        $counts = [];
        foreach ($sessions as $session) {
            if (! $session->started_at || ! $this->londonInRange($session->started_at, $from, $to)) {
                continue;
            }
            $bucket = $this->bucket($session->started_at, $grain);
            if ($bucket === null) {
                continue;
            }
            $counts[$bucket] ??= ['started' => 0, 'completed' => 0, 'abandoned' => 0];
            $counts[$bucket]['started']++;
            $status = $this->status($session);
            if ($status === UserSessionStatus::Completed) {
                $counts[$bucket]['completed']++;
            }
            if ($status === UserSessionStatus::Abandoned || $status === UserSessionStatus::EndedEarly) {
                $counts[$bucket]['abandoned']++;
            }
        }

        return $this->fillBuckets($from, $to, $grain, function (string $bucket) use ($counts) {
            $row = $counts[$bucket] ?? ['started' => 0, 'completed' => 0, 'abandoned' => 0];

            return ['date' => $bucket, ...$row];
        });
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function features(Carbon $previousFromUtc, Carbon $toUtc, Carbon $fromUtc): array
    {
        $catalog = [
            ['key' => 'progressive_hiding', 'label' => 'Progressive Hiding', 'events' => [ProductEventName::PROGRESSIVE_HIDING_USED], 'feature_ids' => null, 'detail' => null],
            ['key' => 'ai_recite', 'label' => 'AI Recite', 'events' => [ProductEventName::AI_RECITE_STARTED, ProductEventName::AI_RECITE_COMPLETED], 'feature_ids' => null, 'detail' => null],
            ['key' => 'daily_mutqin', 'label' => 'Daily Mutqin', 'events' => [ProductEventName::DAILY_MUTQIN_STARTED, ProductEventName::DAILY_MUTQIN_COMPLETED], 'feature_ids' => null, 'detail' => null],
            ['key' => 'personalised_revision', 'label' => 'Personalised Revision', 'events' => [ProductEventName::RECOMMENDATION_FOLLOWED], 'feature_ids' => null, 'detail' => null],
            ['key' => 'saved_sessions', 'label' => 'Saved Sessions', 'events' => [], 'feature_ids' => null, 'detail' => null],
            ['key' => 'listen_repeat', 'label' => 'Listen & Repeat', 'events' => [ProductEventName::DAILY_MUTQIN_STEP_VIEWED], 'feature_ids' => ['listen', 'repeat'], 'detail' => 'Counted when a Daily Mutqin listen or repeat step is shown.'],
            ['key' => 'achievements', 'label' => 'Achievements', 'events' => [ProductEventName::ACHIEVEMENT_UNLOCKED, ProductEventName::ACHIEVEMENT_VIEWED, ProductEventName::ACHIEVEMENT_PROGRESS_VIEWED], 'feature_ids' => null, 'detail' => 'Unlocks and views. Correlation with retention is not causation.'],
        ];

        $names = [];
        foreach ($catalog as $feature) {
            foreach ($feature['events'] as $name) {
                $names[$name] = true;
            }
        }
        $events = $names === []
            ? collect()
            : ProductEvent::query()
                ->whereIn('event_name', array_keys($names))
                ->whereBetween('occurred_at', [$previousFromUtc, $toUtc])
                ->get(['event_name', 'user_id', 'occurred_at', 'properties']);

        $rows = [];
        foreach ($catalog as $feature) {
            if ($feature['events'] === []) {
                $rows[] = $this->featureRow($feature['key'], $feature['label'], false, null, null, null, null);

                continue;
            }
            $matched = $events->filter(fn (ProductEvent $event) => $this->featureMatches($event, $feature['events'], $feature['feature_ids']));
            $ever = $matched->isNotEmpty() || $this->featureExists($feature['events'], $feature['feature_ids']);
            if (! $ever) {
                $rows[] = $this->featureRow($feature['key'], $feature['label'], false, null, null, null, null);

                continue;
            }
            $preferred = $this->preferredFeatureEvents($feature['key'], $matched);
            $current = $preferred->filter(fn (ProductEvent $event) => $event->occurred_at && $event->occurred_at->gte($fromUtc));
            $previous = $preferred->filter(fn (ProductEvent $event) => $event->occurred_at && $event->occurred_at->lt($fromUtc));
            $users = $current->pluck('user_id')->filter()->unique()->count();
            $uses = $current->count();
            $previousUses = $previous->count();
            $detail = $feature['detail'];
            if ($feature['key'] === 'ai_recite' && ! $matched->contains('event_name', ProductEventName::AI_RECITE_STARTED)) {
                $detail = 'Counted from completed recitations. Starts are not stored yet.';
            }
            if ($feature['key'] === 'daily_mutqin' && ! $matched->contains('event_name', ProductEventName::DAILY_MUTQIN_STARTED)) {
                $detail = 'Counted from completions. Starts are not stored yet.';
            }
            $rows[] = $this->featureRow(
                $feature['key'],
                $feature['label'],
                true,
                $users,
                $uses,
                $detail,
                $this->trend($uses, $previousUses, true),
            );
        }

        return $rows;
    }

    /**
     * @param  list<string>  $events
     * @param  list<string>|null  $featureIds
     */
    private function featureExists(array $events, ?array $featureIds): bool
    {
        $query = ProductEvent::query()->whereIn('event_name', $events);
        if ($featureIds !== null) {
            $query->where(function ($inner) use ($featureIds) {
                foreach ($featureIds as $featureId) {
                    $inner->orWhere('properties->feature_id', $featureId);
                }
            });
        }

        return $query->exists();
    }

    /**
     * @param  list<string>  $events
     * @param  list<string>|null  $featureIds
     */
    private function featureMatches(ProductEvent $event, array $events, ?array $featureIds): bool
    {
        if (! in_array($event->event_name, $events, true)) {
            return false;
        }
        if ($featureIds === null) {
            return true;
        }
        $featureId = strtolower((string) ($event->properties['feature_id'] ?? ''));

        return in_array($featureId, $featureIds, true);
    }

    /**
     * Prefer the start event when both a start and a completion were stored,
     * so one sitting is not counted twice.
     *
     * @param  Collection<int, ProductEvent>  $matched
     * @return Collection<int, ProductEvent>
     */
    private function preferredFeatureEvents(string $key, Collection $matched): Collection
    {
        $preferred = match ($key) {
            'ai_recite' => ProductEventName::AI_RECITE_STARTED,
            'daily_mutqin' => ProductEventName::DAILY_MUTQIN_STARTED,
            default => null,
        };
        if ($preferred === null || ! $matched->contains('event_name', $preferred)) {
            return $matched;
        }

        return $matched->where('event_name', $preferred)->values();
    }

    /**
     * @return array<string, mixed>
     */
    private function featureRow(string $key, string $label, bool $collected, ?int $users, ?int $uses, ?string $detail, ?array $comparison): array
    {
        return [
            'key' => $key,
            'label' => $label,
            'collected' => $collected,
            'users' => $users,
            'uses' => $uses,
            'detail' => $detail,
            'comparison' => $comparison,
        ];
    }

    /**
     * @param  Collection<int, User>  $cohort
     * @return list<array{key: string, label: string, count: int, share: float|null, verified: bool}>
     */
    private function sources(Collection $cohort): array
    {
        $counts = [];
        foreach ($cohort as $user) {
            $source = SignupSource::classify(
                $user->signup_utm_source,
                $user->signup_utm_medium,
                $user->signup_referral_code,
            );
            $key = $source['key'].'|'.$source['label'];
            $counts[$key] ??= $source + ['count' => 0];
            $counts[$key]['count']++;
        }
        uasort($counts, fn (array $a, array $b) => $b['count'] <=> $a['count']);
        $total = $cohort->count();
        $rows = [];
        foreach ($counts as $row) {
            $rows[] = [
                'key' => $row['key'],
                'label' => $row['label'],
                'count' => $row['count'],
                'share' => $total > 0 ? round($row['count'] / $total, 4) : null,
                'verified' => $row['verified'],
            ];
        }

        return $rows;
    }

    /**
     * @param  Collection<int, User>  $cohort
     * @return array{link_opens: int, signups: int, rate: float|null, activations: int, activation_rate: float|null}
     */
    private function referral(Collection $cohort, Carbon $fromUtc, Carbon $toUtc): array
    {
        $opens = ProductEvent::query()
            ->where('event_name', ProductEventName::REFERRAL_LINK_OPENED)
            ->whereBetween('occurred_at', [$fromUtc, $toUtc])
            ->count();
        $signups = $cohort->filter(fn (User $user) => trim((string) $user->signup_referral_code) !== '')->count();
        $activations = ProductEvent::query()
            ->where('event_name', ProductEventName::REFERRAL_ACTIVATED)
            ->whereBetween('occurred_at', [$fromUtc, $toUtc])
            ->count();

        return [
            'link_opens' => $opens,
            'signups' => $signups,
            'rate' => $opens > 0 ? round($signups / $opens, 4) : null,
            'activations' => $activations,
            'activation_rate' => $signups > 0 ? round($activations / $signups, 4) : null,
        ];
    }

    /**
     * @param  Collection<int, User>  $cohort
     * @param  array<string, mixed>  $posthog
     * @return array<string, mixed>
     */
    private function consistency(Collection $cohort, Carbon $fromUtc, Carbon $toUtc, array $posthog, int $totalUsers): array
    {
        $ids = $cohort->pluck('id')->map(fn ($id) => (int) $id)->all();
        $signupEvents = $ids === []
            ? collect()
            : ProductEvent::query()
                ->where('event_name', ProductEventName::SIGNUP_COMPLETED)
                ->whereIn('user_id', $ids)
                ->get(['user_id']);
        $distinct = $signupEvents->pluck('user_id')->filter()->unique()->count();
        $duplicates = max(0, $signupEvents->count() - $distinct);
        $missingUser = ProductEvent::query()
            ->where('event_name', ProductEventName::SIGNUP_COMPLETED)
            ->whereNull('user_id')
            ->whereBetween('occurred_at', [$fromUtc, $toUtc])
            ->count();
        $firstSignup = ProductEvent::query()->where('event_name', ProductEventName::SIGNUP_COMPLETED)->min('occurred_at');
        $beforeTracking = $firstSignup
            ? RegisteredUsers::query()->where('created_at', '<', $firstSignup)->count()
            : null;
        $missingInPeriod = max(0, $cohort->count() - $distinct);

        $notes = [];
        if ($firstSignup === null) {
            $notes[] = 'No signup events stored yet. Earlier registrations were not backfilled.';
        } elseif ($beforeTracking > 0) {
            $notes[] = $beforeTracking.' accounts predate signup tracking and were not backfilled.';
        }
        if ($missingInPeriod > 0 && $firstSignup !== null) {
            $notes[] = $missingInPeriod.' accounts in this period have no signup event.';
        }
        if ($duplicates > 0) {
            $notes[] = $duplicates.' duplicate signup events.';
        }
        if ($missingUser > 0) {
            $notes[] = $missingUser.' signup events have no account id.';
        }
        $unattributed = $cohort->contains(function (User $user) {
            return SignupSource::classify(
                $user->signup_utm_source,
                $user->signup_utm_medium,
                $user->signup_referral_code,
            )['key'] === 'unattributed';
        });
        if ($unattributed) {
            $notes[] = 'Some accounts have no stored source.';
        }
        if (($posthog['status'] ?? '') === 'ok') {
            $events = $posthog['registration_events'];
            $people = $posthog['registration_people'];
            if (is_int($events) && is_int($people)) {
                if ($events !== $cohort->count()) {
                    $notes[] = 'PostHog has '.$events.' signup events ('.$people.' people). The database has '.$cohort->count().'.';
                }
                if ($events > $people) {
                    $notes[] = 'Some people have more than one PostHog signup event.';
                }
                $production = $posthog['production_events'];
                $nonProduction = $posthog['non_production_events'];
                if (is_int($production) && is_int($nonProduction)) {
                    $unscoped = $events - $production - $nonProduction;
                    if ($unscoped > 0) {
                        $notes[] = $unscoped.' PostHog signup events have no environment.';
                    } elseif ($nonProduction > 0) {
                        $notes[] = $nonProduction.' PostHog signup events are local or testing.';
                    }
                }
            }
        }

        return [
            'database_total_users' => $totalUsers,
            'database_period_registrations' => $cohort->count(),
            'signup_events' => $signupEvents->count(),
            'signup_events_distinct_users' => $distinct,
            'signup_events_missing_user' => $missingUser,
            'duplicate_signup_events' => $duplicates,
            'accounts_before_first_signup_event' => $beforeTracking,
            'period_accounts_missing_signup_event' => $missingInPeriod,
            'posthog' => $posthog,
            'notes' => $notes,
        ];
    }

    /**
     * @param  array<string, mixed>  $report
     * @return list<string>
     */
    private function insights(array $report): array
    {
        $lines = [];
        $cards = [];
        foreach ($report['overview'] as $card) {
            $cards[$card['key']] = $card;
        }
        $registrations = (int) ($cards['new_registrations']['value'] ?? 0);
        $activated = (int) ($cards['activated_users']['value'] ?? 0);
        if ($registrations > 0) {
            if ($activated === $registrations) {
                $lines[] = 'Every new user in this period started a session.';
            } elseif ($activated === 0) {
                $lines[] = 'No new user in this period has started a session.';
            } elseif ($activated * 2 === $registrations) {
                $lines[] = 'Half of new users started a session.';
            } elseif ($activated / $registrations > 0.5) {
                $lines[] = 'Most new users started a session.';
            } else {
                $lines[] = 'Most new users have not started a session.';
            }
        }

        $dropoff = $report['funnel']['biggest_dropoff'] ?? null;
        if (is_array($dropoff) && count($dropoff['keys'] ?? []) === 1) {
            $lines[] = match ($dropoff['keys'][0]) {
                'started_first_session' => 'Starting a first session is the largest drop-off.',
                'completed_first_session' => 'First-session completion is the largest drop-off.',
                'returned' => 'Returning for another session is the largest drop-off.',
                default => null,
            };
        } elseif (is_array($dropoff) && count($dropoff['keys'] ?? []) > 1) {
            $lines[] = 'The largest drop-off is shared by '.strtolower((string) $dropoff['label']).'.';
        }

        $features = array_values(array_filter(
            $report['engagement']['features'] ?? [],
            fn (array $feature) => ($feature['collected'] ?? false) && (int) ($feature['uses'] ?? 0) > 0,
        ));
        if ($features !== []) {
            usort($features, fn (array $a, array $b) => $b['uses'] <=> $a['uses']);
            $top = (int) $features[0]['uses'];
            $leaders = array_values(array_filter($features, fn (array $feature) => (int) $feature['uses'] === $top));
            if (count($leaders) === 1) {
                $lines[] = $leaders[0]['label'].' is the most frequently used feature.';
            }
        }

        $verified = array_values(array_filter(
            $report['acquisition']['sources'] ?? [],
            fn (array $source) => ($source['verified'] ?? false) === true && (int) $source['count'] > 0,
        ));
        if (count($verified) === 1 || (count($verified) > 1 && $verified[0]['count'] > $verified[1]['count'])) {
            $lines[] = $verified[0]['label'].' is the largest verified source.';
        }

        return array_values(array_filter($lines, fn ($line) => is_string($line) && $line !== ''));
    }

    /**
     * @return array<string, mixed>
     */
    private function card(
        string $key,
        string $title,
        int|float|null $value,
        ?string $display,
        ?string $empty,
        string $subtitle,
        string $hint,
        ?array $comparison,
    ): array {
        return [
            'key' => $key,
            'title' => $title,
            'value' => $value,
            'display' => $display,
            'empty' => $empty,
            'subtitle' => $subtitle,
            'hint' => $hint,
            'comparison' => $comparison,
        ];
    }

    /**
     * @return array{kind: string, percent: float|null, previous: int|float|null}|null
     */
    private function trend(int|float|null $current, int|float|null $previous, bool $comparable): ?array
    {
        if (! $comparable || $current === null || $previous === null) {
            return null;
        }
        if ($previous == 0.0 && $current == 0.0) {
            return null;
        }
        if ($previous == 0.0) {
            return ['kind' => 'new', 'percent' => null, 'previous' => $previous];
        }

        return [
            'kind' => 'percent',
            'percent' => round((($current - $previous) / $previous) * 100, 1),
            'previous' => $previous,
        ];
    }

    private function rate(int|float|null $numerator, int|float|null $denominator): ?float
    {
        if ($denominator === null || $denominator <= 0 || $numerator === null) {
            return null;
        }

        return round($numerator / $denominator, 4);
    }

    private function dropoff(?float $conversion): ?float
    {
        if ($conversion === null) {
            return null;
        }

        return round(1 - $conversion, 4);
    }

    private function percentLabel(?float $rate): ?string
    {
        if ($rate === null) {
            return null;
        }
        $pct = round($rate * 100, 1);
        if (abs($pct - round($pct)) < 0.05) {
            return ((int) round($pct)).'%';
        }

        return $pct.'%';
    }

    /**
     * @param  callable(string): array<string, mixed>  $make
     * @return list<array<string, mixed>>
     */
    private function fillBuckets(Carbon $from, Carbon $to, string $grain, callable $make): array
    {
        $rows = [];
        $cursor = $grain === 'week'
            ? $from->copy()->timezone(self::TIMEZONE)->startOfWeek(Carbon::MONDAY)
            : $from->copy()->timezone(self::TIMEZONE)->startOfDay();
        $end = $grain === 'week'
            ? $to->copy()->timezone(self::TIMEZONE)->startOfWeek(Carbon::MONDAY)
            : $to->copy()->timezone(self::TIMEZONE)->startOfDay();
        $guard = 0;
        while ($cursor->lte($end) && $guard < 140) {
            $rows[] = $make($cursor->toDateString());
            $grain === 'week' ? $cursor->addWeek() : $cursor->addDay();
            $guard++;
        }

        return $rows;
    }

    private function bucket(?Carbon $moment, string $grain): ?string
    {
        if (! $moment) {
            return null;
        }
        $local = $moment->copy()->timezone(self::TIMEZONE);

        return $grain === 'week'
            ? $local->startOfWeek(Carbon::MONDAY)->toDateString()
            : $local->toDateString();
    }

    private function londonDate(?Carbon $moment): ?string
    {
        return $moment?->copy()->timezone(self::TIMEZONE)->toDateString();
    }

    private function londonInRange(Carbon $moment, Carbon $from, Carbon $to): bool
    {
        $day = $moment->copy()->timezone(self::TIMEZONE);

        return $day->gte($from->copy()->timezone(self::TIMEZONE)->startOfDay())
            && $day->lte($to->copy()->timezone(self::TIMEZONE)->endOfDay());
    }

    private function inRange(?Carbon $moment, Carbon $fromUtc, Carbon $toUtc): bool
    {
        return $moment !== null && $moment->gte($fromUtc) && $moment->lte($toUtc);
    }

    private function inclusiveDays(Carbon $from, Carbon $to): int
    {
        return (int) round(abs(
            $from->copy()->startOfDay()->diffInDays($to->copy()->startOfDay())
        )) + 1;
    }

    private function status(?UserSession $session): ?UserSessionStatus
    {
        if (! $session) {
            return null;
        }

        return UserSessionStatus::tryFromMixed($session->status);
    }

    /**
     * @return array<string, string>
     */
    private function definitions(): array
    {
        return [
            'total_registered_users' => 'All non-deleted accounts, matching the Users dashboard total.',
            'new_registrations' => 'Accounts created in the selected Europe/London dates.',
            'activated_users' => 'New accounts in the period with at least one real practice session.',
            'active_learners' => 'Distinct accounts who started or completed a real session in the period.',
            'session_completion_rate' => 'Sessions completed divided by sessions started in the period.',
            'retention' => 'A real session on the London calendar day 1, 7, or 30 after signup. Immature signups are excluded.',
            'sources' => 'One stored source per new account. Missing source stays unattributed.',
            'features' => 'Unique accounts and event counts from product events. Features without events stay uncollected.',
            'achievements' => 'Unlock and view counts from product events and user_achievements. Practice after unlock is descriptive only — not proof of causation.',
        ];
    }

    /**
     * Admin-only achievement engagement for the existing Growth dashboard.
     *
     * @return array<string, mixed>
     */
    private function achievements(Carbon $fromUtc, Carbon $toUtc): array
    {
        $unlockEvents = ProductEvent::query()
            ->where('event_name', ProductEventName::ACHIEVEMENT_UNLOCKED)
            ->whereBetween('occurred_at', [$fromUtc, $toUtc])
            ->get(['user_id', 'occurred_at', 'properties']);

        $viewEvents = ProductEvent::query()
            ->whereIn('event_name', [
                ProductEventName::ACHIEVEMENT_VIEWED,
                ProductEventName::ACHIEVEMENT_PROGRESS_VIEWED,
            ])
            ->whereBetween('occurred_at', [$fromUtc, $toUtc])
            ->get(['user_id', 'event_name']);

        $earners = $unlockEvents->pluck('user_id')->filter()->unique()->count();
        $unlocks = $unlockEvents->count();
        $viewers = $viewEvents->pluck('user_id')->filter()->unique()->count();
        $views = $viewEvents->count();

        $common = [];
        foreach ($unlockEvents as $event) {
            $props = is_array($event->properties) ? $event->properties : [];
            $id = (string) ($props['achievement_id'] ?? '');
            if ($id === '') {
                continue;
            }
            if (! isset($common[$id])) {
                $common[$id] = ['achievement_id' => $id, 'unlocks' => 0, 'users' => []];
            }
            $common[$id]['unlocks']++;
            if ($event->user_id) {
                $common[$id]['users'][$event->user_id] = true;
            }
        }
        $top = array_values(array_map(static function (array $row) {
            return [
                'achievement_id' => $row['achievement_id'],
                'unlocks' => $row['unlocks'],
                'users' => count($row['users']),
            ];
        }, $common));
        usort($top, static fn (array $a, array $b) => $b['unlocks'] <=> $a['unlocks']);
        $top = array_slice($top, 0, 8);

        $practiceAfterUnlock = 0;
        $unlockUserIds = $unlockEvents->pluck('user_id')->filter()->unique()->values();
        if ($unlockUserIds->isNotEmpty()) {
            foreach ($unlockUserIds as $userId) {
                $firstUnlock = $unlockEvents
                    ->where('user_id', $userId)
                    ->sortBy('occurred_at')
                    ->first();
                if (! $firstUnlock?->occurred_at) {
                    continue;
                }
                $practised = UserSession::query()
                    ->where('user_id', $userId)
                    ->where('is_onboarding_example', false)
                    ->where('status', UserSessionStatus::Completed->value)
                    ->where('ended_at', '>', $firstUnlock->occurred_at)
                    ->where('ended_at', '<=', $toUtc)
                    ->exists();
                if ($practised) {
                    $practiceAfterUnlock++;
                }
            }
        }

        $storedUnlocks = UserAchievement::query()
            ->whereBetween('unlocked_at', [$fromUtc, $toUtc])
            ->count();

        return [
            'collected' => $unlocks > 0 || $views > 0 || $storedUnlocks > 0,
            'users_earning' => $earners,
            'unlocks' => $unlocks,
            'stored_unlocks' => $storedUnlocks,
            'engagement_users' => $viewers,
            'engagement_views' => $views,
            'most_common' => $top,
            'practised_after_unlock' => $practiceAfterUnlock,
            'disclaimer' => 'Practice after an unlock is descriptive only. It does not prove achievements caused retention.',
        ];
    }
}

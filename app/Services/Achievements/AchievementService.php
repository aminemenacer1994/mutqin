<?php

namespace App\Services\Achievements;

use App\Models\User;
use App\Models\UserAchievement;
use App\Services\Analytics\ProductEventRecorder;
use App\Support\Achievements\AchievementId;
use App\Support\Analytics\ProductEventName;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * Public achievement API: evaluate, present, acknowledge notifications.
 */
final class AchievementService
{
    private const BACKFILL_FLAG = 'achievements_backfilled_at';

    public function __construct(
        private readonly AchievementCatalog $catalog,
        private readonly AchievementEvaluator $evaluator,
        private readonly PracticePreferences $preferences,
        private readonly ProductEventRecorder $events,
    ) {}

    /**
     * Run after a qualifying session or AI assessment. Quiet; never throws to callers.
     *
     * @return list<array<string, mixed>> newly unlocked presentation rows
     */
    public function evaluateQuietly(User $user, string $unlockSource = 'evaluation'): array
    {
        try {
            return $this->evaluateAndPresentNew($user, $unlockSource);
        } catch (\Throwable $error) {
            report($error);

            return [];
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function evaluateAndPresentNew(User $user, string $unlockSource = 'evaluation'): array
    {
        $source = $this->resolveUnlockSource($user, $unlockSource);
        $newly = $this->evaluator->evaluate($user, $source);
        $presented = [];
        foreach ($newly as $row) {
            $this->recordUnlockEvent($user, $row);
            $presented[] = $this->presentOne($user, $row->achievement_id, $row);
        }
        $this->markBackfilled($user);
        $this->bustDashboardCache($user);

        return $presented;
    }

    /**
     * Full achievements payload for API / drawer.
     *
     * @return array<string, mixed>
     */
    public function fullPayload(User $user, bool $evaluate = true): array
    {
        if ($evaluate) {
            $this->evaluateAndPresentNew($user, 'evaluation');
        }

        $earned = UserAchievement::query()
            ->where('user_id', $user->id)
            ->get()
            ->keyBy('achievement_id');

        $progressMap = $this->evaluator->computeProgress($user);
        $meta = is_array($progressMap['_meta'] ?? null) ? $progressMap['_meta'] : [];
        unset($progressMap['_meta']);

        $earnedIds = $earned->keys()->all();
        $items = [];
        foreach ($this->catalog->definitions() as $definition) {
            $id = $definition['id'];
            $earnedRow = $earned->get($id);
            $progress = is_array($progressMap[$id] ?? null) ? $progressMap[$id] : [];
            $items[] = $this->mergePresentation($definition, $progress, $earnedRow, $earnedIds);
        }

        $next = $this->pickNextBadge($items);
        $nextId = is_array($next) ? (string) ($next['id'] ?? '') : null;
        $items = $this->markNextBadge($items, $nextId);
        $tiers = $this->markNextInTiers($this->presentTiers($items), $nextId);

        $pending = array_values(array_filter(
            $items,
            static fn (array $item) => ($item['state'] ?? '') === 'unlocked' && empty($item['notified_at'])
        ));

        return [
            'items' => $items,
            'tiers' => $tiers,
            'next' => $next,
            'path' => $this->catalog->pathIds(),
            'pending_unlocks' => $pending,
            'settings' => $this->preferences->present($user),
            'summary' => $this->summaryFromItems($items, $meta),
            'meta' => [
                'generated_at' => now()->toIso8601String(),
                'thresholds' => $this->catalog->thresholds(),
            ],
        ];
    }

    /**
     * Compact dashboard widget payload.
     *
     * @return array<string, mixed>
     */
    public function dashboardWidget(User $user): array
    {
        try {
            $this->evaluateAndPresentNew($user, 'evaluation');
            $full = $this->fullPayload($user, false);
        } catch (\Throwable $error) {
            report($error);

            return $this->emptyWidget();
        }

        $items = $full['items'] ?? [];
        $summary = is_array($full['summary'] ?? null) ? $full['summary'] : [];

        $unlocked = array_values(array_filter(
            $items,
            static fn (array $item) => ($item['state'] ?? '') === 'unlocked'
        ));
        usort($unlocked, static function (array $a, array $b) {
            return strcmp((string) ($b['unlocked_at'] ?? ''), (string) ($a['unlocked_at'] ?? ''));
        });

        $next = $this->pickNextBadge($items);
        $items = $this->markNextBadge($items, is_array($next) ? (string) ($next['id'] ?? '') : null);

        $activeTier = is_array($next) ? (string) ($next['tier'] ?? 'beginner') : null;
        if ($activeTier === null && $unlocked !== []) {
            $activeTier = (string) (($unlocked[0]['tier'] ?? null) ?: 'advanced');
        }

        $tiers = $full['tiers'] ?? $this->presentTiers($items);
        $tiers = $this->markNextInTiers($tiers, is_array($next) ? (string) ($next['id'] ?? '') : null);

        return [
            'latest' => $unlocked[0] ?? null,
            'next' => $next,
            'active_tier' => $activeTier,
            'recent_unlocked' => array_slice($unlocked, 0, 3),
            'unlocked_count' => count($unlocked),
            'total_count' => count($items),
            'items' => $items,
            'tiers' => $tiers,
            'summary' => $summary,
            'pending_unlocks' => $full['pending_unlocks'] ?? [],
            'settings' => $full['settings'] ?? $this->preferences->present($user),
            'empty' => count($unlocked) === 0 && ! $next,
            'initial' => count($unlocked) === 0 && ! $next,
        ];
    }

    public function emptyWidget(): array
    {
        return [
            'latest' => null,
            'next' => null,
            'active_tier' => 'beginner',
            'recent_unlocked' => [],
            'unlocked_count' => 0,
            'total_count' => count($this->catalog->definitions()),
            'items' => [],
            'tiers' => [],
            'pending_unlocks' => [],
            'settings' => [
                'timezone' => (string) config('app.timezone', 'UTC'),
                'weekly_practice_days_goal' => null,
                'weekly_goal_editable' => true,
                'weekly_goal_min' => $this->catalog->weeklyGoalMin(),
                'weekly_goal_max' => $this->catalog->weeklyGoalMax(),
            ],
            'empty' => true,
            'initial' => true,
        ];
    }

    /**
     * @param  list<string>  $achievementIds
     * @return list<array<string, mixed>>
     */
    public function acknowledge(User $user, array $achievementIds): array
    {
        $ids = array_values(array_filter(
            $achievementIds,
            static fn ($id) => is_string($id) && AchievementId::isKnown($id)
        ));
        if ($ids === []) {
            return [];
        }

        $now = now();
        UserAchievement::query()
            ->where('user_id', $user->id)
            ->whereIn('achievement_id', $ids)
            ->whereNull('notified_at')
            ->update(['notified_at' => $now]);

        return UserAchievement::query()
            ->where('user_id', $user->id)
            ->whereIn('achievement_id', $ids)
            ->get()
            ->map(fn (UserAchievement $row) => $this->presentOne($user, $row->achievement_id, $row))
            ->all();
    }

    /**
     * @param  array{timezone?: string|null, weekly_practice_days_goal?: int|null}  $input
     * @return array<string, mixed>
     */
    public function updateSettings(User $user, array $input): array
    {
        $settings = $this->preferences->update($user, $input);
        // Re-evaluate Focused after a goal change without inventing history.
        $this->evaluator->evaluate($user, 'weekly_goal');
        $this->bustDashboardCache($user);

        return $settings;
    }

    private function resolveUnlockSource(User $user, string $requested): string
    {
        if ($this->hasBackfillFlag($user)) {
            return $requested;
        }

        if (in_array($requested, ['session_complete', 'ai_recite', 'weekly_goal', 'backfill'], true)) {
            return $requested;
        }

        return 'backfill';
    }

    private function hasBackfillFlag(User $user): bool
    {
        $prefs = is_array($user->practice_preferences) ? $user->practice_preferences : [];

        return ! empty($prefs[self::BACKFILL_FLAG]);
    }

    private function markBackfilled(User $user): void
    {
        if ($this->hasBackfillFlag($user)) {
            return;
        }

        $prefs = is_array($user->practice_preferences) ? $user->practice_preferences : [];
        $prefs[self::BACKFILL_FLAG] = now()->toIso8601String();
        $user->forceFill(['practice_preferences' => $prefs])->saveQuietly();
    }

    private function recordUnlockEvent(User $user, UserAchievement $row): void
    {
        $definition = collect($this->catalog->definitions())->firstWhere('id', $row->achievement_id);
        $category = is_array($definition) ? (string) ($definition['category'] ?? 'practice') : 'practice';
        $snapshot = is_array($row->progress_snapshot) ? $row->progress_snapshot : [];
        $percent = isset($snapshot['percent']) && is_numeric($snapshot['percent'])
            ? (int) $snapshot['percent']
            : 100;

        $this->events->recordQuietly(
            ProductEventName::ACHIEVEMENT_UNLOCKED,
            $user,
            null,
            'achievement:'.$user->id.':'.$row->achievement_id,
            [
                'achievement_id' => $row->achievement_id,
                'achievement_category' => $category,
                'progress_percentage' => $percent,
                'unlock_source' => (string) $row->unlock_source,
            ],
            [],
            $row->unlocked_at instanceof Carbon ? $row->unlocked_at : null,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function presentOne(User $user, string $achievementId, ?UserAchievement $earned = null): array
    {
        $definition = collect($this->catalog->definitions())->firstWhere('id', $achievementId) ?? [
            'id' => $achievementId,
            'tier' => $this->catalog->tierForId($achievementId) ?? 'beginner',
            'category' => 'practice',
            'icon' => 'book',
            'sort' => 100,
        ];
        $progress = $this->evaluator->computeProgress($user)[$achievementId] ?? [];
        $earnedIds = UserAchievement::query()
            ->where('user_id', $user->id)
            ->pluck('achievement_id')
            ->all();
        if ($earned && ! in_array($achievementId, $earnedIds, true)) {
            $earnedIds[] = $achievementId;
        }

        return $this->mergePresentation(
            $definition,
            is_array($progress) ? $progress : [],
            $earned,
            $earnedIds,
        );
    }

    /**
     * @param  array{id: string, tier?: string, category: string, icon: string, sort: int}  $definition
     * @param  array<string, mixed>  $progress
     * @param  list<string>  $earnedIds
     * @return array<string, mixed>
     */
    private function mergePresentation(
        array $definition,
        array $progress,
        ?UserAchievement $earned,
        array $earnedIds = [],
    ): array {
        $id = $definition['id'];
        $tier = (string) ($definition['tier'] ?? $this->catalog->tierForId($id) ?? 'beginner');

        if ($earned) {
            $state = 'unlocked';
            $detail = $progress['detail'] ?? null;
        } else {
            $state = (string) ($progress['state'] ?? 'locked');
            $detail = $progress['detail'] ?? null;
        }

        $current = (int) ($progress['current'] ?? 0);
        $target = (int) ($progress['target'] ?? 0);
        $percent = $earned ? 100 : ($progress['percent'] ?? null);

        return [
            'id' => $id,
            'tier' => $tier,
            'category' => $definition['category'],
            'unit' => (string) ($definition['unit'] ?? 'session'),
            'icon' => $definition['icon'],
            'sort' => $definition['sort'],
            'state' => $state,
            'is_next' => false,
            'path_open' => true,
            'requires_id' => null,
            'current' => $earned ? max($current, $target) : $current,
            'target' => $target,
            'percent' => is_numeric($percent) ? (int) $percent : null,
            'unlocked_at' => $earned?->unlocked_at?->toIso8601String(),
            'unlock_source' => $earned?->unlock_source,
            'notified_at' => $earned?->notified_at?->toIso8601String(),
            'detail' => $detail,
            'comparable_attempts' => $progress['comparable_attempts'] ?? null,
            'required_attempts' => $progress['required_attempts'] ?? null,
        ];
    }

    /**
     * Suggest the most meaningful incomplete badge: closest to done, else first locked.
     *
     * @param  list<array<string, mixed>>  $items
     * @return array<string, mixed>|null
     */
    private function pickNextBadge(array $items): ?array
    {
        $inProgress = array_values(array_filter(
            $items,
            static fn (array $item) => ($item['state'] ?? '') === 'in_progress'
        ));
        usort($inProgress, static function (array $a, array $b) {
            $pct = ((int) ($b['percent'] ?? 0)) <=> ((int) ($a['percent'] ?? 0));
            if ($pct !== 0) {
                return $pct;
            }

            return ((int) ($a['sort'] ?? 100)) <=> ((int) ($b['sort'] ?? 100));
        });
        if ($inProgress !== []) {
            return $inProgress[0];
        }

        foreach ($this->catalog->pathIds() as $id) {
            foreach ($items as $item) {
                if (($item['id'] ?? '') !== $id) {
                    continue;
                }
                if (($item['state'] ?? '') === 'unlocked') {
                    continue;
                }

                return $item;
            }
        }

        return null;
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @return list<array<string, mixed>>
     */
    private function markNextBadge(array $items, ?string $nextId): array
    {
        if ($nextId === null || $nextId === '') {
            return $items;
        }

        return array_map(static function (array $item) use ($nextId) {
            $item['is_next'] = ($item['id'] ?? '') === $nextId;

            return $item;
        }, $items);
    }

    /**
     * @param  list<array<string, mixed>>  $tiers
     * @return list<array<string, mixed>>
     */
    private function markNextInTiers(array $tiers, ?string $nextId): array
    {
        return array_map(function (array $tier) use ($nextId) {
            $tier['items'] = $this->markNextBadge(
                array_values(array_filter(
                    $tier['items'] ?? [],
                    static fn ($row) => is_array($row)
                )),
                $nextId
            );

            return $tier;
        }, $tiers);
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @return list<array<string, mixed>>
     */
    private function presentTiers(array $items): array
    {
        $byId = [];
        foreach ($items as $item) {
            if (isset($item['id'])) {
                $byId[$item['id']] = $item;
            }
        }

        $tiers = [];
        foreach ($this->catalog->tiers() as $tier) {
            $tierItems = [];
            $unlocked = 0;
            foreach ($tier['achievements'] as $id) {
                $row = $byId[$id] ?? null;
                if (! $row) {
                    continue;
                }
                $tierItems[] = $row;
                if (($row['state'] ?? '') === 'unlocked') {
                    $unlocked++;
                }
            }
            $total = count($tierItems);
            $complete = $total > 0 && $unlocked >= $total;

            $tiers[] = [
                'id' => $tier['id'],
                'sort' => $tier['sort'],
                'unlocked_count' => $unlocked,
                'total_count' => $total,
                'complete' => $complete,
                // Tiers organise badges; they do not gate unlocking.
                'open' => true,
                'items' => $tierItems,
            ];
        }

        return $tiers;
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @param  array<string, mixed>  $meta
     * @return array<string, mixed>
     */
    private function summaryFromItems(array $items, array $meta): array
    {
        $unlocked = count(array_filter($items, static fn (array $i) => ($i['state'] ?? '') === 'unlocked'));
        $activeTier = null;
        foreach ($this->catalog->pathIds() as $id) {
            foreach ($items as $item) {
                if (($item['id'] ?? '') !== $id) {
                    continue;
                }
                if (($item['state'] ?? '') !== 'unlocked') {
                    $activeTier = (string) ($item['tier'] ?? null);
                    break 2;
                }
            }
        }

        return [
            'unlocked_count' => $unlocked,
            'total_count' => count($items),
            'active_tier' => $activeTier,
            'practice_days' => (int) ($meta['practice_days'] ?? 0),
            'revision_sessions' => (int) ($meta['revision_sessions'] ?? 0),
            'best_streak' => (int) ($meta['best_streak'] ?? 0),
            'days_this_week' => (int) ($meta['days_this_week'] ?? 0),
            'weekly_goal' => $meta['weekly_goal'] ?? null,
        ];
    }

    private function bustDashboardCache(User $user): void
    {
        if (class_exists(\App\Services\DashboardService::class)) {
            \App\Services\DashboardService::forgetForUser($user);
        }
        Cache::forget('achievements:v1:'.$user->id);
    }
}

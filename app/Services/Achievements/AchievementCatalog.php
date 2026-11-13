<?php

namespace App\Services\Achievements;

use App\Support\Achievements\AchievementId;

final class AchievementCatalog
{
    /**
     * @return list<array{id: string, tier: string, category: string, icon: string, sort: int}>
     */
    public function definitions(): array
    {
        $raw = config('achievements.definitions', []);
        $items = [];
        foreach (AchievementId::all() as $id) {
            $row = is_array($raw[$id] ?? null) ? $raw[$id] : [];
            $items[] = [
                'id' => $id,
                'tier' => (string) ($row['tier'] ?? $this->tierForId($id) ?? 'beginner'),
                'category' => (string) ($row['category'] ?? 'practice'),
                'icon' => (string) ($row['icon'] ?? 'book'),
                'sort' => (int) ($row['sort'] ?? 100),
            ];
        }

        usort($items, static fn (array $a, array $b) => $a['sort'] <=> $b['sort']);

        return $items;
    }

    /**
     * Ordered learning path (Beginner → Intermediate → Advanced).
     *
     * @return list<string>
     */
    public function pathIds(): array
    {
        $ids = [];
        foreach ($this->tiers() as $tier) {
            foreach ($tier['achievements'] as $id) {
                if (AchievementId::isKnown($id)) {
                    $ids[] = $id;
                }
            }
        }

        return array_values(array_unique($ids));
    }

    /**
     * @return list<array{id: string, sort: int, achievements: list<string>}>
     */
    public function tiers(): array
    {
        $raw = config('achievements.tiers', []);
        if (! is_array($raw) || $raw === []) {
            return $this->fallbackTiers();
        }

        $tiers = [];
        foreach ($raw as $key => $row) {
            if (! is_array($row)) {
                continue;
            }
            $id = (string) ($row['id'] ?? $key);
            $achievements = array_values(array_filter(
                $row['achievements'] ?? [],
                static fn ($aid) => is_string($aid) && AchievementId::isKnown($aid)
            ));
            if ($achievements === []) {
                continue;
            }
            $tiers[] = [
                'id' => $id,
                'sort' => (int) ($row['sort'] ?? 100),
                'achievements' => $achievements,
            ];
        }

        usort($tiers, static fn (array $a, array $b) => $a['sort'] <=> $b['sort']);

        return $tiers !== [] ? $tiers : $this->fallbackTiers();
    }

    public function tierForId(string $achievementId): ?string
    {
        foreach ($this->tiers() as $tier) {
            if (in_array($achievementId, $tier['achievements'], true)) {
                return $tier['id'];
            }
        }

        return null;
    }

    public function previousInPath(string $achievementId): ?string
    {
        $path = $this->pathIds();
        $index = array_search($achievementId, $path, true);
        if ($index === false || $index === 0) {
            return null;
        }

        return $path[$index - 1] ?? null;
    }

    /**
     * @return array<string, mixed>
     */
    public function thresholds(): array
    {
        return is_array(config('achievements.thresholds'))
            ? config('achievements.thresholds')
            : [];
    }

    public function threshold(string $key, int $default): int
    {
        $value = $this->thresholds()[$key] ?? $default;

        return is_numeric($value) ? (int) $value : $default;
    }

    public function minMeaningfulDurationSeconds(): int
    {
        return max(0, (int) config('achievements.min_meaningful_duration_seconds', 20));
    }

    public function weeklyGoalMin(): int
    {
        return max(1, (int) config('achievements.weekly_goal_min', 1));
    }

    public function weeklyGoalMax(): int
    {
        return min(7, max($this->weeklyGoalMin(), (int) config('achievements.weekly_goal_max', 7)));
    }

    /**
     * @return list<array{id: string, sort: int, achievements: list<string>}>
     */
    private function fallbackTiers(): array
    {
        return [
            [
                'id' => 'beginner',
                'sort' => 10,
                'achievements' => [
                    AchievementId::FIRST_STEPS,
                    AchievementId::CHECKER,
                    AchievementId::CONSISTENT,
                ],
            ],
            [
                'id' => 'intermediate',
                'sort' => 20,
                'achievements' => [
                    AchievementId::MEMORISER,
                    AchievementId::EXPLORER,
                    AchievementId::DEDICATED,
                ],
            ],
            [
                'id' => 'advanced',
                'sort' => 30,
                'achievements' => [
                    AchievementId::REVISER,
                    AchievementId::GROWING,
                    AchievementId::FOCUSED,
                    AchievementId::STEADFAST,
                ],
            ],
        ];
    }
}

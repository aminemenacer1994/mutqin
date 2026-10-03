<?php

namespace App\Services\Memorisation;

use App\Enums\MutashabihatProgressStatus;
use App\Models\MutashabihatPair;
use App\Models\User;
use App\Models\UserMutashabihatProgress;
use Illuminate\Support\Collection;

class MutashabihatProgressService
{
    public function recordConfusion(
        User $user,
        MutashabihatPair $pair,
        string $expectedVerseKey,
        string $confusedVerseKey,
    ): UserMutashabihatProgress {
        $progress = UserMutashabihatProgress::query()->firstOrNew([
            'user_id' => $user->id,
            'mutashabihat_pair_id' => $pair->id,
        ]);

        if (! $progress->exists) {
            $progress->expected_verse_key = $expectedVerseKey;
            $progress->confused_verse_key = $confusedVerseKey;
            $progress->confusion_count = 0;
            $progress->practice_attempts = 0;
            $progress->successful_attempts = 0;
            $progress->status = MutashabihatProgressStatus::NeedsPractice;
        }

        $progress->confusion_count = (int) $progress->confusion_count + 1;
        $progress->last_confused_at = now();
        if ($progress->status === MutashabihatProgressStatus::Strong) {
            $progress->status = MutashabihatProgressStatus::Improving;
        } elseif ((int) $progress->confusion_count >= 2) {
            $progress->status = MutashabihatProgressStatus::NeedsPractice;
        }

        $progress->save();

        return $progress->fresh(['pair']);
    }

    public function recordPracticeAttempt(
        User $user,
        MutashabihatPair $pair,
        bool $success,
    ): UserMutashabihatProgress {
        $progress = UserMutashabihatProgress::query()->firstOrCreate(
            [
                'user_id' => $user->id,
                'mutashabihat_pair_id' => $pair->id,
            ],
            [
                'expected_verse_key' => $pair->verse_key_1,
                'confused_verse_key' => $pair->verse_key_2,
                'confusion_count' => 0,
                'practice_attempts' => 0,
                'successful_attempts' => 0,
                'status' => MutashabihatProgressStatus::NeedsPractice,
            ],
        );

        $progress->practice_attempts = (int) $progress->practice_attempts + 1;
        $progress->last_practised_at = now();
        if ($success) {
            $progress->successful_attempts = (int) $progress->successful_attempts + 1;
        }

        $attempts = max(1, (int) $progress->practice_attempts);
        $successRate = (int) $progress->successful_attempts / $attempts;
        if ($successRate >= 0.75 && (int) $progress->successful_attempts >= 3) {
            $progress->status = MutashabihatProgressStatus::Strong;
        } elseif ($successRate >= 0.4 || (int) $progress->successful_attempts >= 1) {
            $progress->status = MutashabihatProgressStatus::Improving;
        } else {
            $progress->status = MutashabihatProgressStatus::NeedsPractice;
        }

        $progress->save();

        return $progress->fresh(['pair']);
    }

    /**
     * @return Collection<int, UserMutashabihatProgress>
     */
    public function listForUser(User $user, int $limit = 50): Collection
    {
        return UserMutashabihatProgress::query()
            ->with('pair')
            ->where('user_id', $user->id)
            ->orderByRaw("CASE status WHEN 'needs_practice' THEN 0 WHEN 'improving' THEN 1 ELSE 2 END")
            ->orderByDesc('confusion_count')
            ->orderByDesc('last_confused_at')
            ->limit($limit)
            ->get();
    }
}

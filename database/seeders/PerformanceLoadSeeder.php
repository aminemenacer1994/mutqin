<?php

namespace Database\Seeders;

use App\Enums\UserSessionStatus;
use App\Models\AiReciteAttempt;
use App\Models\AyahNote;
use App\Models\LearningAnalytic;
use App\Models\MemorisationProgress;
use App\Models\MemorisationSyncState;
use App\Models\User;
use App\Models\UserSession;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeds realistic learner data for staging load tests and perf benchmarks.
 *
 * Usage: php artisan db:seed --class=PerformanceLoadSeeder
 * Optional env: PERF_SEED_USERS=50 PERF_SEED_AYAHS=120
 */
class PerformanceLoadSeeder extends Seeder
{
    public function run(): void
    {
        $userCount = max(1, min(500, (int) env('PERF_SEED_USERS', 20)));
        $ayahsPerUser = max(10, min(500, (int) env('PERF_SEED_AYAHS', 80)));
        $sessionsPerUser = max(5, min(100, (int) env('PERF_SEED_SESSIONS', 25)));

        $this->command?->info("Seeding {$userCount} perf users ({$ayahsPerUser} ayahs, {$sessionsPerUser} sessions each)…");

        for ($u = 1; $u <= $userCount; $u += 1) {
            $user = User::query()->firstOrCreate(
                ['email' => "perf-user-{$u}@mutqin-load.test"],
                [
                    'name' => "Perf User {$u}",
                    'password' => Hash::make('password'),
                    'password_set_at' => now(),
                    'email_verified_at' => now(),
                ]
            );

            if (! $user->wasRecentlyCreated) {
                $this->resetPerfUserData($user);
            }

            $this->seedProgress($user, $ayahsPerUser);
            $this->seedSessions($user, $sessionsPerUser);
            $this->seedAnalytics($user);
            $this->seedAiAttempts($user);
            $this->seedNotes($user);
            $this->seedSyncState($user, $ayahsPerUser);
        }

        $this->command?->info('Performance load seed complete.');
    }

    private function resetPerfUserData(User $user): void
    {
        MemorisationProgress::query()->where('user_id', $user->id)->delete();
        UserSession::query()->where('user_id', $user->id)->delete();
        LearningAnalytic::query()->where('user_id', $user->id)->delete();
        AiReciteAttempt::query()->where('user_id', $user->id)->delete();
        AyahNote::query()->where('user_id', $user->id)->delete();
        MemorisationSyncState::query()->where('user_id', $user->id)->delete();
    }

    private function seedProgress(User $user, int $count): void
    {
        $rows = [];
        $now = now();
        for ($i = 1; $i <= $count; $i += 1) {
            $surah = (($i - 1) % 114) + 1;
            $ayah = (($i - 1) % 20) + 1;
            $status = $i % 3 === 0 ? 'memorised' : 'learning';
            $rows[] = [
                'user_id' => $user->id,
                'surah_number' => $surah,
                'ayah_number' => $ayah,
                'status' => $status,
                'mastery_level' => $status === 'memorised' ? 80 : 30,
                'repetitions' => $i % 10,
                'metadata' => null,
                'completed_at' => $status === 'memorised' ? $now->copy()->subDays($i % 14) : null,
                'created_at' => $now,
                'updated_at' => $now->copy()->subHours($i % 48),
            ];
        }

        foreach (array_chunk($rows, 200) as $chunk) {
            MemorisationProgress::upsert(
                $chunk,
                ['user_id', 'surah_number', 'ayah_number'],
                ['status', 'mastery_level', 'repetitions', 'metadata', 'completed_at', 'updated_at']
            );
        }
    }

    private function seedSessions(User $user, int $count): void
    {
        for ($i = 1; $i <= $count; $i += 1) {
            $surah = (($i - 1) % 114) + 1;
            $status = match (true) {
                $i === 1 => UserSessionStatus::Paused,
                $i % 5 === 0 => UserSessionStatus::Completed,
                default => UserSessionStatus::EndedEarly,
            };

            UserSession::query()->create([
                'user_id' => $user->id,
                'surah_number' => $surah,
                'ayah_number' => ($i % 20) + 1,
                'status' => $status,
                'is_onboarding_example' => false,
                'session_duration_seconds' => 300 + ($i * 12),
                'last_activity_at' => now()->subHours($i),
                'ended_at' => $status === UserSessionStatus::Paused ? null : now()->subHours($i),
                'paused_at' => $status === UserSessionStatus::Paused ? now()->subMinutes(30) : null,
                'metadata' => [
                    'config' => [
                        'chapterId' => $surah,
                        'rangeStart' => 1,
                        'rangeEnd' => min(10, ($i % 20) + 1),
                    ],
                    'completed' => $status === UserSessionStatus::Completed,
                ],
            ]);
        }
    }

    private function seedAnalytics(User $user): void
    {
        for ($d = 0; $d < 14; $d += 1) {
            LearningAnalytic::query()->updateOrCreate(
                [
                    'user_id' => $user->id,
                    'session_date' => now()->subDays($d)->toDateString(),
                ],
                [
                    'sessions_completed' => $d % 3,
                    'ayahs_memorised' => $d % 5,
                    'ayahs_reviewed' => $d % 7,
                    'total_minutes' => 10 + ($d * 3),
                ]
            );
        }
    }

    private function seedAiAttempts(User $user): void
    {
        for ($i = 1; $i <= 12; $i += 1) {
            AiReciteAttempt::query()->create([
                'user_id' => $user->id,
                'attempt_number' => $i,
                'accuracy_percent' => 55 + ($i * 3),
                'band' => $i % 2 === 0 ? 'mixed' : 'strong',
                'ayah_range' => [
                    'surah' => (($i - 1) % 114) + 1,
                    'from' => 1,
                    'to' => 3,
                ],
                'created_at' => now()->subHours($i * 4),
            ]);
        }
    }

    private function seedNotes(User $user): void
    {
        for ($i = 1; $i <= 8; $i += 1) {
            AyahNote::query()->create([
                'user_id' => $user->id,
                'surah_number' => (($i - 1) % 114) + 1,
                'ayah_number' => $i,
                'title' => "Note {$i}",
                'body' => "Reflection body for perf seed note {$i}.",
            ]);
        }
    }

    private function seedSyncState(User $user, int $ayahCount): void
    {
        $ayahs = [];
        for ($i = 1; $i <= min($ayahCount, 40); $i += 1) {
            $surah = (($i - 1) % 114) + 1;
            $ayah = (($i - 1) % 20) + 1;
            $key = "{$surah}:{$ayah}";
            $ayahs[$key] = [
                'id' => $key,
                'status' => $i % 3 === 0 ? 'memorised' : 'learning',
                'mastery_level' => $i % 5,
                'repetition_count' => $i % 8,
                'next_review' => now()->addDays($i % 7)->toDateString(),
            ];
        }

        $state = [
            'version' => 1,
            'ayahs' => $ayahs,
            'savedSessions' => [
                ['id' => 'saved-1', 'surah' => 1, 'from' => 1, 'to' => 7],
            ],
            'stats' => [
                'sessions_completed' => 5,
                'ayahs_memorised' => count(array_filter($ayahs, fn ($a) => ($a['status'] ?? '') === 'memorised')),
                'streak' => 3,
            ],
        ];

        $encoded = json_encode($state, JSON_UNESCAPED_UNICODE);
        MemorisationSyncState::query()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'state' => $encoded,
                'payload_hash' => hash('sha256', (string) $encoded),
                'state_updated_at' => now(),
                'last_pulled_at' => now()->subHour(),
            ]
        );
    }
}

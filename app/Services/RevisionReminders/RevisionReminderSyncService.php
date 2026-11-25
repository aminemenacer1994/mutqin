<?php

namespace App\Services\RevisionReminders;

use App\Enums\AssignmentStatus;
use App\Enums\RevisionReminderPriority;
use App\Enums\RevisionReminderSource;
use App\Enums\RevisionReminderStatus;
use App\Enums\UserSessionStatus;
use App\Models\MemorisationPracticePlan;
use App\Models\MemorisationProgress;
use App\Models\RevisionReminder;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Achievements\PracticePreferences;
use App\Support\AssignmentListeningSettings;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

final class RevisionReminderSyncService
{
    public function __construct(
        private readonly SpacedRevisionScheduler $scheduler,
        private readonly PracticePreferences $preferences,
    ) {}

    /**
     * Sync all reminder sources for one user and refresh open statuses.
     *
     * @return array{upserted: int, completed: int, cancelled: int}
     */
    public function syncUser(User $user): array
    {
        $upserted = 0;
        $upserted += $this->syncProgressSources($user);
        $upserted += $this->syncTeacherAssignmentSources($user);
        $upserted += $this->syncPracticePlanSources($user);

        $completed = $this->completeFromAdvancedProgress($user);
        $cancelled = $this->cancelStaleAssignmentReminders($user);
        $this->refreshOpenStatuses($user);

        return [
            'upserted' => $upserted,
            'completed' => $completed,
            'cancelled' => $cancelled,
        ];
    }

    /**
     * Sync reminders for every active user who has due sources (batched for scheduler).
     *
     * @return array{users: int, upserted: int}
     */
    public function syncDueUsers(int $limit = 200): array
    {
        $userIds = collect()
            ->merge(
                MemorisationProgress::query()
                    ->whereNotNull('metadata->next_review')
                    ->where('metadata->next_review', '<=', now()->addDays(90)->toIso8601String())
                    ->distinct()
                    ->limit($limit)
                    ->pluck('user_id')
            )
            ->merge(
                TeacherAssignmentRecipient::query()
                    ->whereIn('status', [
                        AssignmentStatus::Pending->value,
                        AssignmentStatus::InProgress->value,
                        AssignmentStatus::AwaitingConfirmation->value,
                        AssignmentStatus::Overdue->value,
                    ])
                    ->whereHas('assignment', fn ($q) => $q->whereIn('hifz_category', ['sabqi', 'manzil']))
                    ->distinct()
                    ->limit($limit)
                    ->pluck('student_id')
            )
            ->merge(
                MemorisationPracticePlan::query()
                    ->whereNotNull('recommended_review_at')
                    ->whereIn('status', [
                        MemorisationPracticePlan::STATUS_ACTIVE,
                        MemorisationPracticePlan::STATUS_DRAFT,
                    ])
                    ->distinct()
                    ->limit($limit)
                    ->pluck('user_id')
            )
            ->unique()
            ->filter()
            ->take($limit)
            ->values();

        $upserted = 0;
        foreach ($userIds as $userId) {
            $user = User::query()->find($userId);
            if (! $user) {
                continue;
            }
            $result = $this->syncUser($user);
            $upserted += $result['upserted'];
        }

        return ['users' => $userIds->count(), 'upserted' => $upserted];
    }

    public function upsertProgressReminder(
        User $user,
        int $surah,
        int $ayah,
        Carbon $dueAt,
        ?string $zone = null,
        ?int $zoneStep = null,
        ?int $intervalDays = null,
    ): RevisionReminder {
        $dueDate = $this->preferences->localDate($dueAt, $user);
        $sourceKey = sprintf('progress:%d:%d:%s', $surah, $ayah, $dueDate);

        return $this->upsertOpen($user, [
            'source_type' => RevisionReminderSource::Progress->value,
            'source_key' => $sourceKey,
            'surah_number' => $surah,
            'ayah_start' => $ayah,
            'ayah_end' => $ayah,
            'due_at' => $dueAt->copy()->utc(),
            'priority' => RevisionReminderPriority::Normal->value,
            'zone' => $zone,
            'zone_step' => $zoneStep,
            'interval_days' => $intervalDays,
            'session_settings' => ['review' => true],
        ]);
    }

    public function syncTeacherAssignmentRecipient(TeacherAssignmentRecipient $recipient): ?RevisionReminder
    {
        $recipient->loadMissing('assignment', 'student');
        $assignment = $recipient->assignment;
        $student = $recipient->student;
        if (! $assignment || ! $student) {
            return null;
        }

        $category = (string) $assignment->hifz_category;
        if (! in_array($category, ['sabqi', 'manzil'], true) && $assignment->due_at === null) {
            return null;
        }

        $status = $recipient->status instanceof AssignmentStatus
            ? $recipient->status
            : AssignmentStatus::tryFrom((string) $recipient->status);
        if ($status === AssignmentStatus::Completed) {
            $this->completeAssignmentReminder($recipient, 'assignment');

            return null;
        }

        $dueAt = $assignment->due_at?->copy() ?? now()->addDay()->startOfDay();
        $priority = RevisionReminderPriority::normalise($assignment->priority ?? 'normal')->value;
        $sourceKey = 'assignment:'.$recipient->id;
        $existing = RevisionReminder::query()
            ->where('user_id', $student->id)
            ->where('source_key', $sourceKey)
            ->first();
        $dueMoved = $existing?->due_at && ! $existing->due_at->equalTo($dueAt);

        return $this->upsertOpen($student, [
            'source_type' => RevisionReminderSource::TeacherAssignment->value,
            'source_key' => $sourceKey,
            'surah_number' => (int) $assignment->surah_number,
            'ayah_start' => (int) $assignment->ayah_start,
            'ayah_end' => (int) $assignment->ayah_end,
            'due_at' => $dueAt->utc(),
            'priority' => $priority,
            'teacher_assignment_recipient_id' => $recipient->id,
            'session_settings' => $this->sessionSettingsForTeacherAssignment($assignment, (int) $recipient->id),
            ...($dueMoved ? ['notified_in_app_at' => null, 'emailed_at' => null] : []),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function sessionSettingsForTeacherAssignment(TeacherAssignment $assignment, int $recipientId): array
    {
        $settings = [
            'review' => true,
            'assignment_recipient' => $recipientId,
        ];
        $listening = is_array($assignment->session_settings) ? $assignment->session_settings : null;
        if (AssignmentListeningSettings::hasListeningRecommendation($listening)) {
            foreach (['reciter', 'speed', 'repetitions', 'technique'] as $key) {
                if (isset($listening[$key]) && $listening[$key] !== '' && $listening[$key] !== null) {
                    $settings[$key] = $listening[$key];
                }
            }
        }

        return $settings;
    }

    public function syncPracticePlan(MemorisationPracticePlan $plan): ?RevisionReminder
    {
        if ($plan->recommended_review_at === null) {
            return null;
        }

        if (in_array((string) $plan->status, [
            MemorisationPracticePlan::STATUS_COMPLETED,
            MemorisationPracticePlan::STATUS_DISMISSED,
            MemorisationPracticePlan::STATUS_ABANDONED,
        ], true)) {
            return null;
        }

        $user = User::query()->find($plan->user_id);
        if (! $user) {
            return null;
        }

        $surah = (int) $plan->surah_number;
        $start = (int) ($plan->start_ayah ?: 1);
        $end = (int) ($plan->end_ayah ?: $start);
        if ($surah <= 0) {
            return null;
        }

        return $this->upsertOpen($user, [
            'source_type' => RevisionReminderSource::PracticePlan->value,
            'source_key' => 'practice_plan:'.$plan->id,
            'surah_number' => $surah,
            'ayah_start' => $start,
            'ayah_end' => max($start, $end),
            'due_at' => $plan->recommended_review_at->copy()->utc(),
            'priority' => RevisionReminderPriority::Normal->value,
            'memorisation_practice_plan_id' => $plan->id,
            'session_settings' => [
                'review' => true,
                'technique' => is_array($plan->techniques) ? ($plan->techniques[0] ?? null) : null,
                'repetitions' => $plan->repetitions,
            ],
        ]);
    }

    /**
     * Mark matching open reminders completed after a recorded session end.
     * Optionally schedules the next spaced reminder when performance is reliable.
     */
    public function handleSessionCompleted(User $user, UserSession $session): void
    {
        $status = UserSessionStatus::tryFromMixed($session->status);
        if ($status !== UserSessionStatus::Completed) {
            return;
        }

        $meta = is_array($session->metadata) ? $session->metadata : [];
        $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
        $surah = (int) ($session->surah_number ?: ($config['chapterId'] ?? 0));
        $start = (int) ($config['rangeStart'] ?? $meta['range_start'] ?? $session->ayah_number ?? 0);
        $end = (int) ($config['rangeEnd'] ?? $meta['range_end'] ?? $start);
        if ($surah <= 0 || $start <= 0) {
            return;
        }
        if ($end < $start) {
            $end = $start;
        }

        $open = RevisionReminder::query()
            ->where('user_id', $user->id)
            ->whereIn('status', RevisionReminderStatus::openValues())
            ->where('surah_number', $surah)
            ->where('ayah_start', '>=', $start)
            ->where('ayah_end', '<=', $end)
            ->get();

        if ($session->teacher_assignment_recipient_id) {
            $byRecipient = RevisionReminder::query()
                ->where('user_id', $user->id)
                ->whereIn('status', RevisionReminderStatus::openValues())
                ->where('teacher_assignment_recipient_id', $session->teacher_assignment_recipient_id)
                ->get();
            $open = $open->merge($byRecipient)->unique('id');
        }

        foreach ($open as $reminder) {
            $this->markCompleted($reminder, 'session');
        }

        $score = $this->extractSessionScore($meta, $config);
        $advanced = $score
            ? $this->scheduler->advanceFromScore(
                $open->first()?->zone,
                $open->first()?->zone_step,
                $score,
                now()
            )
            : null;

        if ($advanced !== null) {
            // One follow-up reminder for the practiced range (not per-ayah spam).
            $this->upsertOpen($user, [
                'source_type' => RevisionReminderSource::Session->value,
                'source_key' => sprintf(
                    'session:%d:%d:%d:%s',
                    $surah,
                    $start,
                    $end,
                    $this->preferences->localDate($advanced['next_review_at'], $user)
                ),
                'surah_number' => $surah,
                'ayah_start' => $start,
                'ayah_end' => $end,
                'due_at' => $advanced['next_review_at']->copy()->utc(),
                'priority' => RevisionReminderPriority::Normal->value,
                'zone' => $advanced['zone'],
                'zone_step' => $advanced['zone_step'],
                'interval_days' => $advanced['interval_days'],
                'session_settings' => ['review' => true],
                'notified_in_app_at' => null,
                'emailed_at' => null,
            ]);
        }
    }

    public function handlePracticePlanCompleted(User $user, MemorisationPracticePlan $plan, mixed $performance = null): void
    {
        $reminder = RevisionReminder::query()
            ->where('user_id', $user->id)
            ->where('source_key', 'practice_plan:'.$plan->id)
            ->whereIn('status', RevisionReminderStatus::openValues())
            ->first();

        if ($reminder) {
            $this->markCompleted($reminder, 'practice_plan');
        }

        $score = $this->scheduler->scoreFromPerformanceSignal($performance)
            ?? $this->scheduler->scoreFromPerformanceSignal($plan->completion_outcome)
            ?? $this->scheduler->scoreFromPerformanceSignal(
                is_array($plan->completion_data) ? ($plan->completion_data['score'] ?? $plan->completion_data['band'] ?? null) : null
            );

        if ($score === null) {
            return;
        }

        $advanced = $this->scheduler->advanceFromScore(
            $reminder?->zone,
            $reminder?->zone_step,
            $score,
            now()
        );
        if ($advanced === null) {
            return;
        }

        $surah = (int) $plan->surah_number;
        $start = (int) ($plan->start_ayah ?: 1);
        $end = (int) ($plan->end_ayah ?: $start);
        if ($surah <= 0) {
            return;
        }

        $this->upsertOpen($user, [
            'source_type' => RevisionReminderSource::PracticePlan->value,
            'source_key' => sprintf(
                'practice_plan_next:%d:%s',
                $plan->id,
                $this->preferences->localDate($advanced['next_review_at'], $user)
            ),
            'surah_number' => $surah,
            'ayah_start' => $start,
            'ayah_end' => max($start, $end),
            'due_at' => $advanced['next_review_at']->copy()->utc(),
            'priority' => RevisionReminderPriority::Normal->value,
            'zone' => $advanced['zone'],
            'zone_step' => $advanced['zone_step'],
            'interval_days' => $advanced['interval_days'],
            'memorisation_practice_plan_id' => $plan->id,
            'session_settings' => ['review' => true],
            'notified_in_app_at' => null,
            'emailed_at' => null,
        ]);
    }

    public function completeAssignmentReminder(TeacherAssignmentRecipient $recipient, string $via = 'assignment'): void
    {
        $reminder = RevisionReminder::query()
            ->where('source_key', 'assignment:'.$recipient->id)
            ->whereIn('status', RevisionReminderStatus::openValues())
            ->first();

        if ($reminder) {
            $this->markCompleted($reminder, $via);
        }
    }

    public function snooze(RevisionReminder $reminder, int $hours): RevisionReminder
    {
        $hours = max(1, min(72, $hours));
        $until = now()->addHours($hours);
        $reminder->forceFill([
            'status' => RevisionReminderStatus::Snoozed->value,
            'snoozed_until' => $until,
            'due_at' => $until,
            'notified_in_app_at' => null,
            'emailed_at' => null,
        ])->save();

        return $reminder->fresh() ?? $reminder;
    }

    public function dismiss(RevisionReminder $reminder): RevisionReminder
    {
        $reminder->forceFill([
            'status' => RevisionReminderStatus::Cancelled->value,
            'snoozed_until' => null,
        ])->save();

        return $reminder->fresh() ?? $reminder;
    }

    public function refreshOpenStatuses(User $user): void
    {
        $today = $this->preferences->localDate(now(), $user);
        $tz = $this->preferences->timezone($user);

        $open = RevisionReminder::query()
            ->where('user_id', $user->id)
            ->whereIn('status', RevisionReminderStatus::openValues())
            ->get();

        foreach ($open as $reminder) {
            if ($reminder->status === RevisionReminderStatus::Snoozed
                && $reminder->snoozed_until
                && $reminder->snoozed_until->isFuture()
            ) {
                continue;
            }

            $dueLocal = $reminder->due_at->copy()->timezone($tz)->toDateString();
            $status = match (true) {
                $dueLocal < $today => RevisionReminderStatus::Overdue->value,
                $dueLocal === $today => RevisionReminderStatus::Due->value,
                default => RevisionReminderStatus::Upcoming->value,
            };

            if ((string) $reminder->status?->value !== $status
                || ($reminder->status === RevisionReminderStatus::Snoozed && ($reminder->snoozed_until === null || $reminder->snoozed_until->isPast()))
            ) {
                $reminder->forceFill([
                    'status' => $status,
                    'snoozed_until' => null,
                ])->save();
            }
        }
    }

    private function syncProgressSources(User $user): int
    {
        $rows = MemorisationProgress::query()
            ->where('user_id', $user->id)
            ->whereIn('status', ['memorised', 'mastered', 'reviewing', 'reviewed', 'weak'])
            ->whereNotNull('metadata->next_review')
            ->where('metadata->next_review', '<=', now()->addDays(90)->toIso8601String())
            ->get(['id', 'surah_number', 'ayah_number', 'metadata']);

        $count = 0;
        foreach ($rows as $progress) {
            $metadata = is_array($progress->metadata) ? $progress->metadata : [];
            $rawDue = $metadata['next_review'] ?? null;
            if (! $rawDue) {
                continue;
            }
            try {
                $dueAt = Carbon::parse($rawDue);
            } catch (\Throwable) {
                continue;
            }

            $surah = (int) $progress->surah_number;
            $ayah = (int) $progress->ayah_number;
            if ($surah <= 0 || $ayah <= 0) {
                continue;
            }

            $zone = isset($metadata['zone']) ? (string) $metadata['zone'] : null;
            $zoneStep = isset($metadata['zone_step']) ? (int) $metadata['zone_step'] : null;
            $interval = $zone !== null
                ? $this->scheduler->intervalDays($zone, (int) ($zoneStep ?? 0))
                : null;

            $this->upsertProgressReminder($user, $surah, $ayah, $dueAt, $zone, $zoneStep, $interval);
            $count++;
        }

        return $count;
    }

    private function syncTeacherAssignmentSources(User $user): int
    {
        $recipients = TeacherAssignmentRecipient::query()
            ->where('student_id', $user->id)
            ->whereIn('status', [
                AssignmentStatus::Pending->value,
                AssignmentStatus::InProgress->value,
                AssignmentStatus::AwaitingConfirmation->value,
                AssignmentStatus::Overdue->value,
            ])
            ->whereHas('assignment', function ($query) {
                $query->where(function ($inner) {
                    $inner->whereIn('hifz_category', ['sabqi', 'manzil'])
                        ->orWhereNotNull('due_at');
                });
            })
            ->with('assignment')
            ->get();

        $count = 0;
        foreach ($recipients as $recipient) {
            if ($this->syncTeacherAssignmentRecipient($recipient)) {
                $count++;
            }
        }

        return $count;
    }

    private function syncPracticePlanSources(User $user): int
    {
        $plans = MemorisationPracticePlan::query()
            ->where('user_id', $user->id)
            ->whereNotNull('recommended_review_at')
            ->whereIn('status', [
                MemorisationPracticePlan::STATUS_ACTIVE,
                MemorisationPracticePlan::STATUS_DRAFT,
            ])
            ->get();

        $count = 0;
        foreach ($plans as $plan) {
            if ($this->syncPracticePlan($plan)) {
                $count++;
            }
        }

        return $count;
    }

    private function completeFromAdvancedProgress(User $user): int
    {
        $today = $this->preferences->localDate(now(), $user);
        $tz = $this->preferences->timezone($user);
        $completed = 0;

        $progressReminders = RevisionReminder::query()
            ->where('user_id', $user->id)
            ->where('source_type', RevisionReminderSource::Progress->value)
            ->whereIn('status', RevisionReminderStatus::openValues())
            ->get();

        foreach ($progressReminders as $reminder) {
            $progress = MemorisationProgress::query()
                ->where('user_id', $user->id)
                ->where('surah_number', $reminder->surah_number)
                ->where('ayah_number', $reminder->ayah_start)
                ->first();
            if (! $progress) {
                continue;
            }
            $metadata = is_array($progress->metadata) ? $progress->metadata : [];
            $next = $metadata['next_review'] ?? null;
            $lastReview = $metadata['last_review'] ?? null;
            if (! $next || ! $lastReview) {
                continue;
            }
            try {
                $nextAt = Carbon::parse($next);
                $lastAt = Carbon::parse($lastReview);
            } catch (\Throwable) {
                continue;
            }

            // Only complete when a recorded review moved next_review past this due window.
            if ($lastAt->greaterThan($reminder->due_at)
                && $this->preferences->localDate($nextAt, $user) > $today
            ) {
                $this->markCompleted($reminder, 'progress');
                $completed++;
            } elseif ($reminder->due_at->copy()->timezone($tz)->toDateString() < $today
                && $this->preferences->localDate($nextAt, $user) > $this->preferences->localDate($reminder->due_at, $user)
                && $lastAt->greaterThanOrEqualTo($reminder->created_at ?? $reminder->due_at)
            ) {
                $this->markCompleted($reminder, 'progress');
                $completed++;
            }
        }

        return $completed;
    }

    private function cancelStaleAssignmentReminders(User $user): int
    {
        $open = RevisionReminder::query()
            ->where('user_id', $user->id)
            ->where('source_type', RevisionReminderSource::TeacherAssignment->value)
            ->whereIn('status', RevisionReminderStatus::openValues())
            ->get();

        $cancelled = 0;
        foreach ($open as $reminder) {
            $recipientId = (int) ($reminder->teacher_assignment_recipient_id ?? 0);
            if ($recipientId <= 0) {
                continue;
            }
            $recipient = TeacherAssignmentRecipient::query()->find($recipientId);
            if (! $recipient) {
                $this->dismiss($reminder);
                $cancelled++;
            }
        }

        return $cancelled;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function upsertOpen(User $user, array $attributes): RevisionReminder
    {
        return DB::transaction(function () use ($user, $attributes) {
            $existing = RevisionReminder::query()
                ->where('user_id', $user->id)
                ->where('source_key', $attributes['source_key'])
                ->lockForUpdate()
                ->first();

            $dueAt = $attributes['due_at'] instanceof Carbon
                ? $attributes['due_at']
                : Carbon::parse($attributes['due_at']);

            $status = $this->statusForDue($user, $dueAt);

            $payload = [
                'user_id' => $user->id,
                'source_type' => $attributes['source_type'],
                'source_key' => $attributes['source_key'],
                'surah_number' => (int) $attributes['surah_number'],
                'ayah_start' => (int) $attributes['ayah_start'],
                'ayah_end' => (int) $attributes['ayah_end'],
                'due_at' => $dueAt,
                'priority' => $attributes['priority'] ?? RevisionReminderPriority::Normal->value,
                'session_settings' => $attributes['session_settings'] ?? null,
                'teacher_assignment_recipient_id' => $attributes['teacher_assignment_recipient_id'] ?? null,
                'memorisation_practice_plan_id' => $attributes['memorisation_practice_plan_id'] ?? null,
                'zone' => $attributes['zone'] ?? null,
                'zone_step' => $attributes['zone_step'] ?? null,
                'interval_days' => $attributes['interval_days'] ?? null,
            ];

            if ($existing && in_array(
                $existing->status instanceof RevisionReminderStatus
                    ? $existing->status->value
                    : (string) $existing->status,
                [RevisionReminderStatus::Completed->value, RevisionReminderStatus::Cancelled->value],
                true
            )) {
                // Re-open only when due date moved forward for a new cycle.
                if ($existing->completed_at && $dueAt->lessThanOrEqualTo($existing->due_at)) {
                    return $existing;
                }
            }

            if ($existing && $existing->status === RevisionReminderStatus::Snoozed
                && $existing->snoozed_until
                && $existing->snoozed_until->isFuture()
            ) {
                // Keep teacher due/priority updates but preserve snooze window.
                $existing->forceFill(array_merge($payload, [
                    'status' => RevisionReminderStatus::Snoozed->value,
                    'due_at' => $existing->snoozed_until,
                ]))->save();

                return $existing->fresh() ?? $existing;
            }

            if ($existing) {
                $keepNotify = ! array_key_exists('notified_in_app_at', $attributes);
                $fill = array_merge($payload, [
                    'status' => $status,
                    'snoozed_until' => null,
                ]);
                if (! $keepNotify) {
                    $fill['notified_in_app_at'] = $attributes['notified_in_app_at'];
                    $fill['emailed_at'] = $attributes['emailed_at'] ?? null;
                }
                // Teacher/custom due always wins for assignment sources.
                $existing->forceFill($fill)->save();

                return $existing->fresh() ?? $existing;
            }

            $reminder = new RevisionReminder;
            $reminder->forceFill(array_merge($payload, [
                'status' => $status,
                'notified_in_app_at' => $attributes['notified_in_app_at'] ?? null,
                'emailed_at' => $attributes['emailed_at'] ?? null,
            ]))->save();

            return $reminder->fresh() ?? $reminder;
        });
    }

    private function markCompleted(RevisionReminder $reminder, string $via): void
    {
        if (! $reminder->isOpen()) {
            return;
        }

        $reminder->forceFill([
            'status' => RevisionReminderStatus::Completed->value,
            'completed_at' => now(),
            'completed_via' => mb_substr($via, 0, 32),
            'snoozed_until' => null,
        ])->save();
    }

    private function statusForDue(User $user, Carbon $dueAt): string
    {
        $today = $this->preferences->localDate(now(), $user);
        $dueLocal = $this->preferences->localDate($dueAt, $user);

        return match (true) {
            $dueLocal < $today => RevisionReminderStatus::Overdue->value,
            $dueLocal === $today => RevisionReminderStatus::Due->value,
            default => RevisionReminderStatus::Upcoming->value,
        };
    }

    /**
     * @param  array<string, mixed>  $meta
     * @param  array<string, mixed>  $config
     */
    private function extractSessionScore(array $meta, array $config): ?string
    {
        foreach ([
            $meta['retention_score'] ?? null,
            $meta['revision_score'] ?? null,
            $meta['self_rating'] ?? null,
            $config['retention_score'] ?? null,
            $config['revision_score'] ?? null,
        ] as $candidate) {
            $score = $this->scheduler->scoreFromPerformanceSignal($candidate);
            if ($score !== null) {
                return $score;
            }
        }

        if (isset($meta['accuracy_percent'])) {
            return $this->scheduler->scoreFromPerformanceSignal($meta['accuracy_percent']);
        }

        return null;
    }
}

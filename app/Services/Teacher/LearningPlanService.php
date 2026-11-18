<?php

namespace App\Services\Teacher;

use App\Enums\AssignmentKind;
use App\Enums\AssignmentStatus;
use App\Enums\LearningPlanItemStatus;
use App\Enums\LearningPlanStatus;
use App\Models\LearningPlan;
use App\Models\LearningPlanItem;
use App\Models\LearningPlanTemplate;
use App\Models\LearningPlanTemplateItem;
use App\Models\MemorisationWeakSpot;
use App\Models\User;
use App\Services\Learning\LearningTaskNotifier;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Services\RevisionReminders\RevisionReminderSyncService;
use App\Support\ActivityProgress;
use App\Support\QuranMetadata;
use App\Support\TeacherFeatures;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LearningPlanService
{
    public function __construct(
        private readonly StudentAccessAuthorizer $access,
        private readonly TeacherAssignmentService $assignments,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function listForTeacher(User $teacher, ?int $studentId = null): array
    {
        TeacherFeatures::abortUnlessEnabled();
        $query = LearningPlan::query()
            ->where('teacher_id', $teacher->id)
            ->with(['student:id,name', 'items.assignment.recipients'])
            ->latest('id');
        if ($studentId) {
            $this->assertAuthorised($teacher, $studentId);
            $query->where('student_id', $studentId);
        }

        return $query->limit(50)->get()
            ->unique('id')
            ->map(fn (LearningPlan $plan) => $this->presentPlan($plan))
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $input
     */
    public function createPlan(User $teacher, array $input): LearningPlan
    {
        TeacherFeatures::abortUnlessEnabled();
        $studentId = (int) ($input['student_id'] ?? 0);
        $this->assertAuthorised($teacher, $studentId);

        $rawCadence = (string) ($input['cadence'] ?? 'weekly');
        $cadence = in_array($rawCadence, ['weekly', 'monthly', 'custom'], true) ? $rawCadence : 'weekly';
        $startsOn = Carbon::parse((string) ($input['starts_on'] ?? today()->toDateString()))->startOfDay();
        if ($cadence === 'custom' && empty($input['ends_on'])) {
            throw ValidationException::withMessages(['ends_on' => 'Choose an end date for a custom plan.']);
        }
        $endsOn = isset($input['ends_on']) && $input['ends_on']
            ? Carbon::parse((string) $input['ends_on'])->startOfDay()
            : $startsOn->copy()->addDays($cadence === 'monthly' ? 30 : 7);
        $title = trim((string) ($input['title'] ?? 'Learning plan')) ?: 'Learning plan';
        $duplicate = LearningPlan::query()
            ->where('teacher_id', $teacher->id)
            ->where('student_id', $studentId)
            ->where('title', $title)
            ->whereDate('starts_on', $startsOn->toDateString())
            ->where('status', '!=', LearningPlanStatus::Archived->value)
            ->exists();
        if ($duplicate && empty($input['allow_duplicate'])) {
            throw ValidationException::withMessages([
                'title' => 'A plan with this title and start date already exists for this student.',
            ]);
        }

        return DB::transaction(function () use ($teacher, $input, $studentId, $cadence, $startsOn, $endsOn, $title) {
            $plan = new LearningPlan;
            $plan->forceFill([
                'teacher_id' => $teacher->id,
                'student_id' => $studentId,
                'organisation_id' => $teacher->organisation_id,
                'source_template_id' => $input['source_template_id'] ?? null,
                'title' => $title,
                'cadence' => $cadence,
                'status' => LearningPlanStatus::Draft->value,
                'starts_on' => $startsOn->toDateString(),
                'ends_on' => $endsOn->toDateString(),
                'notes' => $this->nullableText($input['notes'] ?? null),
                'student_goal' => $this->nullableGoal($input['student_goal'] ?? null),
            ])->save();

            $items = is_array($input['items'] ?? null) ? $input['items'] : [];
            foreach (array_values($items) as $index => $item) {
                $this->addItem($teacher, $plan, $item, $index, persist: true);
            }

            if (! empty($input['activate'])) {
                return $this->activate($teacher, $plan->fresh('items'));
            }

            return $plan->fresh(['student:id,name', 'items.assignment.recipients']);
        });
    }

    /**
     * @param  array<string, mixed>  $input
     */
    public function updatePlan(User $teacher, LearningPlan $plan, array $input): LearningPlan
    {
        $this->assertOwns($teacher, $plan);
        if (isset($input['title'])) {
            $plan->title = trim((string) $input['title']) ?: $plan->title;
        }
        if (isset($input['notes'])) {
            $plan->notes = $this->nullableText($input['notes']);
        }
        if (array_key_exists('student_goal', $input)) {
            $plan->student_goal = $this->nullableGoal($input['student_goal']);
        }
        if (isset($input['cadence']) && in_array($input['cadence'], ['weekly', 'monthly', 'custom'], true)) {
            $plan->cadence = $input['cadence'];
        }
        if (isset($input['starts_on'])) {
            $plan->starts_on = Carbon::parse((string) $input['starts_on'])->toDateString();
        }
        if (array_key_exists('ends_on', $input)) {
            $plan->ends_on = $input['ends_on']
                ? Carbon::parse((string) $input['ends_on'])->toDateString()
                : null;
        }
        if (isset($input['status'])) {
            $status = LearningPlanStatus::tryFrom((string) $input['status']);
            if ($status && $status !== LearningPlanStatus::Draft) {
                $plan->status = $status;
            }
        }
        $plan->save();

        // Append new activities only — released history and pending suggestions stay.
        if (is_array($input['items'] ?? null)) {
            $nextOrder = ((int) $plan->items()->max('sort_order')) + 1;
            foreach (array_values($input['items']) as $item) {
                if (! empty($item['id'])) {
                    $this->adjustItem($teacher, $plan, $item);

                    continue;
                }
                $this->addItem($teacher, $plan, $item, $nextOrder, persist: true);
                $nextOrder++;
            }
        }

        return $plan->fresh(['student:id,name', 'items.assignment.recipients']);
    }

    public function setStatus(User $teacher, LearningPlan $plan, string $status): LearningPlan
    {
        $this->assertOwns($teacher, $plan);
        $next = LearningPlanStatus::tryFrom($status);
        if (! $next) {
            throw ValidationException::withMessages(['status' => 'Choose a valid plan status.']);
        }
        if ($next === LearningPlanStatus::Active) {
            return $this->activate($teacher, $plan);
        }
        $plan->status = $next;
        $plan->save();
        if ($next === LearningPlanStatus::Paused) {
            $plan->items()
                ->where('item_status', LearningPlanItemStatus::Planned->value)
                ->update(['item_status' => LearningPlanItemStatus::Paused->value]);
        }
        if ($next === LearningPlanStatus::Active) {
            $plan->items()
                ->where('item_status', LearningPlanItemStatus::Paused->value)
                ->update(['item_status' => LearningPlanItemStatus::Planned->value]);
        }

        return $plan->fresh(['student:id,name', 'items.assignment.recipients']);
    }

    public function activate(User $teacher, LearningPlan $plan): LearningPlan
    {
        $this->assertOwns($teacher, $plan);

        return DB::transaction(function () use ($teacher, $plan) {
            $plan->load('items');
            foreach ($plan->items as $item) {
                if ($item->item_status === LearningPlanItemStatus::Planned
                    || $item->item_status === LearningPlanItemStatus::Paused) {
                    if ($item->origin === 'suggested') {
                        continue; // suggestions require explicit approval
                    }
                    $this->releaseItem($teacher, $plan, $item);
                }
            }
            $plan->status = LearningPlanStatus::Active;
            $plan->save();

            return $plan->fresh(['student:id,name', 'items.assignment.recipients']);
        });
    }

    public function approveSuggestion(User $teacher, LearningPlanItem $item): LearningPlanItem
    {
        $item->loadMissing('plan');
        $plan = $item->plan;
        abort_if($plan === null, 404);
        $this->assertOwns($teacher, $plan);
        if ($item->origin !== 'suggested') {
            throw ValidationException::withMessages(['item' => 'Only suggested activities need approval.']);
        }
        $item->origin = 'assigned';
        $item->item_status = LearningPlanItemStatus::Planned;
        $item->save();
        if ($plan->status === LearningPlanStatus::Active) {
            $this->releaseItem($teacher, $plan, $item);
        }

        return $item->fresh('assignment.recipients');
    }

    public function skipItem(User $teacher, LearningPlanItem $item): LearningPlanItem
    {
        $item->loadMissing('plan');
        $plan = $item->plan;
        abort_if($plan === null, 404);
        $this->assertOwns($teacher, $plan);
        if ($item->teacher_assignment_id) {
            throw ValidationException::withMessages(['item' => 'Released activities stay in history. Mark the task complete or leave it.']);
        }
        $item->item_status = LearningPlanItemStatus::Skipped;
        $item->save();

        return $item;
    }

    /**
     * @param  array<string, mixed>  $item
     */
    public function addItem(User $teacher, LearningPlan $plan, array $item, ?int $sortOrder = null, bool $persist = true): LearningPlanItem
    {
        $this->assertOwns($teacher, $plan);
        $activity = (string) ($item['activity'] ?? '');
        $allowedActivities = ['nazra', 'hifz', 'tajweed', 'revision', 'sabqi', 'manzil', 'ai_recite'];
        if (! in_array($activity, $allowedActivities, true)) {
            $activity = null;
        }
        if ($activity === 'hifz') {
            $item['kind'] = 'ai_recite';
            $item['hifz_category'] = $this->stage($item['hifz_category'] ?? null, 'sabaq');
        } elseif ($activity === 'tajweed') {
            $item['kind'] = 'ai_recite';
            $item['hifz_category'] = $this->stage($item['hifz_category'] ?? null, 'sabqi');
        } elseif ($activity === 'nazra' || $activity === 'revision' || $activity === 'sabqi') {
            $item['kind'] = 'practice';
            $item['hifz_category'] = $this->stage($item['hifz_category'] ?? null, 'sabqi');
        } elseif ($activity === 'manzil') {
            $item['kind'] = 'practice';
            $item['hifz_category'] = 'manzil';
        } elseif ($activity === 'ai_recite') {
            $item['kind'] = 'ai_recite';
            $item['hifz_category'] = $this->stage($item['hifz_category'] ?? null, 'sabqi');
        }
        $kind = (string) ($item['kind'] ?? 'practice');
        if ($kind === 'teacher_review') {
            $kind = 'practice';
            $item['hifz_category'] = $item['hifz_category'] ?? 'manzil';
        }
        if (! in_array($kind, AssignmentKind::values(), true)) {
            throw ValidationException::withMessages(['kind' => 'Choose practice or AI recite.']);
        }
        $surah = (int) ($item['surah_number'] ?? 0);
        $start = (int) ($item['ayah_start'] ?? 0);
        $end = (int) ($item['ayah_end'] ?? $start);
        $ayahCount = QuranMetadata::ayahCount($surah);
        if ($ayahCount === null || $start < 1 || $end < $start || $end > $ayahCount) {
            throw ValidationException::withMessages(['ayah_end' => 'Choose a valid surah and ayah range.']);
        }
        $dueOn = ! empty($item['due_on']) ? Carbon::parse((string) $item['due_on'])->toDateString() : null;
        $exceptId = isset($item['id']) ? (int) $item['id'] : null;
        $this->assertUniqueItem($plan, $activity, $surah, $start, $end, $dueOn, $exceptId > 0 ? $exceptId : null);

        $row = new LearningPlanItem;
        $row->forceFill([
            'learning_plan_id' => $plan->id,
            'sort_order' => $sortOrder ?? ((int) $plan->items()->max('sort_order') + 1),
            'origin' => ($item['origin'] ?? 'assigned') === 'suggested' ? 'suggested' : 'assigned',
            'item_status' => LearningPlanItemStatus::Planned->value,
            'kind' => $kind,
            'activity' => $activity,
            'hifz_category' => (string) ($item['hifz_category'] ?? 'sabaq'),
            'surah_number' => $surah,
            'ayah_start' => $start,
            'ayah_end' => $end,
            'repetition_target' => isset($item['repetition_target']) ? (int) $item['repetition_target'] : null,
            'due_on' => $dueOn,
            'priority' => in_array(($item['priority'] ?? 'normal'), ['low', 'normal', 'high'], true) ? (string) ($item['priority'] ?? 'normal') : 'normal',
            'is_milestone' => (bool) ($item['is_milestone'] ?? false),
            'instructions' => $this->nullableText($item['instructions'] ?? null),
            'weak_spot_id' => isset($item['weak_spot_id']) ? (int) $item['weak_spot_id'] : null,
        ]);
        if ($persist) {
            $row->save();
        }

        return $row;
    }

    public function releaseItem(User $teacher, LearningPlan $plan, LearningPlanItem $item): LearningPlanItem
    {
        if ($item->teacher_assignment_id || $item->item_status === LearningPlanItemStatus::Released) {
            return $item;
        }
        if ($item->origin === 'suggested') {
            throw ValidationException::withMessages(['item' => 'Approve this suggestion before assigning it.']);
        }

        try {
            $payload = [
                'kind' => $item->kind,
                'hifz_category' => $item->hifz_category,
                'student_id' => $plan->student_id,
                'surah_number' => $item->surah_number,
                'ayah_start' => $item->ayah_start,
                'ayah_end' => $item->ayah_end,
                'repetition_target' => $item->repetition_target,
                'due_at' => $item->due_on?->toDateString() ?: $plan->ends_on?->toDateString() ?: today()->addDays(7)->toDateString(),
                'feedback' => $item->instructions,
                'learning_plan_id' => $plan->id,
                'learning_plan_item_id' => $item->id,
            ];
            if (in_array((string) $item->activity, ['nazra', 'hifz', 'tajweed', 'revision'], true)) {
                $payload['activity'] = $item->activity;
                $payload['recording_required'] = in_array($item->activity, ['hifz', 'tajweed'], true);
            }
            $assignment = $this->assignments->create($teacher, $payload);
        } catch (ValidationException $exception) {
            // An equivalent open task already exists — keep the plan item planned with a note.
            throw ValidationException::withMessages([
                'item' => $exception->errors()['assignment'][0]
                    ?? 'Could not release this activity because a matching open task already exists.',
            ]);
        }

        $item->forceFill([
            'teacher_assignment_id' => $assignment->id,
            'item_status' => LearningPlanItemStatus::Released->value,
        ])->save();

        return $item->fresh('assignment.recipients');
    }

    /**
     * Suggested revision activities from recurring weak ayahs (not yet assigned).
     *
     * @return list<array<string, mixed>>
     */
    public function suggestFromWeakSpots(User $teacher, User $student): array
    {
        $this->assertAuthorised($teacher, (int) $student->id);

        $grouped = [];
        MemorisationWeakSpot::query()
            ->where('user_id', $student->id)
            ->whereIn('status', ['active', 'improving'])
            ->where('affected_attempt_count', '>=', 2)
            ->orderByDesc('affected_attempt_count')
            ->orderByDesc('severity')
            ->limit(24)
            ->get()
            ->each(function (MemorisationWeakSpot $spot) use (&$grouped) {
                $surah = (int) $spot->surah_number;
                $ayah = (int) $spot->ayah_number;
                $key = $surah.':'.$ayah;
                $count = (int) $spot->affected_attempt_count;
                if (! isset($grouped[$key])) {
                    $grouped[$key] = [
                        'origin' => 'suggested',
                        'kind' => 'practice',
                        'activity' => 'revision',
                        'hifz_category' => 'sabqi',
                        'surah_number' => $surah,
                        'surah_name' => QuranMetadata::name($surah),
                        'ayah_start' => $ayah,
                        'ayah_end' => $ayah,
                        'repetition_target' => 3,
                        'priority' => 'high',
                        'weak_spot_id' => (int) $spot->id,
                        'evidence_count' => $count,
                    ];
                } else {
                    $grouped[$key]['evidence_count'] += $count;
                }
                $grouped[$key]['reason'] = 'The expected wording did not match in '.$grouped[$key]['evidence_count'].' recent checks. Word matching is not a Tajweed or pronunciation assessment.';
            });

        $suggestions = array_values($grouped);
        usort($suggestions, fn ($a, $b) => ($b['evidence_count'] <=> $a['evidence_count']));

        return array_slice($suggestions, 0, 8);
    }

    /**
     * @param  array<string, mixed>  $input
     */
    public function saveTemplate(User $teacher, array $input, ?LearningPlanTemplate $template = null): LearningPlanTemplate
    {
        TeacherFeatures::abortUnlessEnabled();
        if ($template) {
            abort_unless((int) $template->teacher_id === (int) $teacher->id, 404);
        } else {
            $template = new LearningPlanTemplate;
        }
        $template->forceFill([
            'teacher_id' => $teacher->id,
            'organisation_id' => $teacher->organisation_id,
            'name' => trim((string) ($input['name'] ?? 'Plan template')) ?: 'Plan template',
            'description' => $this->nullableText($input['description'] ?? null),
            'cadence' => in_array(($input['cadence'] ?? 'weekly'), ['weekly', 'monthly'], true) ? (string) ($input['cadence'] ?? 'weekly') : 'weekly',
            'is_shared' => (bool) ($input['is_shared'] ?? false),
        ])->save();

        $template->items()->delete();
        foreach (array_values($input['items'] ?? []) as $index => $item) {
            $row = new LearningPlanTemplateItem;
            $row->forceFill([
                'learning_plan_template_id' => $template->id,
                'sort_order' => $index,
                'kind' => (string) ($item['kind'] ?? 'practice'),
                'hifz_category' => (string) ($item['hifz_category'] ?? 'sabaq'),
                'surah_number' => (int) ($item['surah_number'] ?? 1),
                'ayah_start' => (int) ($item['ayah_start'] ?? 1),
                'ayah_end' => (int) ($item['ayah_end'] ?? ($item['ayah_start'] ?? 1)),
                'repetition_target' => isset($item['repetition_target']) ? (int) $item['repetition_target'] : null,
                'day_offset' => (int) ($item['day_offset'] ?? 0),
                'priority' => (string) ($item['priority'] ?? 'normal'),
                'instructions' => $this->nullableText($item['instructions'] ?? null),
            ])->save();
        }

        return $template->fresh('items');
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listTemplates(User $teacher): array
    {
        return LearningPlanTemplate::query()
            ->where(function ($query) use ($teacher) {
                $query->where('teacher_id', $teacher->id)
                    ->orWhere(function ($shared) use ($teacher) {
                        $shared->where('is_shared', true)
                            ->where('organisation_id', $teacher->organisation_id);
                    });
            })
            ->with('items')
            ->latest('id')
            ->limit(40)
            ->get()
            ->map(fn (LearningPlanTemplate $template) => $this->presentTemplate($template))
            ->all();
    }

    public function createFromTemplate(User $teacher, LearningPlanTemplate $template, int $studentId, ?string $startsOn = null): LearningPlan
    {
        abort_unless(
            (int) $template->teacher_id === (int) $teacher->id
            || ($template->is_shared && (int) $template->organisation_id === (int) $teacher->organisation_id),
            404
        );
        $start = Carbon::parse($startsOn ?: today()->toDateString());
        $items = $template->items->map(function (LearningPlanTemplateItem $item) use ($start) {
            return [
                'kind' => $item->kind,
                'hifz_category' => $item->hifz_category,
                'surah_number' => $item->surah_number,
                'ayah_start' => $item->ayah_start,
                'ayah_end' => $item->ayah_end,
                'repetition_target' => $item->repetition_target,
                'due_on' => $start->copy()->addDays((int) $item->day_offset)->toDateString(),
                'priority' => $item->priority,
                'instructions' => $item->instructions,
                'origin' => 'assigned',
            ];
        })->all();

        return $this->createPlan($teacher, [
            'student_id' => $studentId,
            'title' => $template->name,
            'cadence' => $template->cadence,
            'starts_on' => $start->toDateString(),
            'source_template_id' => $template->id,
            'items' => $items,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function presentPlan(LearningPlan $plan): array
    {
        $plan->loadMissing(['student:id,name', 'items.assignment.recipients']);
        $items = $plan->items->map(fn (LearningPlanItem $item) => $this->presentItem($item))->values()->all();
        $progress = $this->progressFromItems($items);

        return [
            'id' => (int) $plan->id,
            'title' => $plan->title,
            'cadence' => $plan->cadence,
            'status' => $plan->status instanceof LearningPlanStatus ? $plan->status->value : (string) $plan->status,
            'starts_on' => $plan->starts_on?->toDateString(),
            'ends_on' => $plan->ends_on?->toDateString(),
            'notes' => $plan->notes,
            'student_goal' => $plan->student_goal,
            'student' => [
                'id' => (int) $plan->student_id,
                'name' => $plan->student?->name,
            ],
            'progress' => $progress,
            'progress_complete' => $progress['total'] > 0 && $progress['completed'] >= $progress['total'],
            'items' => $items,
            'next_action' => $this->nextAction($items),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function presentItem(LearningPlanItem $item): array
    {
        $status = $item->item_status instanceof LearningPlanItemStatus
            ? $item->item_status->value
            : (string) $item->item_status;
        $recipient = $item->assignment?->recipients?->first();
        $taskStatus = $recipient?->status;
        $taskStatusValue = $taskStatus instanceof AssignmentStatus
            ? $taskStatus->value
            : ($taskStatus !== null ? (string) $taskStatus : null);
        $display = $this->displayStatus($status, $taskStatusValue, $item->due_on);

        return [
            'id' => (int) $item->id,
            'sort_order' => (int) $item->sort_order,
            'origin' => $item->origin,
            'item_status' => $status,
            'display_status' => $display,
            'kind' => $item->kind,
            'activity' => $item->activity,
            'hifz_category' => $item->hifz_category,
            'surah_number' => (int) $item->surah_number,
            'surah_name' => QuranMetadata::name((int) $item->surah_number),
            'ayah_start' => (int) $item->ayah_start,
            'ayah_end' => (int) $item->ayah_end,
            'repetition_target' => $item->repetition_target,
            'due_on' => $item->due_on?->toDateString(),
            'priority' => $item->priority,
            'is_milestone' => (bool) $item->is_milestone,
            'instructions' => $item->instructions,
            'teacher_assignment_id' => $item->teacher_assignment_id ? (int) $item->teacher_assignment_id : null,
            'recipient_id' => $recipient ? (int) $recipient->id : null,
            'task_status' => $taskStatusValue,
            'weak_spot_id' => $item->weak_spot_id ? (int) $item->weak_spot_id : null,
            'label' => QuranMetadata::name((int) $item->surah_number).' · '.(int) $item->ayah_start.'–'.(int) $item->ayah_end,
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @return array{total:int,completed:int,overdue:int,upcoming:int,suggested:int,cancelled:int,archived:int,percent:int}
     */
    public function progressFromItems(array $items): array
    {
        $countable = array_values(array_filter($items, fn ($item) => $this->activityCountsTowardPlan($item)));
        $total = count($countable);
        $completed = count(array_filter($countable, fn ($item) => ($item['display_status'] ?? '') === 'completed'));
        $overdue = count(array_filter($countable, fn ($item) => ($item['display_status'] ?? '') === 'overdue'));
        $upcoming = count(array_filter($countable, fn ($item) => in_array(($item['display_status'] ?? ''), ['upcoming', 'in_progress', 'planned', 'submitted'], true)));
        $suggested = count(array_filter($items, fn ($item) => ($item['origin'] ?? '') === 'suggested' && ($item['item_status'] ?? '') !== 'released'));
        $cancelled = count(array_filter($items, fn ($item) => $this->activityClosure($item) === 'cancelled'));
        $archived = count(array_filter($items, fn ($item) => $this->activityClosure($item) === 'archived'));

        return [
            'total' => $total,
            'completed' => $completed,
            'overdue' => $overdue,
            'upcoming' => $upcoming,
            'suggested' => $suggested,
            'cancelled' => $cancelled,
            'archived' => $archived,
            'percent' => ActivityProgress::percent($completed, $total),
        ];
    }

    /**
     * @param  array<string, mixed>  $item
     */
    private function activityCountsTowardPlan(array $item): bool
    {
        if ($this->activityClosure($item) !== null) {
            return false;
        }

        $origin = (string) ($item['origin'] ?? '');
        $itemStatus = (string) ($item['item_status'] ?? '');

        return $origin !== 'suggested' || $itemStatus === 'released';
    }

    /**
     * @param  array<string, mixed>  $item
     */
    private function activityClosure(array $item): ?string
    {
        $itemStatus = (string) ($item['item_status'] ?? '');
        $display = (string) ($item['display_status'] ?? '');
        foreach (['cancelled', 'archived'] as $closure) {
            if ($itemStatus === $closure || $display === $closure) {
                return $closure;
            }
        }

        return null;
    }

    /**
     * Learner-facing active plan summary.
     *
     * @return array<string, mixed>|null
     */
    public function presentForLearner(User $student): ?array
    {
        $plan = LearningPlan::query()
            ->where('student_id', $student->id)
            ->whereIn('status', [LearningPlanStatus::Active->value, LearningPlanStatus::Paused->value])
            ->with(['teacher:id,name', 'items.assignment.recipients' => fn ($q) => $q->where('student_id', $student->id)])
            ->latest('id')
            ->first();
        if (! $plan) {
            return null;
        }
        $presented = $this->presentPlan($plan);
        $presented['teacher_name'] = $plan->teacher?->name;
        $presented['items'] = array_values(array_filter(
            $presented['items'],
            fn ($item) => ($item['origin'] ?? '') === 'assigned' || ($item['item_status'] ?? '') === 'released'
        ));
        $presented['progress'] = $this->progressFromItems($presented['items']);
        $presented['next_action'] = $plan->status === LearningPlanStatus::Paused
            ? null
            : $this->nextAction($presented['items']);
        if ($plan->status === LearningPlanStatus::Paused) {
            $presented['items'] = array_map(function (array $item) {
                if (! in_array($item['display_status'] ?? '', ['completed', 'skipped'], true)) {
                    $item['display_status'] = 'paused';
                }

                return $item;
            }, $presented['items']);
        }

        return $presented;
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @return array<string, mixed>|null
     */
    private function nextAction(array $items): ?array
    {
        $candidates = array_values(array_filter($items, function ($item) {
            if (($item['origin'] ?? '') === 'suggested' && ($item['item_status'] ?? '') !== 'released') {
                return false;
            }

            return in_array(($item['display_status'] ?? ''), ['overdue', 'upcoming', 'in_progress', 'planned'], true);
        }));
        usort($candidates, function ($a, $b) {
            $rank = ['overdue' => 0, 'in_progress' => 1, 'upcoming' => 2, 'planned' => 3];
            $ra = $rank[$a['display_status'] ?? ''] ?? 9;
            $rb = $rank[$b['display_status'] ?? ''] ?? 9;
            if ($ra !== $rb) {
                return $ra <=> $rb;
            }

            return strcmp((string) ($a['due_on'] ?? '9999'), (string) ($b['due_on'] ?? '9999'));
        });

        return $candidates[0] ?? null;
    }

    private function displayStatus(string $itemStatus, ?string $taskStatus, mixed $dueOn): string
    {
        if (in_array($itemStatus, ['cancelled', 'archived'], true)) {
            return $itemStatus;
        }
        if ($itemStatus === LearningPlanItemStatus::Skipped->value) {
            return 'skipped';
        }
        if ($itemStatus === LearningPlanItemStatus::Paused->value) {
            return 'paused';
        }
        if ($taskStatus === AssignmentStatus::Completed->value) {
            return 'completed';
        }
        if ($taskStatus === AssignmentStatus::Overdue->value) {
            return 'overdue';
        }
        if ($taskStatus === AssignmentStatus::AwaitingConfirmation->value) {
            return 'submitted';
        }
        if ($taskStatus === AssignmentStatus::InProgress->value) {
            return 'in_progress';
        }
        $due = $dueOn ? Carbon::parse((string) $dueOn)->endOfDay() : null;
        if ($due && $due->isPast() && $itemStatus === LearningPlanItemStatus::Released->value) {
            return 'overdue';
        }
        if ($itemStatus === LearningPlanItemStatus::Released->value) {
            return 'upcoming';
        }

        return 'planned';
    }

    /**
     * @return array<string, mixed>
     */
    /**
     * @return array<string, mixed>
     */
    public function presentTemplate(LearningPlanTemplate $template): array
    {
        $template->loadMissing('items');

        return [
            'id' => (int) $template->id,
            'name' => $template->name,
            'description' => $template->description,
            'cadence' => $template->cadence,
            'is_shared' => (bool) $template->is_shared,
            'items' => $template->items->map(fn (LearningPlanTemplateItem $item) => [
                'id' => (int) $item->id,
                'sort_order' => (int) $item->sort_order,
                'kind' => $item->kind,
                'hifz_category' => $item->hifz_category,
                'surah_number' => (int) $item->surah_number,
                'surah_name' => QuranMetadata::name((int) $item->surah_number),
                'ayah_start' => (int) $item->ayah_start,
                'ayah_end' => (int) $item->ayah_end,
                'repetition_target' => $item->repetition_target,
                'day_offset' => (int) $item->day_offset,
                'priority' => $item->priority,
                'instructions' => $item->instructions,
            ])->values()->all(),
        ];
    }

    private function assertAuthorised(User $teacher, int $studentId): void
    {
        $student = User::query()->find($studentId);
        abort_unless($student && $this->access->allows($teacher, $student), 404);
    }

    private function assertOwns(User $teacher, LearningPlan $plan): void
    {
        abort_unless((int) $plan->teacher_id === (int) $teacher->id, 404);
        $this->assertAuthorised($teacher, (int) $plan->student_id);
    }

    public function rescheduleItem(User $teacher, LearningPlanItem $item, string $dueOn): LearningPlanItem
    {
        $item->loadMissing('plan.student');
        $plan = $item->plan;
        abort_if($plan === null, 404);
        $this->assertOwns($teacher, $plan);
        $due = Carbon::parse($dueOn)->startOfDay();
        if ($plan->starts_on && $due->lt($plan->starts_on->copy()->startOfDay())) {
            throw ValidationException::withMessages(['due_on' => 'Choose a date inside the plan.']);
        }
        $item->due_on = $due->toDateString();
        $item->save();

        $assignment = $item->teacher_assignment_id
            ? $item->assignment()->with('recipients')->first()
            : null;
        if ($assignment) {
            $previous = $assignment->due_at?->toDateString();
            $assignment->due_at = $due->toDateString();
            $assignment->save();
            $assignment->load('recipients');
            $sync = app(RevisionReminderSyncService::class);
            foreach ($assignment->recipients as $recipient) {
                $sync->syncTeacherAssignmentRecipient($recipient);
            }
            if ($previous !== $due->toDateString()) {
                app(LearningTaskNotifier::class)->deadlineMoved($assignment);
            }
        }

        return $item->fresh('assignment.recipients') ?? $item;
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private function adjustItem(User $teacher, LearningPlan $plan, array $input): void
    {
        $item = $plan->items()->whereKey((int) $input['id'])->first();
        if (! $item instanceof LearningPlanItem) {
            return;
        }
        $released = $item->teacher_assignment_id !== null
            || $item->item_status === LearningPlanItemStatus::Released;
        if ($released) {
            if (! empty($input['due_on'])) {
                $this->rescheduleItem($teacher, $item, (string) $input['due_on']);
            }
            if (array_key_exists('is_milestone', $input)) {
                $item->is_milestone = (bool) $input['is_milestone'];
                $item->save();
            }

            return;
        }

        $draft = $this->addItem($teacher, $plan, $input, (int) $item->sort_order, persist: false);
        $item->forceFill([
            'kind' => $draft->kind,
            'activity' => $draft->activity,
            'hifz_category' => $draft->hifz_category,
            'surah_number' => $draft->surah_number,
            'ayah_start' => $draft->ayah_start,
            'ayah_end' => $draft->ayah_end,
            'repetition_target' => $draft->repetition_target,
            'due_on' => $draft->due_on,
            'priority' => $draft->priority,
            'is_milestone' => $draft->is_milestone,
            'instructions' => $draft->instructions,
        ])->save();
    }

    private function stage(mixed $value, string $fallback): string
    {
        $stage = (string) $value;

        return in_array($stage, ['sabaq', 'sabqi', 'manzil'], true) ? $stage : $fallback;
    }

    private function assertUniqueItem(LearningPlan $plan, ?string $activity, int $surah, int $start, int $end, ?string $dueOn, ?int $exceptId = null): void
    {
        $query = LearningPlanItem::query()
            ->where('learning_plan_id', $plan->id)
            ->where('surah_number', $surah)
            ->where('ayah_start', $start)
            ->where('ayah_end', $end)
            ->where('item_status', '!=', LearningPlanItemStatus::Skipped->value);
        if ($exceptId) {
            $query->where('id', '!=', $exceptId);
        }
        if ($activity === null || $activity === '') {
            $query->whereNull('activity');
        } else {
            $query->where('activity', $activity);
        }
        if ($dueOn === null) {
            $query->whereNull('due_on');
        } else {
            $query->whereDate('due_on', $dueOn);
        }
        if ($query->exists()) {
            throw ValidationException::withMessages([
                'items' => 'This activity is already on the learning plan.',
            ]);
        }
    }

    private function nullableText(mixed $value): ?string
    {
        $text = trim((string) $value);

        return $text === '' ? null : mb_substr($text, 0, 2000);
    }

    private function nullableGoal(mixed $value): ?string
    {
        $text = trim((string) $value);

        return $text === '' ? null : mb_substr($text, 0, 500);
    }
}

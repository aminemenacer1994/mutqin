<?php

namespace App\Services\Parent;

use App\Enums\ParentGuardianPermission;
use App\Models\ParentLearningReport;
use App\Models\User;
use Illuminate\Support\Carbon;

class ParentLearningReportReader
{
    public function __construct(private readonly ParentAccessAuthorizer $access) {}

    /**
     * @return array<string, mixed>
     */
    public function index(User $parent, string $cadence, ?int $childId): array
    {
        $cadence = $cadence === 'month' ? 'month' : 'week';
        if ($childId !== null) {
            $child = $this->child($parent, $childId);
            $reports = ParentLearningReport::query()
                ->where('student_user_id', $child->id)
                ->where('cadence', $cadence)
                ->orderByDesc('period_start')
                ->limit(12)
                ->get()
                ->map(fn (ParentLearningReport $report) => $this->present($parent, $child, $report))
                ->values()
                ->all();

            return [
                'scope' => 'child',
                'cadence' => $cadence,
                'pdf_supported' => false,
                'combined_scores' => false,
                'family' => null,
                'reports' => $reports,
            ];
        }

        $children = User::query()->whereIn('id', $this->access->authorizedStudentIds($parent)->all())->orderBy('name')->get();
        $family = [];
        $reports = [];
        foreach ($children as $child) {
            if (! $this->canSeeAny($parent, $child)) {
                continue;
            }
            $latest = ParentLearningReport::query()
                ->where('student_user_id', $child->id)
                ->where('cadence', $cadence)
                ->orderByDesc('period_start')
                ->first();
            $presented = $latest instanceof ParentLearningReport ? $this->present($parent, $child, $latest, false) : null;
            $family[] = [
                'child_id' => (int) $child->id,
                'name' => $this->firstName($child),
                'report_id' => $presented['id'] ?? null,
                'period_label' => $presented['period_label'] ?? null,
                'assignments' => $presented['assignments'] ?? null,
                'practice_rows' => $presented['activity']['practice_rows'] ?? null,
                'plain' => $presented === null
                    ? 'No '.$cadence.'ly report has been prepared yet.'
                    : $this->familyLine($presented),
            ];
            if ($presented !== null) {
                $reports[] = $presented;
            }
        }

        return [
            'scope' => 'family',
            'cadence' => $cadence,
            'pdf_supported' => false,
            'combined_scores' => false,
            'family' => [
                'plain' => 'Each child is listed separately. Homework and practice counts are not averaged, and wording checks are not combined.',
                'children' => $family,
            ],
            'reports' => $reports,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function show(User $parent, ParentLearningReport $report): array
    {
        $child = $this->child($parent, (int) $report->student_user_id);

        return $this->present($parent, $child, $report);
    }

    /**
     * @return array<string, mixed>
     */
    public function present(User $parent, User $child, ParentLearningReport $report, bool $withNarrative = true): array
    {
        abort_unless($this->canSeeAny($parent, $child), 404);
        $payload = is_array($report->payload) ? $report->payload : [];
        $assignments = $this->access->allows($parent, $child, ParentGuardianPermission::ViewAssignments->value)
            ? ($payload['assignments'] ?? null)
            : null;
        $progress = $this->access->allows($parent, $child, ParentGuardianPermission::ViewProgress->value);
        $messages = $this->access->allows($parent, $child, ParentGuardianPermission::ViewMessages->value);
        $activity = $progress ? ($payload['activity'] ?? null) : null;
        $goals = $progress ? ($payload['goals'] ?? null) : null;
        $wording = $progress ? ($payload['wording'] ?? null) : null;
        $feedback = [
            'notes' => $messages && is_array($payload['feedback']['notes'] ?? null) ? $payload['feedback']['notes'] : [],
            'recommendations' => $progress && is_array($payload['feedback']['recommendations'] ?? null) ? $payload['feedback']['recommendations'] : [],
        ];
        if (! $messages && ! $progress) {
            $feedback = null;
        }
        $comparison = $this->visibleComparison($payload['comparison'] ?? null, $assignments !== null, $progress);
        $attention = array_values(array_filter(
            is_array($payload['attention'] ?? null) ? $payload['attention'] : [],
            function (array $item) use ($assignments, $progress): bool {
                $kind = (string) ($item['kind'] ?? '');
                if ($kind === 'overdue') {
                    return $assignments !== null;
                }

                return $progress;
            }
        ));
        $sources = array_values(array_filter(
            is_array($payload['sources'] ?? null) ? $payload['sources'] : [],
            function (array $source) use ($assignments, $progress, $messages): bool {
                return match ((string) ($source['kind'] ?? '')) {
                    'assignments' => $assignments !== null,
                    'teacher_feedback' => $messages,
                    'plans', 'memorisation', 'revision', 'teacher_recommendation', 'ai_word_match' => $progress,
                    default => false,
                };
            }
        ));

        $visible = $assignments !== null || $activity !== null || $goals !== null || $feedback !== null;
        abort_unless($visible, 404);

        $start = $report->period_start instanceof Carbon ? $report->period_start : Carbon::parse((string) $report->period_start);
        $end = $report->period_end instanceof Carbon ? $report->period_end : Carbon::parse((string) $report->period_end);
        $generated = $report->generated_at instanceof Carbon ? $report->generated_at : Carbon::parse((string) $report->generated_at);

        $presented = [
            'id' => (int) $report->id,
            'child_id' => (int) $child->id,
            'name' => $this->firstName($child),
            'cadence' => (string) $report->cadence,
            'period_start' => $start->toDateString(),
            'period_end' => $end->toDateString(),
            'period_label' => $start->format('j M Y').' – '.$end->format('j M Y'),
            'generated_at' => $generated->toIso8601String(),
            'pdf_supported' => false,
            'combined_scores' => false,
            'assignments' => $assignments,
            'activity' => $activity,
            'goals' => $goals,
            'feedback' => $feedback,
            'comparison' => $comparison,
            'attention' => $attention,
            'wording' => $wording,
            'sources' => $sources,
            'insufficient' => $this->insufficient($assignments, $activity, $goals, $feedback, $wording),
        ];
        if ($withNarrative) {
            $presented['narrative'] = $this->narrative($presented);
        }

        return $presented;
    }

    private function child(User $parent, int $childId): User
    {
        abort_unless($this->access->authorizedStudentIds($parent)->contains($childId), 404);
        $child = User::query()->find($childId);
        abort_unless($child instanceof User, 404);

        return $child;
    }

    private function canSeeAny(User $parent, User $child): bool
    {
        return $this->access->allows($parent, $child, ParentGuardianPermission::ViewAssignments->value)
            || $this->access->allows($parent, $child, ParentGuardianPermission::ViewProgress->value)
            || $this->access->allows($parent, $child, ParentGuardianPermission::ViewMessages->value);
    }

    /**
     * @param  array<string, mixed>|null  $comparison
     * @return array<string, mixed>|null
     */
    private function visibleComparison(?array $comparison, bool $assignments, bool $progress): ?array
    {
        if (! is_array($comparison) || (! $assignments && ! $progress)) {
            return null;
        }
        $parts = [];
        if ($progress) {
            $parts[] = (string) ($this->deltaPlain('Practice records', (int) ($comparison['practice_delta'] ?? 0), (string) ($comparison['period'] ?? 'week')));
        }
        if ($assignments) {
            $parts[] = (string) ($this->deltaPlain('Finished tasks', (int) ($comparison['completed_delta'] ?? 0), (string) ($comparison['period'] ?? 'week')));
        }
        $comparison['plain'] = implode(' ', $parts);

        if (! $progress) {
            unset($comparison['practice_current'], $comparison['practice_previous'], $comparison['practice_delta']);
        }
        if (! $assignments) {
            unset($comparison['completed_current'], $comparison['completed_previous'], $comparison['completed_delta']);
        }

        return $comparison;
    }

    private function deltaPlain(string $subject, int $delta, string $period): string
    {
        if ($delta === 0) {
            return $subject.' are the same as the previous '.$period.'.';
        }

        return $subject.' are '.abs($delta).' '.($delta > 0 ? 'higher' : 'lower').' than the previous '.$period.'.';
    }

    /**
     * @param  array<string, mixed>|null  $assignments
     * @param  array<string, mixed>|null  $activity
     * @param  array<string, mixed>|null  $goals
     * @param  array<string, mixed>|null  $feedback
     * @param  array<string, mixed>|null  $wording
     */
    private function insufficient(?array $assignments, ?array $activity, ?array $goals, ?array $feedback, ?array $wording): bool
    {
        $assigned = (int) ($assignments['assigned'] ?? 0);
        $practice = (int) ($activity['practice_rows'] ?? 0);
        $revision = (int) ($activity['revision_sessions'] ?? 0);
        $plans = is_array($goals['plans'] ?? null) ? $goals['plans'] : [];
        $notes = is_array($feedback['notes'] ?? null) ? $feedback['notes'] : [];
        $recommendations = is_array($feedback['recommendations'] ?? null) ? $feedback['recommendations'] : [];
        $direction = (string) ($wording['direction'] ?? 'insufficient');
        $current = $activity['current_memorised'] ?? null;

        return $assigned === 0
            && $practice === 0
            && $revision === 0
            && $plans === []
            && $notes === []
            && $recommendations === []
            && $direction === 'insufficient'
            && (int) ($current ?? 0) === 0;
    }

    /**
     * @param  array<string, mixed>  $report
     * @return array{label: string, text: string}
     */
    private function narrative(array $report): array
    {
        if ($report['insufficient'] === true) {
            return [
                'label' => 'Generated summary',
                'text' => 'There is not enough learning data in this period to describe progress. No score has been estimated. This summary was written from the shared records in this report. It does not replace the teacher.',
            ];
        }

        $parts = [];
        foreach (['assignments', 'activity', 'goals', 'comparison'] as $key) {
            $plain = $report[$key]['plain'] ?? null;
            if (is_string($plain) && $plain !== '') {
                $parts[] = $plain;
            }
        }
        if (is_array($report['wording'] ?? null) && is_string($report['wording']['plain'] ?? null)) {
            $parts[] = $report['wording']['plain'];
        }
        $attention = is_array($report['attention'] ?? null) ? $report['attention'] : [];
        if ($attention === []) {
            $parts[] = 'Nothing in the shared records is marked as needing extra attention.';
        } else {
            $parts[] = 'Needs attention: '.implode(' ', array_map(fn (array $item) => (string) $item['label'], $attention));
        }
        $parts[] = 'This summary was written from the shared records in this report. It does not replace the teacher.';

        return [
            'label' => 'Generated summary',
            'text' => implode(' ', $parts),
        ];
    }

    /**
     * @param  array<string, mixed>  $report
     */
    private function familyLine(array $report): string
    {
        $bits = [];
        if (is_array($report['assignments'] ?? null)) {
            $finished = (int) $report['assignments']['completed'];
            $bits[] = $finished.' homework '.($finished === 1 ? 'task' : 'tasks').' finished';
        }
        if (is_array($report['activity'] ?? null)) {
            $practice = (int) $report['activity']['practice_rows'];
            $bits[] = $practice.' practice '.($practice === 1 ? 'record' : 'records');
        }
        if ($bits === []) {
            return 'A report is ready. The shared sections do not include homework or practice counts.';
        }

        return implode(', ', $bits).'.';
    }

    private function firstName(User $student): string
    {
        $name = trim((string) $student->name);
        $first = strtok($name, ' ');

        return is_string($first) && $first !== '' ? $first : 'Child';
    }
}

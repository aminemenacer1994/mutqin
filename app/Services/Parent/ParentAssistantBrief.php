<?php

namespace App\Services\Parent;

use App\Enums\LearningPlanStatus;
use App\Enums\ParentGuardianPermission;
use App\Enums\TeacherNoteKind;
use App\Models\LearningPlan;
use App\Models\TeacherNote;
use App\Models\User;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Sanitised learning facts for the parent assistant.
 * Permissions are checked before each section. Private notes and recordings are never loaded.
 */
class ParentAssistantBrief
{
    public function __construct(
        private readonly ParentAccessAuthorizer $access,
        private readonly ParentChildLearningService $learning,
    ) {}

    /**
     * @return array{children: list<array<string, mixed>>, truncated_family: bool}
     */
    public function collect(User $parent, ?User $child): array
    {
        $ids = $this->access->authorizedStudentIds($parent);
        if ($child instanceof User) {
            abort_unless($ids->contains((int) $child->id), 404);
            $students = collect([$child]);
            $truncated = false;
        } else {
            $truncated = $ids->count() > 8;
            $students = $ids->isEmpty()
                ? collect()
                : User::query()->whereIn('id', $ids->take(8)->all())->orderBy('name')->get();
        }

        return [
            'children' => $students
                ->map(fn (User $student) => $this->one($parent, $student))
                ->values()
                ->all(),
            'truncated_family' => $truncated,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function one(User $parent, User $student): array
    {
        $canAssignments = $this->access->allows($parent, $student, ParentGuardianPermission::ViewAssignments->value);
        $canProgress = $this->access->allows($parent, $student, ParentGuardianPermission::ViewProgress->value);
        $canMessages = $this->access->allows($parent, $student, ParentGuardianPermission::ViewMessages->value);

        return [
            'id' => (int) $student->id,
            'name' => $this->firstName($student),
            'assignments' => $canAssignments ? $this->assignments($parent, $student) : null,
            'progress' => $canProgress ? $this->progress($parent, $student) : null,
            'feedback' => $canMessages ? $this->feedback($student) : null,
            'plans' => $canProgress ? $this->plans($student) : [],
        ];
    }

    /**
     * @return array{open: list<array{label: string}>, overdue: list<array{label: string}>, truncated: bool}|null
     */
    private function assignments(User $parent, User $student): ?array
    {
        $payload = $this->guard(fn () => $this->learning->assignments($parent, $student));
        if ($payload === null) {
            return null;
        }

        $open = [];
        $overdue = [];
        foreach ($payload['assignments'] as $row) {
            if (($row['status'] ?? null) === 'completed') {
                continue;
            }
            $assignment = is_array($row['assignment'] ?? null) ? $row['assignment'] : [];
            $label = $this->passage($assignment);
            if ($label === '') {
                continue;
            }
            $item = ['label' => $label];
            $open[] = $item;
            if (($row['display_status'] ?? null) === 'overdue') {
                $overdue[] = $item;
            }
        }

        return [
            'open' => array_slice($open, 0, 3),
            'overdue' => array_slice($overdue, 0, 3),
            'truncated' => (bool) ($payload['truncated'] ?? false),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function progress(User $parent, User $student): ?array
    {
        $payload = $this->guard(fn () => $this->learning->progress($parent, $student, 'month'));
        if ($payload === null) {
            return null;
        }

        $coverage = is_array($payload['coverage'] ?? null) ? $payload['coverage'] : [];
        $validated = is_array($payload['validated_memorisation'] ?? null) ? $payload['validated_memorisation'] : [];
        $practice = is_array($payload['practice_volume'] ?? null) ? $payload['practice_volume'] : [];
        $wording = is_array($payload['wording_match'] ?? null) ? $payload['wording_match'] : [];
        $trends = is_array($payload['assignment_trends'] ?? null) ? $payload['assignment_trends'] : [];
        $due = 0;
        $completed = 0;
        $overdue = 0;
        foreach ($trends as $row) {
            if (! is_array($row)) {
                continue;
            }
            $due += (int) ($row['due'] ?? 0);
            $completed += (int) ($row['completed'] ?? 0);
            $overdue += (int) ($row['overdue'] ?? 0);
        }

        $passage = null;
        foreach ($wording['passages'] ?? [] as $row) {
            if (is_array($row) && isset($row['label'], $row['latest'])) {
                $passage = [
                    'label' => $this->plain((string) $row['label'], 80),
                    'latest' => (float) $row['latest'],
                ];
                break;
            }
        }

        $weak = [];
        foreach ($payload['weak_passages'] ?? [] as $row) {
            if (is_array($row) && ($row['source'] ?? null) === 'teacher_confirmed' && isset($row['label'])) {
                $weak[] = $this->plain((string) $row['label'], 80);
            }
        }

        $recommendations = [];
        foreach ($payload['recommendations'] ?? [] as $row) {
            if (! is_array($row)) {
                continue;
            }
            $label = $this->passage($row);
            $note = $this->plain((string) (($row['reason'] ?? '') !== '' ? $row['reason'] : ($row['instructions'] ?? '')), 160);
            if ($label === '' && $note === '') {
                continue;
            }
            $recommendations[] = ['label' => $label, 'note' => $note];
        }

        return [
            'memorised' => isset($coverage['memorised_ayahs']) ? (int) $coverage['memorised_ayahs'] : null,
            'learning' => isset($coverage['learning_ayahs']) ? (int) $coverage['learning_ayahs'] : null,
            'validated' => isset($validated['validated_ayahs']) ? (int) $validated['validated_ayahs'] : null,
            'practice_ayahs' => isset($practice['ayah_rows']) ? (int) $practice['ayah_rows'] : null,
            'homework_due' => $due,
            'homework_completed' => $completed,
            'homework_overdue' => $overdue,
            'wording_direction' => is_string($wording['direction'] ?? null) ? $wording['direction'] : null,
            'wording_passage' => $passage,
            'weak' => array_slice($weak, 0, 2),
            'recommendations' => array_slice($recommendations, 0, 2),
        ];
    }

    /**
     * @return list<array{teacher: string, excerpt: string}>
     */
    private function feedback(User $student): array
    {
        return TeacherNote::query()
            ->where('student_id', $student->id)
            ->where('kind', TeacherNoteKind::Feedback->value)
            ->whereNotNull('body')
            ->with('teacher:id,name')
            ->latest('id')
            ->limit(2)
            ->get()
            ->map(function (TeacherNote $note) {
                $excerpt = $this->plain((string) $note->body, 160);

                return [
                    'teacher' => $this->firstName($note->teacher) ?: 'Teacher',
                    'excerpt' => $excerpt,
                ];
            })
            ->filter(fn (array $row) => $row['excerpt'] !== '')
            ->values()
            ->all();
    }

    /**
     * @return list<string>
     */
    private function plans(User $student): array
    {
        return LearningPlan::query()
            ->where('student_id', $student->id)
            ->where('status', LearningPlanStatus::Active->value)
            ->orderByDesc('id')
            ->limit(2)
            ->pluck('title')
            ->map(fn ($title) => $this->plain((string) $title, 80))
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function passage(array $row): string
    {
        $name = $this->plain((string) ($row['surah_name'] ?? ''), 40);
        $start = isset($row['ayah_start']) ? (int) $row['ayah_start'] : 0;
        $end = isset($row['ayah_end']) ? (int) $row['ayah_end'] : $start;
        $range = $start > 0 ? ($end > $start ? $start.'–'.$end : (string) $start) : '';

        return trim($name.($range !== '' ? ' '.$range : ''));
    }

    private function firstName(?User $user): string
    {
        $name = trim((string) ($user?->name ?? ''));
        if ($name === '') {
            return '';
        }
        $parts = preg_split('/\s+/u', $name) ?: [];

        return $this->plain((string) ($parts[0] ?? $name), 40);
    }

    private function plain(string $value, int $limit): string
    {
        $value = preg_replace('/\s+/u', ' ', trim($value)) ?? '';
        if (mb_strlen($value) <= $limit) {
            return $value;
        }

        return rtrim(mb_substr($value, 0, $limit - 1)).'…';
    }

    /**
     * @template T
     *
     * @param  callable(): T  $callback
     * @return T|null
     */
    private function guard(callable $callback): mixed
    {
        try {
            return $callback();
        } catch (HttpException $exception) {
            if ($exception->getStatusCode() !== 404) {
                report($exception);
            }

            return null;
        } catch (\Throwable $exception) {
            report($exception);

            return null;
        }
    }
}

<?php

namespace App\Services\Learning;

use App\Models\TeacherAssignmentRecipient;
use App\Models\User;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Services\Teacher\TeacherAssignmentService;
use App\Support\QuranMetadata;

/** Student presentation over canonical recipients; never changes their lifecycle. */
class StudentAssignmentListService
{
    public function __construct(
        private TeacherAssignmentService $assignments,
        private StudentAccessAuthorizer $access,
    ) {}

    public function page(User $student, array $filters): array
    {
        $counts = array_fill_keys(['todo', 'progress', 'review', 'revision', 'completed'], 0);
        $matches = [];
        $teachers = [];
        $permissions = [];
        $today = now()->startOfDay();
        $status = $filters['status'] ?? 'todo';
        // Iterate metadata in bounded chunks; only the requested page receives
        // expensive practice evidence, attempt histories and message presentation.
        foreach (TeacherAssignmentRecipient::query()->where('student_id', $student->id)
            ->whereHas('assignment')->with('assignment.teacher')->lazyById(200) as $recipient) {
            $assignment = $recipient->assignment;
            $teacher = $assignment->teacher;
            $teacherId = (int) $assignment->teacher_id;
            $allowed = $permissions[$teacherId] ??= $teacher && $this->access->allows($teacher, $student);
            $bucket = $this->bucket($recipient);
            if ($bucket === null || (! $allowed && ! in_array($bucket, ['review', 'completed'], true))) {
                continue;
            }
            if ($teacher) {
                $teachers[$teacherId] = ['id' => $teacherId, 'name' => $teacher->name];
            }
            if (! empty($filters['teacher_id']) && $teacherId !== (int) $filters['teacher_id']) {
                continue;
            }
            $category = $assignment->activity;
            if (! in_array($category, ['nazra', 'hifz', 'tajweed', 'revision'], true)) {
                $category = $assignment->kind->value === 'practice' && $assignment->hifz_category === 'sabaq' ? 'hifz' : 'revision';
            }
            if (($filters['category'] ?? 'all') !== 'all' && $category !== $filters['category']) {
                continue;
            }
            $search = trim($filters['search'] ?? '');
            $text = implode(' ', [QuranMetadata::name($assignment->surah_number), $teacher?->name, $assignment->feedback, $assignment->surah_number, $assignment->ayah_start.'–'.$assignment->ayah_end]);
            if ($search !== '' && ! str_contains(mb_strtolower($text), mb_strtolower($search))) {
                continue;
            }
            $counts[$bucket]++;
            if ($status !== $bucket) {
                continue;
            }
            $due = $assignment->due_at?->copy()->startOfDay();
            $deadline = in_array($status, ['completed', 'review'], true) ? 'all' : ($filters['due'] ?? 'all');
            if ($deadline !== 'all' && (! $due || ! match ($deadline) {
                'today' => $due->equalTo($today),
                'overdue' => $due->lessThan($today),
                'upcoming' => $due->greaterThan($today),
                default => true,
            })) {
                continue;
            }
            $matches[] = [
                'id' => (int) $recipient->id,
                'due' => $due?->timestamp ?? PHP_INT_MAX,
                'recent' => ($recipient->completed_at ?? $recipient->student_completed_at ?? $recipient->created_at)?->timestamp ?? 0,
            ];
        }
        $sort = $filters['sort'] ?? 'priority';
        usort($matches, function ($a, $b) use ($sort, $status) {
            if ($sort === 'recent' || ($sort === 'priority' && in_array($status, ['completed', 'review'], true))) {
                return ($b['recent'] <=> $a['recent']) ?: ($b['id'] <=> $a['id']);
            }
            return ($a['due'] <=> $b['due']) ?: ($a['id'] <=> $b['id']);
        });
        $page = max(1, (int) ($filters['page'] ?? 1));
        $limit = min(25, max(1, (int) ($filters['limit'] ?? 10)));
        $ids = array_column(array_slice($matches, ($page - 1) * $limit, $limit), 'id');
        $rows = TeacherAssignmentRecipient::query()->where('student_id', $student->id)->whereIn('id', $ids)
            ->with(['assignment.teacher', 'assignment.organisation', 'assignment.learningGroup', 'latestSelfAssessment'])
            ->get()->keyBy('id');

        return [
            'assignments' => array_map(fn ($id) => $this->present($student, $rows[$id], $permissions), $ids),
            'counts' => $counts,
            'teachers' => array_values($teachers),
            'total' => count($matches),
            'next_page' => $page * $limit < count($matches) ? $page + 1 : null,
        ];
    }

    public function detail(User $student, int $id): array
    {
        $recipient = TeacherAssignmentRecipient::query()->where('student_id', $student->id)
            ->whereHas('assignment')->with(['assignment.teacher', 'assignment.organisation', 'assignment.learningGroup', 'latestSelfAssessment'])
            ->findOrFail($id);
        $teacher = $recipient->assignment->teacher;
        return $this->present($student, $recipient, [
            (int) $recipient->assignment->teacher_id => $teacher && $this->access->allows($teacher, $student),
        ]);
    }

    private function bucket(TeacherAssignmentRecipient $recipient): ?string
    {
        $review = $this->assignments->reviewState($recipient);
        return match (true) {
            in_array($review, ['cancelled', 'reassigned'], true) => null,
            $review === 'approved' => 'completed',
            $review === 'submitted' => 'review',
            $review === 'needs_correction' => 'revision',
            $this->assignments->lifecycleStatus($recipient) === 'in_progress' => 'progress',
            default => 'todo',
        };
    }

    private function present(User $student, TeacherAssignmentRecipient $recipient, array $permissions): array
    {
        $assignment = $recipient->assignment;
        return [
            ...$this->assignments->presentRecipient($recipient, false, null, null, null, (int) $student->id),
            'teacher_id' => (int) $assignment->teacher_id,
            'teacher_name' => $assignment->teacher?->name,
            'organisation_name' => $assignment->organisation?->name,
            'group_name' => $assignment->learningGroup?->name,
            'teacher_access' => $permissions[(int) $assignment->teacher_id] ?? false,
        ];
    }
}

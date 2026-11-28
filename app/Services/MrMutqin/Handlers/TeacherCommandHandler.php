<?php

namespace App\Services\MrMutqin\Handlers;

use App\Models\User;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Services\Teacher\TeacherDashboardService;
use App\Support\TeacherFeatures;
use Illuminate\Support\Str;

final class TeacherCommandHandler
{
    public function __construct(
        private readonly TeacherDashboardService $dashboard,
        private readonly StudentAccessAuthorizer $access,
    ) {}

    /**
     * @param  array<string, mixed>  $context
     * @param  array<string, mixed>  $entities
     * @return array<string, mixed>|null
     */
    public function handle(User $teacher, string $intent, array $context, array $entities, string $transcript): ?array
    {
        TeacherFeatures::abortUnlessEnabled();
        if (! $teacher->isTeacher()) {
            return null;
        }

        return match ($intent) {
            'teacher.students.count' => $this->studentCount($teacher),
            'teacher.students.list' => $this->navigateStudents(),
            'teacher.student.open' => $this->openStudent($teacher, $entities),
            'teacher.assignments.overdue' => $this->overdueAssignments($teacher),
            'teacher.reviews.pending' => $this->pendingReviews($teacher),
            'teacher.messages.unread' => $this->unreadMessages($teacher),
            'teacher.attendance.today' => $this->navigateAttendance(),
            'teacher.overview.priorities' => $this->priorities($teacher),
            default => null,
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function studentCount(User $teacher): array
    {
        $overview = $this->dashboard->overview($teacher, 30);
        $count = (int) ($overview['kpis']['authorised_students'] ?? 0);

        return [
            'ok' => true,
            'intent' => 'teacher.students.count',
            'spoken' => trans_choice('mr_mutqin.teacher_student_count', $count, ['count' => $count]),
            'visible' => [
                'kind' => 'factual',
                'title' => __('mr_mutqin.teacher_students_title'),
                'value' => (string) $count,
            ],
            'navigation' => null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function navigateStudents(): array
    {
        return [
            'ok' => true,
            'intent' => 'teacher.students.list',
            'spoken' => null,
            'visible' => null,
            'navigation' => [
                'shell' => 'teacher',
                'view' => 'students',
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $entities
     * @return array<string, mixed>
     */
    private function openStudent(User $teacher, array $entities): array
    {
        $name = trim((string) ($entities['student_name'] ?? ''));
        if ($name === '') {
            return [
                'ok' => false,
                'intent' => 'teacher.student.open',
                'reason' => 'missing_student',
                'clarify' => __('mr_mutqin.clarify_student_name'),
            ];
        }

        $matches = $this->matchStudentsByName($teacher, $name);
        if ($matches === []) {
            return [
                'ok' => false,
                'intent' => 'teacher.student.open',
                'reason' => 'unknown_student',
                'clarify' => __('mr_mutqin.clarify_unknown_student', ['name' => $name]),
            ];
        }

        if (count($matches) > 1) {
            return [
                'ok' => false,
                'intent' => 'teacher.student.open',
                'reason' => 'ambiguous_student',
                'clarify' => __('mr_mutqin.clarify_ambiguous_student'),
                'clarification' => [
                    'options' => array_slice($matches, 0, 5),
                ],
            ];
        }

        $student = $matches[0];
        $section = (string) ($entities['student_section'] ?? 'ai');

        return [
            'ok' => true,
            'intent' => 'teacher.student.open',
            'spoken' => null,
            'visible' => [
                'kind' => 'student',
                'name' => $student['name'],
            ],
            'navigation' => [
                'shell' => 'teacher',
                'view' => 'student',
                'student_id' => $student['id'],
                'section' => $section,
            ],
        ];
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    private function matchStudentsByName(User $teacher, string $needle): array
    {
        $ids = $this->access->authorizedStudentIds($teacher)->all();
        if ($ids === []) {
            return [];
        }

        $normalized = Str::lower($needle);
        $rows = User::query()->whereIn('id', $ids)->get(['id', 'name']);
        $exact = [];
        $partial = [];

        foreach ($rows as $row) {
            $name = (string) $row->name;
            $lower = Str::lower($name);
            if ($lower === $normalized || Str::startsWith($lower, $normalized)) {
                $exact[] = ['id' => (int) $row->id, 'name' => $name];
            } elseif (str_contains($lower, $normalized)) {
                $partial[] = ['id' => (int) $row->id, 'name' => $name];
            }
        }

        return $exact !== [] ? $exact : $partial;
    }

    /**
     * @return array<string, mixed>
     */
    private function overdueAssignments(User $teacher): array
    {
        $overview = $this->dashboard->overview($teacher, 30);
        $overdue = (int) ($overview['kpis']['overdue_assignments'] ?? 0);
        $outstanding = (int) ($overview['kpis']['outstanding_assignments'] ?? 0);

        return [
            'ok' => true,
            'intent' => 'teacher.assignments.overdue',
            'spoken' => __('mr_mutqin.teacher_overdue_summary', [
                'overdue' => $overdue,
                'outstanding' => $outstanding,
            ]),
            'visible' => [
                'kind' => 'factual',
                'title' => __('mr_mutqin.teacher_assignments_title'),
                'value' => (string) $overdue,
                'detail' => __('mr_mutqin.teacher_outstanding_detail', ['count' => $outstanding]),
            ],
            'navigation' => [
                'shell' => 'teacher',
                'view' => 'assignments',
                'filter' => 'overdue',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function pendingReviews(User $teacher): array
    {
        $overview = $this->dashboard->overview($teacher, 30);
        $snapshot = is_array($overview['snapshot'] ?? null) ? $overview['snapshot'] : [];
        $pending = (int) ($snapshot['recitations_awaiting_review'] ?? 0);

        return [
            'ok' => true,
            'intent' => 'teacher.reviews.pending',
            'spoken' => trans_choice('mr_mutqin.teacher_reviews_pending', $pending, ['count' => $pending]),
            'visible' => [
                'kind' => 'factual',
                'title' => __('mr_mutqin.teacher_reviews_title'),
                'value' => (string) $pending,
            ],
            'navigation' => [
                'shell' => 'teacher',
                'view' => 'reviews',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function unreadMessages(User $teacher): array
    {
        $overview = $this->dashboard->overview($teacher, 30);
        $snapshot = is_array($overview['snapshot'] ?? null) ? $overview['snapshot'] : [];
        $unread = (int) ($snapshot['unread_messages'] ?? 0);

        return [
            'ok' => true,
            'intent' => 'teacher.messages.unread',
            'spoken' => trans_choice('mr_mutqin.teacher_unread_messages', $unread, ['count' => $unread]),
            'visible' => [
                'kind' => 'factual',
                'title' => __('mr_mutqin.teacher_messages_title'),
                'value' => (string) $unread,
            ],
            'navigation' => $unread > 0 ? [
                'shell' => 'teacher',
                'view' => 'messages',
            ] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function navigateAttendance(): array
    {
        return [
            'ok' => true,
            'intent' => 'teacher.attendance.today',
            'spoken' => null,
            'visible' => null,
            'navigation' => [
                'shell' => 'teacher',
                'view' => 'attendance',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function priorities(User $teacher): array
    {
        $overview = $this->dashboard->overview($teacher, 30);
        $kpis = $overview['kpis'] ?? [];
        $overdue = (int) ($kpis['overdue_assignments'] ?? 0);
        $attention = (int) ($kpis['needs_attention'] ?? 0);
        $snapshot = is_array($overview['snapshot'] ?? null) ? $overview['snapshot'] : [];
        $reviews = (int) ($snapshot['recitations_awaiting_review'] ?? 0);

        return [
            'ok' => true,
            'intent' => 'teacher.overview.priorities',
            'spoken' => __('mr_mutqin.teacher_priorities_summary', [
                'reviews' => $reviews,
                'overdue' => $overdue,
                'attention' => $attention,
            ]),
            'visible' => [
                'kind' => 'list',
                'items' => array_values(array_filter([
                    $reviews ? __('mr_mutqin.teacher_priority_reviews', ['count' => $reviews]) : null,
                    $overdue ? __('mr_mutqin.teacher_priority_overdue', ['count' => $overdue]) : null,
                    $attention ? __('mr_mutqin.teacher_priority_attention', ['count' => $attention]) : null,
                ])),
            ],
            'navigation' => [
                'shell' => 'teacher',
                'view' => 'overview',
            ],
        ];
    }
}
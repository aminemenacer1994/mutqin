<?php

namespace App\Services\MrMutqin\Handlers;

use App\Enums\AssignmentStatus;
use App\Models\TeacherAssignmentRecipient;
use App\Models\User;
use App\Support\TeacherFeatures;

final class StudentCommandHandler
{
    /**
     * @param  array<string, mixed>  $context
     * @param  array<string, mixed>  $entities
     * @return array<string, mixed>|null
     */
    public function handle(User $student, string $intent, array $context, array $entities, string $transcript): ?array
    {
        return match ($intent) {
            'student.homework.status' => $this->homeworkStatus($student),
            'student.homework.open' => $this->navigateHomework(),
            'student.progress.open' => $this->navigatePane('progress'),
            'student.learning.open' => $this->navigatePane(TeacherFeatures::learnerSectionEnabled() ? 'learning' : 'practice'),
            'student.messages.open' => $this->navigatePane('messages'),
            'student.memorisation.continue' => $this->navigateMemorisation(),
            default => null,
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function homeworkStatus(User $student): array
    {
        if (! TeacherFeatures::learnerSectionEnabled()) {
            return [
                'ok' => true,
                'intent' => 'student.homework.status',
                'spoken' => __('mr_mutqin.student_no_teacher_network'),
                'visible' => [
                    'kind' => 'factual',
                    'title' => __('mr_mutqin.student_homework_title'),
                    'value' => '0',
                ],
                'navigation' => null,
            ];
        }

        $open = TeacherAssignmentRecipient::query()
            ->where('student_id', $student->id)
            ->whereIn('status', [
                AssignmentStatus::Assigned->value,
                AssignmentStatus::InProgress->value,
            ])
            ->count();

        return [
            'ok' => true,
            'intent' => 'student.homework.status',
            'spoken' => trans_choice('mr_mutqin.student_homework_count', $open, ['count' => $open]),
            'visible' => [
                'kind' => 'factual',
                'title' => __('mr_mutqin.student_homework_title'),
                'value' => (string) $open,
            ],
            'navigation' => $open > 0 ? [
                'shell' => 'student',
                'view' => 'learning',
            ] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function navigateHomework(): array
    {
        return [
            'ok' => true,
            'intent' => 'student.homework.open',
            'spoken' => null,
            'visible' => null,
            'navigation' => [
                'shell' => 'student',
                'view' => TeacherFeatures::learnerSectionEnabled() ? 'learning' : 'home',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function navigatePane(string $pane): array
    {
        return [
            'ok' => true,
            'intent' => 'student.'.$pane.'.open',
            'spoken' => null,
            'visible' => null,
            'navigation' => [
                'shell' => 'student',
                'view' => $pane,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function navigateMemorisation(): array
    {
        return [
            'ok' => true,
            'intent' => 'student.memorisation.continue',
            'spoken' => null,
            'visible' => null,
            'navigation' => [
                'shell' => 'memorisation',
                'href' => route('memorisation'),
            ],
        ];
    }
}
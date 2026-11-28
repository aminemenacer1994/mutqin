<?php

namespace App\Services\MrMutqin;

use App\Support\TeacherFeatures;

final class MrMutqinSuggestionService
{
    /**
     * @param  array<string, mixed>  $context
     * @return list<array{id: string, label: string, sample: string}>
     */
    public function forContext(array $context): array
    {
        $role = (string) ($context['role'] ?? 'student');
        $view = (string) ($context['view'] ?? '');

        if ($role === 'teacher') {
            if ($view === 'student') {
                return $this->clip($this->teacherStudentProfile());
            }
            if ($view === 'reviews') {
                return $this->clip($this->teacherReview());
            }

            return $this->clip($this->teacherDashboard());
        }

        if (($context['shell'] ?? '') === 'memorisation') {
            return $this->clip($this->mushaf());
        }

        if ($view === 'progress') {
            return $this->clip($this->studentProgress());
        }

        return $this->clip($this->studentDashboard());
    }

    /**
     * @param  list<array{id: string, label: string, sample: string}>  $rows
     * @return list<array{id: string, label: string, sample: string}>
     */
    private function clip(array $rows): array
    {
        return array_slice($rows, 0, 3);
    }

    /**
     * @return list<array{id: string, label: string, sample: string}>
     */
    private function teacherDashboard(): array
    {
        return [
            ['id' => 'priorities', 'label' => 'mr_mutqin.suggest.teacher_priorities', 'sample' => 'What do I need to do today?'],
            ['id' => 'overdue', 'label' => 'mr_mutqin.suggest.teacher_overdue', 'sample' => "Who hasn't done their homework?"],
            ['id' => 'reviews', 'label' => 'mr_mutqin.suggest.teacher_reviews', 'sample' => 'Show my pending reviews'],
        ];
    }

    /**
     * @return list<array{id: string, label: string, sample: string}>
     */
    private function teacherStudentProfile(): array
    {
        return [
            ['id' => 'progress', 'label' => 'mr_mutqin.suggest.teacher_student_progress', 'sample' => 'How is this student doing?'],
            ['id' => 'homework', 'label' => 'mr_mutqin.suggest.teacher_student_homework', 'sample' => 'Show their homework'],
            ['id' => 'assign', 'label' => 'mr_mutqin.suggest.teacher_student_assign', 'sample' => 'Assign a lesson'],
        ];
    }

    /**
     * @return list<array{id: string, label: string, sample: string}>
     */
    private function teacherReview(): array
    {
        return [
            ['id' => 'play', 'label' => 'mr_mutqin.suggest.teacher_play_recording', 'sample' => 'Play the recording'],
            ['id' => 'mistakes', 'label' => 'mr_mutqin.suggest.teacher_mistakes', 'sample' => 'Show recorded mistakes'],
            ['id' => 'revision', 'label' => 'mr_mutqin.suggest.teacher_revision', 'sample' => 'Assign revision'],
        ];
    }

    /**
     * @return list<array{id: string, label: string, sample: string}>
     */
    private function studentDashboard(): array
    {
        $rows = [
            ['id' => 'homework', 'label' => 'mr_mutqin.suggest.student_homework', 'sample' => 'Do I have homework?'],
            ['id' => 'continue', 'label' => 'mr_mutqin.suggest.student_continue', 'sample' => 'Continue my lesson'],
            ['id' => 'revise', 'label' => 'mr_mutqin.suggest.student_revise', 'sample' => 'What should I revise today?'],
        ];

        if (! TeacherFeatures::learnerSectionEnabled()) {
            $rows[1] = ['id' => 'practice', 'label' => 'mr_mutqin.suggest.student_practice', 'sample' => 'Open my practice'];
        }

        return $rows;
    }

    /**
     * @return list<array{id: string, label: string, sample: string}>
     */
    private function studentProgress(): array
    {
        return [
            ['id' => 'improved', 'label' => 'mr_mutqin.suggest.student_improved', 'sample' => 'Have I improved?'],
            ['id' => 'weak', 'label' => 'mr_mutqin.suggest.student_weak', 'sample' => 'Show my weakest ayahs'],
            ['id' => 'revise', 'label' => 'mr_mutqin.suggest.student_revise_help', 'sample' => 'Help me revise'],
        ];
    }

    /**
     * @return list<array{id: string, label: string, sample: string}>
     */
    private function mushaf(): array
    {
        return [
            ['id' => 'play', 'label' => 'mr_mutqin.suggest.mushaf_play', 'sample' => 'Play this Surah'],
            ['id' => 'repeat', 'label' => 'mr_mutqin.suggest.mushaf_repeat', 'sample' => 'Repeat this ayah'],
            ['id' => 'memorise', 'label' => 'mr_mutqin.suggest.mushaf_memorise', 'sample' => 'Help me memorise this'],
        ];
    }
}
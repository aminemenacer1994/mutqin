<?php

namespace Database\Factories;

use App\Enums\AssignmentKind;
use App\Models\Organisation;
use App\Models\TeacherAssignment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TeacherAssignment>
 */
class TeacherAssignmentFactory extends Factory
{
    protected $model = TeacherAssignment::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'teacher_id' => User::factory(),
            'organisation_id' => Organisation::factory(),
            'learning_group_id' => null,
            'kind' => AssignmentKind::Practice->value,
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 7,
            'repetition_target' => 1,
            'due_at' => null,
            'feedback' => null,
        ];
    }
}

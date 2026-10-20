<?php

namespace Database\Factories;

use App\Enums\AssignmentStatus;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TeacherAssignmentRecipient>
 */
class TeacherAssignmentRecipientFactory extends Factory
{
    protected $model = TeacherAssignmentRecipient::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'teacher_assignment_id' => TeacherAssignment::factory(),
            'student_id' => User::factory(),
            'status' => AssignmentStatus::Pending->value,
        ];
    }
}

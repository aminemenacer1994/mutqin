<?php

namespace Database\Factories;

use App\Enums\TeacherNoteKind;
use App\Models\Organisation;
use App\Models\TeacherNote;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TeacherNote>
 */
class TeacherNoteFactory extends Factory
{
    protected $model = TeacherNote::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'teacher_id' => User::factory(),
            'student_id' => User::factory(),
            'organisation_id' => Organisation::factory(),
            'teacher_assignment_id' => null,
            'kind' => TeacherNoteKind::Note->value,
            'body' => fake()->sentence(),
        ];
    }
}

<?php

namespace Database\Factories;

use App\Enums\TeacherPrivateNoteCategory;
use App\Models\Organisation;
use App\Models\TeacherPrivateNote;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TeacherPrivateNote>
 */
class TeacherPrivateNoteFactory extends Factory
{
    protected $model = TeacherPrivateNote::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'teacher_id' => User::factory(),
            'student_id' => User::factory(),
            'organisation_id' => Organisation::factory(),
            'category' => TeacherPrivateNoteCategory::LessonObservations->value,
            'body' => fake()->sentence(),
            'pinned' => false,
            'archived_at' => null,
            'surah_number' => null,
            'ayah_start' => null,
            'ayah_end' => null,
            'teacher_assignment_id' => null,
            'shared_feedback_note_id' => null,
            'shared_at' => null,
        ];
    }

    public function pinned(): static
    {
        return $this->state(fn () => ['pinned' => true]);
    }

    public function archived(): static
    {
        return $this->state(fn () => ['archived_at' => now(), 'pinned' => false]);
    }
}

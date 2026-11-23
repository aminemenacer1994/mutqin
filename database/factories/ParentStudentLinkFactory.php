<?php

namespace Database\Factories;

use App\Enums\ParentGuardianPermission;
use App\Enums\ParentLinkStatus;
use App\Models\ParentStudentLink;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ParentStudentLink>
 */
class ParentStudentLinkFactory extends Factory
{
    protected $model = ParentStudentLink::class;

    public function definition(): array
    {
        return [
            'parent_user_id' => User::factory(),
            'student_user_id' => User::factory(),
            'status' => ParentLinkStatus::Pending->value,
            'relationship' => 'guardian',
            'permissions' => ParentGuardianPermission::defaultGranted(),
            'requested_by_user_id' => null,
        ];
    }

    public function approved(): static
    {
        return $this->state(fn () => [
            'status' => ParentLinkStatus::Approved->value,
            'approved_at' => now(),
            'decided_at' => now(),
        ]);
    }
}

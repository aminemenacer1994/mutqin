<?php

namespace Database\Factories;

use App\Models\LearningGroup;
use App\Models\Organisation;
use App\Support\Registration\OrganisationName;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LearningGroup>
 */
class LearningGroupFactory extends Factory
{
    protected $model = LearningGroup::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->words(3, true);

        return [
            'organisation_id' => Organisation::factory(),
            'name' => OrganisationName::display($name),
            'name_canonical' => OrganisationName::canonical($name),
        ];
    }
}

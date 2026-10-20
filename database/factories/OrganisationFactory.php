<?php

namespace Database\Factories;

use App\Enums\OrganisationType;
use App\Models\Organisation;
use App\Support\Registration\OrganisationName;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Organisation>
 */
class OrganisationFactory extends Factory
{
    protected $model = Organisation::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->company();

        return [
            'type' => OrganisationType::Halaqa->value,
            'name' => OrganisationName::display($name),
            'name_canonical' => OrganisationName::canonical($name),
        ];
    }
}

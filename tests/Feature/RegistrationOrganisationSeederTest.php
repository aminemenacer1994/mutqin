<?php

namespace Tests\Feature;

use App\Enums\OrganisationType;
use App\Models\LearningGroup;
use App\Models\Organisation;
use App\Support\Registration\OrganisationName;
use App\Support\Registration\RegistrationOrganisationDirectory;
use Database\Seeders\RegistrationOrganisationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationOrganisationSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_creates_halaqa_madrassa_and_school_names_with_groups(): void
    {
        $this->seed(RegistrationOrganisationSeeder::class);
        $this->artisan('mutqin:seed-registration-organisations')->assertSuccessful();

        $this->assertSame(3, Organisation::count());
        $this->assertSame(3, LearningGroup::count());

        foreach (RegistrationOrganisationDirectory::entries() as $entry) {
            $organisation = Organisation::query()
                ->where('name_canonical', OrganisationName::canonical($entry['name']))
                ->first();

            $this->assertNotNull($organisation);
            $this->assertSame(OrganisationType::from($entry['type']), $organisation->type);

            $this->assertTrue(
                LearningGroup::query()
                    ->where('organisation_id', $organisation->id)
                    ->where('name_canonical', OrganisationName::canonical($entry['group']))
                    ->exists()
            );
        }
    }
}

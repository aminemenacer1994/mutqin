<?php

namespace Database\Seeders;

use App\Models\LearningGroup;
use App\Models\Organisation;
use App\Support\Registration\OrganisationName;
use App\Support\Registration\RegistrationOrganisationDirectory;
use Database\Seeders\Concerns\GuardsDemoSeeding;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds halaqa, madrassa, and school names for registration dropdowns
 * plus a shared group per organisation for teacher/student matching.
 *
 * php artisan mutqin:seed-registration-organisations
 */
class RegistrationOrganisationSeeder extends Seeder
{
    use GuardsDemoSeeding;

    public function run(): void
    {
        $this->guardAgainstProductionSeeding();

        Model::withoutEvents(function () {
            DB::transaction(function () {
                foreach (RegistrationOrganisationDirectory::entries() as $entry) {
                    $this->seedEntry($entry);
                }
            });
        });

        if ($this->command !== null) {
            $this->command->info('Registration organisations ready (halaqa, madrassa, school).');
            $this->command->line('Students and teachers can pick these names when signing up.');
        }
    }

    /**
     * @param  array{type: string, name: string, group: string}  $entry
     */
    private function seedEntry(array $entry): void
    {
        $canonicalName = OrganisationName::canonical($entry['name']);
        $organisation = Organisation::query()->where('name_canonical', $canonicalName)->first() ?? new Organisation;
        $organisation->forceFill([
            'type' => $entry['type'],
            'name' => OrganisationName::display($entry['name']),
            'name_canonical' => $canonicalName,
        ])->save();

        $canonicalGroup = OrganisationName::canonical($entry['group']);
        $group = LearningGroup::query()
            ->where('organisation_id', $organisation->id)
            ->where('name_canonical', $canonicalGroup)
            ->first() ?? new LearningGroup;
        $group->forceFill([
            'organisation_id' => $organisation->id,
            'name' => OrganisationName::display($entry['group']),
            'name_canonical' => $canonicalGroup,
        ])->save();
    }
}

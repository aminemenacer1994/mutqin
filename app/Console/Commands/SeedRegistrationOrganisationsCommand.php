<?php

namespace App\Console\Commands;

use Database\Seeders\RegistrationOrganisationSeeder;
use Illuminate\Console\Command;

class SeedRegistrationOrganisationsCommand extends Command
{
    protected $signature = 'mutqin:seed-registration-organisations';

    protected $description = 'Seed halaqa, madrassa, and school organisation names for registration.';

    public function handle(): int
    {
        $seeder = $this->laravel->make(RegistrationOrganisationSeeder::class);
        $seeder->setContainer($this->laravel);
        $seeder->setCommand($this);
        $seeder->run();

        return self::SUCCESS;
    }
}

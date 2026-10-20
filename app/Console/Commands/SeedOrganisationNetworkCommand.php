<?php

namespace App\Console\Commands;

use Database\Seeders\OrganisationNetworkSeeder;
use Illuminate\Console\Command;

class SeedOrganisationNetworkCommand extends Command
{
    protected $signature = 'mutqin:seed-organisation-network';

    protected $description = 'Seed organisations, groups, teachers, and students with shared links (development only).';

    public function handle(): int
    {
        $seeder = $this->laravel->make(OrganisationNetworkSeeder::class);
        $seeder->setContainer($this->laravel);
        $seeder->setCommand($this);
        $seeder->run();

        return self::SUCCESS;
    }
}

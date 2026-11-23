<?php

namespace App\Console\Commands;

use App\Support\DatabaseDeploySafety;
use Database\Seeders\ParentDemoSeeder;
use Illuminate\Console\Command;

class SeedParentDemoCommand extends Command
{
    protected $signature = 'mutqin:seed-parent-demo';

    protected $description = 'Seed a local parent demo linked to the existing menacer72 child account. Refuses production and does not change the child.';

    public function handle(): int
    {
        DatabaseDeploySafety::assertNotProtectedEnvironment('seed the parent demo');

        $seeder = $this->laravel->make(ParentDemoSeeder::class);
        $seeder->setContainer($this->laravel);
        $seeder->setCommand($this);
        $seeder->run();

        return self::SUCCESS;
    }
}

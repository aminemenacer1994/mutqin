<?php

namespace App\Console\Commands;

use App\Support\DatabaseDeploySafety;
use Database\Seeders\PlatformDemoSeeder;
use Illuminate\Console\Command;

class SeedPlatformDemoCommand extends Command
{
    protected $signature = 'mutqin:seed-platform-demo';

    protected $description = 'Seed the local teacher, student and parent demo classroom. Refuses production. Requires MUTQIN_PLATFORM_DEMO_PASSWORD and does not print it.';

    public function handle(): int
    {
        DatabaseDeploySafety::assertNotProtectedEnvironment('seed the platform demo');

        $seeder = $this->laravel->make(PlatformDemoSeeder::class);
        $seeder->setContainer($this->laravel);
        $seeder->setCommand($this);
        $seeder->run();

        return self::SUCCESS;
    }
}

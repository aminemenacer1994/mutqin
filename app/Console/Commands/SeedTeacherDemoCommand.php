<?php

namespace App\Console\Commands;

use Database\Seeders\TeacherDemoSeeder;
use Illuminate\Console\Command;

class SeedTeacherDemoCommand extends Command
{
    protected $signature = 'mutqin:seed-teacher-demo';

    protected $description = 'Seed development-only teacher and student demo accounts. Refuses to run in production.';

    public function handle(): int
    {
        $seeder = $this->laravel->make(TeacherDemoSeeder::class);
        $seeder->setContainer($this->laravel);
        $seeder->setCommand($this);
        $seeder->run();

        return self::SUCCESS;
    }
}

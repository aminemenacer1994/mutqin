<?php

namespace Database\Seeders;

use App\Services\Organisations\TeacherAnchorStudentEnroller;
use Database\Seeders\Concerns\GuardsDemoSeeding;
use Illuminate\Database\Seeder;

class TeacherAnchorStudentSeeder extends Seeder
{
    use GuardsDemoSeeding;

    public function run(): void
    {
        $this->guardAgainstProductionSeeding();

        app(TeacherAnchorStudentEnroller::class)->enrolAll();
    }
}

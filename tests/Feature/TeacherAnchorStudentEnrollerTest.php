<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Support\Demo\OrganisationNetworkCatalog;
use App\Support\Demo\TeacherDemoCatalog;
use Database\Seeders\OrganisationNetworkSeeder;
use Database\Seeders\TeacherDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeacherAnchorStudentEnrollerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
        config()->set('mutqin.teacher_anchor_student_emails', ['menacer72@gmail.com']);
    }

    public function test_anchor_student_is_visible_to_every_organisation_network_teacher(): void
    {
        $this->seed(OrganisationNetworkSeeder::class);

        $anchor = User::query()->where('email', 'menacer72@gmail.com')->first();
        $this->assertNotNull($anchor);
        $this->assertSame('student', $anchor->account_role->value);

        $access = app(StudentAccessAuthorizer::class);
        foreach (OrganisationNetworkCatalog::networks() as $network) {
            foreach ($network['teachers'] as $teacherDefinition) {
                $teacher = User::query()->where('email', $teacherDefinition['email'])->first();
                $this->assertNotNull($teacher);
                $this->assertTrue(
                    $access->authorizedStudentIds($teacher)->contains((int) $anchor->id),
                    "Expected {$teacherDefinition['email']} to see menacer72@gmail.com"
                );
            }
        }
    }

    public function test_anchor_student_is_visible_to_every_teacher_demo_teacher(): void
    {
        $this->seed(TeacherDemoSeeder::class);

        $anchor = User::query()->where('email', 'menacer72@gmail.com')->first();
        $this->assertNotNull($anchor);

        $access = app(StudentAccessAuthorizer::class);
        foreach (TeacherDemoCatalog::teachers() as $teacherDefinition) {
            $teacher = User::query()->where('email', $teacherDefinition['email'])->first();
            $this->assertNotNull($teacher);
            $this->assertTrue(
                $access->authorizedStudentIds($teacher)->contains((int) $anchor->id),
                "Expected {$teacherDefinition['email']} to see menacer72@gmail.com"
            );
        }
    }
}

<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\TeacherAttendanceRecord;
use App\Models\AiReciteAttempt;
use App\Models\UserSession;
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
        $this->assertSame('Amine Menacer', $anchor->name);
        $this->assertGreaterThanOrEqual(10, UserSession::query()->where('user_id', $anchor->id)->count());
        $this->assertGreaterThanOrEqual(5, AiReciteAttempt::query()->where('user_id', $anchor->id)->count());

        $access = app(StudentAccessAuthorizer::class);
        foreach (OrganisationNetworkCatalog::networks() as $network) {
            foreach ($network['teachers'] as $teacherDefinition) {
                $teacher = User::query()->where('email', $teacherDefinition['email'])->first();
                $this->assertNotNull($teacher);
                $this->assertTrue(
                    $access->authorizedStudentIds($teacher)->contains((int) $anchor->id),
                    "Expected {$teacherDefinition['email']} to see menacer72@gmail.com"
                );
                $this->assertSame(10, TeacherAttendanceRecord::query()
                    ->where('teacher_id', $teacher->id)
                    ->where('student_id', $anchor->id)
                    ->count());
            }
        }
    }

    public function test_teacher_demo_seeder_leaves_personal_student_account_untouched(): void
    {
        $anchor = User::factory()->create(['email' => 'menacer72@gmail.com', 'name' => 'Existing Student', 'account_role' => 'student']);
        $this->seed(TeacherDemoSeeder::class);

        $this->assertSame('Existing Student', $anchor->fresh()->name);
        $this->assertSame('student', $anchor->fresh()->account_role->value);
        $this->assertSame(0, $anchor->groupMemberships()->count());

        $access = app(StudentAccessAuthorizer::class);
        foreach (TeacherDemoCatalog::teachers() as $teacherDefinition) {
            $teacher = User::query()->where('email', $teacherDefinition['email'])->first();
            $this->assertNotNull($teacher);
            $this->assertFalse($access->authorizedStudentIds($teacher)->contains((int) $anchor->id));
        }
    }
}

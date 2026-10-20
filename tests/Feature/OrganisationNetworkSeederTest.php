<?php

namespace Tests\Feature;

use App\Enums\OrganisationType;
use App\Enums\UserSessionStatus;
use App\Models\AiReciteAttempt;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\MemorisationPracticePlan;
use App\Models\MemorisationProgress;
use App\Models\MemorisationWeakSpot;
use App\Models\Organisation;
use App\Models\TeacherNote;
use App\Models\User;
use App\Models\UserLastPosition;
use App\Models\UserSession;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Support\Demo\OrganisationNetworkCatalog;
use App\Support\Registration\OrganisationName;
use App\Support\Registration\RegistrationOrganisationDirectory;
use Database\Seeders\OrganisationNetworkSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class OrganisationNetworkSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
        config()->set('mutqin.teacher_anchor_student_emails', []);
    }

    public function test_organisation_network_seeder_links_orgs_teachers_and_students(): void
    {
        $this->seed(OrganisationNetworkSeeder::class);

        $this->assertSame(3, Organisation::count());
        $this->assertSame(3, LearningGroup::count());
        $this->assertSame(OrganisationNetworkCatalog::TEACHER_COUNT, User::query()->whereIn('email', OrganisationNetworkCatalog::emails())->where('account_role', 'teacher')->count());
        $this->assertSame(OrganisationNetworkCatalog::STUDENT_COUNT, User::query()->whereIn('email', OrganisationNetworkCatalog::emails())->where('account_role', 'student')->count());

        foreach (OrganisationNetworkCatalog::networks() as $network) {
            $organisation = Organisation::query()
                ->where('name_canonical', OrganisationName::canonical($network['name']))
                ->first();

            $this->assertNotNull($organisation);
            $this->assertSame(OrganisationType::from($network['type']), $organisation->type);

            $group = LearningGroup::query()
                ->where('organisation_id', $organisation->id)
                ->where('name_canonical', OrganisationName::canonical($network['group']))
                ->first();

            $this->assertNotNull($group);

            foreach ($network['teachers'] as $teacherDefinition) {
                $teacher = User::query()->where('email', $teacherDefinition['email'])->first();
                $this->assertNotNull($teacher);
                $this->assertSame($organisation->id, $teacher->organisation_id);
                $this->assertTrue(Hash::check(OrganisationNetworkCatalog::PASSWORD, $teacher->password));
                $this->assertTrue(
                    GroupMembership::query()
                        ->where('user_id', $teacher->id)
                        ->where('learning_group_id', $group->id)
                        ->where('membership_role', 'teacher')
                        ->exists()
                );
            }

            foreach ($network['students'] as $studentDefinition) {
                $student = User::query()->where('email', $studentDefinition['email'])->first();
                $this->assertNotNull($student);
                $this->assertSame($organisation->id, $student->organisation_id);
                $this->assertTrue(
                    GroupMembership::query()
                        ->where('user_id', $student->id)
                        ->where('learning_group_id', $group->id)
                        ->where('membership_role', 'student')
                        ->where('analytics_consent_status', 'granted')
                        ->exists()
                );
            }
        }

        $access = app(StudentAccessAuthorizer::class);
        $halaqaTeacher = User::query()->where('email', 'org.demo.halaqa.teacher@example.com')->firstOrFail();
        $this->assertSame(12, $access->authorizedStudentIds($halaqaTeacher)->count());

        $madrassaLead = User::query()->where('email', 'org.demo.madrassa.teacher@example.com')->firstOrFail();
        $madrassaCo = User::query()->where('email', 'org.demo.madrassa.coteacher@example.com')->firstOrFail();
        $this->assertSame(16, $access->authorizedStudentIds($madrassaLead)->count());
        $this->assertSame(16, $access->authorizedStudentIds($madrassaCo)->count());

        $schoolTeacher = User::query()->where('email', 'org.demo.school.teacher@example.com')->firstOrFail();
        $this->assertSame(12, $access->authorizedStudentIds($schoolTeacher)->count());

        $this->getJson('/api/registration/organisations?type=halaqa')
            ->assertOk()
            ->assertJsonFragment(['name' => RegistrationOrganisationDirectory::entries()[0]['name']]);
    }

    public function test_organisation_network_seeds_practice_ai_and_profile_data(): void
    {
        $this->seed(OrganisationNetworkSeeder::class);

        $student = User::query()->where('email', 'org.demo.halaqa.student1@example.com')->firstOrFail();
        $teacher = User::query()->where('email', 'org.demo.halaqa.teacher@example.com')->firstOrFail();

        $this->assertGreaterThan(0, UserSession::query()->where('user_id', $student->id)->count());
        $this->assertTrue(
            UserSession::query()
                ->where('user_id', $student->id)
                ->where('status', UserSessionStatus::Paused->value)
                ->exists()
        );
        $this->assertGreaterThan(0, AiReciteAttempt::query()->where('user_id', $student->id)->whereNotNull('accuracy_percent')->count());
        $this->assertGreaterThan(0, MemorisationProgress::query()->where('user_id', $student->id)->count());
        $this->assertGreaterThan(0, MemorisationWeakSpot::query()->where('user_id', $student->id)->count());
        $this->assertGreaterThan(0, MemorisationPracticePlan::query()->where('user_id', $student->id)->count());
        $this->assertNotNull(UserLastPosition::query()->where('user_id', $student->id)->first());
        $this->assertTrue(
            TeacherNote::query()
                ->where('teacher_id', $teacher->id)
                ->where('student_id', $student->id)
                ->exists()
        );

        $this->actingAs($teacher)
            ->getJson(route('api.teacher.overview'))
            ->assertOk()
            ->assertJsonPath('kpis.authorised_students', 12);

        $profile = $this->actingAs($teacher)
            ->getJson(route('api.teacher.students.show', ['student' => $student->id, 'section' => 'overview']))
            ->assertOk()
            ->json();

        $this->assertSame($student->name, $profile['student']['name']);
        $this->assertGreaterThan(0, $profile['payload']['metrics']['sessions']);
        $this->assertGreaterThan(0, $profile['payload']['metrics']['active_days']);
        $this->assertGreaterThan(0, $profile['payload']['metrics']['ayahs_practised']);

        $practice = $this->actingAs($teacher)
            ->getJson(route('api.teacher.students.show', ['student' => $student->id, 'section' => 'practice']))
            ->assertOk()
            ->json();
        $this->assertNotEmpty($practice['payload']['sessions']);
        $this->assertNotNull($practice['payload']['latest_saved']);

        $ai = $this->actingAs($teacher)
            ->getJson(route('api.teacher.students.show', ['student' => $student->id, 'section' => 'ai']))
            ->assertOk()
            ->json();
        $this->assertNotNull($ai['payload']['success_rate']);
        $this->assertNotEmpty($ai['payload']['attempts']);
    }

    public function test_organisation_network_command_is_idempotent(): void
    {
        $this->artisan('mutqin:seed-organisation-network')->assertSuccessful();
        $this->artisan('mutqin:seed-organisation-network')->assertSuccessful();

        $this->assertSame(3, Organisation::count());
        $this->assertSame(count(OrganisationNetworkCatalog::emails()), User::query()->whereIn('email', OrganisationNetworkCatalog::emails())->count());
        $this->assertSame(OrganisationNetworkCatalog::STUDENT_COUNT, UserSession::query()->whereIn('user_id', User::query()->whereIn('email', OrganisationNetworkCatalog::emails())->pluck('id'))->distinct('user_id')->count('user_id'));
    }
}

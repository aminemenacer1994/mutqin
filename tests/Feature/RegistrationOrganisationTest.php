<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\OrganisationType;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\Organisation;
use App\Models\User;
use App\Services\Organisations\GroupMembershipService;
use App\Services\Organisations\OrganisationMembershipService;
use App\Support\Registration\RegistrationOrganisationDirectory;
use Database\Seeders\RegistrationOrganisationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Tests\TestCase;

class RegistrationOrganisationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
    }

    public function test_email_registration_defaults_to_an_individual_without_an_organisation(): void
    {
        $this->post(route('register'), [
            'name' => 'Independent Learner',
            'email' => 'individual@example.com',
            'password' => 'secret12',
            'password_confirmation' => 'secret12',
        ])->assertRedirect(route('memorisation'));

        $user = User::where('email', 'individual@example.com')->firstOrFail();
        $this->assertSame(AccountRole::Individual, $user->account_role);
        $this->assertNull($user->organisation_id);
        $this->assertSame(0, Organisation::count());
    }

    public function test_student_and_teacher_registration_does_not_require_organisation_details(): void
    {
        $this->post(route('register'), [
            'name' => 'Org Free Student',
            'email' => 'student-free@example.com',
            'password' => 'secret12',
            'password_confirmation' => 'secret12',
            'account_role' => 'student',
        ])->assertRedirect(route('memorisation'));

        $student = User::where('email', 'student-free@example.com')->firstOrFail();
        $this->assertSame(AccountRole::Student, $student->account_role);
        $this->assertNull($student->organisation_id);

        $this->post(route('logout'));

        $this->post(route('register'), [
            'name' => 'Org Free Teacher',
            'email' => 'teacher-free@example.com',
            'password' => 'secret12',
            'password_confirmation' => 'secret12',
            'account_role' => 'teacher',
        ])->assertRedirect(route('teacher.dashboard'));

        $teacher = User::where('email', 'teacher-free@example.com')->firstOrFail();
        $this->assertSame(AccountRole::Teacher, $teacher->account_role);
        $this->assertNull($teacher->organisation_id);
        $this->assertSame(0, Organisation::count());
    }

    public function test_registration_ignores_organisation_fields_posted_at_signup(): void
    {
        $this->post(route('register'), [
            'name' => 'Ignored Org',
            'email' => 'ignored-org@example.com',
            'password' => 'secret12',
            'password_confirmation' => 'secret12',
            'account_role' => 'teacher',
            'organisation_type' => 'school',
            'organisation_name' => 'Should Not Join',
        ])->assertRedirect(route('teacher.dashboard'));

        $teacher = User::where('email', 'ignored-org@example.com')->firstOrFail();
        $this->assertNull($teacher->organisation_id);
        $this->assertSame(0, Organisation::count());
    }

    public function test_matching_names_share_one_organisation_via_connect_and_do_not_grant_access(): void
    {
        $memberships = app(OrganisationMembershipService::class);

        $student = User::factory()->create(['account_role' => AccountRole::Student->value]);
        $teacher = User::factory()->create(['account_role' => AccountRole::Teacher->value]);
        $schoolTeacher = User::factory()->create(['account_role' => AccountRole::Teacher->value]);
        $hyphenStudent = User::factory()->create(['account_role' => AccountRole::Student->value]);

        $memberships->joinOrCreate($student, OrganisationType::Halaqa, '  AL   Noor ', MembershipRole::Student);
        $memberships->joinOrCreate($teacher, OrganisationType::Halaqa, 'al noor', MembershipRole::Teacher);
        $memberships->joinOrCreate($schoolTeacher, OrganisationType::School, 'Al Noor', MembershipRole::Teacher);
        $memberships->joinOrCreate($hyphenStudent, OrganisationType::Halaqa, 'Al-Noor', MembershipRole::Student);

        $this->assertSame(3, Organisation::count());
        $this->assertSame(0, GroupMembership::count());

        $student = $student->fresh();
        $teacher = $teacher->fresh();
        $schoolTeacher = $schoolTeacher->fresh();
        $hyphenStudent = $hyphenStudent->fresh();

        $this->assertSame($student->organisation_id, $teacher->organisation_id);
        $this->assertNotSame($student->organisation_id, $schoolTeacher->organisation_id);
        $this->assertNotSame($student->organisation_id, $hyphenStudent->organisation_id);
        $this->assertSame('AL Noor', $student->organisation->name);
        $this->assertSame(OrganisationType::Halaqa, $student->organisation->type);
        $this->assertSame(AccountRole::Student, $student->account_role);
        $this->assertSame(AccountRole::Teacher, $teacher->account_role);

        $this->assertFalse(Gate::forUser($teacher)->allows('view-student-analytics', $student));
        $this->assertFalse(Gate::forUser($teacher)->allows('viewMembers', $teacher->organisation));
        $this->assertTrue(Gate::forUser($teacher)->allows('createGroup', $teacher->organisation));
        $this->assertFalse(Gate::forUser($student)->allows('createGroup', $student->organisation));
    }

    public function test_teacher_access_requires_shared_approved_group_and_student_consent(): void
    {
        $organisation = Organisation::factory()->create([
            'type' => OrganisationType::Madrassa->value,
            'name' => 'Nur',
            'name_canonical' => 'nur',
        ]);
        $otherOrganisation = Organisation::factory()->create([
            'type' => OrganisationType::Madrassa->value,
            'name' => 'Other Nur',
            'name_canonical' => 'other nur',
        ]);

        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
        ]);
        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $organisation->id,
        ]);
        $otherStudent = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $organisation->id,
        ]);

        $group = LearningGroup::factory()->create(['organisation_id' => $organisation->id]);
        $otherGroup = LearningGroup::factory()->create(['organisation_id' => $organisation->id]);

        $teacherMembership = GroupMembership::factory()->create([
            'learning_group_id' => $group->id,
            'user_id' => $teacher->id,
            'membership_role' => MembershipRole::Teacher->value,
            'status' => MembershipStatus::Pending->value,
        ]);
        $studentMembership = GroupMembership::factory()->create([
            'learning_group_id' => $group->id,
            'user_id' => $student->id,
            'membership_role' => MembershipRole::Student->value,
            'status' => MembershipStatus::Pending->value,
        ]);
        GroupMembership::factory()->create([
            'learning_group_id' => $otherGroup->id,
            'user_id' => $otherStudent->id,
            'membership_role' => MembershipRole::Student->value,
            'status' => MembershipStatus::Approved->value,
            'analytics_consent_status' => AnalyticsConsentStatus::Granted->value,
            'analytics_consent_version' => GroupMembership::ANALYTICS_CONSENT_VERSION,
            'analytics_consent_user_id' => $otherStudent->id,
        ]);

        $service = app(GroupMembershipService::class);

        $this->assertFalse(Gate::forUser($teacher)->allows('accept', $studentMembership));
        $this->assertFalse(Gate::forUser($teacher)->allows('grantAnalyticsConsent', $studentMembership));
        $this->assertFalse(Gate::forUser($teacher)->allows('view-student-analytics', $student));
        $this->assertFalse(Gate::forUser($teacher)->allows('view', $group));

        $service->accept($teacher, $teacherMembership);
        $this->assertTrue(Gate::forUser($teacher)->allows('view', $group));

        $service->accept($student, $studentMembership->fresh());
        $this->assertFalse(Gate::forUser($teacher)->allows('view-student-analytics', $student));

        $service->grantAnalyticsConsent($student, $studentMembership->fresh());
        $this->assertTrue(Gate::forUser($teacher)->allows('view-student-analytics', $student));
        $this->assertTrue(Gate::forUser($teacher)->allows('viewAnalytics', $studentMembership->fresh()));
        $this->assertFalse(Gate::forUser($teacher)->allows('view-student-analytics', $otherStudent));
        $this->assertFalse(Gate::forUser($student)->allows('view-student-analytics', $otherStudent));

        $service->revokeAnalyticsConsent($student, $studentMembership->fresh());
        $this->assertFalse(Gate::forUser($teacher)->allows('view-student-analytics', $student));

        GroupMembership::factory()->create([
            'learning_group_id' => $group->id,
            'user_id' => $otherStudent->id,
            'membership_role' => MembershipRole::Student->value,
            'status' => MembershipStatus::Approved->value,
            'analytics_consent_status' => AnalyticsConsentStatus::Granted->value,
            'analytics_consent_version' => GroupMembership::ANALYTICS_CONSENT_VERSION,
            'analytics_consent_user_id' => $teacher->id,
        ]);
        $this->assertFalse(Gate::forUser($teacher)->allows('view-student-analytics', $otherStudent));

        $outsider = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $otherOrganisation->id,
        ]);
        $this->assertFalse(Gate::forUser($outsider)->allows('view', $group));
        $this->assertFalse(Gate::forUser($outsider)->allows('createGroup', $organisation));

        $rejectedStudent = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $organisation->id,
        ]);
        GroupMembership::factory()->create([
            'learning_group_id' => $group->id,
            'user_id' => $rejectedStudent->id,
            'membership_role' => MembershipRole::Student->value,
            'status' => MembershipStatus::Rejected->value,
            'analytics_consent_status' => AnalyticsConsentStatus::Granted->value,
            'analytics_consent_version' => GroupMembership::ANALYTICS_CONSENT_VERSION,
            'analytics_consent_user_id' => $rejectedStudent->id,
        ]);
        $this->assertFalse(Gate::forUser($teacher)->allows('view-student-analytics', $rejectedStudent));
    }

    public function test_existing_users_without_a_role_can_still_sign_in(): void
    {
        $user = User::factory()->create([
            'email' => 'legacy@example.com',
            'password' => bcrypt('secret12'),
        ]);

        $this->assertNull($user->account_role);

        $this->post(route('login'), [
            'email' => 'legacy@example.com',
            'password' => 'secret12',
        ])->assertRedirect('/memorisation');

        $this->assertAuthenticatedAs($user);
    }

    public function test_seeded_registration_organisations_link_teacher_and_student_rosters_via_connect(): void
    {
        $this->seed(RegistrationOrganisationSeeder::class);

        $halaqaName = RegistrationOrganisationDirectory::entries()[0]['name'];
        $memberships = app(OrganisationMembershipService::class);

        $student = User::factory()->create(['account_role' => AccountRole::Student->value]);
        $teacher = User::factory()->create(['account_role' => AccountRole::Teacher->value]);

        $memberships->joinOrCreate($student, OrganisationType::Halaqa, $halaqaName, MembershipRole::Student);
        $memberships->joinOrCreate($teacher, OrganisationType::Halaqa, $halaqaName, MembershipRole::Teacher);

        $student = $student->fresh();
        $teacher = $teacher->fresh();

        $this->assertSame($student->organisation_id, $teacher->organisation_id);
        $this->assertSame(2, GroupMembership::count());
        $this->assertTrue(Gate::forUser($teacher)->allows('view-student-analytics', $student));
    }

    public function test_connect_can_join_organisation_after_org_free_signup(): void
    {
        $this->post(route('register'), [
            'name' => 'Connect Later',
            'email' => 'connect-later@example.com',
            'password' => 'secret12',
            'password_confirmation' => 'secret12',
            'account_role' => 'teacher',
        ])->assertRedirect(route('teacher.dashboard'));

        $teacher = User::where('email', 'connect-later@example.com')->firstOrFail();
        $this->assertNull($teacher->organisation_id);

        $this->actingAs($teacher)
            ->patchJson(route('api.onboarding.connections.update'), [
                'step' => 'institution',
                'organisation_type' => OrganisationType::School->value,
                'organisation_name' => 'Connect School',
            ])
            ->assertOk();

        $teacher = $teacher->fresh();
        $this->assertNotNull($teacher->organisation_id);
        $this->assertSame('Connect School', $teacher->organisation->name);
    }

    public function test_registration_organisation_catalogue_lists_database_names_by_type(): void
    {
        Organisation::factory()->create([
            'name' => 'Sunrise Madrassa',
            'type' => OrganisationType::Madrassa->value,
        ]);
        Organisation::factory()->create([
            'name' => 'Al Noor School',
            'type' => OrganisationType::School->value,
        ]);

        $this->getJson(route('api.registration.organisations', ['type' => 'madrassa']))
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Sunrise Madrassa')
            ->assertJsonMissing(['name' => 'Al Noor School']);

        $this->get(route('register'))
            ->assertOk()
            ->assertDontSee('data-organisation-catalog', false)
            ->assertDontSee('name="organisation_type"', false)
            ->assertDontSee('organisation-type-madrassa', false)
            ->assertSee('data-register-step="account"', false)
            ->assertSee('data-register-step="purpose"', false)
            ->assertSee(__('ui.auth_purpose_heading'));
    }
}

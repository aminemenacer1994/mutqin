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

    public function test_student_and_teacher_registration_requires_organisation_details(): void
    {
        $this->from(route('register'))
            ->post(route('register'), [
                'name' => 'Missing Org',
                'email' => 'student-missing@example.com',
                'password' => 'secret12',
                'password_confirmation' => 'secret12',
                'account_role' => 'student',
            ])->assertRedirect(route('register'))
            ->assertSessionHasErrors(['organisation_type', 'organisation_name']);

        $this->assertGuest();
        $this->assertSame(0, User::count());

        $this->from(route('register'))
            ->post(route('register'), [
                'name' => 'Missing Name',
                'email' => 'teacher-missing@example.com',
                'password' => 'secret12',
                'password_confirmation' => 'secret12',
                'account_role' => 'teacher',
                'organisation_type' => 'school',
                'organisation_name' => '   ',
            ])->assertRedirect(route('register'))
            ->assertSessionHasErrors('organisation_name');

        $this->assertSame(0, Organisation::count());
    }

    public function test_matching_names_share_one_organisation_and_do_not_grant_access(): void
    {
        $this->register('Student One', 'student-one@example.com', 'student', 'halaqa', '  AL   Noor ');
        $this->register('Teacher One', 'teacher-one@example.com', 'teacher', 'halaqa', 'al noor');
        $this->register('Other School', 'school@example.com', 'teacher', 'school', 'Al Noor');
        $this->register('Hyphenated', 'hyphen@example.com', 'student', 'halaqa', 'Al-Noor');

        $this->assertSame(3, Organisation::count());
        $this->assertSame(0, GroupMembership::count());

        $student = User::where('email', 'student-one@example.com')->firstOrFail();
        $teacher = User::where('email', 'teacher-one@example.com')->firstOrFail();
        $schoolTeacher = User::where('email', 'school@example.com')->firstOrFail();
        $hyphenStudent = User::where('email', 'hyphen@example.com')->firstOrFail();

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
            ->assertSee('data-organisation-catalog', false)
            ->assertSee('Sunrise Madrassa', false);
    }

    private function register(string $name, string $email, string $role, string $type, string $organisation): void
    {
        $this->post(route('logout'));

        $this->post(route('register'), [
            'name' => $name,
            'email' => $email,
            'password' => 'secret12',
            'password_confirmation' => 'secret12',
            'account_role' => $role,
            'organisation_type' => $type,
            'organisation_name' => $organisation,
        ])->assertRedirect(route('memorisation'));
    }
}

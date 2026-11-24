<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\LearningGroupInvitationStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\OrganisationType;
use App\Enums\ParentLinkStatus;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\Organisation;
use App\Models\OrganisationMembership;
use App\Models\ParentStudentLink;
use App\Models\User;
use App\Services\Organisations\GroupMembershipService;
use App\Services\Organisations\LearningGroupInvitationService;
use App\Services\Organisations\OrganisationMembershipService;
use App\Services\Organisations\StudentAccessAuthorizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganisationMembershipAndInviteTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
        $this->enableParentFeatures();
    }

    public function test_organisation_search_filters_by_query_and_type(): void
    {
        Organisation::factory()->create([
            'type' => OrganisationType::Masjid->value,
            'name' => 'Masjid Al Noor',
            'name_canonical' => 'masjid al noor',
        ]);
        Organisation::factory()->create([
            'type' => OrganisationType::Academy->value,
            'name' => 'Academy Light',
            'name_canonical' => 'academy light',
        ]);

        $this->getJson(route('api.registration.organisations', [
            'type' => OrganisationType::Masjid->value,
            'q' => 'noor',
        ]))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Masjid Al Noor');
    }

    public function test_joining_an_existing_institution_stays_pending_until_approved(): void
    {
        $organisation = Organisation::factory()->create([
            'type' => OrganisationType::School->value,
            'name' => 'Shared School',
            'name_canonical' => 'shared school',
        ]);
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
        ]);
        OrganisationMembership::query()->create([
            'user_id' => $teacher->id,
            'organisation_id' => $organisation->id,
            'membership_role' => MembershipRole::Teacher->value,
            'status' => MembershipStatus::Approved->value,
            'decided_by' => $teacher->id,
            'decided_at' => now(),
        ]);

        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => null,
        ]);

        $membership = app(OrganisationMembershipService::class)->requestJoin(
            $student,
            $organisation,
            MembershipRole::Student,
        );

        $this->assertSame(MembershipStatus::Pending, $membership->status);
        $this->assertNull($student->fresh()->organisation_id);
        $this->assertFalse(app(StudentAccessAuthorizer::class)->allows($teacher, $student));

        app(OrganisationMembershipService::class)->approve($teacher, $membership->fresh());
        $this->assertSame($organisation->id, $student->fresh()->organisation_id);
        $this->assertFalse(app(StudentAccessAuthorizer::class)->allows($teacher, $student->fresh()));
    }

    public function test_switching_active_organisation_does_not_expose_previous_class_data(): void
    {
        $first = Organisation::factory()->create([
            'type' => OrganisationType::School->value,
            'name' => 'First School',
            'name_canonical' => 'first school',
        ]);
        $second = Organisation::factory()->create([
            'type' => OrganisationType::School->value,
            'name' => 'Second School',
            'name_canonical' => 'second school',
        ]);

        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $first->id,
        ]);
        foreach ([$first, $second] as $organisation) {
            OrganisationMembership::query()->create([
                'user_id' => $teacher->id,
                'organisation_id' => $organisation->id,
                'membership_role' => MembershipRole::Teacher->value,
                'status' => MembershipStatus::Approved->value,
                'decided_by' => $teacher->id,
                'decided_at' => now(),
            ]);
        }

        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $first->id,
        ]);
        $group = LearningGroup::factory()->create(['organisation_id' => $first->id]);
        GroupMembership::factory()->create([
            'learning_group_id' => $group->id,
            'user_id' => $teacher->id,
            'membership_role' => MembershipRole::Teacher->value,
            'status' => MembershipStatus::Approved->value,
        ]);
        GroupMembership::factory()->create([
            'learning_group_id' => $group->id,
            'user_id' => $student->id,
            'membership_role' => MembershipRole::Student->value,
            'status' => MembershipStatus::Approved->value,
            'analytics_consent_status' => AnalyticsConsentStatus::Granted->value,
            'analytics_consent_version' => GroupMembership::ANALYTICS_CONSENT_VERSION,
            'analytics_consent_user_id' => $student->id,
        ]);

        $this->assertTrue(app(StudentAccessAuthorizer::class)->allows($teacher, $student));

        app(OrganisationMembershipService::class)->switchActive($teacher, $second);
        $this->assertSame($second->id, $teacher->fresh()->organisation_id);
        $this->assertFalse(app(StudentAccessAuthorizer::class)->allows($teacher->fresh(), $student));
    }

    public function test_class_invite_redeem_stays_pending_until_consent_and_approval(): void
    {
        $organisation = Organisation::factory()->create([
            'type' => OrganisationType::Madrassa->value,
            'name' => 'Invite Madrassa',
            'name_canonical' => 'invite madrassa',
        ]);
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
        ]);
        OrganisationMembership::query()->create([
            'user_id' => $teacher->id,
            'organisation_id' => $organisation->id,
            'membership_role' => MembershipRole::Teacher->value,
            'status' => MembershipStatus::Approved->value,
            'decided_by' => $teacher->id,
            'decided_at' => now(),
        ]);
        $group = LearningGroup::factory()->create(['organisation_id' => $organisation->id]);
        GroupMembership::factory()->create([
            'learning_group_id' => $group->id,
            'user_id' => $teacher->id,
            'membership_role' => MembershipRole::Teacher->value,
            'status' => MembershipStatus::Approved->value,
        ]);

        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => null,
        ]);

        $issued = app(LearningGroupInvitationService::class)->issue($teacher, $group);
        $membership = app(LearningGroupInvitationService::class)->redeem($student, $issued['code']);

        $this->assertSame(MembershipStatus::Pending, $membership->status);
        $this->assertSame($organisation->id, $student->fresh()->organisation_id);
        $this->assertFalse(app(StudentAccessAuthorizer::class)->allows($teacher, $student->fresh()));
        $this->assertSame(LearningGroupInvitationStatus::Pending, $issued['invitation']->fresh()->status);

        app(GroupMembershipService::class)->grantAnalyticsConsent($student, $membership->fresh());
        app(GroupMembershipService::class)->teacherApprove($teacher, $membership->fresh());

        $this->assertTrue(app(StudentAccessAuthorizer::class)->allows($teacher, $student->fresh()));
    }

    public function test_classroom_invite_code_can_be_redeemed_by_multiple_students(): void
    {
        $organisation = Organisation::factory()->create([
            'type' => OrganisationType::Madrassa->value,
            'name' => 'Shared Code Madrassa',
            'name_canonical' => 'shared code madrassa',
        ]);
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
        ]);
        OrganisationMembership::query()->create([
            'user_id' => $teacher->id,
            'organisation_id' => $organisation->id,
            'membership_role' => MembershipRole::Teacher->value,
            'status' => MembershipStatus::Approved->value,
            'decided_by' => $teacher->id,
            'decided_at' => now(),
        ]);
        $group = LearningGroup::factory()->create(['organisation_id' => $organisation->id]);
        GroupMembership::factory()->create([
            'learning_group_id' => $group->id,
            'user_id' => $teacher->id,
            'membership_role' => MembershipRole::Teacher->value,
            'status' => MembershipStatus::Approved->value,
        ]);

        $issued = app(LearningGroupInvitationService::class)->issue($teacher, $group);
        $first = User::factory()->create(['account_role' => AccountRole::Student->value]);
        $second = User::factory()->create(['account_role' => AccountRole::Student->value]);

        app(LearningGroupInvitationService::class)->redeem($first, $issued['code']);
        app(LearningGroupInvitationService::class)->redeem($second, $issued['code']);

        $this->assertSame(LearningGroupInvitationStatus::Pending, $issued['invitation']->fresh()->status);
        $this->assertSame(2, GroupMembership::query()
            ->where('learning_group_id', $group->id)
            ->where('membership_role', MembershipRole::Student->value)
            ->count());
    }

    public function test_class_invite_redeem_is_not_blocked_by_other_route_throttles(): void
    {
        $organisation = Organisation::factory()->create([
            'type' => OrganisationType::School->value,
            'name' => 'Throttle School',
            'name_canonical' => 'throttle school',
        ]);
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
        ]);
        OrganisationMembership::query()->create([
            'user_id' => $teacher->id,
            'organisation_id' => $organisation->id,
            'membership_role' => MembershipRole::Teacher->value,
            'status' => MembershipStatus::Approved->value,
            'decided_by' => $teacher->id,
            'decided_at' => now(),
        ]);
        $group = LearningGroup::factory()->create(['organisation_id' => $organisation->id]);
        GroupMembership::factory()->create([
            'learning_group_id' => $group->id,
            'user_id' => $teacher->id,
            'membership_role' => MembershipRole::Teacher->value,
            'status' => MembershipStatus::Approved->value,
        ]);
        $student = User::factory()->create(['account_role' => AccountRole::Student->value]);
        $issued = app(LearningGroupInvitationService::class)->issue($teacher, $group);

        // Session throttles used to share one per-user key with redeem (empty prefix).
        // After isolating prefixes, 12+ session hits must not 429 redeem.
        for ($i = 0; $i < 12; $i++) {
            $this->actingAs($student)->postJson(route('api.session.pause'), []);
        }

        $this->actingAs($student)
            ->postJson(route('api.me.class-invites.redeem'), ['code' => $issued['code']])
            ->assertOk();
    }

    public function test_class_invite_url_paste_redeems_and_consumes_token(): void
    {
        $organisation = Organisation::factory()->create([
            'type' => OrganisationType::Academy->value,
            'name' => 'URL Invite Academy',
            'name_canonical' => 'url invite academy',
        ]);
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
        ]);
        OrganisationMembership::query()->create([
            'user_id' => $teacher->id,
            'organisation_id' => $organisation->id,
            'membership_role' => MembershipRole::Teacher->value,
            'status' => MembershipStatus::Approved->value,
            'decided_by' => $teacher->id,
            'decided_at' => now(),
        ]);
        $group = LearningGroup::factory()->create(['organisation_id' => $organisation->id]);
        GroupMembership::factory()->create([
            'learning_group_id' => $group->id,
            'user_id' => $teacher->id,
            'membership_role' => MembershipRole::Teacher->value,
            'status' => MembershipStatus::Approved->value,
        ]);
        $student = User::factory()->create(['account_role' => AccountRole::Student->value]);
        $issued = app(LearningGroupInvitationService::class)->issue($teacher, $group);

        $membership = app(LearningGroupInvitationService::class)->redeem($student, $issued['invite_url']);

        $this->assertSame(MembershipStatus::Pending, $membership->status);
        $this->assertSame(LearningGroupInvitationStatus::Accepted, $issued['invitation']->fresh()->status);
    }

    public function test_transfer_drops_access_to_the_old_class(): void
    {
        $organisation = Organisation::factory()->create([
            'type' => OrganisationType::School->value,
            'name' => 'Transfer School',
            'name_canonical' => 'transfer school',
        ]);
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
        ]);
        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $organisation->id,
        ]);
        $source = LearningGroup::factory()->create(['organisation_id' => $organisation->id, 'name' => 'Morning']);
        $destination = LearningGroup::factory()->create(['organisation_id' => $organisation->id, 'name' => 'Evening']);

        foreach ([$source, $destination] as $group) {
            GroupMembership::factory()->create([
                'learning_group_id' => $group->id,
                'user_id' => $teacher->id,
                'membership_role' => MembershipRole::Teacher->value,
                'status' => MembershipStatus::Approved->value,
            ]);
        }

        $membership = GroupMembership::factory()->create([
            'learning_group_id' => $source->id,
            'user_id' => $student->id,
            'membership_role' => MembershipRole::Student->value,
            'status' => MembershipStatus::Approved->value,
            'analytics_consent_status' => AnalyticsConsentStatus::Granted->value,
            'analytics_consent_version' => GroupMembership::ANALYTICS_CONSENT_VERSION,
            'analytics_consent_user_id' => $student->id,
        ]);

        $this->assertTrue(app(StudentAccessAuthorizer::class)->allows($teacher, $student));

        $pending = app(GroupMembershipService::class)->transfer($teacher, $membership, $destination);
        $this->assertSame(MembershipStatus::Pending, $pending->status);
        $this->assertSame($destination->id, $pending->learning_group_id);
        $this->assertSame(MembershipStatus::Rejected, $membership->fresh()->status);
        $this->assertFalse(app(StudentAccessAuthorizer::class)->allows($teacher, $student->fresh()));
    }

    public function test_student_can_approve_or_reject_pending_guardian_links(): void
    {
        $student = User::factory()->create(['account_role' => AccountRole::Student->value]);
        $parent = User::factory()->create(['account_role' => AccountRole::Parent->value]);
        $link = ParentStudentLink::query()->create([
            'parent_user_id' => $parent->id,
            'student_user_id' => $student->id,
            'status' => ParentLinkStatus::Pending->value,
            'relationship' => 'mother',
            'permissions' => ['view_progress'],
            'requested_by_user_id' => $parent->id,
        ]);

        $this->actingAs($student)
            ->postJson(route('api.me.guardians.approve', $link))
            ->assertOk();

        $this->assertSame(ParentLinkStatus::Approved, $link->fresh()->status);

        $other = ParentStudentLink::query()->create([
            'parent_user_id' => User::factory()->create(['account_role' => AccountRole::Parent->value])->id,
            'student_user_id' => $student->id,
            'status' => ParentLinkStatus::Pending->value,
            'relationship' => 'father',
            'permissions' => ['view_progress'],
            'requested_by_user_id' => $parent->id,
        ]);

        $this->actingAs($student)
            ->postJson(route('api.me.guardians.reject', $other))
            ->assertOk();

        $this->assertSame(ParentLinkStatus::Rejected, $other->fresh()->status);
    }
}

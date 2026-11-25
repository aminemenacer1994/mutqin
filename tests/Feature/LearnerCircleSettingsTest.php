<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\OrganisationType;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\Organisation;
use App\Models\OrganisationMembership;
use App\Models\User;
use App\Services\Organisations\GroupMembershipService;
use App\Services\Organisations\LearningGroupInvitationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LearnerCircleSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
    }

    public function test_learner_circle_is_available_without_full_support_network(): void
    {
        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
        ]);

        $this->actingAs($student)
            ->getJson(route('api.me.circle'))
            ->assertOk()
            ->assertJsonPath('circle.teachers', [])
            ->assertJsonPath('circle.memberships', []);
    }

    public function test_class_invite_preview_and_student_pending_reject(): void
    {
        $organisation = Organisation::factory()->create([
            'type' => OrganisationType::Madrassa->value,
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
        $group = LearningGroup::factory()->create(['organisation_id' => $organisation->id, 'name' => 'Beginners']);
        GroupMembership::factory()->create([
            'learning_group_id' => $group->id,
            'user_id' => $teacher->id,
            'membership_role' => MembershipRole::Teacher->value,
            'status' => MembershipStatus::Approved->value,
        ]);

        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
        ]);
        $issued = app(LearningGroupInvitationService::class)->issue($teacher, $group);

        $this->actingAs($student)
            ->postJson(route('api.me.class-invites.preview'), ['code' => $issued['code']])
            ->assertOk()
            ->assertJsonPath('class_name', 'Beginners')
            ->assertJsonPath('organisation_name', $organisation->name)
            ->assertJsonPath('already_joined', false);

        $this->actingAs($student)
            ->postJson(route('api.me.class-invites.redeem'), ['code' => $issued['code']])
            ->assertOk();

        $membership = GroupMembership::query()
            ->where('user_id', $student->id)
            ->where('learning_group_id', $group->id)
            ->firstOrFail();

        $this->actingAs($student)
            ->postJson(route('api.me.memberships.reject', $membership))
            ->assertOk()
            ->assertJsonPath('circle.memberships.0.status', MembershipStatus::Rejected->value);
    }

    public function test_duplicate_approved_class_join_is_blocked(): void
    {
        $organisation = Organisation::factory()->create();
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
        app(LearningGroupInvitationService::class)->redeem($student, $issued['code']);

        $membership = GroupMembership::query()->where('user_id', $student->id)->firstOrFail();
        app(GroupMembershipService::class)->grantAnalyticsConsent($student, $membership);
        app(GroupMembershipService::class)->teacherApprove($teacher, $membership->fresh());

        $this->actingAs($student)
            ->postJson(route('api.me.class-invites.redeem'), ['code' => $issued['code']])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['code']);
    }
}

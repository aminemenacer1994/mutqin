<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\OrganisationType;
use App\Models\Organisation;
use App\Models\OrganisationMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganisationInstitutionAdminTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
    }

    public function test_first_approved_teacher_becomes_institution_admin(): void
    {
        $organisation = Organisation::factory()->create();
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
        ]);

        $membership = OrganisationMembership::query()->create([
            'user_id' => $teacher->id,
            'organisation_id' => $organisation->id,
            'membership_role' => MembershipRole::Teacher->value,
            'status' => MembershipStatus::Approved->value,
            'decided_by' => $teacher->id,
            'decided_at' => now(),
            'is_institution_admin' => true,
        ]);

        $this->assertTrue($membership->is_institution_admin);
    }

    public function test_admin_can_invite_and_colleague_accepts(): void
    {
        $organisation = Organisation::factory()->create([
            'type' => OrganisationType::Academy->value,
            'name' => 'Academy One',
            'name_canonical' => 'academy one',
        ]);

        $admin = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'email' => 'admin@school.test',
            'organisation_id' => $organisation->id,
        ]);
        OrganisationMembership::query()->create([
            'user_id' => $admin->id,
            'organisation_id' => $organisation->id,
            'membership_role' => MembershipRole::Teacher->value,
            'status' => MembershipStatus::Approved->value,
            'decided_by' => $admin->id,
            'decided_at' => now(),
            'is_institution_admin' => true,
        ]);

        $colleague = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'email' => 'colleague@school.test',
            'organisation_id' => null,
        ]);

        $response = $this->actingAs($admin)
            ->postJson(route('api.organisations.active.teacher-invitations.store'), [
                'email' => 'colleague@school.test',
            ])
            ->assertCreated()
            ->assertJsonPath('invitation.email', 'colleague@school.test');

        $inviteUrl = (string) $response->json('invite_url');
        $this->assertNotEmpty($inviteUrl);
        preg_match('/teacher_invite=([^&]+)/', $inviteUrl, $matches);
        $plain = isset($matches[1]) ? urldecode($matches[1]) : '';
        $this->assertNotEmpty($plain);

        $this->actingAs($colleague)
            ->postJson(route('api.organisations.teacher-invitations.accept'), [
                'token' => $plain,
            ])
            ->assertOk()
            ->assertJsonPath('organisation.id', $organisation->id);

        $this->assertDatabaseHas('organisation_memberships', [
            'user_id' => $colleague->id,
            'organisation_id' => $organisation->id,
            'membership_role' => MembershipRole::Teacher->value,
            'status' => MembershipStatus::Approved->value,
        ]);
    }

    public function test_non_admin_cannot_invite_teachers(): void
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
            'is_institution_admin' => false,
        ]);

        $this->actingAs($teacher)
            ->postJson(route('api.organisations.active.teacher-invitations.store'), [
                'email' => 'new@school.test',
            ])
            ->assertForbidden();
    }

    public function test_institution_dashboard_is_scoped_to_active_organisation(): void
    {
        $organisation = Organisation::factory()->create(['name' => 'Scoped Org']);
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
            'is_institution_admin' => true,
        ]);

        $this->actingAs($teacher)
            ->getJson(route('api.organisations.active.institution'))
            ->assertOk()
            ->assertJsonPath('organisation.name', 'Scoped Org')
            ->assertJsonPath('capabilities.institution_admin', true);
    }
}
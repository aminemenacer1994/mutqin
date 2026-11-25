<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\ParentGuardianPermission;
use App\Models\Organisation;
use App\Models\OrganisationMembership;
use App\Models\ParentStudentLink;
use App\Models\User;
use App\Enums\ParentLinkStatus;
use App\Services\Auth\UserRoleService;
use App\Services\Billing\SubscriptionEntitlement;
use App\Services\Organisations\OrganisationMembershipService;
use App\Services\Parent\ParentAccessAuthorizer;
use App\Services\Parent\ParentStudentLinkService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class Mutqin20AuditFixesTest extends TestCase
{
    use RefreshDatabase;

    public function test_parent_access_honours_supplemental_student_role(): void
    {
        $this->enableParentFeatures();

        $parent = User::factory()->create([
            'account_role' => AccountRole::Parent->value,
        ]);
        $learner = User::factory()->create([
            'account_role' => AccountRole::Individual->value,
        ]);
        app(UserRoleService::class)->grant($learner, AccountRole::Student);

        $link = app(ParentStudentLinkService::class)->request($parent, $learner, $parent, 'mother');
        app(ParentStudentLinkService::class)->approve($link, $learner, [
            ParentGuardianPermission::ViewProgress->value,
        ]);

        $access = app(ParentAccessAuthorizer::class);

        $this->assertTrue($access->allows($parent->fresh(), $learner->fresh()));
        $this->assertTrue($access->authorizedStudentIds($parent->fresh())->contains($learner->id));
    }

    public function test_supplemental_teacher_can_create_group_in_active_organisation(): void
    {
        $this->enableTeacherFeatures();

        $organisation = Organisation::factory()->create();
        $user = User::factory()->create([
            'account_role' => AccountRole::Individual->value,
            'organisation_id' => $organisation->id,
        ]);
        app(UserRoleService::class)->grant($user, AccountRole::Teacher);

        $this->assertTrue(Gate::forUser($user)->allows('createGroup', $organisation));
    }

    public function test_unapproved_teacher_cannot_reject_organisation_membership(): void
    {
        $this->enableTeacherFeatures();

        $organisation = Organisation::factory()->create();
        $approver = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
        ]);
        OrganisationMembership::query()->create([
            'user_id' => $approver->id,
            'organisation_id' => $organisation->id,
            'membership_role' => MembershipRole::Teacher->value,
            'status' => MembershipStatus::Approved->value,
            'decided_by' => $approver->id,
            'decided_at' => now(),
        ]);

        $intruder = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
        ]);

        $pending = OrganisationMembership::query()->create([
            'user_id' => User::factory()->create(['account_role' => AccountRole::Student->value])->id,
            'organisation_id' => $organisation->id,
            'membership_role' => MembershipRole::Student->value,
            'status' => MembershipStatus::Pending->value,
        ]);

        try {
            app(OrganisationMembershipService::class)->reject($intruder, $pending);
            $this->fail('Expected reject to be forbidden for teachers without approved membership.');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $exception) {
            $this->assertSame(403, $exception->getStatusCode());
        }
    }

    public function test_find_ayah_token_mint_consumes_premium_daily_quota(): void
    {
        config([
            'mutqin.unrestricted_subscription' => false,
            'services.speechmatics.api_key' => 'speechmatics-test-key-123456',
            'services.speechmatics.region' => 'eu',
            'services.speechmatics.token_ttl' => 120,
            'services.speechmatics.usage_cap.enabled' => true,
            'services.speechmatics.usage_cap.daily_user_token_mints' => 50,
            'services.speechmatics.usage_cap.daily_global_token_mints' => 500,
            'billing.limits.premium.find_ayah_per_day' => 1,
        ]);

        Http::fake([
            'https://mp.speechmatics.com/*' => Http::response([
                'key_value' => 'rt-test-token',
            ], 201),
        ]);

        $user = User::factory()->premium()->create();
        $entitlement = app(SubscriptionEntitlement::class);

        $this->actingAs($user)
            ->postJson(route('memorisation.transcription-token'), ['purpose' => 'find_ayah'])
            ->assertOk()
            ->assertJsonPath('access_token', 'rt-test-token');

        $this->assertFalse($entitlement->canStartFindAyah($user->fresh()));

        $this->actingAs($user)
            ->postJson(route('memorisation.transcription-token'), ['purpose' => 'find_ayah'])
            ->assertStatus(403)
            ->assertJsonPath('upgrade', true);
    }
}
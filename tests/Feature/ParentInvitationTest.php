<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\ParentInvitationStatus;
use App\Enums\ParentLinkStatus;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\Organisation;
use App\Models\ParentInvitation;
use App\Models\ParentInvitationEvent;
use App\Models\ParentLinkCode;
use App\Models\ParentStudentLink;
use App\Models\User;
use App\Services\Parent\ParentAccessAuthorizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class ParentInvitationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
        $this->enableParentFeatures();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_invitation_token_is_stored_as_a_hash_and_only_the_invited_account_can_accept(): void
    {
        [$teacher, $student] = $this->classroom();
        $parent = User::factory()->create([
            'account_role' => AccountRole::Individual->value,
            'email' => 'guardian.one@mutqin.test',
            'name' => 'Guardian One',
        ]);
        $other = User::factory()->create([
            'email' => 'someone.else@mutqin.test',
            'name' => 'Someone Else',
        ]);

        $this->actingAs($parent)->getJson(route('api.parent.shell'))->assertForbidden();
        $this->actingAs($parent)->getJson(route('api.parent.children.show', $student))->assertNotFound();

        $created = $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.guardians.invitations.store', $student), [
                'email' => 'Guardian.One@mutqin.test',
                'relationship' => 'mother',
            ])
            ->assertCreated();

        $token = $this->tokenFrom($created->json('invite_url'));
        $invitation = ParentInvitation::query()->firstOrFail();

        $this->assertNotSame($token, $invitation->token_hash);
        $this->assertSame(hash('sha256', $token), $invitation->token_hash);
        $this->assertDatabaseMissing('parent_invitations', ['token_hash' => $token]);
        $this->assertSame(ParentInvitationStatus::Pending, $invitation->status);
        $created->assertJsonMissingPath('invitation.token_hash');
        $this->assertStringNotContainsString($student->name, $created->getContent());

        $this->actingAs($parent)
            ->get(route('parent.invitation.show', ['token' => $token]))
            ->assertOk()
            ->assertDontSee($student->name);
        $this->actingAs($student)
            ->get(route('parent.link-code'))
            ->assertOk();

        $this->actingAs($other)
            ->postJson(route('api.parent.invitations.accept'), ['token' => $token])
            ->assertUnprocessable()
            ->assertJsonPath('errors.token.0', __('parent.invite_wrong_account'));
        $this->assertStringNotContainsString($student->name, $this->actingAs($other)
            ->postJson(route('api.parent.invitations.accept'), ['token' => $token])
            ->getContent());

        $this->actingAs($parent)->getJson(route('api.parent.children.show', $student))->assertNotFound();

        $this->actingAs($parent)
            ->postJson(route('api.parent.invitations.accept'), ['token' => $token])
            ->assertOk()
            ->assertJsonPath('child.id', $student->id)
            ->assertJsonPath('child.name', $student->name);

        $this->assertSame(ParentInvitationStatus::Accepted, $invitation->fresh()->status);
        $this->assertNotSame(hash('sha256', $token), $invitation->fresh()->token_hash);
        $this->assertTrue(app(ParentAccessAuthorizer::class)->allows($parent->fresh(), $student));
        $this->assertTrue($parent->fresh()->isParent());
        $this->assertGreaterThan(0, ParentInvitationEvent::query()->where('parent_invitation_id', $invitation->id)->count());

        $this->actingAs($parent->fresh())
            ->getJson(route('api.parent.shell'))
            ->assertOk()
            ->assertJsonPath('children_count', 1)
            ->assertJsonPath('children.0.id', $student->id)
            ->assertJsonPath('children.0.teachers.0.name', $teacher->name);

        $this->actingAs($parent)
            ->postJson(route('api.parent.invitations.accept'), ['token' => $token])
            ->assertUnprocessable()
            ->assertJsonPath('errors.token.0', __('parent.invite_invalid'));
    }

    public function test_unauthorized_teacher_cannot_list_or_invite_and_duplicates_are_rejected(): void
    {
        [$teacher, $student] = $this->classroom();
        $outsider = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'name' => 'Outside Teacher',
        ]);

        $this->actingAs($outsider)
            ->getJson(route('api.teacher.students.guardians', $student))
            ->assertNotFound();
        $this->actingAs($outsider)
            ->postJson(route('api.teacher.students.guardians.invitations.store', $student), [
                'email' => 'guardian.one@mutqin.test',
            ])
            ->assertNotFound();
        $this->assertSame(0, ParentInvitation::query()->count());

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.guardians.invitations.store', $student), [
                'email' => $student->email,
            ])
            ->assertUnprocessable();

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.guardians.invitations.store', $student), [
                'email' => 'guardian.one@mutqin.test',
            ])
            ->assertCreated();

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.guardians.invitations.store', $student), [
                'email' => 'guardian.one@mutqin.test',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.email.0', __('parent.invite_already_pending'));

        $this->assertSame(1, ParentInvitation::query()->count());
        $this->assertFalse(Route::has('api.teacher.students.guardians.approve'));
    }

    public function test_expired_resent_and_revoked_invitations_stop_access(): void
    {
        [$teacher, $student] = $this->classroom();
        $parent = User::factory()->create([
            'email' => 'guardian.one@mutqin.test',
        ]);

        $first = $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.guardians.invitations.store', $student), [
                'email' => $parent->email,
            ])
            ->assertCreated();
        $oldToken = $this->tokenFrom($first->json('invite_url'));
        $invitation = ParentInvitation::query()->firstOrFail();

        Carbon::setTestNow(now()->addDays(8));
        $this->actingAs($parent)
            ->postJson(route('api.parent.invitations.accept'), ['token' => $oldToken])
            ->assertUnprocessable()
            ->assertJsonPath('errors.token.0', __('parent.invite_expired'));
        $this->assertSame(ParentInvitationStatus::Expired, $invitation->fresh()->status);

        $resent = $this->actingAs($teacher)
            ->postJson(route('api.teacher.guardian-invitations.resend', $invitation))
            ->assertOk();
        $newToken = $this->tokenFrom($resent->json('invite_url'));
        $this->assertNotSame($oldToken, $newToken);

        $this->actingAs($parent)
            ->postJson(route('api.parent.invitations.accept'), ['token' => $oldToken])
            ->assertUnprocessable();

        $this->actingAs($parent)
            ->postJson(route('api.parent.invitations.accept'), ['token' => $newToken])
            ->assertOk()
            ->assertJsonPath('child.name', $student->name);

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.guardian-invitations.revoke', $invitation))
            ->assertOk()
            ->assertJsonPath('invitation.status', 'revoked');

        $this->assertFalse(app(ParentAccessAuthorizer::class)->allows($parent->fresh(), $student));
        $this->actingAs($parent->fresh())->getJson(route('api.parent.children.show', $student))->assertNotFound();
        $this->assertSame(ParentLinkStatus::Revoked, ParentStudentLink::query()->firstOrFail()->status);

        Carbon::setTestNow();
    }

    public function test_two_guardians_stay_isolated_and_a_link_code_is_single_use(): void
    {
        [$teacher, $student] = $this->classroom();
        $otherStudent = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'name' => 'Other Child',
        ]);
        $first = User::factory()->create(['email' => 'guardian.one@mutqin.test', 'name' => 'Guardian One']);
        $second = User::factory()->create(['email' => 'guardian.two@mutqin.test', 'name' => 'Guardian Two']);

        foreach ([$first, $second] as $guardian) {
            $created = $this->actingAs($teacher)
                ->postJson(route('api.teacher.students.guardians.invitations.store', $student), [
                    'email' => $guardian->email,
                ])
                ->assertCreated();
            $this->actingAs($guardian)
                ->postJson(route('api.parent.invitations.accept'), ['token' => $this->tokenFrom($created->json('invite_url'))])
                ->assertOk();
        }

        $listed = $this->actingAs($teacher)
            ->getJson(route('api.teacher.students.guardians', $student))
            ->assertOk();
        $this->assertCount(2, collect($listed->json('guardians'))->where('status', 'accepted'));

        $this->actingAs($first->fresh())->getJson(route('api.parent.children.show', $student))->assertOk();
        $this->actingAs($second->fresh())->getJson(route('api.parent.children.show', $student))->assertOk();
        $this->actingAs($first->fresh())->getJson(route('api.parent.children.show', $otherStudent))->assertNotFound();

        $issued = $this->actingAs($second->fresh())
            ->postJson(route('api.parent.link-codes.store'))
            ->assertCreated();
        $plain = (string) $issued->json('code');
        $this->assertNotSame($plain, ParentLinkCode::query()->firstOrFail()->code_hash);
        $this->assertSame(hash('sha256', $plain), ParentLinkCode::query()->firstOrFail()->code_hash);

        $this->actingAs($teacher)
            ->postJson(route('api.parent.link-codes.redeem'), ['code' => $plain])
            ->assertUnprocessable()
            ->assertJsonPath('errors.code.0', __('parent.link_code_invalid'));

        $this->actingAs($otherStudent)
            ->postJson(route('api.parent.link-codes.redeem'), ['code' => $plain])
            ->assertOk()
            ->assertJsonPath('child.id', $otherStudent->id);

        $this->actingAs($student)
            ->postJson(route('api.parent.link-codes.redeem'), ['code' => $plain])
            ->assertUnprocessable();

        $this->assertTrue(app(ParentAccessAuthorizer::class)->allows($second->fresh(), $otherStudent));
        $this->assertFalse(app(ParentAccessAuthorizer::class)->allows($first->fresh(), $otherStudent));
        $this->actingAs($first->fresh())->getJson(route('api.parent.children.show', $otherStudent))->assertNotFound();
        $this->actingAs($second->fresh())
            ->getJson(route('api.parent.shell'))
            ->assertOk()
            ->assertJsonPath('children_count', 2);

        $again = $this->actingAs($second->fresh())->postJson(route('api.parent.link-codes.store'))->assertCreated();
        $expiring = ParentLinkCode::query()->whereNull('used_at')->firstOrFail();
        $expiring->forceFill(['expires_at' => now()->subMinute()])->save();
        $this->actingAs($student)
            ->postJson(route('api.parent.link-codes.redeem'), ['code' => $again->json('code')])
            ->assertUnprocessable()
            ->assertJsonPath('errors.code.0', __('parent.link_code_invalid'));
    }

    public function test_pending_invitation_can_be_rejected_and_a_seeded_link_can_be_revoked(): void
    {
        [$teacher, $student] = $this->classroom();
        $parent = User::factory()->create(['email' => 'guardian.one@mutqin.test']);
        $created = $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.guardians.invitations.store', $student), [
                'email' => $parent->email,
            ])
            ->assertCreated();

        $this->actingAs($parent)
            ->postJson(route('api.parent.invitations.reject'), ['token' => $this->tokenFrom($created->json('invite_url'))])
            ->assertOk();

        $this->assertSame(ParentInvitationStatus::Rejected, ParentInvitation::query()->firstOrFail()->status);
        $this->assertSame(0, ParentStudentLink::query()->count());
        $this->actingAs($parent)->getJson(route('api.parent.children.show', $student))->assertNotFound();

        $link = ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => $parent->id,
            'student_user_id' => $student->id,
        ]);

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.guardians.links.revoke', [$student, $link]))
            ->assertOk();

        $this->assertSame(ParentLinkStatus::Revoked, $link->fresh()->status);
        $this->assertFalse(app(ParentAccessAuthorizer::class)->allows($parent->fresh(), $student));
    }

    /**
     * @return array{0: User, 1: User}
     */
    private function classroom(): array
    {
        $organisation = Organisation::factory()->create();
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
            'name' => 'Classroom Teacher',
        ]);
        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $organisation->id,
            'name' => 'Classroom Student',
        ]);
        $group = LearningGroup::factory()->create(['organisation_id' => $organisation->id]);

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

        return [$teacher, $student];
    }

    private function tokenFrom(string $url): string
    {
        $token = basename((string) parse_url($url, PHP_URL_PATH));
        $this->assertNotSame('', $token);

        return $token;
    }
}

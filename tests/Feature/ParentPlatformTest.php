<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\ParentGuardianPermission;
use App\Enums\ParentLinkStatus;
use App\Models\Organisation;
use App\Models\ParentStudentLink;
use App\Models\ParentStudentLinkEvent;
use App\Models\User;
use App\Services\Auth\UserRoleService;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Services\Parent\ParentAccessAuthorizer;
use App\Services\Parent\ParentStudentLinkService;
use App\Support\ParentFeatures;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ParentPlatformTest extends TestCase
{
    use RefreshDatabase;

    public function test_parent_features_are_disabled_unless_configured(): void
    {
        $this->assertFalse(ParentFeatures::enabled());

        $this->enableParentFeatures();

        $this->assertTrue(ParentFeatures::enabled());
    }

    public function test_disabled_parent_routes_are_not_found(): void
    {
        $parent = User::factory()->create([
            'account_role' => AccountRole::Parent->value,
        ]);
        app(UserRoleService::class)->grant($parent, AccountRole::Parent);

        $this->get(route('parent.dashboard'))->assertNotFound();
        $this->getJson(route('api.parent.shell'))->assertNotFound();

        $this->actingAs($parent)->get(route('parent.dashboard'))->assertNotFound();
        $this->actingAs($parent)->getJson(route('api.parent.shell'))->assertNotFound();
    }

    public function test_parent_shell_requires_parent_role(): void
    {
        $this->enableParentFeatures();

        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
        ]);

        $this->actingAs($student)->get(route('parent.dashboard'))->assertForbidden();
        $this->actingAs($student)->getJson(route('api.parent.shell'))->assertForbidden();
    }

    public function test_teacher_with_supplemental_parent_role_can_open_parent_dashboard(): void
    {
        $this->enableParentFeatures();
        $this->enableTeacherFeatures();

        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
        ]);
        app(UserRoleService::class)->grant($teacher, AccountRole::Parent);

        $this->actingAs($teacher)
            ->get(route('parent.dashboard'))
            ->assertOk()
            ->assertSee('parent-dashboard', false);

        $this->actingAs($teacher)
            ->getJson(route('api.parent.shell'))
            ->assertOk()
            ->assertJsonPath('phase', 'dashboard');
    }

    public function test_parent_link_flow_and_relationship_authorization(): void
    {
        $this->enableParentFeatures();

        $parent = User::factory()->create([
            'account_role' => AccountRole::Individual->value,
        ]);
        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
        ]);

        $links = app(ParentStudentLinkService::class);
        $access = app(ParentAccessAuthorizer::class);

        $link = $links->request($parent, $student, $parent, 'mother');

        $this->assertTrue($parent->fresh()->isParent());
        $this->assertSame(ParentLinkStatus::Pending, $link->status);
        $this->assertFalse($access->allows($parent, $student));

        $links->approve($link, $student, [
            ParentGuardianPermission::ViewProgress->value,
        ]);

        $this->assertTrue($access->allows($parent, $student, ParentGuardianPermission::ViewProgress->value));
        $this->assertFalse($access->allows($parent, $student, ParentGuardianPermission::ViewAssignments->value));

        $this->actingAs($parent)
            ->getJson(route('api.parent.shell'))
            ->assertOk()
            ->assertJsonPath('children_count', 1);

        $this->assertSame(2, ParentStudentLinkEvent::query()->where('parent_student_link_id', $link->id)->count());

        $links->revoke($link->fresh(), $student, 'student_withdrew');

        $this->assertSame(ParentLinkStatus::Revoked, $link->fresh()->status);
        $this->assertFalse($access->allows($parent, $student));
    }

    public function test_platform_switch_moves_teacher_to_parent_workspace(): void
    {
        $this->enableParentFeatures();
        $this->enableTeacherFeatures();

        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
        ]);
        app(UserRoleService::class)->grant($teacher, AccountRole::Parent);

        $this->actingAs($teacher)
            ->post(route('platform.switch'), ['platform' => 'parent'])
            ->assertRedirect(route('parent.dashboard'));

        $this->actingAs($teacher)
            ->post(route('platform.switch'), ['platform' => 'learner'])
            ->assertRedirect(route('memorisation'));
    }

    public function test_teacher_student_access_is_unchanged_when_parent_links_exist(): void
    {
        $this->enableParentFeatures();
        $this->enableTeacherFeatures();

        $organisation = Organisation::factory()->create();
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
        ]);
        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $organisation->id,
        ]);
        $parent = User::factory()->create([
            'account_role' => AccountRole::Parent->value,
        ]);
        app(UserRoleService::class)->grant($parent, AccountRole::Parent);

        ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => $parent->id,
            'student_user_id' => $student->id,
            'decided_by_user_id' => $student->id,
        ]);

        $teacherAccess = app(StudentAccessAuthorizer::class);

        $this->assertFalse($teacherAccess->allows($teacher, $student));
        $this->assertTrue(app(ParentAccessAuthorizer::class)->allows($parent, $student));
    }
}

<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\OrganisationType;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\Organisation;
use App\Models\TeacherAssignment;
use App\Models\User;
use App\Services\Organisations\GroupMembershipService;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Services\Teacher\TeacherAssignmentService;
use App\Support\TeacherFeatures;
use Illuminate\Contracts\Http\Kernel as HttpKernel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tests\TestCase;

class TeacherFeaturesTest extends TestCase
{
    use RefreshDatabase;

    public function test_teacher_features_are_disabled_unless_configured(): void
    {
        $this->assertFalse(config('mutqin.teacher_features_enabled'));
        $this->assertFalse(TeacherFeatures::enabled());

        $this->enableTeacherFeatures();

        $this->assertTrue(TeacherFeatures::enabled());
    }

    public function test_disabled_registration_keeps_the_existing_form_and_rejects_teacher_accounts(): void
    {
        $this->get(route('register'))
            ->assertOk()
            ->assertSee(__('ui.auth_register_heading'))
            ->assertSee(__('ui.continue_google'))
            ->assertSee(__('ui.create_account'))
            ->assertSee(route('auth.google.prepare'), false)
            ->assertDontSee('class="auth-role"', false)
            ->assertDontSee('id="account-role-individual"', false)
            ->assertDontSee('id="account-role-student"', false)
            ->assertDontSee('id="account-role-teacher"', false)
            ->assertDontSee('id="organisation_name"', false)
            ->assertDontSee('id="organisation_type"', false);

        $this->post(route('register'), [
            'name' => 'Existing Learner',
            'email' => 'learner@example.com',
            'password' => 'secret12',
            'password_confirmation' => 'secret12',
        ])->assertRedirect(route('memorisation'));

        $learner = User::where('email', 'learner@example.com')->firstOrFail();
        $this->assertNull($learner->account_role);
        $this->assertNull($learner->organisation_id);

        auth()->logout();

        $this->from(route('register'))
            ->post(route('register'), [
                'name' => 'Hidden Teacher',
                'email' => 'hidden-teacher@example.com',
                'password' => 'secret12',
                'password_confirmation' => 'secret12',
                'account_role' => 'teacher',
                'organisation_type' => 'school',
                'organisation_name' => 'Hidden School',
            ])->assertRedirect(route('register'))
            ->assertSessionHasErrors('account_role');

        $this->from(route('register'))
            ->post(route('register'), [
                'name' => 'Hidden Student',
                'email' => 'hidden-student@example.com',
                'password' => 'secret12',
                'password_confirmation' => 'secret12',
                'account_role' => 'student',
                'organisation_type' => 'halaqa',
                'organisation_name' => 'Hidden Halaqa',
            ])->assertRedirect(route('register'))
            ->assertSessionHasErrors('account_role');

        $this->assertNull(User::where('email', 'hidden-teacher@example.com')->first());
        $this->assertNull(User::where('email', 'hidden-student@example.com')->first());
        $this->assertSame(0, Organisation::count());
    }

    public function test_disabled_google_prepare_cannot_store_a_teacher_intent(): void
    {
        config([
            'services.google.client_id' => 'test-client.apps.googleusercontent.com',
            'services.google.client_secret' => 'test-secret',
            'services.google.redirect' => 'http://localhost/auth/google/callback',
        ]);

        $this->from(route('register'))
            ->post(route('auth.google.prepare'), [
                'account_role' => 'teacher',
                'organisation_type' => 'school',
                'organisation_name' => 'Hidden School',
            ])->assertRedirect(route('register'))
            ->assertSessionHasErrors('account_role');

        $this->assertSame(0, User::count());
        $this->assertSame(0, Organisation::count());
        $this->assertNull(session('mutqin_registration_intent'));
    }

    public function test_disabled_teacher_routes_are_not_found_and_existing_records_stay(): void
    {
        $organisation = Organisation::factory()->create();
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
        ]);
        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $organisation->id,
        ]);
        $group = LearningGroup::factory()->create([
            'organisation_id' => $organisation->id,
        ]);

        $this->get(route('teacher.dashboard'))->assertNotFound();
        $this->getJson(route('api.teacher.overview'))->assertNotFound();
        $this->getJson(route('api.me.support'))->assertNotFound();

        $this->actingAs($teacher)->get(route('teacher.dashboard'))->assertNotFound();
        $this->actingAs($teacher)->getJson(route('api.teacher.overview'))->assertNotFound();
        $this->actingAs($teacher)->getJson(route('api.teacher.students'))->assertNotFound();
        $this->actingAs($teacher)->postJson(route('api.teacher.groups.store'), ['name' => 'Secret'])->assertNotFound();
        $this->actingAs($teacher)->postJson(route('api.teacher.assignments.store'), [])->assertNotFound();
        $this->actingAs($student)->getJson(route('api.me.support'))->assertNotFound();
        $this->actingAs($student)->postJson(route('api.me.groups.request', $group))->assertNotFound();

        $dashboard = $this->actingAs($teacher)->get(route('dashboard'));
        $dashboard->assertOk();
        $dashboard->assertSee('"teacher_features_enabled":false', false);
        $dashboard->assertSee('"teacher_dashboard_url":null', false);
        $dashboard->assertSee('"account_role":null', false);
        $dashboard->assertDontSee($student->email, false);

        $this->actingAs($teacher)->get(route('memorisation'))->assertOk();
        $this->actingAs($teacher)->getJson(route('api.dashboard.show'))->assertOk();

        $this->assertFalse(app(StudentAccessAuthorizer::class)->allows($teacher, $student));
        $this->assertSame(AccountRole::Teacher, $teacher->fresh()->account_role);
        $this->assertSame(AccountRole::Student, $student->fresh()->account_role);
        $this->assertSame(1, Organisation::count());
        $this->assertSame(1, LearningGroup::count());

        try {
            app(GroupMembershipService::class)->requestJoin($student, $group);
            $this->fail('A disabled group request was accepted.');
        } catch (NotFoundHttpException) {
            $this->assertSame(0, GroupMembership::count());
        }

        try {
            app(TeacherAssignmentService::class)->create($teacher, []);
            $this->fail('A disabled assignment was created.');
        } catch (NotFoundHttpException) {
            $this->assertSame(0, TeacherAssignment::count());
        }
    }

    public function test_both_production_hosts_hide_the_teacher_dashboard_when_disabled(): void
    {
        config([
            'app.url' => 'https://mutqin.ai',
            'mutqin.domains.enable_in_tests' => true,
            'mutqin.domains.force_disabled' => false,
            'mutqin.domains.marketing_host' => 'mutqin.ai',
            'mutqin.domains.app_host' => 'app.mutqin.ai',
        ]);

        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
        ]);

        $kernel = $this->app->make(HttpKernel::class);
        $marketing = Request::create('/teacher', 'GET', [], [], [], [
            'HTTP_HOST' => 'mutqin.ai',
            'HTTPS' => 'on',
            'SERVER_NAME' => 'mutqin.ai',
        ]);
        $marketing->setUserResolver(fn () => $teacher);
        $marketingResponse = $kernel->handle($marketing);
        $kernel->terminate($marketing, $marketingResponse);

        $this->assertTrue($marketingResponse->isRedirection());
        $this->assertSame('https://app.mutqin.ai/teacher', (string) $marketingResponse->headers->get('Location'));
        $this->assertStringNotContainsString('teacher-dashboard', (string) $marketingResponse->getContent());

        $this->actingAs($teacher)
            ->call('GET', 'https://app.mutqin.ai/teacher', [], [], [], [
                'HTTP_HOST' => 'app.mutqin.ai',
                'HTTPS' => 'on',
                'SERVER_NAME' => 'app.mutqin.ai',
            ])
            ->assertNotFound()
            ->assertDontSee('teacher-dashboard', false);
    }

    public function test_enabled_flag_restores_registration_roles_and_the_teacher_dashboard(): void
    {
        $this->enableTeacherFeatures();

        $this->get(route('teacher.dashboard'))->assertRedirect(route('login'));
        $this->getJson(route('api.teacher.overview'))->assertUnauthorized();

        $this->get(route('register'))
            ->assertOk()
            ->assertSee(__('ui.auth_role_individual'))
            ->assertSee(__('ui.auth_role_student'))
            ->assertSee(__('ui.auth_role_teacher'))
            ->assertSee('name="organisation_name"', false)
            ->assertSee(__('ui.continue_google'));

        $this->post(route('register'), [
            'name' => 'Classroom Teacher',
            'email' => 'classroom@example.com',
            'password' => 'secret12',
            'password_confirmation' => 'secret12',
            'account_role' => 'teacher',
            'organisation_type' => OrganisationType::School->value,
            'organisation_name' => 'Al Noor School',
        ])->assertRedirect(route('teacher.dashboard'));

        $teacher = User::where('email', 'classroom@example.com')->firstOrFail();
        $this->assertSame(AccountRole::Teacher, $teacher->account_role);
        $this->assertNotNull($teacher->organisation_id);

        $this->actingAs($teacher)
            ->get(route('teacher.dashboard'))
            ->assertOk()
            ->assertSee('teacher-dashboard', false)
            ->assertSee('"teacher_features_enabled":true', false);

        $this->actingAs($teacher)->getJson(route('api.teacher.overview'))->assertOk();
        $this->actingAs($teacher)->get(route('dashboard'))->assertOk();
        $this->actingAs($teacher)->get(route('memorisation'))->assertOk();
    }

    public function test_teacher_sign_in_opens_the_teacher_dashboard(): void
    {
        $this->enableTeacherFeatures();

        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
        ]);
        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
        ]);

        $this->post(route('login'), [
            'email' => $teacher->email,
            'password' => 'password',
        ])->assertRedirect(route('teacher.dashboard'));

        auth()->logout();

        $this->post(route('login'), [
            'email' => $student->email,
            'password' => 'password',
        ])->assertRedirect(route('memorisation'));
    }
}

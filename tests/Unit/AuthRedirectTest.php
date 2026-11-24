<?php

namespace Tests\Unit;

use App\Enums\AccountRole;
use App\Enums\PlatformContext;
use App\Models\User;
use App\Services\Auth\UserRoleService;
use App\Support\AuthRedirect;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthRedirectTest extends TestCase
{
    use RefreshDatabase;

    public function test_verified_teacher_goes_to_the_teacher_dashboard_when_enabled(): void
    {
        $this->enableTeacherFeatures();

        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
        ]);

        $this->assertSame(route('teacher.dashboard', absolute: false), AuthRedirect::path($teacher));
        $this->assertSame(route('teacher.dashboard'), AuthRedirect::to($teacher));
    }

    public function test_verified_student_and_learner_stay_on_memorisation(): void
    {
        $this->enableTeacherFeatures();

        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
        ]);
        $learner = User::factory()->create([
            'account_role' => AccountRole::Individual->value,
        ]);

        $this->assertSame(route('memorisation', absolute: false), AuthRedirect::path($student));
        $this->assertSame(route('memorisation', absolute: false), AuthRedirect::path($learner));
        $this->assertSame(route('memorisation', absolute: false), AuthRedirect::path(User::factory()->create()));
    }

    public function test_teacher_stays_on_memorisation_when_teacher_features_are_disabled(): void
    {
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
        ]);

        $this->assertSame(route('memorisation', absolute: false), AuthRedirect::path($teacher));
    }

    public function test_preferred_platform_wins_for_multi_role_accounts(): void
    {
        $this->enableTeacherFeatures();
        $this->enableParentFeatures();

        $user = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'preferred_platform' => PlatformContext::Parent->value,
        ]);
        app(UserRoleService::class)->grant($user, AccountRole::Parent);

        $this->assertSame(route('parent.dashboard', absolute: false), AuthRedirect::path($user->fresh()));
    }

    public function test_just_registered_student_without_organisation_goes_to_memorisation(): void
    {
        $this->enableTeacherFeatures();

        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => null,
        ]);

        $this->assertSame(
            route('memorisation', absolute: false),
            AuthRedirect::path($student, justRegistered: true),
        );
    }

    public function test_just_registered_teacher_without_organisation_goes_to_teacher_dashboard(): void
    {
        $this->enableTeacherFeatures();

        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => null,
        ]);

        $this->assertSame(
            route('teacher.dashboard', absolute: false),
            AuthRedirect::path($teacher, justRegistered: true),
        );
    }
}

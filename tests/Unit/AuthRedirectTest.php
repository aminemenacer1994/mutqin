<?php

namespace Tests\Unit;

use App\Enums\AccountRole;
use App\Models\User;
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
}

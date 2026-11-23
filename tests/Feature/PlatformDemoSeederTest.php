<?php

namespace Tests\Feature;

use App\Enums\AssignmentStatus;
use App\Models\AiReciteAttempt;
use App\Models\LearningPlan;
use App\Models\MemorisationProgress;
use App\Models\ParentStudentLink;
use App\Models\RevisionRecommendation;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\User;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Services\Parent\ParentAccessAuthorizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Tests\TestCase;

class PlatformDemoSeederTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'platform-demo-test-pass';

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
        $this->enableParentFeatures();
        config()->set('mutqin.platform_demo_password', self::PASSWORD);
        config()->set('mutqin.teacher_anchor_student_emails', []);
    }

    public function test_platform_demo_refuses_production_and_a_missing_password(): void
    {
        $this->app['env'] = 'production';

        try {
            $this->artisan('mutqin:seed-platform-demo');
            $this->fail('Production seeding was allowed.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('production', $exception->getMessage());
        }

        $this->app['env'] = 'testing';
        config()->set('mutqin.platform_demo_password', '');

        try {
            $this->artisan('mutqin:seed-platform-demo');
            $this->fail('Seeding without a password was allowed.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('MUTQIN_PLATFORM_DEMO_PASSWORD', $exception->getMessage());
        }
    }

    public function test_platform_demo_builds_relationships_learning_records_and_dashboard_access(): void
    {
        $this->artisan('mutqin:seed-platform-demo')
            ->expectsOutputToContain('Password is MUTQIN_PLATFORM_DEMO_PASSWORD')
            ->doesntExpectOutputToContain(self::PASSWORD)
            ->assertSuccessful();

        $this->artisan('mutqin:seed-platform-demo')->assertSuccessful();

        $this->assertSame(5, User::query()->where('email', 'like', 'platform.demo.teacher.%')->count());
        $this->assertSame(15, User::query()->where('email', 'like', 'platform.demo.student.%')->count());
        $this->assertSame(8, User::query()->where('email', 'like', 'platform.demo.parent.%')->count());

        $teacherAccess = app(StudentAccessAuthorizer::class);
        $parentAccess = app(ParentAccessAuthorizer::class);
        $students = User::query()->where('email', 'like', 'platform.demo.student.%')->orderBy('email')->get();

        foreach ($students as $student) {
            $teacherIds = User::query()->where('email', 'like', 'platform.demo.teacher.%')->get()
                ->filter(fn (User $teacher) => $teacherAccess->allows($teacher, $student));
            $this->assertGreaterThanOrEqual(1, $teacherIds->count(), $student->email);
            $this->assertGreaterThanOrEqual(
                1,
                ParentStudentLink::query()->where('student_user_id', $student->id)->where('status', 'approved')->count(),
                $student->email,
            );
        }

        $twoGuardians = ParentStudentLink::query()
            ->where('status', 'approved')
            ->select('student_user_id')
            ->groupBy('student_user_id')
            ->havingRaw('count(*) >= 2')
            ->get();
        $this->assertGreaterThanOrEqual(1, $twoGuardians->count());

        $multiChildParents = ParentStudentLink::query()
            ->where('status', 'approved')
            ->select('parent_user_id')
            ->groupBy('parent_user_id')
            ->havingRaw('count(*) >= 2')
            ->get();
        $this->assertGreaterThanOrEqual(3, $multiChildParents->count());

        $multiGroupStudents = User::query()
            ->where('email', 'like', 'platform.demo.student.%')
            ->withCount('groupMemberships')
            ->get()
            ->filter(fn (User $student) => $student->group_memberships_count >= 2);
        $this->assertGreaterThanOrEqual(1, $multiGroupStudents->count());

        $activities = TeacherAssignment::query()->pluck('activity')->unique()->sort()->values()->all();
        $this->assertEqualsCanonicalizing(['hifz', 'nazra', 'revision', 'tajweed'], $activities);

        $statuses = TeacherAssignmentRecipient::query()->pluck('status')->map(fn ($status) => $status instanceof AssignmentStatus ? $status->value : (string) $status)->unique();
        foreach (['pending', 'in_progress', 'awaiting_confirmation', 'completed'] as $status) {
            $this->assertTrue($statuses->contains($status), $status);
        }

        $this->assertTrue(
            TeacherAssignmentRecipient::query()
                ->where('status', 'pending')
                ->whereHas('assignment', fn ($query) => $query->where('due_at', '<', now()))
                ->exists()
        );
        $this->assertGreaterThan(0, LearningPlan::query()->count());
        $this->assertGreaterThan(0, RevisionRecommendation::query()->count());
        $this->assertGreaterThan(0, AiReciteAttempt::query()->whereNull('audio_path')->count());
        $this->assertSame(0, AiReciteAttempt::query()->whereNotNull('audio_path')->count());

        $earliest = MemorisationProgress::query()->min('created_at');
        $latest = MemorisationProgress::query()->max('created_at');
        $this->assertNotNull($earliest);
        $this->assertTrue(strtotime((string) $latest) - strtotime((string) $earliest) >= 14 * 86400);

        $teacher = User::query()->where('email', 'platform.demo.teacher.01@mutqin.test')->firstOrFail();
        $parent = User::query()->where('email', 'platform.demo.parent.01@mutqin.test')->firstOrFail();
        $child = User::query()->where('email', 'platform.demo.student.01@mutqin.test')->firstOrFail();

        $this->assertTrue(Hash::check(self::PASSWORD, $teacher->password));
        $this->assertTrue($teacherAccess->allows($teacher, $child));
        $this->assertTrue($parentAccess->allows($parent, $child, 'view_progress'));
        $this->assertGreaterThanOrEqual(2, $parentAccess->authorizedStudentIds($parent)->count());

        $this->actingAs($teacher)->get(route('teacher.dashboard'))->assertOk();
        $this->actingAs($teacher)->getJson(route('api.teacher.students'))->assertOk();
        $this->actingAs($child)->get(route('dashboard'))->assertOk();
        $this->actingAs($parent)->get(route('parent.dashboard'))->assertOk();
        $this->actingAs($parent)->getJson(route('api.parent.shell'))
            ->assertOk()
            ->assertJsonPath('children_count', 3);
    }

    public function test_platform_demo_does_not_overwrite_an_unmarked_account(): void
    {
        User::factory()->create([
            'email' => 'platform.demo.teacher.01@mutqin.test',
            'stripe_customer_id' => null,
        ]);

        try {
            $this->artisan('mutqin:seed-platform-demo');
            $this->fail('An unmarked account was overwritten.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('Refusing to overwrite', $exception->getMessage());
        }
    }
}

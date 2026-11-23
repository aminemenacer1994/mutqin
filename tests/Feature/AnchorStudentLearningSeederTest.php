<?php

namespace Tests\Feature;

use App\Models\MemorisationProgress;
use App\Models\ParentLearningReport;
use App\Models\ParentStudentLink;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherNote;
use App\Models\User;
use App\Models\UserSession;
use App\Support\Demo\ParentDemoCatalog;
use Database\Seeders\OrganisationNetworkSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnchorStudentLearningSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
        $this->enableParentFeatures();
        config()->set('mutqin.teacher_anchor_student_emails', [ParentDemoCatalog::CHILD_EMAIL]);
    }

    public function test_anchor_student_receives_classroom_data_after_database_seed_flow(): void
    {
        User::factory()->create([
            'email' => ParentDemoCatalog::CHILD_EMAIL,
            'name' => 'Amine Menacer',
            'account_role' => 'student',
        ]);

        $this->seed(OrganisationNetworkSeeder::class);

        $child = User::query()->where('email', ParentDemoCatalog::CHILD_EMAIL)->firstOrFail();

        $this->assertGreaterThan(0, UserSession::query()->where('user_id', $child->id)->count());
        $this->assertGreaterThan(0, TeacherAssignmentRecipient::query()->where('student_id', $child->id)->count());
        $this->assertGreaterThan(0, MemorisationProgress::query()->where('user_id', $child->id)->count());
        $this->assertGreaterThan(0, TeacherNote::query()->where('student_id', $child->id)->whereNull('parent_user_id')->count());
    }

    public function test_parent_demo_seeds_learning_reports_and_messages(): void
    {
        User::factory()->create([
            'email' => ParentDemoCatalog::CHILD_EMAIL,
            'name' => 'Amine Menacer',
            'account_role' => 'student',
        ]);

        $this->seed(OrganisationNetworkSeeder::class);
        $this->artisan('mutqin:seed-parent-demo')->assertSuccessful();

        $child = User::query()->where('email', ParentDemoCatalog::CHILD_EMAIL)->firstOrFail();
        $parent = User::query()->where('email', ParentDemoCatalog::PARENT_EMAIL)->firstOrFail();

        $this->assertSame(1, ParentStudentLink::query()->count());
        $this->assertGreaterThan(0, TeacherNote::query()
            ->where('student_id', $child->id)
            ->where('parent_user_id', $parent->id)
            ->count());
        $this->assertGreaterThan(0, ParentLearningReport::query()->where('student_user_id', $child->id)->count());
    }
}
<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\AssignmentStatus;
use App\Enums\ParentGuardianPermission;
use App\Enums\TeacherNoteKind;
use App\Models\LearningPlan;
use App\Models\MemorisationProgress;
use App\Models\Organisation;
use App\Models\ParentStudentLink;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherNote;
use App\Models\User;
use App\Support\QuranMetadata;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ParentFamilyDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableParentFeatures();
    }

    public function test_dashboard_counts_come_from_the_linked_child_and_hide_other_families(): void
    {
        $organisation = Organisation::factory()->create();
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
            'name' => 'Hana Yusuf',
        ]);
        $parent = User::factory()->create([
            'account_role' => AccountRole::Parent->value,
            'name' => 'Sara Qadir',
        ]);
        $otherParent = User::factory()->create([
            'account_role' => AccountRole::Parent->value,
            'name' => 'Other Guardian',
        ]);
        $child = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'name' => 'Adam Nasser',
        ]);
        $hidden = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'name' => 'Hidden Child',
        ]);

        ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => $parent->id,
            'student_user_id' => $child->id,
        ]);
        ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => $otherParent->id,
            'student_user_id' => $hidden->id,
        ]);

        $open = TeacherAssignment::factory()->create([
            'teacher_id' => $teacher->id,
            'organisation_id' => $organisation->id,
            'activity' => 'nazra',
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 4,
            'due_at' => now()->subDay(),
            'feedback' => 'Keep this short range steady.',
        ]);
        TeacherAssignmentRecipient::factory()->create([
            'teacher_assignment_id' => $open->id,
            'student_id' => $child->id,
            'status' => AssignmentStatus::Pending->value,
        ]);
        $done = TeacherAssignment::factory()->create([
            'teacher_id' => $teacher->id,
            'organisation_id' => $organisation->id,
            'activity' => 'hifz',
            'due_at' => now()->subDays(2),
        ]);
        TeacherAssignmentRecipient::factory()->create([
            'teacher_assignment_id' => $done->id,
            'student_id' => $child->id,
            'status' => AssignmentStatus::Completed->value,
            'completed_at' => now()->subDay(),
        ]);
        $secret = TeacherAssignment::factory()->create([
            'teacher_id' => $teacher->id,
            'organisation_id' => $organisation->id,
            'activity' => 'revision',
            'due_at' => now()->addDay(),
        ]);
        TeacherAssignmentRecipient::factory()->create([
            'teacher_assignment_id' => $secret->id,
            'student_id' => $hidden->id,
            'status' => AssignmentStatus::Pending->value,
        ]);

        LearningPlan::query()->forceCreate([
            'teacher_id' => $teacher->id,
            'student_id' => $child->id,
            'organisation_id' => $organisation->id,
            'title' => 'Four-week reading target',
            'cadence' => 'weekly',
            'status' => 'active',
            'starts_on' => now()->toDateString(),
        ]);
        (new MemorisationProgress)->forceFill([
            'user_id' => $child->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'status' => 'learning',
            'created_at' => now()->subDays(2),
            'updated_at' => now()->subDays(2),
        ])->save();
        TeacherNote::factory()->create([
            'teacher_id' => $teacher->id,
            'student_id' => $child->id,
            'organisation_id' => $organisation->id,
            'kind' => TeacherNoteKind::Feedback->value,
            'body' => 'A calm repetition will help this range.',
        ]);
        TeacherNote::factory()->create([
            'teacher_id' => $teacher->id,
            'student_id' => $hidden->id,
            'organisation_id' => $organisation->id,
            'kind' => TeacherNoteKind::Feedback->value,
            'body' => 'Hidden family feedback must stay hidden.',
        ]);

        $response = $this->actingAs($parent)->getJson(route('api.parent.shell'))->assertOk();

        $response
            ->assertJsonPath('phase', 'learning')
            ->assertJsonPath('children_count', 1)
            ->assertJsonPath('children.0.id', $child->id)
            ->assertJsonPath('children.0.learning.plan_title', 'Four-week reading target')
            ->assertJsonPath('children.0.learning.surah_name', QuranMetadata::name(1))
            ->assertJsonPath('children.0.assignments.active', 1)
            ->assertJsonPath('children.0.assignments.completed', 1)
            ->assertJsonPath('children.0.assignments.needs_attention', 1)
            ->assertJsonPath('children.0.progress.recent_ayahs', 1)
            ->assertJsonPath('summary.active_assignments', 1)
            ->assertJsonPath('summary.completed_assignments', 1)
            ->assertJsonPath('summary.needs_attention', 1)
            ->assertJsonPath('homework.0.status', 'overdue')
            ->assertJsonPath('feedback.0.excerpt', 'A calm repetition will help this range.');

        $this->assertStringNotContainsString('Hidden Child', $response->getContent());
        $this->assertStringNotContainsString('Hidden family feedback', $response->getContent());

        $this->actingAs($otherParent)
            ->getJson(route('api.parent.children.show', $child))
            ->assertNotFound();
    }

    public function test_missing_permissions_omit_homework_progress_and_feedback(): void
    {
        $parent = User::factory()->create(['account_role' => AccountRole::Parent->value]);
        $child = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'name' => 'Private Student',
        ]);
        ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => $parent->id,
            'student_user_id' => $child->id,
            'permissions' => [ParentGuardianPermission::ViewAttendance->value],
        ]);
        $assignment = TeacherAssignment::factory()->create(['activity' => 'nazra', 'due_at' => now()->addDay()]);
        TeacherAssignmentRecipient::factory()->create([
            'teacher_assignment_id' => $assignment->id,
            'student_id' => $child->id,
            'status' => AssignmentStatus::Pending->value,
        ]);
        TeacherNote::factory()->create([
            'teacher_id' => $assignment->teacher_id,
            'student_id' => $child->id,
            'organisation_id' => $assignment->organisation_id,
            'kind' => TeacherNoteKind::Feedback->value,
            'body' => 'This feedback is not shared.',
        ]);

        $this->actingAs($parent)
            ->getJson(route('api.parent.shell'))
            ->assertOk()
            ->assertJsonPath('children.0.name', 'Private Student')
            ->assertJsonPath('children.0.assignments', null)
            ->assertJsonPath('children.0.progress', null)
            ->assertJsonPath('children.0.learning', null)
            ->assertJsonPath('summary.assignments_shared', false)
            ->assertJsonPath('summary.active_assignments', 0)
            ->assertJsonCount(0, 'homework')
            ->assertJsonCount(0, 'feedback')
            ->assertJsonMissing(['excerpt' => 'This feedback is not shared.']);
    }
}

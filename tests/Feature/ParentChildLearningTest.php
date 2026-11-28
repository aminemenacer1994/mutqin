<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\AssignmentStatus;
use App\Enums\ParentGuardianPermission;
use App\Enums\TeacherNoteKind;
use App\Models\Organisation;
use App\Models\ParentStudentLink;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherNote;
use App\Models\TeacherPrivateNote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ParentChildLearningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableParentFeatures();
    }

    public function test_guardian_sees_assignments_and_progress_for_linked_child_only(): void
    {
        $organisation = Organisation::factory()->create();
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
        ]);
        $parent = User::factory()->create(['account_role' => AccountRole::Parent->value]);
        $child = User::factory()->create(['account_role' => AccountRole::Student->value, 'name' => 'Adam Nasser']);
        $other = User::factory()->create(['account_role' => AccountRole::Student->value, 'name' => 'Hidden Child']);

        ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => $parent->id,
            'student_user_id' => $child->id,
        ]);
        ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => User::factory()->create(['account_role' => AccountRole::Parent->value])->id,
            'student_user_id' => $other->id,
        ]);

        $open = TeacherAssignment::factory()->create([
            'teacher_id' => $teacher->id,
            'organisation_id' => $organisation->id,
            'activity' => 'nazra',
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 2,
            'due_at' => now()->addDay(),
            'feedback' => 'Steady pace.',
        ]);
        TeacherAssignmentRecipient::factory()->create([
            'teacher_assignment_id' => $open->id,
            'student_id' => $child->id,
            'status' => AssignmentStatus::InProgress->value,
            'started_at' => now()->subDay(),
        ]);

        $hidden = TeacherAssignment::factory()->create([
            'teacher_id' => $teacher->id,
            'organisation_id' => $organisation->id,
            'activity' => 'hifz',
        ]);
        TeacherAssignmentRecipient::factory()->create([
            'teacher_assignment_id' => $hidden->id,
            'student_id' => $other->id,
            'status' => AssignmentStatus::Pending->value,
        ]);

        $assignments = $this->actingAs($parent)
            ->getJson(route('api.parent.children.assignments', $child))
            ->assertOk()
            ->assertJsonPath('read_only', true)
            ->assertJsonCount(1, 'assignments')
            ->assertJsonPath('assignments.0.child_name', 'Adam Nasser')
            ->assertJsonPath('assignments.0.display_status', 'in_progress');

        $this->assertStringNotContainsString('Hidden Child', $assignments->getContent());

        $this->actingAs($parent)
            ->getJson(route('api.parent.children.assignments', $other))
            ->assertNotFound();

        $this->actingAs($parent)
            ->getJson(route('api.parent.children.progress', $child).'?window=week')
            ->assertOk()
            ->assertJsonPath('read_only', true)
            ->assertJsonPath('window', 'week');

        $this->actingAs($parent)
            ->getJson(route('api.parent.children.profile', $child))
            ->assertOk()
            ->assertJsonPath('read_only', true)
            ->assertJsonPath('child.name', 'Adam Nasser');
    }

    public function test_revoked_permissions_and_private_notes_stay_hidden(): void
    {
        $organisation = Organisation::factory()->create();
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
        ]);
        $parent = User::factory()->create(['account_role' => AccountRole::Parent->value]);
        $child = User::factory()->create(['account_role' => AccountRole::Student->value]);

        ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => $parent->id,
            'student_user_id' => $child->id,
            'permissions' => [ParentGuardianPermission::ViewAttendance->value],
        ]);

        $assignment = TeacherAssignment::factory()->create([
            'teacher_id' => $teacher->id,
            'organisation_id' => $organisation->id,
        ]);
        TeacherAssignmentRecipient::factory()->create([
            'teacher_assignment_id' => $assignment->id,
            'student_id' => $child->id,
        ]);
        TeacherNote::factory()->create([
            'teacher_id' => $teacher->id,
            'student_id' => $child->id,
            'organisation_id' => $organisation->id,
            'kind' => TeacherNoteKind::Feedback->value,
            'body' => 'Shared feedback',
        ]);
        TeacherPrivateNote::factory()->create([
            'teacher_id' => $teacher->id,
            'student_id' => $child->id,
            'organisation_id' => $organisation->id,
            'body' => 'Private coaching note',
        ]);

        $this->actingAs($parent)
            ->getJson(route('api.parent.children.assignments', $child))
            ->assertNotFound();

        $this->actingAs($parent)
            ->getJson(route('api.parent.children.progress', $child))
            ->assertNotFound();

        $profile = $this->actingAs($parent)
            ->getJson(route('api.parent.children.profile', $child))
            ->assertOk();

        $this->assertStringNotContainsString('Shared feedback', $profile->getContent());
        $this->assertStringNotContainsString('Private coaching note', $profile->getContent());
    }

    public function test_assignment_filters_by_activity_and_status(): void
    {
        $organisation = Organisation::factory()->create();
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
        ]);
        $parent = User::factory()->create(['account_role' => AccountRole::Parent->value]);
        $child = User::factory()->create(['account_role' => AccountRole::Student->value]);
        ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => $parent->id,
            'student_user_id' => $child->id,
        ]);

        $nazra = TeacherAssignment::factory()->create([
            'teacher_id' => $teacher->id,
            'organisation_id' => $organisation->id,
            'activity' => 'nazra',
            'due_at' => now()->subDay(),
        ]);
        TeacherAssignmentRecipient::factory()->create([
            'teacher_assignment_id' => $nazra->id,
            'student_id' => $child->id,
            'status' => AssignmentStatus::Pending->value,
        ]);
        $hifz = TeacherAssignment::factory()->create([
            'teacher_id' => $teacher->id,
            'organisation_id' => $organisation->id,
            'activity' => 'hifz',
            'due_at' => now()->addWeek(),
        ]);
        TeacherAssignmentRecipient::factory()->create([
            'teacher_assignment_id' => $hifz->id,
            'student_id' => $child->id,
            'status' => AssignmentStatus::Completed->value,
            'completed_at' => now(),
        ]);

        $this->actingAs($parent)
            ->getJson(route('api.parent.children.assignments', [
                'student' => $child,
                'activity' => 'nazra',
                'status' => 'overdue',
            ]))
            ->assertOk()
            ->assertJsonCount(1, 'assignments')
            ->assertJsonPath('assignments.0.display_status', 'overdue');
    }

    public function test_parent_supervision_ack_is_separate_from_student_workflow(): void
    {
        $organisation = Organisation::factory()->create();
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
        ]);
        $parent = User::factory()->create(['account_role' => AccountRole::Parent->value]);
        $child = User::factory()->create(['account_role' => AccountRole::Student->value]);

        ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => $parent->id,
            'student_user_id' => $child->id,
        ]);

        $assignment = TeacherAssignment::factory()->create([
            'teacher_id' => $teacher->id,
            'organisation_id' => $organisation->id,
            'due_at' => now()->addDay(),
        ]);
        $recipient = TeacherAssignmentRecipient::factory()->create([
            'teacher_assignment_id' => $assignment->id,
            'student_id' => $child->id,
            'status' => AssignmentStatus::InProgress->value,
            'started_at' => now()->subHour(),
        ]);

        $this->actingAs($parent)
            ->getJson(route('api.parent.children.assignments', $child))
            ->assertOk()
            ->assertJsonPath('assignments.0.supervision.acknowledged', false);

        $this->actingAs($parent)
            ->postJson(route('api.parent.children.assignments.supervision', [$child, $recipient]))
            ->assertOk()
            ->assertJsonPath('supervision.acknowledged', true);

        $recipient->refresh();
        $this->assertSame(AssignmentStatus::InProgress, $recipient->status);

        $this->actingAs($parent)
            ->getJson(route('api.parent.children.assignments', $child))
            ->assertOk()
            ->assertJsonPath('assignments.0.supervision.acknowledged', true);
    }
}

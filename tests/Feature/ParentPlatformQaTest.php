<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\TeacherNoteKind;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\Organisation;
use App\Models\ParentStudentLink;
use App\Models\TeacherNote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ParentPlatformQaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableParentFeatures();
        $this->enableTeacherFeatures();
    }

    public function test_unlinked_deleted_and_foreign_accounts_cannot_read_a_child(): void
    {
        [$teacher, $student, $parent] = $this->classroom();
        $outsider = User::factory()->create(['account_role' => AccountRole::Parent->value]);

        $this->actingAs($outsider)
            ->getJson(route('api.parent.shell'))
            ->assertOk()
            ->assertJsonPath('children_count', 0)
            ->assertJsonPath('summary.message_unread', 0);

        $this->actingAs($outsider)
            ->getJson(route('api.parent.children.assignments', $student))
            ->assertNotFound();

        $this->actingAs($outsider)
            ->getJson(route('api.parent.messages.show', [$teacher, $student]))
            ->assertNotFound();

        $student->delete();

        $this->actingAs($parent)
            ->getJson(route('api.parent.children.profile', $student))
            ->assertNotFound();
    }

    public function test_arabic_names_multiple_teachers_and_message_pages(): void
    {
        [$teacher, $student, $parent] = $this->classroom('فاطمة الزهراء', 'عبد الرحمن بن محمد الطويل');
        $second = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $teacher->organisation_id,
            'name' => 'مريم نور',
        ]);
        $groupId = GroupMembership::query()->where('user_id', $teacher->id)->value('learning_group_id');
        GroupMembership::factory()->create([
            'learning_group_id' => $groupId,
            'user_id' => $second->id,
            'membership_role' => MembershipRole::Teacher->value,
            'status' => MembershipStatus::Approved->value,
        ]);

        $inbox = $this->actingAs($parent)->getJson(route('api.parent.messages.index'))->assertOk()->json('conversations');
        $names = collect($inbox)->pluck('teacher_name')->all();
        $this->assertEqualsCanonicalizing(['Classroom Teacher', 'مريم نور'], $names);
        $this->assertSame('عبد الرحمن بن محمد الطويل', $inbox[0]['child_name']);

        for ($i = 0; $i < 41; $i++) {
            $note = new TeacherNote;
            $note->forceFill([
                'teacher_id' => $teacher->id,
                'student_id' => $student->id,
                'parent_user_id' => $parent->id,
                'organisation_id' => $teacher->organisation_id,
                'kind' => TeacherNoteKind::ParentMessage->value,
                'body' => 'Page '.$i,
            ])->save();
        }

        $page = $this->actingAs($parent)
            ->getJson(route('api.parent.messages.show', [$teacher, $student]))
            ->assertOk();
        $this->assertCount(40, $page->json('messages'));
        $this->assertTrue($page->json('has_earlier'));
        $this->assertSame('Page 40', $page->json('messages.39.body'));

        $earlier = $this->actingAs($parent)
            ->getJson(route('api.parent.messages.show', [
                'teacher' => $teacher,
                'student' => $student,
                'before' => $page->json('messages.0.id'),
            ]))
            ->assertOk();
        $this->assertCount(1, $earlier->json('messages'));
        $this->assertFalse($earlier->json('has_earlier'));
        $this->assertSame('Page 0', $earlier->json('messages.0.body'));

        $teacher->delete();
        $remaining = collect($this->actingAs($parent)->getJson(route('api.parent.messages.index'))->json('conversations'))
            ->pluck('teacher_name');
        $this->assertFalse($remaining->contains('Classroom Teacher'));
        $this->assertTrue($remaining->contains('مريم نور'));
    }

    /**
     * @return array{0: User, 1: User, 2: User}
     */
    private function classroom(string $parentName = 'Classroom Parent', string $studentName = 'Classroom Student'): array
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
            'name' => $studentName,
        ]);
        $parent = User::factory()->create([
            'account_role' => AccountRole::Parent->value,
            'name' => $parentName,
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
        ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => $parent->id,
            'student_user_id' => $student->id,
        ]);

        return [$teacher, $student, $parent];
    }
}

<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\TeacherNoteKind;
use App\Enums\TeacherPrivateNoteCategory;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\Organisation;
use App\Models\TeacherNote;
use App\Models\TeacherPrivateNote;
use App\Models\User;
use App\Services\Teacher\TeacherPrivateNoteService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class TeacherPrivateNotesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
    }

    public function test_teacher_can_create_list_edit_pin_archive_and_delete_private_notes(): void
    {
        [$teacher, $student, $hidden] = $this->classroom();

        $this->actingAs($teacher)->postJson(route('api.teacher.students.private-notes.store', $hidden), [
            'category' => TeacherPrivateNoteCategory::Strengths->value,
            'body' => 'Should not work',
        ])->assertNotFound();

        $created = $this->actingAs($teacher)->postJson(route('api.teacher.students.private-notes.store', $student), [
            'category' => TeacherPrivateNoteCategory::Strengths->value,
            'body' => 'Strong madd control.',
            'pinned' => true,
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 3,
        ])->assertCreated()->json('note');

        $this->assertSame('strengths', $created['category']);
        $this->assertTrue($created['pinned']);
        $this->assertSame(1, $created['passage']['surah_number']);

        $list = $this->actingAs($teacher)->getJson(route('api.teacher.students.private-notes.index', $student))
            ->assertOk()
            ->json();
        $this->assertCount(1, $list['notes']);
        $this->assertSame($created['id'], $list['notes'][0]['id']);

        $profile = $this->actingAs($teacher)->getJson(route('api.teacher.students.show', [
            'student' => $student,
            'section' => 'notes',
        ]))->assertOk()->json('payload');
        $this->assertCount(1, $profile['notes']);

        $updated = $this->actingAs($teacher)->patchJson(route('api.teacher.students.private-notes.update', [
            'student' => $student,
            'privateNote' => $created['id'],
        ]), [
            'body' => 'Strong madd and ghunnah.',
            'category' => TeacherPrivateNoteCategory::LessonObservations->value,
            'pinned' => false,
        ])->assertOk()->json('note');
        $this->assertSame('Strong madd and ghunnah.', $updated['body']);
        $this->assertFalse($updated['pinned']);
        $this->assertSame('lesson_observations', $updated['category']);

        $this->actingAs($teacher)->postJson(route('api.teacher.students.private-notes.archive', [
            'student' => $student,
            'privateNote' => $created['id'],
        ]))->assertOk()->assertJsonPath('note.archived', true);

        $this->actingAs($teacher)->getJson(route('api.teacher.students.private-notes.index', $student))
            ->assertOk()
            ->assertJsonCount(0, 'notes');

        $this->actingAs($teacher)->getJson(route('api.teacher.students.private-notes.index', [
            'student' => $student,
            'archived' => 1,
        ]))->assertOk()->assertJsonCount(1, 'notes');

        $this->actingAs($teacher)->deleteJson(route('api.teacher.students.private-notes.destroy', [
            'student' => $student,
            'privateNote' => $created['id'],
        ]))->assertOk();

        $this->assertSoftDeleted('teacher_private_notes', ['id' => $created['id']]);
    }

    public function test_private_notes_are_author_only_and_hidden_from_learners(): void
    {
        [$teacher, $student] = $this->classroom();
        $peer = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $teacher->organisation_id,
        ]);
        GroupMembership::factory()->create([
            'learning_group_id' => LearningGroup::query()->where('organisation_id', $teacher->organisation_id)->value('id'),
            'user_id' => $peer->id,
            'membership_role' => MembershipRole::Teacher->value,
            'status' => MembershipStatus::Approved->value,
        ]);

        $note = TeacherPrivateNote::factory()->create([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'organisation_id' => $teacher->organisation_id,
            'category' => TeacherPrivateNoteCategory::Difficulties->value,
            'body' => 'Needs slower pacing.',
        ]);

        $this->actingAs($peer)->getJson(route('api.teacher.students.private-notes.index', $student))
            ->assertOk()
            ->assertJsonCount(0, 'notes');

        $this->actingAs($peer)->patchJson(route('api.teacher.students.private-notes.update', [
            'student' => $student,
            'privateNote' => $note->id,
        ]), ['body' => 'Hacked'])->assertNotFound();

        $support = $this->actingAs($student)->getJson(route('api.me.support'))->assertOk()->json();
        $encoded = json_encode($support);
        $this->assertStringNotContainsString('Needs slower pacing.', (string) $encoded);
        $this->assertStringNotContainsString('private_notes', (string) $encoded);
    }

    public function test_share_creates_student_visible_feedback_without_exposing_private_row(): void
    {
        [$teacher, $student] = $this->classroom();
        $note = TeacherPrivateNote::factory()->create([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'organisation_id' => $teacher->organisation_id,
            'category' => TeacherPrivateNoteCategory::Recommendations->value,
            'body' => 'Practise Al-Fatihah slowly this week.',
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 7,
        ]);

        $shared = $this->actingAs($teacher)->postJson(route('api.teacher.students.private-notes.share', [
            'student' => $student,
            'privateNote' => $note->id,
        ]))->assertCreated()->json('note');

        $this->assertTrue($shared['shared']);
        $this->assertNotNull($shared['shared_feedback_note_id']);

        $feedback = TeacherNote::query()->findOrFail($shared['shared_feedback_note_id']);
        $this->assertSame(TeacherNoteKind::Feedback, $feedback->kind);
        $this->assertSame('Practise Al-Fatihah slowly this week.', $feedback->body);

        $inbox = $this->actingAs($student)->getJson(route('api.me.support'))->assertOk()->json('learning.feedback_inbox');
        $bodies = collect($inbox)->pluck('body')->all();
        $this->assertContains('Practise Al-Fatihah slowly this week.', $bodies);
    }

    public function test_search_and_category_filters_apply(): void
    {
        [$teacher, $student] = $this->classroom();
        TeacherPrivateNote::factory()->create([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'organisation_id' => $teacher->organisation_id,
            'category' => TeacherPrivateNoteCategory::Strengths->value,
            'body' => 'Excellent tajweed consistency.',
        ]);
        TeacherPrivateNote::factory()->create([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'organisation_id' => $teacher->organisation_id,
            'category' => TeacherPrivateNoteCategory::Difficulties->value,
            'body' => 'Struggles with stopping rules.',
        ]);

        $this->actingAs($teacher)->getJson(route('api.teacher.students.private-notes.index', [
            'student' => $student,
            'category' => 'strengths',
        ]))->assertOk()->assertJsonCount(1, 'notes')->assertJsonPath('notes.0.category', 'strengths');

        $this->actingAs($teacher)->getJson(route('api.teacher.students.private-notes.index', [
            'student' => $student,
            'q' => 'stopping',
        ]))->assertOk()->assertJsonCount(1, 'notes')->assertJsonPath('notes.0.category', 'difficulties');
    }

    public function test_retention_purge_removes_expired_archived_and_soft_deleted_notes(): void
    {
        [$teacher, $student] = $this->classroom();
        $archived = TeacherPrivateNote::factory()->archived()->create([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'organisation_id' => $teacher->organisation_id,
            'archived_at' => Carbon::now()->subDays(400),
        ]);
        $deleted = TeacherPrivateNote::factory()->create([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'organisation_id' => $teacher->organisation_id,
        ]);
        $deleted->delete();
        TeacherPrivateNote::withTrashed()->whereKey($deleted->id)->update([
            'deleted_at' => Carbon::now()->subDays(40),
        ]);

        $removed = app(TeacherPrivateNoteService::class)->purgeExpired(365, 30);
        $this->assertSame(2, $removed);
        $this->assertNull(TeacherPrivateNote::withTrashed()->find($archived->id));
        $this->assertNull(TeacherPrivateNote::withTrashed()->find($deleted->id));
    }

    /**
     * @return array{0: User, 1: User, 2: User}
     */
    private function classroom(): array
    {
        $organisation = Organisation::factory()->create();
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
        ]);
        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $organisation->id,
            'name' => 'Authorised Student',
        ]);
        $hidden = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $organisation->id,
            'name' => 'Hidden Student',
        ]);
        $group = LearningGroup::factory()->create(['organisation_id' => $organisation->id, 'name' => 'Morning Halaqa']);

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
        GroupMembership::factory()->create([
            'learning_group_id' => $group->id,
            'user_id' => $hidden->id,
            'membership_role' => MembershipRole::Student->value,
            'status' => MembershipStatus::Approved->value,
            'analytics_consent_status' => AnalyticsConsentStatus::None->value,
        ]);

        return [$teacher, $student, $hidden];
    }
}

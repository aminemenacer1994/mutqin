<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\AssignmentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\MemorisationWeakSpot;
use App\Models\Organisation;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherNote;
use App\Models\User;
use App\Notifications\LearningTaskNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PersonalisedLearningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
    }

    public function test_teacher_plan_flows_into_revision_history_and_dashboards(): void
    {
        [$teacher, $student, $hidden, $group] = $this->classroom();

        $plan = $this->actingAs($teacher)->postJson(route('api.teacher.learning-plans.store'), [
            'student_id' => $student->id,
            'title' => 'Week of Al-Fatihah',
            'cadence' => 'weekly',
            'student_goal' => 'Read Al-Fatihah clearly',
            'activate' => true,
            'items' => [[
                'activity' => 'hifz',
                'kind' => 'practice',
                'hifz_category' => 'sabaq',
                'surah_number' => 1,
                'ayah_start' => 1,
                'ayah_end' => 3,
                'due_on' => now()->addDays(2)->toDateString(),
                'instructions' => 'Slow and clear',
                'is_milestone' => true,
                'origin' => 'assigned',
            ]],
        ])->assertCreated()->json('plan');

        $this->assertSame('Read Al-Fatihah clearly', $plan['student_goal']);
        $this->assertTrue($plan['items'][0]['is_milestone']);
        $this->assertSame('hifz', $plan['items'][0]['activity']);
        $this->assertNotNull($plan['items'][0]['teacher_assignment_id']);

        TeacherAssignmentRecipient::query()->whereKey($plan['items'][0]['recipient_id'])->update([
            'status' => AssignmentStatus::Completed->value,
            'completed_at' => now(),
            'student_completed_at' => now(),
        ]);

        $confirmed = $this->weakSpot($student, 2, 5, 3);
        $this->weakSpot($student, 2, 6, 4);

        $this->actingAs($teacher)->postJson(route('api.teacher.students.recitation-difficulties.review', [$student, $confirmed]), [
            'status' => 'confirmed',
            'note' => 'Needs another pass',
        ])->assertOk();

        $first = $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.revision-recommendations', $student))
            ->assertOk()
            ->json('recommendations');
        $again = $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.revision-recommendations', $student))
            ->assertOk()
            ->json('recommendations');

        $this->assertCount(count($first), $again);
        $this->assertNotEmpty($first);
        foreach ($first as $row) {
            $this->assertSame('pending', $row['status']);
            $this->assertFalse($row['published']);
            $this->assertNull($row['teacher_assignment_id']);
            $this->assertFalse($row['is_tajweed_assessment']);
        }

        $wordMatch = collect($first)->firstWhere('reason_code', 'ai_word_match');
        $confirmedRow = collect($first)->firstWhere('reason_code', 'teacher_confirmed_difficulty');
        $this->assertNotNull($wordMatch);
        $this->assertNotNull($confirmedRow);
        $this->assertStringContainsString('not a Tajweed', $wordMatch['reason']);
        $this->assertSame('revision', $wordMatch['activity']);

        $this->actingAs($student)
            ->postJson(route('api.teacher.students.revision-recommendations', $student))
            ->assertForbidden();

        $edited = $this->actingAs($teacher)->patchJson(route('api.teacher.revision-recommendations.update', $confirmedRow['id']), [
            'activity' => 'revision',
            'due_on' => now()->addDays(4)->toDateString(),
            'instructions' => 'Revise slowly',
        ])->assertOk()->json('recommendation');
        $this->assertSame('Revise slowly', $edited['instructions']);
        $this->assertSame('pending', $edited['status']);

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.revision-recommendations.accept', $confirmedRow['id']))
            ->assertOk()
            ->assertJsonPath('recommendation.status', 'accepted')
            ->assertJsonPath('recommendation.published', false);

        $assigned = $this->actingAs($teacher)
            ->postJson(route('api.teacher.revision-recommendations.assign', $confirmedRow['id']))
            ->assertOk()
            ->json('recommendation');
        $this->assertSame('assigned', $assigned['status']);
        $this->assertNotNull($assigned['teacher_assignment_id']);

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.revision-recommendations.assign', $confirmedRow['id']))
            ->assertOk()
            ->assertJsonPath('recommendation.teacher_assignment_id', $assigned['teacher_assignment_id']);

        $revision = TeacherAssignmentRecipient::query()
            ->where('student_id', $student->id)
            ->where('teacher_assignment_id', $assigned['teacher_assignment_id'])
            ->first();
        $this->assertNotNull($revision);
        $this->assertTrue($student->notifications->contains(
            fn ($notification) => $notification->type === LearningTaskNotification::class
                && ($notification->data['type'] ?? null) === 'revision'
                && (int) ($notification->data['teacher_assignment_recipient_id'] ?? 0) === (int) $revision->id
        ));

        $revision->forceFill([
            'status' => AssignmentStatus::AwaitingConfirmation->value,
            'student_completed_at' => now(),
        ])->save();

        $this->actingAs($student)->postJson(route('api.me.self-assessments.store'), [
            'feeling' => 'difficult',
            'help_request' => 'The middle of the ayah',
            'teacher_assignment_recipient_id' => $plan['items'][0]['recipient_id'],
            'surah_number' => 1,
            'ayah_start' => 2,
            'ayah_end' => 2,
        ])->assertOk()
            ->assertJsonPath('self_assessment.verified_mistake', false)
            ->assertJsonPath('self_assessment.feeling', 'difficult');

        $history = $this->actingAs($student)->getJson(route('api.dashboard.activity'))->assertOk()->json('activity');
        $milestone = collect($history)->firstWhere('type', 'milestone');
        $revisionEvent = collect($history)->firstWhere('outcome_key', 'revision_attempt');
        $reflection = collect($history)->firstWhere('type', 'self_assessment');
        $this->assertNotNull($milestone);
        $this->assertNotNull($revisionEvent);
        $this->assertNotNull($reflection);
        $this->assertFalse($reflection['verified_mistake']);
        $this->assertSame('student', $reflection['authority']);
        $this->assertFalse($milestone['is_tajweed_assessment']);

        $profile = $this->actingAs($teacher)->getJson(route('api.teacher.students.show', $student))->assertOk()->json();
        $this->assertNotEmpty($profile['payload']['learning_history']);
        $this->assertFalse($profile['payload']['self_assessments'][0]['verified_mistake']);
        $this->assertSame('difficult', $profile['payload']['self_assessments'][0]['feeling']);
        $this->assertNotEmpty($profile['payload']['teaching']['upcoming']);
        $this->assertNotEmpty($profile['payload']['teaching']['completed']);
        $this->assertNotEmpty($profile['payload']['teaching']['practice_areas']['word_match']);
        $this->assertNotEmpty($profile['payload']['teaching']['practice_areas']['teacher_confirmed']);
        foreach ($profile['payload']['teaching']['practice_areas']['word_match'] as $area) {
            $this->assertFalse($area['is_tajweed_assessment']);
            $this->assertSame('word_match', $area['kind']);
        }
        $this->actingAs($student)->getJson(route('api.teacher.students.show', $student))->assertForbidden();
        $this->actingAs($teacher)->getJson(route('api.teacher.students.show', $hidden))->assertNotFound();
        $this->actingAs($student)->getJson(route('api.teacher.students.private-notes.index', $student))->assertForbidden();

        $overview = $this->actingAs($teacher)->getJson(route('api.teacher.overview'))->assertOk()->json();
        $this->assertNotEmpty($overview['recent_completions']);
        $this->assertNotEmpty($overview['outstanding_revision']);
        $this->assertGreaterThan(0, $overview['plan_progress']['active']);

        $this->actingAs($teacher)->postJson(route('api.teacher.attendance.lessons.store', $group), [
            'date' => now()->addDay()->toDateString(),
            'title' => 'Morning lesson',
        ])->assertCreated();
        $this->actingAs($teacher)->postJson(route('api.teacher.attendance.lessons.store', $group), [
            'date' => now()->addDay()->toDateString(),
            'title' => 'Morning lesson',
        ])->assertCreated();
        $lessonNotices = $student->fresh()->notifications->filter(
            fn ($notification) => ($notification->data['type'] ?? null) === 'lesson'
        );
        $this->assertCount(1, $lessonNotices);

        $note = new TeacherNote;
        $note->forceFill([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'organisation_id' => $teacher->organisation_id,
            'kind' => 'feedback',
            'body' => 'Hold the madd a little longer.',
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 1,
        ])->save();
        $this->assertTrue($student->fresh()->notifications->contains(
            fn ($notification) => ($notification->data['type'] ?? null) === 'teacher_feedback'
                && (int) ($notification->data['teacher_note_id'] ?? 0) === (int) $note->id
        ));

        $other = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => Organisation::factory()->create()->id,
        ]);
        $this->actingAs($other)
            ->postJson(route('api.teacher.revision-recommendations.assign', $wordMatch['id']))
            ->assertNotFound();

        $this->assertNotSame($student->id, $hidden->id);
    }

    private function weakSpot(User $student, int $surah, int $ayah, int $count): MemorisationWeakSpot
    {
        return MemorisationWeakSpot::query()->create([
            'user_id' => $student->id,
            'surah_number' => $surah,
            'ayah_number' => $ayah,
            'spot_type' => MemorisationWeakSpot::TYPE_AYAH,
            'verse_key' => $surah.':'.$ayah,
            'spot_key' => MemorisationWeakSpot::buildSpotKey(MemorisationWeakSpot::TYPE_AYAH, $surah, $ayah),
            'status' => MemorisationWeakSpot::STATUS_ACTIVE,
            'severity' => 'high',
            'affected_attempt_count' => $count,
            'last_identified_at' => now(),
        ]);
    }

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

        return [$teacher, $student, $hidden, $group];
    }
}

<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\AssignmentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\LearningPlan;
use App\Models\LearningPlanItem;
use App\Models\MemorisationWeakSpot;
use App\Models\Organisation;
use App\Models\TeacherAssignmentRecipient;
use App\Models\User;
use App\Services\Teacher\TeacherDashboardService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LearningPlansTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
    }

    public function test_teacher_can_create_activate_and_progress_learning_plan(): void
    {
        [$teacher, $student] = $this->classroom();

        $created = $this->actingAs($teacher)->postJson(route('api.teacher.learning-plans.store'), [
            'student_id' => $student->id,
            'title' => 'Week 1 plan',
            'cadence' => 'weekly',
            'activate' => true,
            'items' => [
                [
                    'kind' => 'practice',
                    'hifz_category' => 'sabaq',
                    'surah_number' => 1,
                    'ayah_start' => 1,
                    'ayah_end' => 3,
                    'due_on' => now()->addDays(2)->toDateString(),
                    'priority' => 'high',
                    'instructions' => 'Slow and clear',
                    'origin' => 'assigned',
                ],
            ],
        ])->assertCreated()->json('plan');

        $this->assertSame('active', $created['status']);
        $this->assertSame(1, $created['progress']['total']);
        $this->assertSame(0, $created['progress']['completed']);
        $this->assertNotEmpty($created['items'][0]['teacher_assignment_id']);
        $this->assertSame('released', $created['items'][0]['item_status']);

        $recipientId = $created['items'][0]['recipient_id'];
        $this->assertNotNull($recipientId);

        TeacherAssignmentRecipient::query()->whereKey($recipientId)->update([
            'status' => AssignmentStatus::Completed->value,
            'completed_at' => now(),
        ]);

        $listed = $this->actingAs($teacher)
            ->getJson(route('api.teacher.learning-plans.index', ['student_id' => $student->id]))
            ->assertOk()
            ->json('data.0');

        $this->assertSame(1, $listed['progress']['completed']);
        $this->assertSame(100, $listed['progress']['percent']);
    }

    public function test_suggested_items_require_approval_and_history_is_preserved(): void
    {
        [$teacher, $student] = $this->classroom();

        MemorisationWeakSpot::query()->create([
            'user_id' => $student->id,
            'surah_number' => 2,
            'ayah_number' => 5,
            'spot_type' => MemorisationWeakSpot::TYPE_AYAH,
            'verse_key' => '2:5',
            'spot_key' => MemorisationWeakSpot::buildSpotKey(MemorisationWeakSpot::TYPE_AYAH, 2, 5),
            'status' => MemorisationWeakSpot::STATUS_ACTIVE,
            'severity' => 'high',
            'affected_attempt_count' => 3,
            'last_identified_at' => now(),
        ]);

        $suggestions = $this->actingAs($teacher)
            ->getJson(route('api.teacher.students.learning-plan-suggestions', $student))
            ->assertOk()
            ->json('suggestions');
        $this->assertNotEmpty($suggestions);

        $plan = $this->actingAs($teacher)->postJson(route('api.teacher.learning-plans.store'), [
            'student_id' => $student->id,
            'title' => 'Revision plan',
            'activate' => true,
            'items' => [
                [
                    'kind' => 'practice',
                    'hifz_category' => 'sabaq',
                    'surah_number' => 1,
                    'ayah_start' => 1,
                    'ayah_end' => 2,
                    'origin' => 'assigned',
                ],
                [
                    'kind' => 'practice',
                    'hifz_category' => 'sabqi',
                    'surah_number' => 2,
                    'ayah_start' => 5,
                    'ayah_end' => 5,
                    'origin' => 'suggested',
                    'weak_spot_id' => $suggestions[0]['weak_spot_id'],
                    'priority' => 'high',
                ],
            ],
        ])->assertCreated()->json('plan');

        $assigned = collect($plan['items'])->firstWhere('origin', 'assigned');
        $suggested = collect($plan['items'])->firstWhere('origin', 'suggested');
        $this->assertSame('released', $assigned['item_status']);
        $this->assertSame('planned', $suggested['item_status']);
        $this->assertNull($suggested['teacher_assignment_id']);

        $releasedId = $assigned['id'];

        $this->actingAs($teacher)->putJson(route('api.teacher.learning-plans.update', $plan['id']), [
            'title' => 'Revision plan updated',
            'items' => [
                [
                    'kind' => 'ai_recite',
                    'hifz_category' => 'sabaq',
                    'surah_number' => 1,
                    'ayah_start' => 4,
                    'ayah_end' => 5,
                    'origin' => 'assigned',
                ],
            ],
        ])->assertOk();

        $this->assertDatabaseHas('learning_plan_items', [
            'id' => $releasedId,
            'teacher_assignment_id' => $assigned['teacher_assignment_id'],
        ]);

        $approved = $this->actingAs($teacher)
            ->postJson(route('api.teacher.learning-plan-items.approve', $suggested['id']))
            ->assertOk()
            ->json('item');
        $this->assertSame('assigned', $approved['origin']);
        $this->assertSame('released', $approved['item_status']);
        $this->assertNotNull($approved['teacher_assignment_id']);
    }

    public function test_learner_sees_active_plan_without_unapproved_suggestions(): void
    {
        [$teacher, $student, $hidden] = $this->classroom();

        $plan = $this->actingAs($teacher)->postJson(route('api.teacher.learning-plans.store'), [
            'student_id' => $student->id,
            'title' => 'Learner plan',
            'activate' => true,
            'items' => [
                [
                    'kind' => 'practice',
                    'hifz_category' => 'sabaq',
                    'surah_number' => 1,
                    'ayah_start' => 1,
                    'ayah_end' => 7,
                    'origin' => 'assigned',
                ],
                [
                    'kind' => 'practice',
                    'hifz_category' => 'sabqi',
                    'surah_number' => 2,
                    'ayah_start' => 1,
                    'ayah_end' => 1,
                    'origin' => 'suggested',
                ],
            ],
        ])->assertCreated()->json('plan');

        $this->actingAs($hidden)->getJson(route('api.teacher.learning-plans.index'))->assertForbidden();

        $support = app(TeacherDashboardService::class)->learnerSupport($student);
        $this->assertNotNull($support['learning_plan']);
        $this->assertSame($plan['id'], $support['learning_plan']['id']);
        $this->assertCount(1, $support['learning_plan']['items']);
        $this->assertSame('assigned', $support['learning_plan']['items'][0]['origin']);
        $this->assertNotNull($support['learning_plan']['next_action']);
    }

    public function test_templates_can_be_saved_and_applied(): void
    {
        [$teacher, $student] = $this->classroom();

        $template = $this->actingAs($teacher)->postJson(route('api.teacher.learning-plan-templates.store'), [
            'name' => 'Starter week',
            'cadence' => 'weekly',
            'items' => [
                [
                    'kind' => 'practice',
                    'hifz_category' => 'sabaq',
                    'surah_number' => 1,
                    'ayah_start' => 1,
                    'ayah_end' => 3,
                    'day_offset' => 0,
                ],
                [
                    'kind' => 'ai_recite',
                    'hifz_category' => 'sabaq',
                    'surah_number' => 1,
                    'ayah_start' => 1,
                    'ayah_end' => 3,
                    'day_offset' => 2,
                ],
            ],
        ])->assertCreated()->json('template');

        $this->assertCount(2, $template['items']);

        $applied = $this->actingAs($teacher)->postJson(route('api.teacher.learning-plan-templates.apply', $template['id']), [
            'student_id' => $student->id,
            'starts_on' => now()->toDateString(),
        ])->assertCreated()->json('plan');

        $this->assertSame('Starter week', $applied['title']);
        $this->assertCount(2, $applied['items']);
        $this->assertSame(LearningPlan::query()->whereKey($applied['id'])->value('source_template_id'), $template['id']);
    }

    public function test_other_teacher_cannot_manage_plan(): void
    {
        [$teacher, $student] = $this->classroom();
        $otherOrg = Organisation::factory()->create();
        $otherTeacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $otherOrg->id,
        ]);

        $plan = $this->actingAs($teacher)->postJson(route('api.teacher.learning-plans.store'), [
            'student_id' => $student->id,
            'title' => 'Private plan',
            'items' => [[
                'kind' => 'practice',
                'hifz_category' => 'sabaq',
                'surah_number' => 1,
                'ayah_start' => 1,
                'ayah_end' => 1,
            ]],
        ])->assertCreated()->json('plan');

        $this->actingAs($otherTeacher)
            ->postJson(route('api.teacher.learning-plans.status', $plan['id']), ['status' => 'active'])
            ->assertNotFound();

        $itemId = LearningPlanItem::query()->where('learning_plan_id', $plan['id'])->value('id');
        $this->actingAs($otherTeacher)
            ->postJson(route('api.teacher.learning-plan-items.approve', $itemId))
            ->assertNotFound();
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

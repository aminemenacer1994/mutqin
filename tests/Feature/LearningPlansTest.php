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

        $learnerPlan = app(TeacherDashboardService::class)->learnerSupport($student)['learning_plan'];
        $this->assertNotNull($learnerPlan);
        $this->assertSame($listed['progress']['completed'], $learnerPlan['progress']['completed']);
        $this->assertSame($listed['progress']['total'], $learnerPlan['progress']['total']);
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

    public function test_identical_open_plan_is_rejected_until_the_teacher_duplicates_it(): void
    {
        [$teacher, $student] = $this->classroom();
        $payload = [
            'student_id' => $student->id,
            'title' => 'Week 1 plan',
            'starts_on' => now()->toDateString(),
            'items' => [[
                'activity' => 'nazra',
                'kind' => 'practice',
                'hifz_category' => 'sabqi',
                'surah_number' => 1,
                'ayah_start' => 1,
                'ayah_end' => 3,
            ]],
        ];

        $created = $this->actingAs($teacher)
            ->postJson(route('api.teacher.learning-plans.store'), $payload)
            ->assertCreated()
            ->json('plan');
        $this->assertSame('nazra', $created['items'][0]['activity']);
        $this->assertFalse($created['progress_complete']);

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.learning-plans.store'), $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title']);

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.learning-plans.store'), $payload + ['allow_duplicate' => true])
            ->assertCreated();
    }

    public function test_paused_plan_is_not_required_for_the_student(): void
    {
        [$teacher, $student] = $this->classroom();
        $plan = $this->actingAs($teacher)->postJson(route('api.teacher.learning-plans.store'), [
            'student_id' => $student->id,
            'title' => 'Paused week',
            'activate' => true,
            'items' => [[
                'kind' => 'practice',
                'hifz_category' => 'sabaq',
                'surah_number' => 1,
                'ayah_start' => 1,
                'ayah_end' => 2,
            ]],
        ])->assertCreated()->json('plan');

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.learning-plans.status', $plan['id']), ['status' => 'paused'])
            ->assertOk();

        $summary = app(TeacherDashboardService::class)->learnerSupport($student);
        $this->assertSame('paused', $summary['learning_plan']['status']);
        $this->assertNull($summary['learning_plan']['next_action']);
        $this->assertSame('paused', $summary['learning_plan']['items'][0]['display_status']);
    }

    public function test_draft_edit_and_activation_keep_assignments_intentional(): void
    {
        [$teacher, $student] = $this->classroom();

        $plan = $this->actingAs($teacher)->postJson(route('api.teacher.learning-plans.store'), [
            'student_id' => $student->id,
            'title' => 'Draft week',
            'student_goal' => 'Finish Al-Fatihah',
            'notes' => 'Listen first',
            'activate' => false,
            'items' => [[
                'activity' => 'hifz',
                'kind' => 'ai_recite',
                'hifz_category' => 'sabaq',
                'surah_number' => 1,
                'ayah_start' => 1,
                'ayah_end' => 7,
                'repetition_target' => 3,
            ]],
        ])->assertCreated()->json('plan');

        $this->assertSame('draft', $plan['status']);
        $this->assertNull($plan['items'][0]['teacher_assignment_id']);
        $itemId = $plan['items'][0]['id'];

        $updated = $this->actingAs($teacher)->putJson(route('api.teacher.learning-plans.update', $plan['id']), [
            'notes' => 'Listen first, then recite',
            'items' => [[
                'id' => $itemId,
                'activity' => 'hifz',
                'kind' => 'ai_recite',
                'hifz_category' => 'sabaq',
                'surah_number' => 1,
                'ayah_start' => 1,
                'ayah_end' => 7,
                'repetition_target' => 4,
                'instructions' => 'Slow',
            ]],
        ])->assertOk()->json('plan');

        $this->assertSame('draft', $updated['status']);
        $this->assertCount(1, $updated['items']);
        $this->assertSame(4, (int) $updated['items'][0]['repetition_target']);
        $this->assertSame('Slow', $updated['items'][0]['instructions']);
        $this->assertNull($updated['items'][0]['teacher_assignment_id']);

        $this->actingAs($teacher)->putJson(route('api.teacher.learning-plans.update', $plan['id']), [
            'items' => [[
                'activity' => 'hifz',
                'kind' => 'ai_recite',
                'hifz_category' => 'sabaq',
                'surah_number' => 1,
                'ayah_start' => 1,
                'ayah_end' => 7,
            ]],
        ])->assertUnprocessable()->assertJsonValidationErrors(['items']);

        $this->actingAs($teacher)->postJson(route('api.teacher.learning-plans.store'), [
            'student_id' => $student->id,
            'title' => 'Invalid range',
            'items' => [[
                'activity' => 'hifz',
                'kind' => 'ai_recite',
                'hifz_category' => 'sabaq',
                'surah_number' => 1,
                'ayah_start' => 1,
                'ayah_end' => 99,
            ]],
        ])->assertUnprocessable();

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.learning-plan-items.skip', $itemId))
            ->assertOk();
        $this->assertSame('skipped', LearningPlanItem::query()->find($itemId)?->item_status?->value);
        $this->assertNull(LearningPlanItem::query()->find($itemId)?->teacher_assignment_id);

        $activated = $this->actingAs($teacher)
            ->postJson(route('api.teacher.learning-plans.status', $plan['id']), ['status' => 'active'])
            ->assertOk()
            ->json('plan');
        $this->assertSame('active', $activated['status']);
        $this->assertNull(collect($activated['items'])->firstWhere('id', $itemId)['teacher_assignment_id']);
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

    public function test_plan_exposes_measurable_targets_and_completes_only_after_teacher_approval(): void
    {
        [$teacher, $student] = $this->classroom();
        $due = now()->addDays(2)->toDateString();
        $plan = $this->actingAs($teacher)->postJson(route('api.teacher.learning-plans.store'), [
            'student_id' => $student->id,
            'title' => 'Al-Fatihah Sabaq',
            'student_goal' => 'Memorise ayahs 1–3 by Friday',
            'notes' => 'Pause at the end of each ayah.',
            'activate' => true,
            'items' => [[
                'activity' => 'hifz',
                'kind' => 'ai_recite',
                'hifz_category' => 'sabaq',
                'surah_number' => 1,
                'ayah_start' => 1,
                'ayah_end' => 3,
                'repetition_target' => 2,
                'due_on' => $due,
                'is_milestone' => true,
            ]],
        ])->assertCreated()->json('plan');

        $this->assertSame(1, $plan['progress']['activities_total']);
        $this->assertSame(0, $plan['progress']['activities_completed']);
        $this->assertSame(1, $plan['progress']['upcoming_lessons']);
        $this->assertSame(0, $plan['progress']['validated_memorised_ayahs']);
        $this->assertSame($plan['items'][0]['id'], $plan['next_milestone']['id']);
        $this->assertSame(2, $plan['items'][0]['completion_criteria']['required_activities']);
        $this->assertTrue($plan['items'][0]['completion_criteria']['teacher_approval_required']);
        $this->assertTrue($plan['items'][0]['completion_criteria']['validates_memorisation']);

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.learning-plans.status', $plan['id']), ['status' => 'completed'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);

        $recipient = TeacherAssignmentRecipient::query()->findOrFail($plan['items'][0]['recipient_id']);
        $recipient->forceFill([
            'status' => AssignmentStatus::AwaitingConfirmation->value,
            'student_completed_at' => now(),
        ])->save();

        $submitted = $this->actingAs($teacher)
            ->getJson(route('api.teacher.learning-plans.index', ['student_id' => $student->id]))
            ->assertOk()
            ->json('data.0');
        $this->assertSame(0, $submitted['progress']['completed']);
        $this->assertSame('submitted', $submitted['items'][0]['display_status']);

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.assignment-recipients.approve', $recipient))
            ->assertOk();

        $completed = $this->actingAs($teacher)
            ->getJson(route('api.teacher.learning-plans.index', ['student_id' => $student->id]))
            ->assertOk()
            ->json('data.0');
        $this->assertSame('completed', $completed['status']);
        $this->assertSame(1, $completed['progress']['activities_completed']);
        $this->assertSame(3, $completed['progress']['validated_memorised_ayahs']);
        $this->assertNull($completed['next_action']);

        $learner = app(TeacherDashboardService::class)->learnerSupport($student)['learning_plan'];
        $this->assertSame('completed', $learner['status']);
        $this->assertSame($completed['progress'], $learner['progress']);
        $this->assertNull($learner['next_milestone']);
    }

    public function test_active_plan_conflicts_and_overdue_partial_progress_are_reported(): void
    {
        [$teacher, $student] = $this->classroom();
        $active = $this->actingAs($teacher)->postJson(route('api.teacher.learning-plans.store'), [
            'student_id' => $student->id,
            'title' => 'Current plan',
            'activate' => true,
            'items' => [[
                'activity' => 'revision',
                'kind' => 'practice',
                'hifz_category' => 'manzil',
                'surah_number' => 112,
                'ayah_start' => 1,
                'ayah_end' => 4,
                'due_on' => now()->subDay()->toDateString(),
            ]],
        ])->assertCreated()->json('plan');

        $this->assertSame(1, $active['progress']['overdue']);
        $this->assertSame(1, $active['progress']['revision_due']);
        $this->assertSame(0, $active['progress']['completed']);

        $second = $this->actingAs($teacher)->postJson(route('api.teacher.learning-plans.store'), [
            'student_id' => $student->id,
            'title' => 'Next plan',
            'items' => [[
                'activity' => 'hifz',
                'kind' => 'ai_recite',
                'hifz_category' => 'sabaq',
                'surah_number' => 113,
                'ayah_start' => 1,
                'ayah_end' => 2,
            ]],
        ])->assertCreated()->json('plan');

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.learning-plans.status', $second['id']), ['status' => 'active'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);
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

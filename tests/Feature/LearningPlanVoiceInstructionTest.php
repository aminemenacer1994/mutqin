<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\LearningPlanItemStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\LearningPlanItem;
use App\Models\Organisation;
use App\Models\OrganisationMembership;
use App\Models\TeacherAssignment;
use App\Models\User;
use App\Support\DemoRecitationAudio;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class LearningPlanVoiceInstructionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
    }

    public function test_plan_item_voice_reuses_assets_when_released_to_assignment(): void
    {
        Storage::fake('user_files');
        [$teacher, $student] = $this->classroom();

        $response = $this->actingAs($teacher)->post(route('api.teacher.learning-plans.store'), [
            'student_id' => $student->id,
            'title' => 'Voice plan',
            'starts_on' => today()->toDateString(),
            'ends_on' => today()->addDays(7)->toDateString(),
            'items' => json_encode([[
                'activity' => 'hifz',
                'kind' => 'ai_recite',
                'hifz_category' => 'sabaq',
                'surah_number' => 1,
                'ayah_start' => 1,
                'ayah_end' => 3,
                'repetition_target' => 3,
                'due_on' => today()->addDays(2)->toDateString(),
                'instructions' => 'Listen first.',
                'instruction_audio_duration_ms' => 900,
            ]]),
            'items_instruction_audio_0' => UploadedFile::fake()->createWithContent(
                'instruction.wav',
                DemoRecitationAudio::silentWavBytes(900),
            ),
        ])->assertCreated();

        $planId = (int) $response->json('plan.id');
        $itemId = (int) collect($response->json('plan.items'))->value('id');
        $item = LearningPlanItem::query()->findOrFail($itemId);
        $this->assertNotNull($item->instruction_audio_asset_id);
        $this->assertTrue((bool) $response->json('plan.items.0.voice_instructions.instruction.available'));

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.learning-plans.status', $planId), ['status' => 'active'])
            ->assertOk();

        $item->refresh();
        $this->assertSame(LearningPlanItemStatus::Released->value, $item->item_status->value);
        $this->assertNotNull($item->teacher_assignment_id);

        $assignment = TeacherAssignment::query()->findOrFail((int) $item->teacher_assignment_id);
        $this->assertSame((int) $item->instruction_audio_asset_id, (int) $assignment->instruction_audio_asset_id);
    }

    /**
     * @return array{0: User, 1: User}
     */
    private function classroom(): array
    {
        $organisation = Organisation::factory()->create();
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
        ]);
        OrganisationMembership::query()->create([
            'user_id' => $teacher->id,
            'organisation_id' => $organisation->id,
            'membership_role' => MembershipRole::Teacher->value,
            'status' => MembershipStatus::Approved->value,
            'decided_by' => $teacher->id,
            'decided_at' => now(),
            'is_institution_admin' => true,
        ]);
        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $organisation->id,
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

        return [$teacher, $student];
    }
}
<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\Organisation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MushafAnnotationMarkingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
    }

    public function test_teacher_can_store_and_list_manual_mushaf_annotation(): void
    {
        [$teacher, $student] = $this->classroom();

        $this->actingAs($teacher)->postJson(route('api.teacher.students.mushaf-annotations.store', $student), [
            'context_type' => 'manual_live',
            'context_id' => 0,
            'surah' => 1,
            'ayah' => 4,
            'word_index' => 2,
            'category' => 'memorisation',
            'guidance' => 'Review this word.',
            'publish' => true,
        ])->assertCreated()
            ->assertJsonPath('category', 'memorisation')
            ->assertJsonPath('is_published', true);

        $this->actingAs($teacher)->getJson(route('api.teacher.students.mushaf-annotations.index', [
            'student' => $student,
            'context_type' => 'manual_live',
            'context_id' => 0,
        ]))->assertOk()
            ->assertJsonCount(1, 'annotations')
            ->assertJsonPath('annotations.0.guidance', 'Review this word.');
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
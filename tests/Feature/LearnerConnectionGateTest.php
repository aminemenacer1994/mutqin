<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\Organisation;
use App\Models\User;
use App\Services\Learning\LearnerConnectionGate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LearnerConnectionGateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
    }

    public function test_standalone_individual_is_not_connected_and_cannot_load_support(): void
    {
        $user = User::factory()->create([
            'account_role' => AccountRole::Individual->value,
        ]);

        $this->assertFalse(app(LearnerConnectionGate::class)->connected($user));

        $this->actingAs($user)
            ->getJson(route('api.me.support'))
            ->assertNotFound();

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertSee('"learner_learning_network_connected":false', false);
    }

    public function test_pending_class_membership_allows_support_and_marks_dashboard_connected(): void
    {
        $organisation = Organisation::factory()->create();
        $group = LearningGroup::factory()->create(['organisation_id' => $organisation->id]);
        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $organisation->id,
        ]);

        GroupMembership::factory()->create([
            'user_id' => $student->id,
            'learning_group_id' => $group->id,
            'membership_role' => MembershipRole::Student->value,
            'status' => MembershipStatus::Pending->value,
        ]);

        $this->assertTrue(app(LearnerConnectionGate::class)->connected($student));

        $this->actingAs($student)
            ->getJson(route('api.me.support'))
            ->assertOk()
            ->assertJsonStructure(['circle', 'assignments']);

        $this->actingAs($student)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertSee('"learner_learning_network_connected":true', false);
    }
}
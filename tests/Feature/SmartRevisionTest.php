<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\RevisionRecommendationStatus;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\MemorisationWeakSpot;
use App\Models\Organisation;
use App\Models\RevisionRecommendation;
use App\Models\User;
use App\Services\Parent\RecordParentLearningReportCollector;
use App\Services\Teacher\RevisionRecommendationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class SmartRevisionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
    }

    public function test_sync_upgrades_passage_from_word_match_to_teacher_confirmed(): void
    {
        [$teacher, $student] = $this->pair();
        $spot = $this->weakSpot($student, 2, 7, 3);

        $service = app(RevisionRecommendationService::class);
        $service->sync($teacher, $student);
        $rows = $service->syncAndList($teacher, $student);
        $match = collect($rows)->first(fn (array $row) => (int) $row['surah_number'] === 2 && (int) $row['ayah_start'] === 7);
        $this->assertNotNull($match);
        $this->assertSame('ai_word_match', $match['reason_code']);

        $this->actingAs($teacher)->postJson(route('api.teacher.students.recitation-difficulties.review', [$student, $spot]), [
            'status' => 'confirmed',
            'note' => 'Needs another pass',
        ])->assertOk();

        $service->sync($teacher, $student);
        $rows = $service->syncAndList($teacher, $student);
        $upgraded = collect($rows)->first(fn (array $row) => (int) $row['ayah_start'] === 7 && (int) $row['surah_number'] === 2);
        $this->assertNotNull($upgraded);
        $this->assertSame('teacher_confirmed_difficulty', $upgraded['reason_code']);
        $this->assertSame(1, collect($rows)->filter(fn (array $row) => (int) $row['ayah_start'] === 7)->count());
    }

    public function test_parent_report_shows_assigned_revision_not_pending_recommendations(): void
    {
        $child = User::factory()->create(['account_role' => AccountRole::Student->value]);
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => Organisation::factory()->create()->id,
        ]);
        $from = Carbon::parse('2026-11-17 00:00:00');
        $to = Carbon::parse('2026-11-23 23:59:59');
        Carbon::setTestNow($from->copy()->addDays(3));

        (new RevisionRecommendation)->forceFill([
            'teacher_id' => $teacher->id,
            'student_id' => $child->id,
            'organisation_id' => $teacher->organisation_id,
            'status' => RevisionRecommendationStatus::Pending->value,
            'activity' => 'revision',
            'surah_number' => 2,
            'ayah_start' => 1,
            'ayah_end' => 3,
            'reason_code' => 'ai_word_match',
            'reason' => 'PRIVATE-PENDING-RECOMMENDATION',
            'source_key' => 'pending-only',
            'created_at' => $from->copy()->addDay(),
        ])->save();

        (new RevisionRecommendation)->forceFill([
            'teacher_id' => $teacher->id,
            'student_id' => $child->id,
            'organisation_id' => $teacher->organisation_id,
            'status' => RevisionRecommendationStatus::Assigned->value,
            'activity' => 'revision',
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 7,
            'instructions' => 'PUBLIC-ASSIGNED-REVISION',
            'reason_code' => 'teacher_confirmed_difficulty',
            'reason' => 'Teacher assigned revision',
            'source_key' => 'assigned-parent',
            'assigned_at' => $from->copy()->addDays(2),
        ])->save();

        $payload = app(RecordParentLearningReportCollector::class)->collect($child, 'week', $from, $to);
        $json = json_encode($payload);
        $this->assertStringNotContainsString('PRIVATE-PENDING-RECOMMENDATION', $json);
        $this->assertSame('PUBLIC-ASSIGNED-REVISION', $payload['feedback']['recommendations'][0]['text'] ?? null);
        $this->assertSame('assigned', $payload['feedback']['recommendations'][0]['status'] ?? null);
    }

    public function test_parent_report_includes_teacher_confirmed_improve_summary(): void
    {
        $child = User::factory()->create(['account_role' => AccountRole::Student->value]);
        $from = Carbon::parse('2026-11-17 00:00:00');
        $to = Carbon::parse('2026-11-23 23:59:59');

        MemorisationWeakSpot::query()->create([
            'user_id' => $child->id,
            'surah_number' => 112,
            'ayah_number' => 1,
            'spot_type' => MemorisationWeakSpot::TYPE_AYAH,
            'verse_key' => '112:1',
            'spot_key' => MemorisationWeakSpot::buildSpotKey(MemorisationWeakSpot::TYPE_AYAH, 112, 1),
            'status' => MemorisationWeakSpot::STATUS_ACTIVE,
            'teacher_review_status' => MemorisationWeakSpot::REVIEW_CONFIRMED,
            'severity' => 'high',
            'affected_attempt_count' => 3,
            'last_identified_at' => $from->copy()->addDay(),
        ]);

        $payload = app(RecordParentLearningReportCollector::class)->collect($child, 'week', $from, $to);
        $this->assertNotEmpty($payload['improve']['items']);
        $this->assertSame('teacher_confirmed_weak', $payload['improve']['items'][0]['kind']);
        $this->assertFalse($payload['improve']['items'][0]['ai_wording_flag']);
        $this->assertFalse($payload['insufficient']);
    }

    private function pair(): array
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
}
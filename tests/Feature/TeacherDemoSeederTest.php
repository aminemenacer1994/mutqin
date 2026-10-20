<?php

namespace Tests\Feature;

use App\Models\AiReciteAttempt;
use App\Models\GroupMembership;
use App\Models\MemorisationProgress;
use App\Models\MemorisationWeakSpot;
use App\Models\Organisation;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Services\Teacher\TeacherDashboardService;
use App\Support\Demo\TeacherDemoCatalog;
use Database\Seeders\TeacherDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Tests\TestCase;

class TeacherDemoSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
    }

    public function test_teacher_demo_seeding_refuses_production(): void
    {
        $this->app['env'] = 'production';

        try {
            $this->artisan('mutqin:seed-teacher-demo');
            $this->fail('The teacher demo command ran in production.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('production', $exception->getMessage());
        }

        try {
            $this->artisan('db:seed', [
                '--class' => TeacherDemoSeeder::class,
                '--force' => true,
            ]);
            $this->fail('A forced database seed ran in production.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('production', $exception->getMessage());
        }

        $this->assertSame(0, User::query()->where('email', 'like', 'teacher.demo.%')->count());
    }

    public function test_teacher_demo_reset_refuses_production(): void
    {
        $this->app['env'] = 'production';

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('production');

        $this->artisan('mutqin:reset-teacher-demo');
    }

    public function test_teacher_demo_seeding_does_not_overwrite_an_unmarked_account(): void
    {
        $email = TeacherDemoCatalog::students()[0]['email'];
        $user = User::factory()->create([
            'email' => $email,
            'name' => 'Kept Account',
            'stripe_customer_id' => null,
        ]);

        try {
            $this->seed(TeacherDemoSeeder::class);
            $this->fail('The seeder overwrote an account it does not own.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('Refusing to overwrite', $exception->getMessage());
        }

        $this->assertSame('Kept Account', $user->fresh()->name);
        $this->assertSame(0, Organisation::query()->where('name', TeacherDemoCatalog::organisations()[0]['name'])->count());
    }

    public function test_teacher_demo_records_drive_the_dashboard(): void
    {
        $bystander = User::factory()->create([
            'email' => 'bystander.classroom@school.test',
            'name' => 'Bystander',
        ]);

        $this->artisan('mutqin:seed-teacher-demo')->assertSuccessful();
        $sessionCount = UserSession::query()->count();

        $this->assertClassroom();
        $this->assertSame('Bystander', $bystander->fresh()->name);
        $this->assertSame(0, UserSession::query()->where('user_id', $bystander->id)->count());

        $this->artisan('mutqin:seed-teacher-demo')->assertSuccessful();
        $this->assertSame($sessionCount, UserSession::query()->count());
        $this->assertSame(35, User::query()->where('email', 'like', 'teacher.demo.%')->count());
        $this->assertSame('Bystander', $bystander->fresh()->name);

        $this->artisan('mutqin:reset-teacher-demo')->assertSuccessful();
        $this->assertNull(User::query()->where('email', 'like', 'teacher.demo.%')->first());
        $this->assertSame(0, Organisation::query()->where('name', TeacherDemoCatalog::organisations()[0]['name'])->count());
        $this->assertSame('Bystander', $bystander->fresh()->name);
    }

    private function assertClassroom(): void
    {
        $this->assertSame(3, Organisation::query()->whereIn('name', array_column(TeacherDemoCatalog::organisations(), 'name'))->count());
        $this->assertSame(5, User::query()->whereIn('email', array_column(TeacherDemoCatalog::teachers(), 'email'))->count());
        $this->assertSame(30, User::query()->whereIn('email', array_column(TeacherDemoCatalog::students(), 'email'))->count());

        $ids = User::query()->where('email', 'like', 'teacher.demo.student.%')->pluck('id');
        $sessions = UserSession::query()->whereIn('user_id', $ids)->count();
        $attempts = AiReciteAttempt::query()->whereIn('user_id', $ids)->count();
        $assignments = TeacherAssignment::query()->count();
        $this->assertGreaterThanOrEqual(300, $sessions);
        $this->assertLessThanOrEqual(500, $sessions);
        $this->assertGreaterThanOrEqual(150, $attempts);
        $this->assertLessThanOrEqual(250, $attempts);
        $this->assertGreaterThanOrEqual(40, $assignments);
        $this->assertLessThanOrEqual(60, $assignments);

        $fajr = User::query()->where('email', 'teacher.demo.halaqa.fajr@example.com')->firstOrFail();
        $maghrib = User::query()->where('email', 'teacher.demo.halaqa.maghrib@example.com')->firstOrFail();
        $school = User::query()->where('email', 'teacher.demo.school.7b@example.com')->firstOrFail();
        $madrassa = User::query()->where('email', 'teacher.demo.madrassa@example.com')->firstOrFail();
        $high = $this->student(TeacherDemoCatalog::HIGH_PERFORMER);
        $hidden = $this->student(2);
        $intervention = $this->student(TeacherDemoCatalog::INTERVENTION);
        $paused = $this->student(TeacherDemoCatalog::PAUSED);
        $repeated = $this->student(TeacherDemoCatalog::REPEATED);
        $inactive = $this->student(TeacherDemoCatalog::INACTIVE[0]);
        $empty = $this->student(TeacherDemoCatalog::NEW_EMPTY);
        $minimal = $this->student(TeacherDemoCatalog::NEW_MINIMAL);

        $this->assertTrue(Hash::check(TeacherDemoCatalog::PASSWORD, $fajr->password));
        $membership = GroupMembership::query()->where('user_id', $high->id)->firstOrFail();
        $this->assertSame('granted', $membership->analytics_consent_status->value);
        $this->assertSame(GroupMembership::ANALYTICS_CONSENT_VERSION, $membership->analytics_consent_version);
        $this->assertSame($high->id, (int) $membership->analytics_consent_user_id);

        $this->post('/login', [
            'email' => $fajr->email,
            'password' => TeacherDemoCatalog::PASSWORD,
        ])->assertRedirect();
        $this->assertAuthenticatedAs($fajr);

        $overview = $this->getJson(route('api.teacher.overview', ['days' => 30]))
            ->assertOk()
            ->assertJsonPath('kpis.authorised_students', 5)
            ->assertJsonPath('chart.is_empty', false)
            ->json();

        $this->getJson(route('api.teacher.students.show', $hidden))->assertNotFound();
        $this->actingAs($maghrib)
            ->getJson(route('api.teacher.students.show', $hidden))
            ->assertOk();

        $dashboard = app(TeacherDashboardService::class);
        $fajrIds = collect($dashboard->students($fajr, ['per_page' => 50])['data'])->pluck('id');
        $this->assertTrue($fajrIds->contains($high->id));
        $this->assertFalse($fajrIds->contains($hidden->id));
        $this->assertFalse($fajrIds->contains($intervention->id));

        $highRow = collect($dashboard->students($fajr, ['per_page' => 50])['data'])->firstWhere('id', $high->id);
        $this->assertGreaterThanOrEqual(90, $highRow['ai_success_rate']);
        $this->assertLessThanOrEqual(98, $highRow['ai_success_rate']);
        $this->assertSame(0, $highRow['revision_overdue']);
        $this->assertGreaterThan(0, $highRow['revision_upcoming']);
        $this->assertFalse($highRow['needs_attention']);
        $this->assertSame($this->activeDays($high), $highRow['active_days']);

        $highOverview = $dashboard->profile($fajr, $high, 'overview')['payload']['metrics'];
        $this->assertSame(
            MemorisationProgress::query()->where('user_id', $high->id)->whereIn('status', ['memorised', 'mastered'])->count(),
            $highOverview['memorised_ayahs']
        );
        $this->assertSame(
            MemorisationProgress::query()->where('user_id', $high->id)->count(),
            $highOverview['ayahs_practised']
        );
        $this->assertEquals($this->expectedClassRate($fajr), $overview['kpis']['ai_success_rate']);

        $start = now()->subDays(29)->startOfDay();
        $chartSessions = UserSession::query()
            ->whereIn('user_id', $fajrIds)
            ->where('is_onboarding_example', false)
            ->where('last_activity_at', '>=', $start)
            ->count();
        $this->assertSame($chartSessions, $overview['chart']['total']);
        $this->assertGreaterThan(0, $overview['chart']['total']);

        $saved = $dashboard->profile($fajr, $paused, 'practice')['payload']['latest_saved'];
        $this->assertNotNull($saved);
        $this->assertSame('paused', $saved['status']);

        $revision = $dashboard->profile($school, $intervention, 'revision')['payload'];
        $comparison = collect($revision['assignments'])->first(fn (array $row) => ($row['comparison']['available'] ?? false) === true);
        $this->assertNotNull($comparison);
        $this->assertSame(TeacherDemoCatalog::INTERVENTION_BEFORE, $comparison['comparison']['before']['accuracy_percent']);
        $this->assertSame(TeacherDemoCatalog::INTERVENTION_AFTER, $comparison['comparison']['after']['accuracy_percent']);
        $this->assertSame(
            TeacherDemoCatalog::INTERVENTION_AFTER - TeacherDemoCatalog::INTERVENTION_BEFORE,
            $comparison['comparison']['accuracy_delta']
        );
        $this->assertSame(112, $comparison['assignment']['surah_number']);
        $this->assertSame(1, $comparison['assignment']['ayah_start']);
        $this->assertSame(4, $comparison['assignment']['ayah_end']);

        $support = $this->actingAs($intervention)->getJson(route('api.me.support'))->assertOk()->json();
        $this->assertTrue(collect($support['feedback'])->contains(fn (array $note) => $note['body'] === TeacherDemoCatalog::INTERVENTION_FEEDBACK));
        $this->assertFalse(collect($support['feedback'])->contains(fn (array $note) => $note['body'] === TeacherDemoCatalog::PRIVATE_NOTE));
        $this->assertTrue(collect($support['assignments'])->contains(fn (array $row) => ($row['assignment']['surah_number'] ?? null) === 112));

        $teacherNotes = $dashboard->profile($madrassa, $repeated, 'overview')['payload']['notes'];
        $this->assertTrue(collect($teacherNotes)->contains(fn (array $note) => $note['body'] === TeacherDemoCatalog::PRIVATE_NOTE && $note['kind'] === 'note'));
        $repeatedSupport = $dashboard->learnerSupport($repeated);
        $this->assertFalse(collect($repeatedSupport['feedback'])->contains(fn (array $note) => $note['body'] === TeacherDemoCatalog::PRIVATE_NOTE));

        $word = MemorisationWeakSpot::query()
            ->where('user_id', $repeated->id)
            ->where('spot_type', MemorisationWeakSpot::TYPE_WORD)
            ->orderByDesc('affected_attempt_count')
            ->firstOrFail();
        $matchingAttempts = AiReciteAttempt::query()->validScored()->where('user_id', $repeated->id)->get()->filter(function (AiReciteAttempt $attempt) use ($word) {
            foreach ($attempt->word_statuses ?? [] as $status) {
                if (! is_array($status) || ($status['status'] ?? null) !== 'incorrect') {
                    continue;
                }
                if ((int) ($status['surah'] ?? 0) === (int) $word->surah_number
                    && (int) ($status['ayah'] ?? 0) === (int) $word->ayah_number
                    && (int) ($status['word_index'] ?? -1) === (int) $word->word_index) {
                    return true;
                }
            }

            return false;
        });
        $this->assertSame($matchingAttempts->count(), (int) $word->affected_attempt_count);
        $this->assertGreaterThanOrEqual(2, (int) $word->affected_attempt_count);

        $ai = $dashboard->profile($madrassa, $repeated, 'ai')['payload'];
        $unassessed = collect($ai['attempts'])->first(fn (array $attempt) => $attempt['accuracy_percent'] === null);
        $this->assertNotNull($unassessed);
        $this->assertNull($unassessed['issues']['wrong']);
        $this->assertSame('failed', $unassessed['assessment_status']);
        $this->assertSame(8, AiReciteAttempt::query()->validScored()->where('user_id', $repeated->id)->count());
        $this->assertGreaterThanOrEqual(40, $ai['success_rate']);
        $this->assertLessThanOrEqual(64, $ai['success_rate']);

        $latestScored = collect($ai['attempts'])->first(fn (array $attempt) => $attempt['accuracy_percent'] !== null);
        $latestModel = AiReciteAttempt::query()->findOrFail($latestScored['id']);
        $this->assertSame($this->issueCount($latestModel, ['wrong', 'error', 'incorrect', 'red']), $latestScored['issues']['wrong']);
        $this->assertSame($this->issueCount($latestModel, ['missed', 'missing', 'omitted', 'skipped', 'black']), $latestScored['issues']['skipped']);
        $this->assertSame($this->issueCount($latestModel, ['extra', 'grey', 'gray']), $latestScored['issues']['extra']);
        $this->assertSame($this->issueCount($latestModel, ['repeated', 'repeat', 'duplicate']), $latestScored['issues']['repeated']);

        $inactiveRow = collect($dashboard->students($maghrib, ['per_page' => 50])['data'])->firstWhere('id', $inactive->id);
        $this->assertNotNull($inactiveRow);
        $this->assertGreaterThan(0, $inactiveRow['revision_overdue']);
        $this->assertGreaterThan(0, $inactiveRow['assignments']['overdue']);
        $this->assertTrue($inactiveRow['needs_attention']);
        $plans = $dashboard->profile($maghrib, $inactive, 'revision')['payload']['plans'];
        $this->assertTrue(collect($plans)->contains(fn (array $plan) => $plan['overdue'] === true));

        $emptyRow = collect($dashboard->students(User::query()->where('email', 'teacher.demo.school.7a@example.com')->firstOrFail(), ['per_page' => 50])['data'])->firstWhere('id', $empty->id);
        $this->assertSame(1, $emptyRow['sessions']);
        $this->assertNull($emptyRow['ai_success_rate']);
        $minimalAi = $dashboard->profile(User::query()->where('email', 'teacher.demo.school.7b@example.com')->firstOrFail(), $minimal, 'ai')['payload'];
        $this->assertCount(1, $minimalAi['trend']);

        $this->assertTrue(TeacherAssignmentRecipient::query()->where('student_id', $high->id)->where('status', 'completed')->exists());
        $this->assertTrue(TeacherAssignmentRecipient::query()->where('student_id', $repeated->id)->where('status', 'in_progress')->exists());
    }

    private function student(int $number): User
    {
        return User::query()->where('email', sprintf('teacher.demo.student.%02d@example.com', $number))->firstOrFail();
    }

    private function activeDays(User $student): int
    {
        $days = [];
        UserSession::query()
            ->where('user_id', $student->id)
            ->where('is_onboarding_example', false)
            ->whereNotNull('last_activity_at')
            ->get(['last_activity_at'])
            ->each(function (UserSession $session) use (&$days) {
                $days[$session->last_activity_at->toDateString()] = true;
            });
        AiReciteAttempt::query()->where('user_id', $student->id)->get(['created_at'])->each(function (AiReciteAttempt $attempt) use (&$days) {
            if ($attempt->created_at) {
                $days[$attempt->created_at->toDateString()] = true;
            }
        });

        return count($days);
    }

    private function expectedClassRate(User $teacher): float
    {
        $ids = app(StudentAccessAuthorizer::class)->authorizedStudentIds($teacher);
        $rates = [];
        foreach ($ids as $id) {
            $scores = AiReciteAttempt::query()->validScored()->where('user_id', $id)->pluck('accuracy_percent');
            if ($scores->isNotEmpty()) {
                $rates[] = round(((float) $scores->sum()) / $scores->count(), 1);
            }
        }

        return round(array_sum($rates) / count($rates), 1);
    }

    /**
     * @param  list<string>  $tones
     */
    private function issueCount(AiReciteAttempt $attempt, array $tones): int
    {
        $count = 0;
        foreach ($attempt->word_statuses ?? [] as $status) {
            if (! is_array($status)) {
                continue;
            }
            $tone = strtolower((string) ($status['status'] ?? ''));
            if (in_array($tone, $tones, true)) {
                $count++;
            }
        }

        return $count;
    }
}

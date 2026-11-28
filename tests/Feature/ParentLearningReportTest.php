<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\AssignmentStatus;
use App\Enums\ParentGuardianPermission;
use App\Enums\ParentLinkStatus;
use App\Enums\TeacherNoteKind;
use App\Jobs\GenerateParentLearningReportJob;
use App\Models\MemorisationProgress;
use App\Models\Organisation;
use App\Models\ParentLearningReport;
use App\Models\ParentStudentLink;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherNote;
use App\Models\TeacherPrivateNote;
use App\Models\User;
use App\Services\Parent\ParentLearningReportCollector;
use App\Services\Parent\ParentLearningReportGenerator;
use App\Services\Parent\RecordParentLearningReportCollector;
use App\Support\QuranMetadata;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Queue;
use RuntimeException;
use Tests\TestCase;

class ParentLearningReportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableParentFeatures();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_a_weekly_report_counts_only_the_period_and_skips_private_notes(): void
    {
        [$parent, $child] = $this->family('Adam Nasser');
        $this->assignment($child, 1, 1, 2, '2026-11-18 12:00:00', AssignmentStatus::Pending);
        $this->assignment($child, 2, 1, 3, '2026-10-01 12:00:00', AssignmentStatus::Completed);
        $this->practice($child, 1, 1, 'memorised', '2026-11-18 12:00:00');
        $this->practice($child, 1, 2, 'memorised', '2026-10-02 12:00:00');
        $organisation = Organisation::factory()->create();
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
            'name' => 'Hana Yusuf',
        ]);
        $note = TeacherNote::factory()->create([
            'teacher_id' => $teacher->id,
            'student_id' => $child->id,
            'organisation_id' => $teacher->organisation_id,
            'kind' => TeacherNoteKind::Feedback->value,
            'body' => 'SHARED-FEEDBACK-LINE keep the short range calm.',
        ]);
        $note->forceFill(['created_at' => '2026-11-18 12:00:00'])->save();
        TeacherPrivateNote::factory()->create([
            'teacher_id' => $teacher->id,
            'student_id' => $child->id,
            'organisation_id' => $teacher->organisation_id,
            'body' => 'PRIVATE-NOTE-TOKEN',
        ]);

        $this->assertSame(0, Artisan::call('mutqin:generate-parent-reports', [
            '--sync' => true,
            '--start' => '2026-11-16',
        ]));
        $this->assertSame(0, Artisan::call('mutqin:generate-parent-reports', [
            '--sync' => true,
            '--start' => '2026-11-16',
        ]));
        $this->assertSame(1, ParentLearningReport::query()->count());

        $body = $this->actingAs($parent)
            ->getJson(route('api.parent.reports.index', ['cadence' => 'week', 'child_id' => $child->id]))
            ->assertOk()
            ->assertJsonPath('reports.0.assignments.assigned', 1)
            ->assertJsonPath('reports.0.assignments.completed', 0)
            ->assertJsonPath('reports.0.assignments.overdue', 1)
            ->assertJsonPath('reports.0.activity.practice_rows', 1)
            ->assertJsonPath('reports.0.home_practice.items.0.kind', 'assignment')
            ->assertJsonPath('reports.0.wording.is_tajweed', false)
            ->assertJsonPath('reports.0.combined_scores', false)
            ->assertJsonPath('pdf_supported', true)
            ->getContent();

        $this->assertStringContainsString('1 task was set in this period', $body);
        $this->assertStringContainsString(QuranMetadata::name(1), $body);
        $this->assertStringContainsString('SHARED-FEEDBACK-LINE', $body);
        $this->assertStringContainsString('Generated summary', $body);
        $this->assertStringContainsString('"lines"', $body);
        $this->assertStringNotContainsString('not a Tajweed grade', $body);
        $this->assertStringNotContainsString(QuranMetadata::name(2), $body);
        $this->assertStringNotContainsString('PRIVATE-NOTE-TOKEN', $body);
        $this->assertStringNotContainsString('Tajweed proficiency', $body);
    }

    public function test_closed_periods_use_the_previous_week_and_month(): void
    {
        [$parent, $child] = $this->family('Adam Nasser');
        Carbon::setTestNow('2026-11-23 09:00:00');

        Artisan::call('mutqin:generate-parent-reports', ['--sync' => true, '--cadence' => 'week']);
        Artisan::call('mutqin:generate-parent-reports', ['--sync' => true, '--cadence' => 'month']);

        $week = ParentLearningReport::query()->where('cadence', 'week')->first();
        $month = ParentLearningReport::query()->where('cadence', 'month')->first();
        $this->assertSame('2026-11-16', $week?->period_start?->toDateString());
        $this->assertSame('2026-11-22', $week?->period_end?->toDateString());
        $this->assertSame('2026-10-01', $month?->period_start?->toDateString());
        $this->assertSame('2026-10-31', $month?->period_end?->toDateString());

        $this->actingAs($parent)
            ->getJson(route('api.parent.reports.index', ['cadence' => 'month', 'child_id' => $child->id]))
            ->assertOk()
            ->assertJsonPath('reports.0.period_start', '2026-10-01')
            ->assertJsonPath('reports.0.period_end', '2026-10-31')
            ->assertJsonPath('reports.0.insufficient', true);
    }

    public function test_permissions_revocation_and_other_families_hide_reports(): void
    {
        [$parent, $child, $link] = $this->family('Adam Nasser', true);
        $this->assignment($child, 1, 1, 2, '2026-11-18 12:00:00', AssignmentStatus::Pending);
        Artisan::call('mutqin:generate-parent-reports', ['--sync' => true, '--start' => '2026-11-16']);
        $report = ParentLearningReport::query()->firstOrFail();

        $limited = User::factory()->create(['account_role' => AccountRole::Parent->value]);
        ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => $limited->id,
            'student_user_id' => $child->id,
            'permissions' => [ParentGuardianPermission::ViewAttendance->value],
        ]);
        $outsider = User::factory()->create(['account_role' => AccountRole::Parent->value]);
        $other = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'name' => 'Zaynab Isolated',
        ]);
        ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => $outsider->id,
            'student_user_id' => $other->id,
        ]);
        $this->assignment($other, 112, 1, 1, '2026-11-18 12:00:00', AssignmentStatus::Pending);

        $this->actingAs($limited)
            ->getJson(route('api.parent.reports.show', $report))
            ->assertOk()
            ->assertJsonPath('report.assignments', null)
            ->assertJsonPath('report.activity', null)
            ->assertJsonStructure(['report' => ['attendance']]);
        $this->actingAs($outsider)
            ->getJson(route('api.parent.reports.show', $report))
            ->assertNotFound();

        $family = $this->actingAs($parent)
            ->getJson(route('api.parent.reports.index', ['cadence' => 'week']))
            ->assertOk()
            ->assertJsonPath('combined_scores', false)
            ->getContent();
        $this->assertStringContainsString('Adam', $family);
        $this->assertStringNotContainsString('Zaynab', $family);
        $this->assertStringNotContainsString(QuranMetadata::name(112), $family);

        $link->update(['status' => ParentLinkStatus::Revoked->value]);
        $this->actingAs($parent)
            ->getJson(route('api.parent.reports.download', $report))
            ->assertNotFound();
    }

    public function test_missing_data_is_explained_and_a_failed_run_can_be_repeated(): void
    {
        [$parent, $child] = $this->family('Adam Nasser');
        $this->app->bind(ParentLearningReportCollector::class, function () {
            return new class implements ParentLearningReportCollector
            {
                public function collect(User $student, string $cadence, Carbon $from, Carbon $to): array
                {
                    throw new RuntimeException('report failed');
                }
            };
        });
        $this->app->forgetInstance(ParentLearningReportGenerator::class);

        $this->assertSame(0, Artisan::call('mutqin:generate-parent-reports', [
            '--sync' => true,
            '--start' => '2026-11-16',
        ]));
        $this->assertSame(0, ParentLearningReport::query()->count());

        $this->app->bind(ParentLearningReportCollector::class, RecordParentLearningReportCollector::class);
        $this->app->forgetInstance(ParentLearningReportGenerator::class);
        Artisan::call('mutqin:generate-parent-reports', ['--sync' => true, '--start' => '2026-11-16']);

        $body = $this->actingAs($parent)
            ->getJson(route('api.parent.reports.index', ['child_id' => $child->id]))
            ->assertOk()
            ->assertJsonPath('reports.0.insufficient', true)
            ->getContent();
        $this->assertStringContainsString('Not enough shared learning data', $body);
        $this->assertStringContainsString('Ask your child', $body);
    }

    public function test_opted_in_notices_stay_generic_and_generation_is_scheduled(): void
    {
        [$parent, $child] = $this->family('Adam Nasser');
        $this->actingAs($parent)
            ->putJson(route('api.parent.notification-preferences.update'), ['reports' => true])
            ->assertOk()
            ->assertJsonPath('preferences.reports', true);

        Artisan::call('mutqin:generate-parent-reports', ['--sync' => true, '--start' => '2026-11-16']);
        Artisan::call('mutqin:generate-parent-reports', ['--sync' => true, '--start' => '2026-11-16']);

        $notices = $parent->notifications()->get();
        $this->assertCount(1, $notices);
        $data = $notices->first()->data;
        $this->assertSame('A learning report is ready.', $data['body']);
        $this->assertStringNotContainsString('Adam', $data['title'].$data['body']);
        $this->assertStringContainsString('/parent?view=reports&child='.$child->id, (string) $data['href']);

        $report = ParentLearningReport::query()->firstOrFail();
        $download = $this->actingAs($parent)
            ->get(route('api.parent.reports.download', $report))
            ->assertOk();
        $this->assertSame('application/pdf', $download->headers->get('content-type'));
        $this->assertStringStartsWith('%PDF', $download->getContent());
        $this->assertStringContainsString('attachment;', (string) $download->headers->get('content-disposition'));
        $this->assertStringContainsString('.pdf', (string) $download->headers->get('content-disposition'));

        Queue::fake();
        Artisan::call('mutqin:generate-parent-reports', ['--cadence' => 'month']);
        Queue::assertPushed(GenerateParentLearningReportJob::class);

        $commands = collect(app(Schedule::class)->events())->map(fn ($event) => (string) $event->command);
        $this->assertTrue($commands->contains(fn (string $command) => str_contains($command, 'mutqin:generate-parent-reports --cadence=week --sync')));
        $this->assertTrue($commands->contains(fn (string $command) => str_contains($command, 'mutqin:generate-parent-reports --cadence=month --sync')));
    }

    /**
     * @return array{0: User, 1: User, 2?: ParentStudentLink}
     */
    private function family(string $childName, bool $withLink = false): array
    {
        $parent = User::factory()->create(['account_role' => AccountRole::Parent->value]);
        $child = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'name' => $childName,
        ]);
        $link = ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => $parent->id,
            'student_user_id' => $child->id,
        ]);

        return $withLink ? [$parent, $child, $link] : [$parent, $child];
    }

    private function assignment(User $child, int $surah, int $start, int $end, string $due, AssignmentStatus $status): void
    {
        $organisation = Organisation::factory()->create();
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
        ]);
        $assignment = TeacherAssignment::factory()->create([
            'teacher_id' => $teacher->id,
            'organisation_id' => $organisation->id,
            'surah_number' => $surah,
            'ayah_start' => $start,
            'ayah_end' => $end,
            'due_at' => $due,
        ]);
        TeacherAssignmentRecipient::factory()->create([
            'teacher_assignment_id' => $assignment->id,
            'student_id' => $child->id,
            'status' => $status->value,
        ]);
    }

    private function practice(User $child, int $surah, int $ayah, string $status, string $at): void
    {
        $row = MemorisationProgress::query()->create([
            'user_id' => $child->id,
            'surah_number' => $surah,
            'ayah_number' => $ayah,
            'status' => $status,
        ]);
        $row->forceFill(['created_at' => $at])->save();
    }
}

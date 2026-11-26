<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\StudentImportBatchStatus;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\Organisation;
use App\Models\OrganisationMembership;
use App\Models\StudentImportBatch;
use App\Models\User;
use App\Jobs\CommitStudentImportBatchJob;
use App\Jobs\ProcessStudentImportBatchJob;
use App\Services\Organisations\StudentImportProcessingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StudentImportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
        Bus::fake([ProcessStudentImportBatchJob::class, CommitStudentImportBatchJob::class]);
        Storage::fake('student_imports');
        config(['mutqin.student_import.disk' => 'student_imports']);
    }

    public function test_csv_import_stays_in_staging_until_commit(): void
    {
        [$teacher, $group] = $this->managedClassroom();
        $csv = "email,name\nnew.student@example.test,New Student\n";

        $response = $this->actingAs($teacher)->postJson(route('api.teacher.groups.imports.store', $group), [
            'files' => [
                UploadedFile::fake()->createWithContent('roster.csv', $csv),
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('rows.0.normalized.email', 'new.student@example.test');
        $batchId = $response->json('id');
        $this->assertNotNull($batchId);

        $batch = StudentImportBatch::query()->findOrFail($batchId);
        $this->assertSame(StudentImportBatchStatus::Ready, $batch->status);
        $this->assertSame(1, $batch->rows_valid);
        $this->assertDatabaseMissing('users', ['email' => 'new.student@example.test']);

        $this->actingAs($teacher)->postJson(route('api.teacher.imports.commit', $batch))->assertOk();
        $this->assertDatabaseHas('users', ['email' => 'new.student@example.test']);
        $this->assertDatabaseHas('group_memberships', [
            'learning_group_id' => $group->id,
            'status' => MembershipStatus::Approved->value,
        ]);
        $this->assertTrue(
            app(\App\Services\Organisations\StudentAccessAuthorizer::class)
                ->authorizedStudentIds($teacher)
                ->contains(User::query()->where('email', 'new.student@example.test')->value('id')),
        );
    }

    public function test_unsupported_binary_doc_is_reported_on_batch(): void
    {
        [$teacher, $group] = $this->managedClassroom();

        $response = $this->actingAs($teacher)->postJson(route('api.teacher.groups.imports.store', $group), [
            'files' => [
                UploadedFile::fake()->createWithContent('legacy.doc', 'not-a-real-doc', 'application/msword'),
            ],
        ]);

        $response->assertCreated();
        app(StudentImportProcessingService::class)->process((int) $response->json('id'));

        $show = $this->actingAs($teacher)->getJson(route('api.teacher.imports.show', $response->json('id')))->assertOk();
        $this->assertSame('unsupported', $show->json('files.0.status'));
        $this->assertStringContainsString('.doc', (string) $show->json('files.0.error_message'));
    }

    public function test_pasted_text_import_parses_tab_separated_rows(): void
    {
        [$teacher, $group] = $this->managedClassroom();

        $response = $this->actingAs($teacher)->postJson(route('api.teacher.groups.imports.store', $group), [
            'pasted_text' => "email\tname\npaste.student@example.test\tPaste Student\n",
        ]);

        $response->assertCreated();
        app(StudentImportProcessingService::class)->process((int) $response->json('id'));

        $show = $this->actingAs($teacher)->getJson(route('api.teacher.imports.show', $response->json('id')))->assertOk();
        $this->assertSame(1, $show->json('rows_valid'));
        $this->assertSame('paste.student@example.test', $show->json('rows.0.normalized.email'));
    }

    public function test_existing_student_in_same_org_is_matched_and_enrolled_on_commit(): void
    {
        [$teacher, $group] = $this->managedClassroom();
        $existing = User::factory()->create([
            'email' => 'existing@example.test',
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $group->organisation_id,
        ]);

        $response = $this->actingAs($teacher)->postJson(route('api.teacher.groups.imports.store', $group), [
            'pasted_text' => "email,name\nexisting@example.test,Existing Student\n",
        ]);
        $batchId = (int) $response->json('id');
        app(StudentImportProcessingService::class)->process($batchId);

        $show = $this->actingAs($teacher)->getJson(route('api.teacher.imports.show', $batchId))->assertOk();
        $this->assertSame($existing->id, $show->json('rows.0.matched_user_id'));

        $this->actingAs($teacher)->postJson(route('api.teacher.imports.commit', $batchId))->assertOk();
        $this->assertDatabaseHas('group_memberships', [
            'learning_group_id' => $group->id,
            'user_id' => $existing->id,
            'status' => MembershipStatus::Approved->value,
        ]);
        $this->assertSame(1, User::query()->whereRaw('LOWER(email) = ?', ['existing@example.test'])->count());
    }

    public function test_commit_marks_row_failed_when_email_belongs_to_other_institution(): void
    {
        [$teacher, $group] = $this->managedClassroom();
        $otherOrg = Organisation::factory()->create();
        User::factory()->create([
            'email' => 'foreign@example.test',
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $otherOrg->id,
        ]);

        $response = $this->actingAs($teacher)->postJson(route('api.teacher.groups.imports.store', $group), [
            'pasted_text' => "email,name\nforeign@example.test,Foreign Student\n",
        ]);
        $batchId = (int) $response->json('id');
        app(StudentImportProcessingService::class)->process($batchId);

        $commit = $this->actingAs($teacher)->postJson(route('api.teacher.imports.commit', $batchId))->assertOk();
        $this->assertSame('failed', $commit->json('rows.0.status'));
        $this->assertStringContainsString('another institution', implode(' ', $commit->json('rows.0.errors') ?? []));
    }

    public function test_large_batch_commit_is_queued_async(): void
    {
        Bus::fake([ProcessStudentImportBatchJob::class, CommitStudentImportBatchJob::class]);
        [$teacher, $group] = $this->managedClassroom();

        $lines = ["email,name"];
        for ($i = 1; $i <= 51; $i++) {
            $lines[] = "bulk{$i}@example.test,Student {$i}";
        }
        $response = $this->actingAs($teacher)->postJson(route('api.teacher.groups.imports.store', $group), [
            'pasted_text' => implode("\n", $lines)."\n",
        ]);
        $batchId = (int) $response->json('id');
        app(StudentImportProcessingService::class)->process($batchId);

        $commit = $this->actingAs($teacher)->postJson(route('api.teacher.imports.commit', $batchId))->assertOk();
        $this->assertTrue($commit->json('queued'));
        Bus::assertDispatched(CommitStudentImportBatchJob::class);
    }

    public function test_csv_import_benchmark_100_rows_under_five_seconds(): void
    {
        [$teacher, $group] = $this->managedClassroom();
        $lines = ["email,name"];
        for ($i = 1; $i <= 100; $i++) {
            $lines[] = "bench{$i}@example.test,Bench {$i}";
        }
        $csv = implode("\n", $lines)."\n";

        $response = $this->actingAs($teacher)->postJson(route('api.teacher.groups.imports.store', $group), [
            'files' => [
                UploadedFile::fake()->createWithContent('bench-100.csv', $csv),
            ],
        ])->assertCreated();

        $started = microtime(true);
        app(StudentImportProcessingService::class)->process((int) $response->json('id'));
        $elapsed = microtime(true) - $started;

        $batch = StudentImportBatch::query()->findOrFail((int) $response->json('id'));
        $this->assertSame(100, $batch->rows_valid);
        $this->assertLessThan(5.0, $elapsed, 'Processing 100 roster rows should stay under 5 seconds in CI');
    }

    public function test_process_endpoint_parses_pending_upload(): void
    {
        [$teacher, $group] = $this->managedClassroom();
        $csv = "email,name\nreprocess@example.test,Reprocess\n";

        $response = $this->actingAs($teacher)->postJson(route('api.teacher.groups.imports.store', $group), [
            'files' => [
                UploadedFile::fake()->createWithContent('roster.csv', $csv),
            ],
        ])->assertCreated();

        $batchId = (int) $response->json('id');
        $this->assertSame(StudentImportBatchStatus::Ready, StudentImportBatch::query()->findOrFail($batchId)->status);

        $stuck = StudentImportBatch::query()->findOrFail($batchId);
        $stuck->forceFill(['status' => StudentImportBatchStatus::Uploaded, 'progress_percent' => 0])->save();
        $stuck->files()->update(['status' => 'pending']);
        $stuck->rows()->delete();

        $this->actingAs($teacher)->postJson(route('api.teacher.imports.process', $stuck))->assertOk()
            ->assertJsonPath('status', StudentImportBatchStatus::Ready->value)
            ->assertJsonPath('rows.0.normalized.email', 'reprocess@example.test');
    }

    public function test_teacher_outside_group_cannot_view_batch(): void
    {
        [$teacher, $group] = $this->managedClassroom();
        $other = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $teacher->organisation_id,
        ]);

        $batch = StudentImportBatch::query()->create([
            'organisation_id' => $group->organisation_id,
            'learning_group_id' => $group->id,
            'initiated_by_user_id' => $teacher->id,
            'status' => StudentImportBatchStatus::Uploaded,
        ]);

        $this->actingAs($other)->getJson(route('api.teacher.imports.show', $batch))->assertForbidden();
    }

    /**
     * @return array{0: User, 1: LearningGroup}
     */
    private function managedClassroom(): array
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
        ]);
        $group = LearningGroup::factory()->create(['organisation_id' => $organisation->id]);
        GroupMembership::factory()->create([
            'learning_group_id' => $group->id,
            'user_id' => $teacher->id,
            'membership_role' => MembershipRole::Teacher->value,
            'status' => MembershipStatus::Approved->value,
        ]);

        return [$teacher, $group];
    }
}
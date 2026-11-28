<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\TeacherAssignmentAudioRole;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\Organisation;
use App\Models\OrganisationMembership;
use App\Models\ParentStudentLink;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentAudioAsset;
use App\Models\TeacherAssignmentRecipient;
use App\Models\User;
use App\Support\DemoRecitationAudio;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TeacherAssignmentVoiceInstructionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
        $this->enableParentFeatures();
    }

    public function test_teacher_can_attach_voice_instructions_when_creating_assignment(): void
    {
        Storage::fake('user_files');
        [$teacher, $student] = $this->classroom();

        $response = $this->actingAs($teacher)->postJson(route('api.teacher.assignments.store'), [
            'kind' => 'practice',
            'hifz_category' => 'sabaq',
            'activity' => 'hifz',
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 3,
            'repetition_target' => 3,
            'due_at' => now()->addDays(2)->toDateString(),
            'student_id' => $student->id,
            'feedback' => 'Memorise with tajweed.',
            'instruction_audio' => UploadedFile::fake()->createWithContent(
                'instruction.wav',
                DemoRecitationAudio::silentWavBytes(900),
            ),
            'instruction_audio_duration_ms' => 900,
        ]);

        $response->assertCreated()
            ->assertJsonPath('assignment.voice_instructions.instruction.available', true);

        $assignmentId = (int) $response->json('assignment.id');
        $this->assertNotNull(TeacherAssignment::query()->findOrFail($assignmentId)->instruction_audio_asset_id);

        $this->actingAs($student)->get($response->json('assignment.voice_instructions.instruction.url'))
            ->assertOk();
    }

    public function test_failed_instruction_upload_blocks_assignment_publish(): void
    {
        [$teacher, $student] = $this->classroom();

        $this->actingAs($teacher)->postJson(route('api.teacher.assignments.store'), [
            'kind' => 'practice',
            'hifz_category' => 'sabaq',
            'activity' => 'hifz',
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 3,
            'repetition_target' => 3,
            'due_at' => now()->addDays(2)->toDateString(),
            'student_id' => $student->id,
            'instruction_audio' => UploadedFile::fake()->create('instruction.txt', 4, 'text/plain'),
            'instruction_audio_duration_ms' => 1200,
        ])->assertUnprocessable();

        $this->assertSame(0, TeacherAssignment::query()->count());
    }

    public function test_linked_parent_can_stream_assignment_voice_instructions(): void
    {
        Storage::fake('user_files');
        [$teacher, $student, $parent] = $this->classroomWithParent();

        $created = $this->actingAs($teacher)->postJson(route('api.teacher.assignments.store'), [
            'kind' => 'practice',
            'hifz_category' => 'sabaq',
            'activity' => 'hifz',
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 3,
            'repetition_target' => 3,
            'due_at' => now()->addDays(2)->toDateString(),
            'student_id' => $student->id,
            'feedback' => 'Practice with rhythm.',
            'instruction_audio' => UploadedFile::fake()->createWithContent(
                'instruction.wav',
                DemoRecitationAudio::silentWavBytes(900),
            ),
            'instruction_audio_duration_ms' => 900,
        ])->assertCreated();

        $recipientId = (int) $created->json('recipients.0.id');

        $row = collect($this->actingAs($parent)
            ->getJson(route('api.parent.children.assignments', $student))
            ->assertOk()
            ->json('assignments'))
            ->firstWhere('id', $recipientId);
        $this->assertNotNull($row);
        $this->assertTrue((bool) ($row['assignment']['voice_instructions']['instruction']['available'] ?? false));

        $this->actingAs($parent)
            ->get($row['assignment']['voice_instructions']['instruction']['url'])
            ->assertOk();
    }

    public function test_duplicate_assignment_reuses_authorised_instruction_audio_asset(): void
    {
        Storage::fake('user_files');
        [$teacher, $student] = $this->classroom();
        $asset = new TeacherAssignmentAudioAsset;
        $asset->forceFill([
            'teacher_id' => $teacher->id,
            'organisation_id' => $teacher->organisation_id,
            'role' => TeacherAssignmentAudioRole::Instruction->value,
            'audio_disk' => 'user_files',
            'audio_path' => 'teacher-assignment-audio/test.webm',
            'audio_mime' => 'audio/webm',
            'audio_bytes' => 32,
            'audio_duration_ms' => 1500,
        ])->save();
        Storage::disk('user_files')->put($asset->audio_path, 'audio');

        $source = TeacherAssignment::factory()->create([
            'teacher_id' => $teacher->id,
            'organisation_id' => $teacher->organisation_id,
            'instruction_audio_asset_id' => $asset->id,
        ]);
        TeacherAssignmentRecipient::factory()->create([
            'teacher_assignment_id' => $source->id,
            'student_id' => $student->id,
        ]);

        $response = $this->actingAs($teacher)->postJson(route('api.teacher.assignments.duplicate', $source), [
            'student_id' => $student->id,
            'allow_duplicate' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('assignment.voice_instructions.instruction.available', true);

        $duplicateId = (int) $response->json('assignment.id');
        $this->assertSame($asset->id, TeacherAssignment::query()->findOrFail($duplicateId)->instruction_audio_asset_id);
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

    /**
     * @return array{0: User, 1: User, 2: User}
     */
    private function classroomWithParent(): array
    {
        [$teacher, $student] = $this->classroom();
        $parent = User::factory()->create([
            'account_role' => AccountRole::Parent->value,
        ]);
        ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => $parent->id,
            'student_user_id' => $student->id,
        ]);

        return [$teacher, $student, $parent];
    }
}
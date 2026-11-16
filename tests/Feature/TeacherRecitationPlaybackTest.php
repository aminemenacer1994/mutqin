<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\AiReciteAttempt;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\MemorisationAssessment;
use App\Models\Organisation;
use App\Models\TeacherAssignment;
use App\Models\TeacherPrivateNote;
use App\Models\TeacherWordCoaching;
use App\Models\User;
use App\Services\Teacher\TeacherWordCoachingService;
use App\Support\DemoRecitationAudio;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TeacherRecitationPlaybackTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
    }

    public function test_teacher_playback_uses_stored_word_timings_and_review_actions(): void
    {
        Storage::fake('user_files');
        [$teacher, $student, $hidden] = $this->classroom();
        $task = $this->actingAs($teacher)->postJson(route('api.teacher.assignments.store'), [
            'kind' => 'ai_recite',
            'hifz_category' => 'sabaq',
            'student_id' => $student->id,
            'surah_number' => 114,
            'ayah_start' => 1,
            'ayah_end' => 2,
            'due_at' => today()->addDays(3)->toDateString(),
            'feedback' => 'Slow the middle',
        ])->assertCreated()->json();

        $recipientId = $task['recipients'][0]['id'];
        $start = $this->actingAs($student)->postJson(route('api.me.assignments.start', $recipientId))
            ->assertOk()->json();
        $this->assertStringContainsString('assignment_recipient='.$recipientId, $start['href']);
        $this->actingAs($student)->postJson(route('api.me.assignments.complete', $recipientId))->assertStatus(422);

        $assessment = MemorisationAssessment::query()->create([
            'user_id' => $student->id,
            'idempotency_key' => 'playback-review',
            'surah_number' => 114,
            'start_ayah' => 1,
            'end_ayah' => 2,
            'assessment_type' => 'memorisation_detection',
            'status' => MemorisationAssessment::STATUS_COMPLETED,
            'recognition_data' => [
                'alignment' => [
                    'word_results' => [
                        ['ayah' => 1, 'word_index' => 1, 'start' => 0.4, 'end' => 0.9, 'confidence' => 0.62],
                    ],
                ],
            ],
        ]);
        $attempt = AiReciteAttempt::query()->create([
            'user_id' => $student->id,
            'teacher_assignment_recipient_id' => $task['recipients'][0]['id'],
            'memorisation_assessment_id' => $assessment->id,
            'attempt_number' => 1,
            'accuracy_percent' => 80,
            'band' => 'mixed',
            'duration_ms' => 4200,
            'ayah_range' => ['surah' => 114, 'from' => 1, 'to' => 2, 'surah_name' => 'An-Nas'],
            'word_statuses' => [
                ['ayah' => 1, 'word_index' => 0, 'status' => 'correct', 'text' => 'قُلْ', 'start' => 0.1, 'end' => 0.4, 'confidence' => 0.91],
                ['ayah' => 1, 'word_index' => 1, 'status' => 'wrong', 'type' => 'SUBSTITUTION', 'text' => 'أَعُوذُ', 'recognised_word' => 'اعوذ'],
                ['ayah' => 1, 'word_index' => 2, 'status' => 'partial', 'text' => 'بِرَبِّ'],
                ['ayah' => 2, 'word_index' => 0, 'status' => 'skipped', 'text' => 'word'],
            ],
        ]);

        $playback = $this->actingAs($teacher)
            ->getJson(route('api.teacher.students.attempts.playback', [$student, $attempt]))
            ->assertOk()
            ->assertJsonPath('student.name', 'Authorised Student')
            ->assertJsonPath('assignment.title', 'Slow the middle')
            ->assertJsonPath('range.surah_name', 'An-Nas')
            ->assertJsonPath('range.from', 1)
            ->assertJsonPath('range.to', 2)
            ->assertJsonPath('duration_ms', 4200)
            ->assertJsonPath('accuracy_percent', 80)
            ->assertJsonPath('review.status', 'pending')
            ->assertJsonPath('timing.timed_words', 2)
            ->assertJsonPath('suggested_revision.focused', true)
            ->assertJsonPath('suggested_revision.ayah_start', 1)
            ->assertJsonPath('suggested_revision.ayah_end', 2)
            ->json();

        $this->assertSame(0.1, $playback['words'][0]['start']);
        $this->assertSame(0.4, $playback['words'][0]['end']);
        $this->assertSame(0.91, $playback['words'][0]['confidence']);
        $this->assertSame(0.4, $playback['words'][1]['start']);
        $this->assertSame(0.9, $playback['words'][1]['end']);
        $this->assertSame('اعوذ', $playback['words'][1]['recognised']);
        $this->assertSame('SUBSTITUTION', $playback['words'][1]['error_type']);
        $this->assertArrayNotHasKey('start', $playback['words'][2]);
        $this->assertArrayNotHasKey('text', $playback['words'][3]);
        $this->assertNull($playback['review']['private_note']);

        $this->actingAs($hidden)
            ->getJson(route('api.teacher.students.attempts.playback', [$student, $attempt]))
            ->assertNotFound();
        $this->actingAs($student)
            ->getJson(route('api.teacher.students.attempts.playback', [$student, $attempt]))
            ->assertForbidden();
        $this->actingAs($student)
            ->postJson(route('api.teacher.students.attempts.playback.review', [$student, $attempt]))
            ->assertForbidden();

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.attempts.playback.feedback', [$student, $attempt]), [
                'body' => 'Stretch the madd.',
                'client_message_id' => '11111111-1111-4111-8111-111111111111',
            ])
            ->assertCreated()
            ->assertJsonPath('review.feedback.body', 'Stretch the madd.');
        $notesBeforeRetry = \App\Models\TeacherNote::query()->count();
        $this->actingAs($teacher)->postJson(route('api.teacher.students.attempts.playback.feedback', [$student, $attempt]), [
            'body' => 'Stretch the madd.',
            'client_message_id' => '11111111-1111-4111-8111-111111111111',
        ])->assertCreated();
        $this->assertSame($notesBeforeRetry, \App\Models\TeacherNote::query()->count());


        $this->actingAs($teacher)
            ->post(route('api.teacher.students.attempts.playback.feedback', [$student, $attempt]), [
                'body' => 'Listen once more.',
                'audio' => UploadedFile::fake()->createWithContent('voice.wav', DemoRecitationAudio::silentWavBytes(800)),
                'duration_ms' => 800,
            ])
            ->assertCreated()
            ->assertJsonPath('review.feedback.has_audio', true)
            ->assertJsonPath('review.feedback.body', 'Listen once more.');

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.attempts.playback.private-note', [$student, $attempt]), [
                'body' => 'Only the teacher should see this.',
            ])
            ->assertCreated()
            ->assertJsonPath('review.private_note.body', 'Only the teacher should see this.');

        $this->assertSame(1, TeacherPrivateNote::query()->where('student_id', $student->id)->count());
        $this->actingAs($student)
            ->getJson(route('api.teacher.students.attempts.playback', [$student, $attempt]))
            ->assertForbidden();

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.attempts.playback.revision', [$student, $attempt]), [
                'due_at' => today()->addDays(7)->toDateString(),
                'feedback' => 'Repeat ayah 1 slowly.',
            ])
            ->assertCreated()
            ->assertJsonPath('review.revision.title', 'Repeat ayah 1 slowly.')
            ->assertJsonPath('review.revision.ayah_start', 1);

        $this->assertTrue(TeacherAssignment::query()->where('teacher_id', $teacher->id)->where('hifz_category', 'sabqi')->exists());
        $revision = TeacherAssignment::query()->where('teacher_id', $teacher->id)->where('hifz_category', 'sabqi')->firstOrFail();
        $countBeforeRetry = TeacherAssignment::query()->count();
        $this->actingAs($teacher)->postJson(route('api.teacher.students.attempts.playback.revision', [$student, $attempt]), [
            'due_at' => today()->addDays(3)->toDateString(),
            'feedback' => 'Repeat ayah 1 slowly.',
        ])->assertCreated();
        $this->assertSame($countBeforeRetry, TeacherAssignment::query()->count(), 'Retry must not duplicate the revision');
        $support = $this->actingAs($student)->getJson(route('api.me.support'))->assertOk();
        $this->assertStringNotContainsString('Only the teacher should see this.', $support->getContent());
        $this->assertStringContainsString('Listen once more.', $support->getContent());
        $revisionRow = collect($support->json('assignments'))->firstWhere('assignment.id', $revision->id);
        $this->assertNotNull($revisionRow, 'The assigned revision reaches the original student');
        $revisionStart = $this->actingAs($student)->postJson(route('api.me.assignments.start', $revisionRow['id']))->assertOk()->json();
        $this->assertStringContainsString('assignment_recipient='.$revisionRow['id'], $revisionStart['href']);
        $this->assertSame(114, $revisionRow['assignment']['surah_number']);
        $this->assertSame(1, $revisionRow['assignment']['ayah_start']);
        $this->assertSame(2, $revisionRow['assignment']['ayah_end']);
        $this->actingAs($student)->postJson(route('api.me.assignments.complete', $revisionRow['id']))->assertStatus(422);
        $retry = $attempt->replicate();
        $retry->forceFill([
            'teacher_assignment_recipient_id' => $revisionRow['id'],
            'memorisation_assessment_id' => null,
            'attempt_number' => 2,
            'accuracy_percent' => 100,
            'word_statuses' => [
                ['ayah' => 1, 'word_index' => 0, 'status' => 'correct'],
                ['ayah' => 1, 'word_index' => 1, 'status' => 'correct'],
                ['ayah' => 1, 'word_index' => 2, 'status' => 'correct'],
                ['ayah' => 2, 'word_index' => 0, 'status' => 'correct'],
            ],
        ])->save();
        $this->actingAs($student)->postJson(route('api.me.assignments.complete', $revisionRow['id']))->assertOk();
        $this->actingAs($teacher)->getJson(route('api.teacher.students.attempts.playback', [$student, $retry]))
            ->assertOk()->assertJsonPath('accuracy_percent', 100);


        $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.attempts.playback.review', [$student, $attempt]))
            ->assertOk()
            ->assertJsonPath('review.status', 'reviewed');

        $listed = $this->actingAs($teacher)
            ->getJson(route('api.teacher.students.show', ['student' => $student, 'section' => 'ai']))
            ->assertOk()
            ->json('payload.attempts');
        $listed = collect($listed)->firstWhere('id', $attempt->id)['evidence']['words'];
        $this->assertSame(0.1, $listed[0]['start']);
        $this->assertArrayNotHasKey('start', $listed[2]);
    }

    public function test_word_coaching_keeps_the_checker_result_and_links_a_real_retry(): void
    {
        Storage::fake('user_files');
        [$teacher, $student, $hidden] = $this->classroom();
        $attempt = $this->recitation($student);

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.attempts.playback.words', [$student, $attempt]), [
                'ayah' => 1,
                'word_index' => 1,
                'action' => 'confirm',
            ])
            ->assertOk()
            ->assertJsonPath('coachings.0.ai.status', 'wrong')
            ->assertJsonPath('coachings.0.ai.recognised', 'اعوذ')
            ->assertJsonPath('coachings.0.ai.error_type', 'SUBSTITUTION')
            ->assertJsonPath('coachings.0.decision', 'confirmed')
            ->assertJsonPath('coachings.0.segment.start', 0.4);

        $attempt->refresh();
        $this->assertSame('wrong', $attempt->word_statuses[1]['status']);
        $this->assertSame('اعوذ', $attempt->word_statuses[1]['recognised_word']);

        $this->actingAs($student)
            ->getJson(route('api.me.support'))
            ->assertOk()
            ->assertJsonPath('learning.word_corrections', []);

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.attempts.playback.private-note', [$student, $attempt]), [
                'body' => 'Only the teacher should see this coaching note.',
            ])
            ->assertCreated();

        $saved = $this->actingAs($teacher)
            ->post(route('api.teacher.students.attempts.playback.words', [$student, $attempt]), [
                'ayah' => 1,
                'word_index' => 1,
                'action' => 'correct',
                'body' => 'Hold the madd a little longer.',
                'audio' => UploadedFile::fake()->createWithContent('voice.wav', DemoRecitationAudio::silentWavBytes(800)),
                'duration_ms' => 800,
            ])
            ->assertCreated()
            ->assertJsonPath('coachings.0.corrections.0.body', 'Hold the madd a little longer.')
            ->assertJsonPath('coachings.0.corrections.0.audio.available', true)
            ->json();

        $audioUrl = $saved['coachings'][0]['corrections'][0]['audio']['url'];
        $this->actingAs($teacher)->get($audioUrl)->assertOk();
        $this->actingAs($student)->get($audioUrl)->assertOk();
        $this->actingAs($hidden)->get($audioUrl)->assertNotFound();

        $support = $this->actingAs($student)->getJson(route('api.me.support'))->assertOk();
        $support->assertJsonPath('learning.word_corrections.0.corrections.0.body', 'Hold the madd a little longer.');
        $support->assertJsonMissingPath('learning.word_corrections.0.decision');
        $this->assertStringNotContainsString('Only the teacher should see this coaching note.', $support->getContent());

        $this->actingAs($student)
            ->postJson(route('api.teacher.students.attempts.playback.words', [$student, $attempt]), [
                'ayah' => 1,
                'word_index' => 1,
                'action' => 'confirm',
            ])
            ->assertForbidden();

        $this->actingAs($teacher)
            ->post(route('api.teacher.students.attempts.playback.words', [$student, $attempt]), [
                'ayah' => 1,
                'word_index' => 1,
                'action' => 'correct',
                'audio' => UploadedFile::fake()->create('notes.txt', 20, 'text/plain'),
            ])
            ->assertStatus(422);

        $this->actingAs($hidden)
            ->postJson(route('api.teacher.students.attempts.playback.words', [$student, $attempt]), [
                'ayah' => 1,
                'word_index' => 1,
                'action' => 'dismiss',
            ])
            ->assertNotFound();

        $correctionId = $saved['coachings'][0]['corrections'][0]['id'];
        $this->actingAs($teacher)
            ->deleteJson(route('api.teacher.students.attempts.playback.corrections.audio.destroy', [$student, $attempt, $correctionId]))
            ->assertOk()
            ->assertJsonPath('coachings.0.corrections.0.audio.available', false);
        $this->actingAs($student)->get($audioUrl)->assertNotFound();

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.attempts.playback.words', [$student, $attempt]), [
                'ayah' => 1,
                'word_index' => 1,
                'action' => 'retry',
            ])
            ->assertOk()
            ->assertJsonPath('coachings.0.review_status', 'awaiting_retry');

        $coachingId = (int) TeacherWordCoaching::query()->value('id');
        $unrelated = AiReciteAttempt::query()->create([
            'user_id' => $student->id,
            'attempt_number' => 2,
            'accuracy_percent' => 70,
            'band' => 'mixed',
            'ayah_range' => ['surah' => 114, 'from' => 1, 'to' => 1],
            'word_statuses' => [
                ['ayah' => 1, 'word_index' => 0, 'status' => 'correct', 'text' => 'قُلْ'],
            ],
        ]);
        $coachings = app(TeacherWordCoachingService::class);
        $this->assertTrue($coachings->attachRetry($student, $coachingId, (int) $unrelated->id));
        $this->assertSame('awaiting_retry', TeacherWordCoaching::query()->find($coachingId)->review_status);

        $retry = AiReciteAttempt::query()->create([
            'user_id' => $student->id,
            'attempt_number' => 3,
            'accuracy_percent' => 96,
            'band' => 'strong',
            'ayah_range' => ['surah' => 114, 'from' => 1, 'to' => 1],
            'word_statuses' => [
                ['ayah' => 1, 'word_index' => 1, 'status' => 'correct', 'text' => 'أَعُوذُ'],
            ],
        ]);
        $this->assertTrue($coachings->attachRetry($student, $coachingId, (int) $retry->id));
        $row = TeacherWordCoaching::query()->find($coachingId);
        $this->assertSame(TeacherWordCoaching::IMPROVED, $row->review_status);
        $this->assertSame(TeacherWordCoaching::BASIS_COMPARABLE, $row->improvement_basis);
        $this->assertSame((int) $retry->id, (int) $row->latest_retry_attempt_id);
        $this->assertSame('wrong', $attempt->fresh()->word_statuses[1]['status']);

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.attempts.playback.words', [$student, $attempt]), [
                'ayah' => 9,
                'word_index' => 0,
                'action' => 'reviewed',
            ])
            ->assertStatus(422);
    }

    private function recitation(User $student): \App\Models\AiReciteAttempt
    {
        $assessment = MemorisationAssessment::query()->create([
            'user_id' => $student->id,
            'idempotency_key' => 'word-coaching-'.$student->id,
            'surah_number' => 114,
            'start_ayah' => 1,
            'end_ayah' => 2,
            'assessment_type' => 'memorisation_detection',
            'status' => MemorisationAssessment::STATUS_COMPLETED,
            'recognition_data' => [
                'alignment' => [
                    'word_results' => [
                        ['ayah' => 1, 'word_index' => 1, 'start' => 0.4, 'end' => 0.9, 'confidence' => 0.62],
                    ],
                ],
            ],
        ]);

        return \App\Models\AiReciteAttempt::query()->create([
            'user_id' => $student->id,
            'memorisation_assessment_id' => $assessment->id,
            'attempt_number' => 1,
            'accuracy_percent' => 80,
            'band' => 'mixed',
            'duration_ms' => 4200,
            'ayah_range' => ['surah' => 114, 'from' => 1, 'to' => 2, 'surah_name' => 'An-Nas'],
            'word_statuses' => [
                ['ayah' => 1, 'word_index' => 0, 'status' => 'correct', 'text' => 'قُلْ', 'start' => 0.1, 'end' => 0.4],
                ['ayah' => 1, 'word_index' => 1, 'status' => 'wrong', 'type' => 'SUBSTITUTION', 'text' => 'أَعُوذُ', 'recognised_word' => 'اعوذ'],
            ],
        ]);
    }

    /**
     * @return array{0: User, 1: User, 2: User}
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
            'name' => 'Authorised Student',
        ]);
        $hidden = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
            'name' => 'Other Teacher',
        ]);
        $group = LearningGroup::factory()->create(['organisation_id' => $organisation->id]);
        $otherGroup = LearningGroup::factory()->create(['organisation_id' => $organisation->id]);

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
        GroupMembership::factory()->create([
            'learning_group_id' => $otherGroup->id,
            'user_id' => $hidden->id,
            'membership_role' => MembershipRole::Teacher->value,
            'status' => MembershipStatus::Approved->value,
        ]);

        return [$teacher, $student, $hidden];
    }
}

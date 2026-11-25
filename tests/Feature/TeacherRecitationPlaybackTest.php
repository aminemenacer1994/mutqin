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
        Storage::fake('local');
        config(['mutqin.audio_privacy.raw_recording_retention' => 'retain']);
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
                'tajweed_practice_check' => [
                    'version' => 2,
                    'assessed' => true,
                    'band' => 'needs_work',
                    'headline' => 'Hold madd a little longer.',
                    'summary' => 'One segment was short.',
                    'segments' => [
                        [
                            'verseKey' => '114:1',
                            'wordIndex' => 1,
                            'ruleKey' => 'madd',
                            'word' => 'أَعُوذُ',
                            'outcome' => 'practice',
                            'hold' => 'short',
                        ],
                        [
                            'verseKey' => '114:1',
                            'wordIndex' => 2,
                            'ruleKey' => 'silent',
                            'outcome' => 'strong',
                        ],
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
            ->assertJsonPath('tajweed_practice_suggestion.authority', 'ai_practice_check')
            ->assertJsonPath('tajweed_practice_suggestion.is_tajweed_assessment', false)
            ->assertJsonPath('tajweed_practice_suggestion.band', 'needs_work')
            ->assertJsonPath('tajweed_practice_suggestion.segments.0.rule_key', 'madd')
            ->assertJsonCount(1, 'tajweed_practice_suggestion.segments')
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
        $this->actingAs($student)->postJson(route('api.me.assignments.complete', $revisionRow['id']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('audio');
        $this->actingAs($student)->post('/api/ai-recite-attempts/'.$retry->id.'/audio', [
            'audio' => UploadedFile::fake()->createWithContent('recitation.webm', str_repeat('R', 2048)),
            'duration_ms' => 1800,
        ], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('audio.available', true);
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

    public function test_teaching_workflow_keeps_audio_assessment_and_ai_flags_distinct(): void
    {
        Storage::fake('local');
        config(['mutqin.audio_privacy.raw_recording_retention' => 'retain']);
        [$teacher, $student] = $this->classroom();
        $attempt = $this->recitation($student);
        $attempt->forceFill([
            'teacher_assignment_recipient_id' => $this->openTask($teacher, $student),
        ])->save();

        $this->actingAs($student)->post('/api/ai-recite-attempts/'.$attempt->id.'/audio', [
            'audio' => UploadedFile::fake()->createWithContent('recitation.webm', str_repeat('R', 4096)),
            'duration_ms' => 2200,
        ], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('audio.available', true);

        $this->actingAs($teacher)->get('/api/ai-recite-attempts/'.$attempt->id.'/audio')->assertOk();
        $playback = $this->actingAs($teacher)
            ->getJson(route('api.teacher.students.attempts.playback', [$student, $attempt]))
            ->assertOk()
            ->assertJsonPath('audio.available', true)
            ->assertJsonPath('audio.reason', 'available')
            ->json();
        $this->assertSame('wrong', $playback['words'][1]['status']);

        $words = $attempt->word_statuses;
        $saved = $this->actingAs($teacher)->putJson(route('api.teacher.students.attempts.assess', [$student, $attempt]), [
            'memorisation' => ['rating' => 'needs_work', 'note' => 'The second word dropped out.'],
            'tajweed' => ['rating' => 'sound', 'note' => 'Madd length is acceptable.'],
            'pronunciation' => ['rating' => 'needs_work', 'note' => 'Clarify the qaf.'],
            'fluency' => ['rating' => 'strong', 'note' => null],
            'general' => 'Repeat ayah 1 slowly.',
        ])->assertOk()
            ->assertJsonPath('assessment.source', 'teacher')
            ->assertJsonPath('assessment.observations.memorisation.rating', 'needs_work')
            ->assertJsonPath('assessment.observations.tajweed.rating', 'sound')
            ->assertJsonPath('assessment.score', 4)
            ->json();
        $this->assertArrayNotHasKey('tajweed_score', $saved['assessment']['observations']['pronunciation']);
        $attempt->refresh();
        $this->assertSame($words, $attempt->word_statuses);
        $this->assertSame(80, (int) $attempt->accuracy_percent);

        $this->actingAs($teacher)->putJson(route('api.teacher.students.attempts.assess', [$student, $attempt]), [
            'memorisation' => ['rating' => 'needs_work', 'note' => 'The second word dropped out.'],
            'tajweed' => ['rating' => 'sound', 'note' => 'Madd length is acceptable.'],
            'pronunciation' => ['rating' => 'needs_work', 'note' => 'Keep the qaf clear.'],
            'fluency' => ['rating' => 'strong'],
            'general' => 'Repeat ayah 1 slowly.',
        ])->assertOk();
        $this->assertSame(1, \App\Models\TeacherRecitationAssessment::query()->count());
        $this->assertSame(1, \App\Models\TeacherNote::query()->where('kind', 'feedback')->count());

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.attempts.playback.words', [$student, $attempt]), [
                'ayah' => 1,
                'word_index' => 1,
                'action' => 'confirm',
            ])->assertOk();
        $noted = $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.attempts.playback.words', [$student, $attempt]), [
                'ayah' => 1,
                'word_index' => 1,
                'action' => 'correct',
                'body' => 'Hold the ghunnah.',
                'focus' => 'ghunnah',
                'finding' => 'difficulty',
            ])->assertCreated()->json();
        $correctionId = $noted['coachings'][0]['corrections'][0]['id'];
        $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.attempts.playback.words', [$student, $attempt]), [
                'ayah' => 1,
                'word_index' => 1,
                'action' => 'correct',
                'correction_id' => $correctionId,
                'body' => 'Hold the ghunnah a little longer.',
                'focus' => 'ghunnah',
                'finding' => 'difficulty',
            ])->assertCreated();
        $this->assertSame(1, \App\Models\TeacherWordCoachingCorrection::query()->count());

        $profile = $this->actingAs($teacher)->getJson(route('api.teacher.students.show', $student))->assertOk()->json();
        $observations = collect($profile['payload']['teaching']['practice_areas']['teacher_observations']);
        $ghunnah = $observations->firstWhere('category', 'ghunnah');
        $this->assertNotNull($ghunnah);
        $this->assertSame(1, $ghunnah['count']);
        $this->assertFalse($ghunnah['ai_wording_flag']);
        $this->assertSame('teacher_observation', $ghunnah['kind']);
        $this->assertNotNull($observations->firstWhere('category', 'memorisation'));
        $this->assertNotNull($observations->firstWhere('category', 'pronunciation'));
        foreach ($profile['payload']['teaching']['practice_areas']['teacher_confirmed'] as $row) {
            $this->assertNotSame('teacher_observation', $row['kind']);
        }

        $revision = $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.attempts.playback.revision', [$student, $attempt]), [
                'due_at' => today()->addDays(4)->toDateString(),
                'feedback' => 'Revise the dropped word.',
            ])->assertCreated()
            ->assertJsonPath('review.revision.source_attempt_id', $attempt->id)
            ->assertJsonPath('review.revision.follow_up.submitted', false)
            ->json();
        $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.attempts.playback.revision', [$student, $attempt]), [
                'due_at' => today()->addDays(2)->toDateString(),
                'feedback' => 'Revise the dropped word.',
            ])->assertCreated();
        $this->assertSame(1, \App\Models\TeacherAssignment::query()->whereNotNull('source_ai_recite_attempt_id')->count());

        $recipientId = \App\Models\TeacherAssignmentRecipient::query()
            ->where('teacher_assignment_id', $revision['review']['revision']['id'])
            ->value('id');
        $followUp = $attempt->replicate();
        $followUp->forceFill([
            'teacher_assignment_recipient_id' => $recipientId,
            'memorisation_assessment_id' => null,
            'attempt_number' => 2,
            'accuracy_percent' => 96,
            'band' => 'strong',
            'audio_disk' => null,
            'audio_path' => null,
            'audio_mime' => null,
            'audio_bytes' => null,
            'audio_expires_at' => null,
            'ayah_range' => [
                'surah' => 114,
                'from' => $revision['review']['revision']['ayah_start'],
                'to' => $revision['review']['revision']['ayah_end'],
                'surah_name' => 'An-Nas',
            ],
        ])->save();
        $this->actingAs($student)->postJson(route('api.me.assignments.complete', $recipientId))
            ->assertStatus(422)
            ->assertJsonValidationErrors('audio');
        $this->actingAs($student)->post('/api/ai-recite-attempts/'.$followUp->id.'/audio', [
            'audio' => UploadedFile::fake()->createWithContent('revision.webm', str_repeat('R', 3000)),
            'duration_ms' => 1600,
        ], ['Accept' => 'application/json'])->assertOk();
        $this->actingAs($student)->postJson(route('api.me.assignments.complete', $recipientId))->assertOk();

        $this->actingAs($teacher)->postJson(route('api.teacher.students.attempts.playback.review', [$student, $attempt]))->assertOk();
        $this->actingAs($teacher)
            ->getJson(route('api.teacher.students.attempts.playback', [$student, $attempt]))
            ->assertOk()
            ->assertJsonPath('review.revision.follow_up.submitted', true)
            ->assertJsonPath('review.status', 'reviewed');
        $this->actingAs($teacher)
            ->getJson(route('api.teacher.students.attempts.playback', [$student, $followUp]))
            ->assertOk()
            ->assertJsonPath('history.previous_review.attempt_id', $attempt->id)
            ->assertJsonPath('history.previous_review.feedback', 'Repeat ayah 1 slowly.')
            ->assertJsonPath('history.previous_review.observations.pronunciation.note', 'Keep the qaf clear.')
            ->assertJsonPath('history.previous_review.wording_only', true)
            ->assertJsonPath('accuracy_percent', 96);
    }

    private function openTask(User $teacher, User $student): int
    {
        $task = $this->actingAs($teacher)->postJson(route('api.teacher.assignments.store'), [
            'kind' => 'ai_recite',
            'hifz_category' => 'sabaq',
            'student_id' => $student->id,
            'surah_number' => 114,
            'ayah_start' => 1,
            'ayah_end' => 2,
            'due_at' => today()->addDays(3)->toDateString(),
        ])->assertCreated()->json();

        return (int) $task['recipients'][0]['id'];
    }

    public function test_teacher_finding_stays_separate_from_the_word_check(): void
    {
        [$teacher, $student] = $this->classroom();
        $attempt = $this->recitation($student);

        $saved = $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.attempts.playback.words', [$student, $attempt]), [
                'ayah' => 1,
                'word_index' => 1,
                'action' => 'correct',
                'body' => 'The meem needs a clearer ghunnah.',
                'focus' => 'ghunnah',
                'finding' => 'difficulty',
            ])
            ->assertCreated()
            ->assertJsonPath('coachings.0.ai.status', 'wrong')
            ->assertJsonPath('coachings.0.ai.error_type', 'SUBSTITUTION')
            ->assertJsonPath('coachings.0.corrections.0.focus', 'ghunnah')
            ->assertJsonPath('coachings.0.corrections.0.finding', 'difficulty')
            ->assertJsonPath('coachings.0.corrections.0.source', 'teacher')
            ->json();

        $this->assertArrayNotHasKey('tajweed_score', $saved['coachings'][0]['corrections'][0]);
        $attempt->refresh();
        $this->assertSame('wrong', $attempt->word_statuses[1]['status']);

        $this->actingAs($student)->getJson(route('api.me.support'))
            ->assertOk()
            ->assertJsonPath('learning.word_corrections.0.ai.status', 'wrong')
            ->assertJsonPath('learning.word_corrections.0.corrections.0.focus', 'ghunnah')
            ->assertJsonPath('learning.word_corrections.0.corrections.0.source', 'teacher')
            ->assertJsonMissingPath('learning.word_corrections.0.corrections.0.tajweed_score');

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.attempts.playback.words', [$student, $attempt]), [
                'ayah' => 1,
                'word_index' => 0,
                'action' => 'correct',
                'body' => 'Clear articulation.',
                'focus' => 'makharij',
            ])
            ->assertStatus(422);
    }

    public function test_sound_ratings_need_a_recording_or_a_live_hearing(): void
    {
        [$teacher, $student] = $this->classroom();
        $attempt = $this->recitation($student);
        $words = $attempt->word_statuses;
        $accuracy = (int) $attempt->accuracy_percent;

        $this->actingAs($teacher)->putJson(route('api.teacher.students.attempts.assess', [$student, $attempt]), [
            'memorisation' => ['rating' => 'sound', 'note' => 'The wording is in place.'],
            'tajweed' => ['rating' => 'needs_work', 'note' => 'Inferred from the missed word.'],
            'pronunciation' => ['rating' => 'sound'],
        ])->assertStatus(422)->assertJsonValidationErrors(['tajweed', 'pronunciation']);
        $this->assertSame(0, \App\Models\TeacherRecitationAssessment::query()->count());
        $attempt->refresh();
        $this->assertSame($words, $attempt->word_statuses);
        $this->assertSame($accuracy, (int) $attempt->accuracy_percent);

        $saved = $this->actingAs($teacher)->putJson(route('api.teacher.students.attempts.assess', [$student, $attempt]), [
            'memorisation' => ['rating' => 'sound', 'note' => 'The wording is in place.'],
            'fluency' => ['rating' => 'sound'],
            'heard_live' => false,
        ])->assertOk()
            ->assertJsonPath('assessment.observations.evidence', 'unverified')
            ->assertJsonPath('assessment.observations.heard_live', false)
            ->assertJsonPath('assessment.observations.tajweed.rating', null)
            ->assertJsonPath('assessment.observations.memorisation.rating', 'sound')
            ->json();
        $this->assertSame($words, $attempt->fresh()->word_statuses);
        $this->assertArrayNotHasKey('tajweed_score', $saved['assessment']['observations']['memorisation']);

        $this->actingAs($teacher)->putJson(route('api.teacher.students.attempts.assess', [$student, $attempt]), [
            'memorisation' => ['rating' => 'sound'],
            'tajweed' => ['rating' => 'needs_work', 'note' => 'Heard the madd shorten.'],
            'pronunciation' => ['rating' => 'sound', 'note' => 'Heard the qaf.'],
            'heard_live' => true,
        ])->assertOk()
            ->assertJsonPath('assessment.observations.evidence', 'heard_live')
            ->assertJsonPath('assessment.observations.heard_live', true)
            ->assertJsonPath('assessment.observations.tajweed.rating', 'needs_work')
            ->assertJsonPath('assessment.source', 'teacher');
        $this->assertSame($words, $attempt->fresh()->word_statuses);
        $this->assertSame($accuracy, (int) $attempt->fresh()->accuracy_percent);
        $this->assertSame(1, \App\Models\TeacherRecitationAssessment::query()->count());
    }

    public function test_feedback_segments_validate_bounds_and_surface_to_learner(): void
    {
        Storage::fake('user_files');
        Storage::fake('local');
        config(['mutqin.audio_privacy.raw_recording_retention' => 'retain']);
        [$teacher, $student] = array_slice($this->classroom(), 0, 2);
        $attempt = $this->recitation($student);
        $attempt->forceFill([
            'audio_disk' => 'local',
            'audio_path' => 'ai-recite-audio/'.$student->id.'/'.$attempt->id.'.webm',
            'audio_mime' => 'audio/webm',
            'audio_bytes' => 2048,
            'audio_duration_ms' => 4200,
        ])->save();
        Storage::disk('local')->put((string) $attempt->audio_path, str_repeat('R', 2048));

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.attempts.playback.segments.store', [$student, $attempt]), [
                'start_ms' => 5000,
                'end_ms' => 1000,
                'body' => 'Invalid order',
            ])
            ->assertStatus(422);

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.attempts.playback.segments.store', [$student, $attempt]), [
                'start_ms' => 400,
                'end_ms' => 1200,
                'body' => 'Slow this phrase',
                'client_message_id' => '22222222-2222-4222-8222-222222222222',
            ])
            ->assertCreated()
            ->assertJsonPath('feedback_segments.0.body', 'Slow this phrase')
            ->assertJsonPath('feedback_segments.0.start_ms', 400)
            ->assertJsonPath('feedback_segments.0.end_ms', 1200)
            ->assertJsonPath('review_summary.segment_comments.0.body', 'Slow this phrase');

        $count = \App\Models\TeacherRecitationFeedbackSegment::query()->count();
        $this->actingAs($teacher)->postJson(route('api.teacher.students.attempts.playback.segments.store', [$student, $attempt]), [
            'start_ms' => 400,
            'end_ms' => 1200,
            'body' => 'Slow this phrase',
            'client_message_id' => '22222222-2222-4222-8222-222222222222',
        ])->assertCreated();
        $this->assertSame($count, \App\Models\TeacherRecitationFeedbackSegment::query()->count());

        $segmentId = (int) \App\Models\TeacherRecitationFeedbackSegment::query()->value('id');
        $this->actingAs($student)
            ->getJson(route('api.teacher.feedback-segments.audio', ['segment' => $segmentId]))
            ->assertNotFound();

        $attemptWithoutAudio = $this->recitation($student, 'segment-no-audio');
        $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.attempts.playback.segments.store', [$student, $attemptWithoutAudio]), [
                'start_ms' => 0,
                'end_ms' => 500,
                'body' => 'No recording',
            ])
            ->assertStatus(422);
    }

    private function recitation(User $student, ?string $idempotencyKey = null): \App\Models\AiReciteAttempt
    {
        $assessment = MemorisationAssessment::query()->create([
            'user_id' => $student->id,
            'idempotency_key' => $idempotencyKey ?? ('word-coaching-'.$student->id),
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

<?php

namespace Tests\Feature;

use App\Models\AiReciteAttempt;
use App\Models\Feedback;
use App\Models\MemorisationAssessment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FeedbackTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('mutqin.admin_emails', ['admin@example.com']);
    }

    public function test_guest_cannot_submit_feedback(): void
    {
        $this->postJson('/api/feedback', [
            'type' => 'suggestion',
            'message' => 'Love the mushaf layout options.',
        ])->assertUnauthorized();
    }

    public function test_user_can_submit_suggestion(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/feedback', [
                'type' => 'suggestion',
                'message' => 'Please add more surah bookmarks.',
                'context' => [
                    'route' => '/memorisation',
                    'theme' => 'sepia',
                    'mushaf_layout' => 'mushaf',
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.type', 'suggestion')
            ->assertJsonPath('data.status', 'new');

        $this->assertDatabaseHas('feedbacks', [
            'user_id' => $user->id,
            'type' => 'suggestion',
            'status' => 'new',
        ]);
    }

    public function test_user_can_submit_bug_report_with_screenshot(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/api/feedback', [
                'type' => 'bug',
                'message' => 'The save button does not respond on mobile.',
                'context' => [
                    'route' => '/memorisation',
                    'device' => 'mobile',
                ],
                'screenshot' => UploadedFile::fake()->image('issue.png'),
            ])
            ->assertCreated();

        $feedback = Feedback::query()->where('user_id', $user->id)->first();
        $this->assertNotNull($feedback);
        $this->assertNotNull($feedback->screenshot_path);
        Storage::disk('local')->assertExists($feedback->screenshot_path);
    }

    public function test_ai_complaint_links_to_owned_ai_recite_attempt(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        $owned = AiReciteAttempt::query()->create([
            'user_id' => $user->id,
            'attempt_number' => 1,
            'accuracy_percent' => 82,
            'band' => 'mixed',
        ]);

        $foreign = AiReciteAttempt::query()->create([
            'user_id' => $other->id,
            'attempt_number' => 1,
            'accuracy_percent' => 70,
            'band' => 'weak',
        ]);

        $this->actingAs($user)
            ->postJson('/api/feedback', [
                'type' => 'ai_recitation',
                'message' => 'The highlighted word was wrong.',
                'ai_check_id' => $owned->id,
                'ai_check_source' => Feedback::AI_CHECK_AI_RECITE,
                'ai_reason' => 'wrong_highlight',
            ])
            ->assertCreated();

        $this->actingAs($user)
            ->postJson('/api/feedback', [
                'type' => 'ai_recitation',
                'message' => 'Trying to report someone else check.',
                'ai_check_id' => $foreign->id,
                'ai_check_source' => Feedback::AI_CHECK_AI_RECITE,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['ai_check_id']);
    }

    public function test_duplicate_ai_complaint_is_rejected(): void
    {
        $user = User::factory()->create();
        $assessment = MemorisationAssessment::query()->create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'start_ayah' => 1,
            'end_ayah' => 1,
            'status' => MemorisationAssessment::STATUS_COMPLETED,
            'overall_accuracy' => 88,
        ]);

        $payload = [
            'type' => 'ai_recitation',
            'message' => 'I recited correctly but got marked wrong.',
            'ai_check_id' => $assessment->id,
            'ai_check_source' => Feedback::AI_CHECK_ASSESSMENT,
            'ai_reason' => 'correct_marked_wrong',
        ];

        $this->actingAs($user)->postJson('/api/feedback', $payload)->assertCreated();
        $this->actingAs($user)->postJson('/api/feedback', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['ai_check_id']);
    }

    public function test_validation_and_upload_failures_preserve_server_rejection(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/feedback', [
                'type' => 'suggestion',
                'message' => 'ok',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['message']);

        $this->actingAs($user)
            ->post('/api/feedback', [
                'type' => 'bug',
                'message' => 'Broken upload test case.',
                'screenshot' => UploadedFile::fake()->create('notes.txt', 10, 'text/plain'),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['screenshot']);
    }

    public function test_forged_user_status_and_ai_ids_are_rejected(): void
    {
        $user = User::factory()->create();
        $attacker = User::factory()->create();
        $attempt = AiReciteAttempt::query()->create([
            'user_id' => $user->id,
            'attempt_number' => 1,
            'accuracy_percent' => 90,
            'band' => 'strong',
        ]);

        $this->actingAs($attacker)
            ->postJson('/api/feedback', [
                'type' => 'ai_recitation',
                'message' => 'Forged complaint.',
                'ai_check_id' => $attempt->id,
                'ai_check_source' => Feedback::AI_CHECK_AI_RECITE,
                'user_id' => $user->id,
                'status' => 'resolved',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['user_id', 'status']);

        $this->assertDatabaseMissing('feedbacks', [
            'user_id' => $attacker->id,
            'type' => 'ai_recitation',
        ]);
    }

    public function test_non_admin_cannot_access_feedback_admin_api(): void
    {
        $user = User::factory()->create(['email' => 'learner@example.com']);
        $feedback = Feedback::query()->create([
            'user_id' => $user->id,
            'type' => 'bug',
            'message' => 'Something broke.',
            'status' => 'new',
        ]);

        $this->actingAs($user)->getJson('/api/admin/feedback')->assertForbidden();
        $this->actingAs($user)->getJson("/api/admin/feedback/{$feedback->id}")->assertForbidden();
        $this->actingAs($user)->patchJson("/api/admin/feedback/{$feedback->id}", [
            'status' => 'resolved',
        ])->assertForbidden();
        $this->actingAs($user)->deleteJson("/api/admin/feedback/{$feedback->id}")->assertForbidden();
        $this->get(route('admin.feedback.index'))->assertForbidden();
    }

    public function test_admin_can_list_update_and_view_feedback(): void
    {
        Storage::fake('local');
        $admin = User::factory()->admin()->create(['email' => 'admin@example.com']);
        $learner = User::factory()->create(['name' => 'Learner One']);

        $feedback = Feedback::query()->create([
            'user_id' => $learner->id,
            'type' => 'design',
            'message' => 'The sepia theme is easier on my eyes.',
            'status' => 'new',
            'context' => [
                'route' => '/memorisation',
                'theme' => 'sepia',
                'device' => 'desktop',
            ],
            'screenshot_path' => 'feedback-screenshots/test.png',
        ]);
        Storage::disk('local')->put('feedback-screenshots/test.png', 'fake-image');

        $this->actingAs($admin)
            ->get(route('admin.feedback.index'))
            ->assertOk()
            ->assertSee('admin-feedback', false);

        $this->actingAs($admin)
            ->getJson('/api/admin/feedback?status=new')
            ->assertOk()
            ->assertJsonPath('items.0.id', $feedback->id)
            ->assertJsonPath('items.0.user.name', 'Learner One');

        $this->actingAs($admin)
            ->getJson("/api/admin/feedback/{$feedback->id}")
            ->assertOk()
            ->assertJsonPath('feedback.message', $feedback->message);

        $this->actingAs($admin)
            ->patchJson("/api/admin/feedback/{$feedback->id}", [
                'status' => 'reviewing',
                'admin_note' => 'Looks like a theme contrast tweak.',
            ])
            ->assertOk()
            ->assertJsonPath('feedback.status', 'reviewing');

        $this->actingAs($admin)
            ->get("/api/admin/feedback/{$feedback->id}/screenshot")
            ->assertOk();
    }

    public function test_admin_can_delete_feedback(): void
    {
        Storage::fake('local');
        $admin = User::factory()->admin()->create(['email' => 'admin@example.com']);
        $learner = User::factory()->create();

        $feedback = Feedback::query()->create([
            'user_id' => $learner->id,
            'type' => 'bug',
            'message' => 'Delete me please.',
            'status' => 'new',
            'screenshot_path' => 'feedback-screenshots/delete-me.png',
        ]);
        Storage::disk('local')->put('feedback-screenshots/delete-me.png', 'fake-image');

        $this->actingAs($admin)
            ->deleteJson("/api/admin/feedback/{$feedback->id}")
            ->assertOk()
            ->assertJsonPath('message', __('admin.feedback.deleted'));

        $this->assertDatabaseMissing('feedbacks', ['id' => $feedback->id]);
        Storage::disk('local')->assertMissing('feedback-screenshots/delete-me.png');
    }

    public function test_ai_complaint_metrics_use_valid_scored_denominator(): void
    {
        $admin = User::factory()->admin()->create(['email' => 'admin@example.com']);
        $user = User::factory()->create();

        AiReciteAttempt::query()->create([
            'user_id' => $user->id,
            'attempt_number' => 1,
            'accuracy_percent' => 95,
            'band' => 'strong',
        ]);
        AiReciteAttempt::query()->create([
            'user_id' => $user->id,
            'attempt_number' => 2,
            'accuracy_percent' => null,
            'band' => 'insufficient_audio',
        ]);

        $attempt = AiReciteAttempt::query()->where('band', 'strong')->first();
        Feedback::query()->create([
            'user_id' => $user->id,
            'type' => 'ai_recitation',
            'message' => 'Wrong highlight.',
            'status' => 'new',
            'ai_check_id' => $attempt->id,
            'ai_check_source' => Feedback::AI_CHECK_AI_RECITE,
        ]);

        $this->actingAs($admin)
            ->getJson('/api/admin/feedback/metrics')
            ->assertOk()
            ->assertJsonPath('ai_complaints.complaints', 1)
            ->assertJsonPath('ai_complaints.valid_checks', 1)
            ->assertJsonPath('ai_complaints.complaint_rate_percent', 100);
    }

    public function test_ai_complaint_metrics_zero_checks_return_null_rate(): void
    {
        $admin = User::factory()->admin()->create(['email' => 'admin@example.com']);

        $this->actingAs($admin)
            ->getJson('/api/admin/feedback/metrics')
            ->assertOk()
            ->assertJsonPath('ai_complaints.complaints', 0)
            ->assertJsonPath('ai_complaints.valid_checks', 0)
            ->assertJsonPath('ai_complaints.complaint_rate_percent', null);
    }

    public function test_ai_complaint_metrics_checks_without_complaints_are_zero_percent(): void
    {
        $admin = User::factory()->admin()->create(['email' => 'admin@example.com']);
        $user = User::factory()->create();

        AiReciteAttempt::query()->create([
            'user_id' => $user->id,
            'attempt_number' => 1,
            'accuracy_percent' => 91,
            'band' => 'strong',
        ]);
        AiReciteAttempt::query()->create([
            'user_id' => $user->id,
            'attempt_number' => 2,
            'accuracy_percent' => 70,
            'band' => 'mixed',
        ]);
        MemorisationAssessment::query()->create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'start_ayah' => 1,
            'end_ayah' => 2,
            'status' => MemorisationAssessment::STATUS_COMPLETED,
            'overall_accuracy' => 80,
            'completed_at' => now(),
        ]);
        // Failed / cancelled style rows must stay out of the denominator.
        AiReciteAttempt::query()->create([
            'user_id' => $user->id,
            'attempt_number' => 3,
            'accuracy_percent' => null,
            'band' => 'cancelled',
        ]);
        MemorisationAssessment::query()->create([
            'user_id' => $user->id,
            'surah_number' => 2,
            'start_ayah' => 1,
            'end_ayah' => 1,
            'status' => MemorisationAssessment::STATUS_FAILED,
            'overall_accuracy' => null,
            'failure_reason' => 'provider_error',
        ]);

        $this->actingAs($admin)
            ->getJson('/api/admin/feedback/metrics')
            ->assertOk()
            ->assertJsonPath('ai_complaints.complaints', 0)
            ->assertJsonPath('ai_complaints.valid_checks', 3)
            ->assertJsonPath('ai_complaints.complaint_rate_percent', 0);
    }

    public function test_ai_complaint_metrics_known_percentage_and_date_window(): void
    {
        $admin = User::factory()->admin()->create(['email' => 'admin@example.com']);
        $user = User::factory()->create();

        $oldAttempt = AiReciteAttempt::query()->create([
            'user_id' => $user->id,
            'attempt_number' => 1,
            'accuracy_percent' => 88,
            'band' => 'mixed',
            'created_at' => now()->subDays(20),
            'updated_at' => now()->subDays(20),
        ]);
        $recentA = AiReciteAttempt::query()->create([
            'user_id' => $user->id,
            'attempt_number' => 2,
            'accuracy_percent' => 92,
            'band' => 'strong',
            'created_at' => now()->subDays(2),
            'updated_at' => now()->subDays(2),
        ]);
        $recentB = AiReciteAttempt::query()->create([
            'user_id' => $user->id,
            'attempt_number' => 3,
            'accuracy_percent' => 61,
            'band' => 'weak',
            'created_at' => now()->subDay(),
            'updated_at' => now()->subDay(),
        ]);
        $recentC = AiReciteAttempt::query()->create([
            'user_id' => $user->id,
            'attempt_number' => 4,
            'accuracy_percent' => 77,
            'band' => 'mixed',
            'created_at' => now()->subHours(3),
            'updated_at' => now()->subHours(3),
        ]);

        $oldComplaint = Feedback::query()->create([
            'user_id' => $user->id,
            'type' => 'ai_recitation',
            'message' => 'Old complaint outside window.',
            'status' => 'new',
            'ai_check_id' => $oldAttempt->id,
            'ai_check_source' => Feedback::AI_CHECK_AI_RECITE,
        ]);
        $oldComplaint->forceFill([
            'created_at' => now()->subDays(20),
            'updated_at' => now()->subDays(20),
        ])->saveQuietly();

        Feedback::query()->create([
            'user_id' => $user->id,
            'type' => 'ai_recitation',
            'message' => 'Recent complaint A.',
            'status' => 'new',
            'ai_check_id' => $recentA->id,
            'ai_check_source' => Feedback::AI_CHECK_AI_RECITE,
        ]);

        // Ensure attempt timestamps survive model defaults.
        $oldAttempt->forceFill([
            'created_at' => now()->subDays(20),
            'updated_at' => now()->subDays(20),
        ])->saveQuietly();
        $recentA->forceFill([
            'created_at' => now()->subDays(2),
            'updated_at' => now()->subDays(2),
        ])->saveQuietly();
        $recentB->forceFill([
            'created_at' => now()->subDay(),
            'updated_at' => now()->subDay(),
        ])->saveQuietly();
        $recentC->forceFill([
            'created_at' => now()->subHours(3),
            'updated_at' => now()->subHours(3),
        ])->saveQuietly();

        // 1 complaint / 3 recent eligible checks = 33.3%
        $this->actingAs($admin)
            ->getJson('/api/admin/feedback/metrics?days=7')
            ->assertOk()
            ->assertJsonPath('ai_complaints.complaints', 1)
            ->assertJsonPath('ai_complaints.valid_checks', 3)
            ->assertJsonPath('ai_complaints.complaint_rate_percent', 33.3);

        // Explicit calendar range still works for the admin feedback filters.
        $from = now()->subDays(3)->toDateString();
        $to = now()->toDateString();
        $this->actingAs($admin)
            ->getJson("/api/admin/feedback/metrics?date_from={$from}&date_to={$to}")
            ->assertOk()
            ->assertJsonPath('ai_complaints.complaints', 1)
            ->assertJsonPath('ai_complaints.valid_checks', 3)
            ->assertJsonPath('ai_complaints.complaint_rate_percent', 33.3);

        // All-time: 2 complaints / 4 eligible checks = 50%
        $this->actingAs($admin)
            ->getJson('/api/admin/feedback/metrics')
            ->assertOk()
            ->assertJsonPath('ai_complaints.complaints', 2)
            ->assertJsonPath('ai_complaints.valid_checks', 4)
            ->assertJsonPath('ai_complaints.complaint_rate_percent', 50);
    }

    public function test_non_admin_cannot_access_feedback_metrics(): void
    {
        $user = User::factory()->create(['email' => 'learner@example.com']);

        $this->actingAs($user)
            ->getJson('/api/admin/feedback/metrics')
            ->assertForbidden();
    }
}

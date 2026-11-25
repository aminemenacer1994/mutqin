<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\LearningTaskNotification;
use App\Services\Teacher\StudentHifzProgressService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentNotificationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_inbox_lists_and_marks_learning_notices(): void
    {
        $student = User::factory()->create();

        $student->notify(new LearningTaskNotification('test-deadline:1', [
            'type' => 'deadline',
            'title' => 'Task deadline',
            'body' => 'Al-Fatihah · 1',
            'href' => '/dashboard?tab=learning&assignment_recipient=42',
        ]));
        $student->notify(new LearningTaskNotification('parent-deadline:1', [
            'type' => 'parent_deadline',
            'title' => 'Parent copy',
            'body' => 'Should not appear',
            'href' => '/parent',
            'child_user_id' => $student->id,
        ]));

        $list = $this->actingAs($student)
            ->getJson(route('api.me.notifications.index'))
            ->assertOk()
            ->json();

        $this->assertSame(1, $list['unread_count']);
        $this->assertCount(1, $list['notifications']);
        $this->assertSame('deadline', $list['notifications'][0]['type']);

        $id = $list['notifications'][0]['id'];

        $this->actingAs($student)
            ->postJson(route('api.me.notifications.read', $id))
            ->assertOk()
            ->assertJsonPath('unread_count', 0);

        $this->actingAs($student)
            ->postJson(route('api.me.notifications.read-all'))
            ->assertOk()
            ->assertJsonPath('unread_count', 0);
    }

    public function test_hifz_summary_shape_for_my_learning(): void
    {
        $student = User::factory()->create();
        $summary = app(StudentHifzProgressService::class)->forMyLearningPane($student);

        $this->assertArrayHasKey('coverage', $summary);
        $this->assertArrayHasKey('validated_memorisation', $summary);
        $this->assertArrayHasKey('empty', $summary);
        $this->assertTrue($summary['empty']);
    }
}
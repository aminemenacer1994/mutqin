<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MrMutqinInterpretTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_interpret(): void
    {
        $this->postJson(route('api.mr-mutqin.interpret'), [
            'transcript' => 'How many students do I have?',
        ])->assertUnauthorized();
    }

    public function test_teacher_student_count_command(): void
    {
        config(['mutqin.teacher_features_enabled' => true]);
        $teacher = User::factory()->create(['account_role' => AccountRole::Teacher->value]);

        $this->actingAs($teacher)
            ->postJson(route('api.mr-mutqin.interpret'), [
                'transcript' => 'How many students do I have?',
                'context' => ['role' => 'teacher', 'shell' => 'teacher', 'view' => 'overview'],
            ])
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('intent', 'teacher.students.count')
            ->assertJsonPath('response_mode', 'ANSWER_ONLY');
    }

    public function test_student_homework_status(): void
    {
        $student = User::factory()->create();

        $this->actingAs($student)
            ->postJson(route('api.mr-mutqin.interpret'), [
                'transcript' => 'Do I have homework?',
                'context' => ['role' => 'student', 'shell' => 'dashboard', 'view' => 'home'],
            ])
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('intent', 'student.homework.status');
    }

    public function test_suggestions_endpoint(): void
    {
        $student = User::factory()->create();

        $this->actingAs($student)
            ->getJson(route('api.mr-mutqin.suggestions', ['role' => 'student', 'shell' => 'dashboard']))
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonCount(3, 'suggestions');
    }
}
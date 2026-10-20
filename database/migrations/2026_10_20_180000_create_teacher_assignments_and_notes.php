<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teacher_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('organisation_id')->constrained('organisations')->cascadeOnDelete();
            $table->foreignId('learning_group_id')->nullable()->constrained('learning_groups')->nullOnDelete();
            $table->string('kind', 32);
            $table->unsignedTinyInteger('surah_number');
            $table->unsignedSmallInteger('ayah_start');
            $table->unsignedSmallInteger('ayah_end');
            $table->unsignedSmallInteger('repetition_target')->nullable();
            $table->timestamp('due_at')->nullable();
            $table->text('feedback')->nullable();
            $table->timestamps();

            $table->index(['teacher_id', 'created_at']);
            $table->index('learning_group_id');
        });

        Schema::create('teacher_assignment_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_assignment_id')->constrained('teacher_assignments')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->string('status', 32)->default('pending');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['teacher_assignment_id', 'student_id'], 'assignment_recipient_unique');
            $table->index(['student_id', 'status']);
        });

        Schema::create('teacher_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('organisation_id')->constrained('organisations')->cascadeOnDelete();
            $table->foreignId('teacher_assignment_id')->nullable()->constrained('teacher_assignments')->nullOnDelete();
            $table->string('kind', 16);
            $table->text('body');
            $table->timestamps();

            $table->index(['teacher_id', 'student_id']);
            $table->index(['student_id', 'kind']);
        });

        Schema::table('group_memberships', function (Blueprint $table) {
            $table->index(['learning_group_id', 'membership_role', 'status'], 'gm_group_role_status_idx');
        });
    }

    public function down(): void
    {
        Schema::table('group_memberships', function (Blueprint $table) {
            $table->dropIndex('gm_group_role_status_idx');
        });

        Schema::dropIfExists('teacher_notes');
        Schema::dropIfExists('teacher_assignment_recipients');
        Schema::dropIfExists('teacher_assignments');
    }
};

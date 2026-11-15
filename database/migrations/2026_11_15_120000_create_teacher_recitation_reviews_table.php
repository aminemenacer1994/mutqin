<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teacher_recitation_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('ai_recite_attempt_id')->constrained('ai_recite_attempts')->cascadeOnDelete();
            $table->string('status', 20)->default('pending');
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('feedback_note_id')->nullable()->constrained('teacher_notes')->nullOnDelete();
            $table->foreignId('private_note_id')->nullable()->constrained('teacher_private_notes')->nullOnDelete();
            $table->foreignId('teacher_assignment_id')->nullable()->constrained('teacher_assignments')->nullOnDelete();
            $table->timestamps();

            $table->unique(['teacher_id', 'ai_recite_attempt_id'], 'teacher_recitation_review_unique');
            $table->index(['student_id', 'status'], 'teacher_recitation_review_student_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teacher_recitation_reviews');
    }
};

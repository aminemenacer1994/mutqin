<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teacher_recitation_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('ai_recite_attempt_id')->constrained('ai_recite_attempts')->cascadeOnDelete();
            $table->unsignedTinyInteger('tajweed_score');
            $table->text('annotation')->nullable();
            $table->timestamps();
            $table->unique(['teacher_id', 'ai_recite_attempt_id'], 'teacher_attempt_assessment_unique');
            $table->index(['student_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teacher_recitation_assessments');
    }
};

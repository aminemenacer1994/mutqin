<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teacher_word_coachings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('ai_recite_attempt_id')->constrained('ai_recite_attempts')->cascadeOnDelete();
            $table->unsignedTinyInteger('surah_number');
            $table->unsignedSmallInteger('ayah_number');
            $table->unsignedSmallInteger('word_index');
            $table->string('ai_status', 32);
            $table->string('ai_recognised', 120)->nullable();
            $table->float('ai_confidence')->nullable();
            $table->string('ai_error_type', 40)->nullable();
            $table->string('decision', 20)->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->string('review_status', 24)->default('open');
            $table->string('improvement_basis', 16)->nullable();
            $table->boolean('retry_requested')->default(false);
            $table->foreignId('practice_assignment_id')->nullable()->constrained('teacher_assignments')->nullOnDelete();
            $table->foreignId('latest_retry_attempt_id')->nullable()->constrained('ai_recite_attempts')->nullOnDelete();
            $table->timestamps();

            $table->unique(
                ['teacher_id', 'ai_recite_attempt_id', 'ayah_number', 'word_index'],
                'teacher_word_coaching_word_unique'
            );
            $table->index(['student_id', 'review_status'], 'teacher_word_coaching_student_idx');
        });

        Schema::create('teacher_word_coaching_corrections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_word_coaching_id')->constrained('teacher_word_coachings', indexName: 'twcc_coaching_fk')->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->text('body')->nullable();
            $table->string('audio_disk', 32)->nullable();
            $table->string('audio_path')->nullable();
            $table->string('audio_mime', 80)->nullable();
            $table->unsignedInteger('audio_bytes')->nullable();
            $table->unsignedInteger('audio_duration_ms')->nullable();
            $table->timestamps();

            $table->index(['teacher_word_coaching_id', 'id'], 'teacher_word_coaching_correction_idx');
        });

        Schema::create('teacher_word_coaching_retries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_word_coaching_id')->constrained('teacher_word_coachings', indexName: 'twcr_coaching_fk')->cascadeOnDelete();
            $table->foreignId('ai_recite_attempt_id')->constrained('ai_recite_attempts')->cascadeOnDelete();
            $table->string('comparable_status', 32)->nullable();
            $table->boolean('improved')->default(false);
            $table->timestamps();

            $table->unique(
                ['teacher_word_coaching_id', 'ai_recite_attempt_id'],
                'teacher_word_coaching_retry_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teacher_word_coaching_retries');
        Schema::dropIfExists('teacher_word_coaching_corrections');
        Schema::dropIfExists('teacher_word_coachings');
    }
};

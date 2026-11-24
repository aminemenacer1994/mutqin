<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teacher_recitation_feedback_segments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users', indexName: 'trfbseg_teacher_fk')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users', indexName: 'trfbseg_student_fk')->cascadeOnDelete();
            $table->foreignId('ai_recite_attempt_id')->constrained('ai_recite_attempts', indexName: 'trfbseg_attempt_fk')->cascadeOnDelete();
            $table->foreignId('teacher_recitation_review_id')->nullable()->constrained('teacher_recitation_reviews', indexName: 'trfbseg_review_fk')->nullOnDelete();
            $table->unsignedInteger('start_ms');
            $table->unsignedInteger('end_ms');
            $table->text('body')->nullable();
            $table->string('audio_disk', 32)->nullable();
            $table->string('audio_path')->nullable();
            $table->string('audio_mime', 80)->nullable();
            $table->unsignedInteger('audio_bytes')->nullable();
            $table->unsignedInteger('audio_duration_ms')->nullable();
            $table->uuid('client_message_id')->nullable();
            $table->timestamps();

            $table->index(['ai_recite_attempt_id', 'teacher_id'], 'tr_feedback_segment_attempt_teacher_idx');
            $table->unique(
                ['teacher_id', 'ai_recite_attempt_id', 'client_message_id'],
                'tr_feedback_segment_client_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teacher_recitation_feedback_segments');
    }
};
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hifz_examination_attempts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('teacher_assignment_recipient_id');
            $table->foreign('teacher_assignment_recipient_id', 'hifz_exam_attempt_recipient_fk')
                ->references('id')->on('teacher_assignment_recipients')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->string('status', 32)->default('in_progress');
            $table->unsignedInteger('question_count')->default(0);
            $table->unsignedInteger('completed_question_count')->default(0);
            $table->string('generation_seed', 64)->nullable();
            $table->json('settings_snapshot')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->unique('teacher_assignment_recipient_id', 'hifz_exam_attempt_recipient_uq');
        });

        Schema::create('hifz_examination_questions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('hifz_examination_attempt_id');
            $table->foreign('hifz_examination_attempt_id', 'hifz_exam_question_attempt_fk')
                ->references('id')->on('hifz_examination_attempts')->cascadeOnDelete();
            $table->unsignedSmallInteger('position')->default(1);
            $table->string('mode', 48);
            $table->unsignedTinyInteger('surah_number');
            $table->unsignedSmallInteger('ayah_number');
            $table->unsignedTinyInteger('end_surah_number')->nullable();
            $table->unsignedSmallInteger('end_ayah_number')->nullable();
            $table->unsignedTinyInteger('recitation_length_ayahs')->default(1);
            $table->string('prompt_seed', 64)->nullable();
            $table->json('meta')->nullable();
            $table->string('wording_result', 32)->nullable();
            $table->boolean('hesitation')->nullable();
            $table->unsignedTinyInteger('prompts_used')->default(0);
            $table->boolean('completed')->nullable();
            $table->string('fluency', 32)->nullable();
            $table->text('teacher_feedback')->nullable();
            $table->unsignedTinyInteger('teacher_score')->nullable();
            $table->unsignedBigInteger('memorisation_assessment_id')->nullable();
            $table->foreign('memorisation_assessment_id', 'hifz_exam_q_mem_assess_fk')
                ->references('id')->on('memorisation_assessments')->nullOnDelete();
            $table->unsignedBigInteger('ai_recite_attempt_id')->nullable();
            $table->foreign('ai_recite_attempt_id', 'hifz_exam_q_ai_attempt_fk')
                ->references('id')->on('ai_recite_attempts')->nullOnDelete();
            $table->timestamp('answered_at')->nullable();
            $table->timestamps();

            $table->unique(['hifz_examination_attempt_id', 'position'], 'hifz_exam_q_attempt_pos_uq');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hifz_examination_questions');
        Schema::dropIfExists('hifz_examination_attempts');
    }
};
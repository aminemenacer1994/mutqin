<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('student_progress_reports')) {
            return;
        }

        Schema::create('student_progress_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('teacher_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('period_type', 16);
            $table->date('period_start');
            $table->date('period_end');
            $table->string('status', 16)->default('draft');
            $table->text('teacher_notes')->nullable();
            $table->json('payload')->nullable();
            $table->unsignedSmallInteger('payload_version')->default(1);
            $table->timestamp('generated_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('shared_with_parents')->default(false);
            $table->timestamps();

            $table->unique(
                ['student_user_id', 'teacher_user_id', 'period_start', 'period_end', 'status'],
                'student_progress_report_period_status_unique',
            );
            $table->index(['student_user_id', 'status', 'approved_at'], 'student_progress_report_student_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_progress_reports');
    }
};
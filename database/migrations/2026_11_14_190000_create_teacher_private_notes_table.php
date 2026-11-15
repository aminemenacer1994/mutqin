<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teacher_private_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('organisation_id')->constrained('organisations')->cascadeOnDelete();
            $table->string('category', 32);
            $table->text('body');
            $table->boolean('pinned')->default(false);
            $table->timestamp('archived_at')->nullable();
            $table->unsignedTinyInteger('surah_number')->nullable();
            $table->unsignedSmallInteger('ayah_start')->nullable();
            $table->unsignedSmallInteger('ayah_end')->nullable();
            $table->foreignId('teacher_assignment_id')->nullable()->constrained('teacher_assignments')->nullOnDelete();
            $table->foreignId('shared_feedback_note_id')->nullable()->constrained('teacher_notes')->nullOnDelete();
            $table->timestamp('shared_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['teacher_id', 'student_id', 'archived_at'], 'tpn_teacher_student_archived_idx');
            $table->index(['teacher_id', 'student_id', 'category'], 'tpn_teacher_student_category_idx');
            $table->index(['teacher_id', 'student_id', 'pinned'], 'tpn_teacher_student_pinned_idx');
            $table->index(['archived_at', 'deleted_at'], 'tpn_retention_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teacher_private_notes');
    }
};

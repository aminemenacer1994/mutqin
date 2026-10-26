<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teacher_assignments', function (Blueprint $table) {
            $table->string('hifz_category', 12)->nullable()->after('kind');
            $table->index(['teacher_id', 'hifz_category']);
        });

        Schema::create('teacher_attendance_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('learning_group_id')->constrained('learning_groups')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->date('attendance_date');
            $table->string('status', 12);
            $table->timestamps();
            $table->unique(['teacher_id', 'learning_group_id', 'student_id', 'attendance_date'], 'teacher_attendance_unique');
            $table->index(['teacher_id', 'student_id', 'attendance_date'], 'teacher_attendance_student_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teacher_attendance_records');
        Schema::table('teacher_assignments', function (Blueprint $table) {
            $table->dropIndex(['teacher_id', 'hifz_category']);
            $table->dropColumn('hifz_category');
        });
    }
};

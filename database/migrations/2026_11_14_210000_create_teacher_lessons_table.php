<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teacher_lessons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('learning_group_id')->constrained('learning_groups')->cascadeOnDelete();
            $table->date('lesson_date');
            $table->string('title', 120)->nullable();
            $table->timestamps();
            $table->unique(['teacher_id', 'learning_group_id', 'lesson_date'], 'teacher_lessons_unique');
            $table->index(['teacher_id', 'lesson_date'], 'teacher_lessons_teacher_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teacher_lessons');
    }
};

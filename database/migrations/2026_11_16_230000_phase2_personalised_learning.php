<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('learning_plans', function (Blueprint $table) {
            $table->string('student_goal', 500)->nullable()->after('notes');
        });

        Schema::table('learning_plan_items', function (Blueprint $table) {
            $table->boolean('is_milestone')->default(false)->after('priority');
        });

        Schema::create('revision_recommendations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('organisation_id')->nullable()->constrained('organisations')->nullOnDelete();
            $table->string('status', 24)->default('pending');
            $table->string('activity', 24);
            $table->unsignedTinyInteger('surah_number');
            $table->unsignedSmallInteger('ayah_start');
            $table->unsignedSmallInteger('ayah_end');
            $table->date('due_on')->nullable();
            $table->string('instructions', 2000)->nullable();
            $table->string('reason_code', 48);
            $table->string('reason', 500);
            $table->json('evidence')->nullable();
            $table->string('source_key', 191);
            $table->foreignId('learning_plan_id')->nullable()->constrained('learning_plans')->nullOnDelete();
            $table->foreignId('learning_plan_item_id')->nullable()->constrained('learning_plan_items')->nullOnDelete();
            $table->foreignId('teacher_assignment_id')->nullable()->constrained('teacher_assignments')->nullOnDelete();
            $table->foreignId('weak_spot_id')->nullable()->constrained('memorisation_weak_spots')->nullOnDelete();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('dismissed_at')->nullable();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamps();

            $table->unique(['teacher_id', 'student_id', 'source_key'], 'revision_recommendations_source_unique');
            $table->index(['teacher_id', 'student_id', 'status'], 'revision_recommendations_status_idx');
        });

        Schema::create('student_self_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('teacher_assignment_recipient_id')->nullable()->constrained('teacher_assignment_recipients')->nullOnDelete();
            $table->foreignId('teacher_lesson_id')->nullable()->constrained('teacher_lessons')->nullOnDelete();
            $table->string('feeling', 16);
            $table->string('help_request', 1000)->nullable();
            $table->unsignedTinyInteger('surah_number')->nullable();
            $table->unsignedSmallInteger('ayah_start')->nullable();
            $table->unsignedSmallInteger('ayah_end')->nullable();
            $table->timestamps();

            $table->index(['student_id', 'created_at'], 'student_self_assessments_student_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_self_assessments');
        Schema::dropIfExists('revision_recommendations');

        Schema::table('learning_plan_items', function (Blueprint $table) {
            $table->dropColumn('is_milestone');
        });

        Schema::table('learning_plans', function (Blueprint $table) {
            $table->dropColumn('student_goal');
        });
    }
};

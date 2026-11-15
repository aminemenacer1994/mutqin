<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('learning_plan_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('organisation_id')->nullable()->constrained('organisations')->nullOnDelete();
            $table->string('name', 120);
            $table->string('description', 500)->nullable();
            $table->string('cadence', 16)->default('weekly'); // weekly|monthly
            $table->boolean('is_shared')->default(false);
            $table->timestamps();
        });

        Schema::create('learning_plan_template_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('learning_plan_template_id')->constrained('learning_plan_templates')->cascadeOnDelete();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->string('kind', 24); // practice|ai_recite|teacher_review
            $table->string('hifz_category', 24)->default('sabaq');
            $table->unsignedTinyInteger('surah_number');
            $table->unsignedSmallInteger('ayah_start');
            $table->unsignedSmallInteger('ayah_end');
            $table->unsignedTinyInteger('repetition_target')->nullable();
            $table->unsignedSmallInteger('day_offset')->default(0);
            $table->string('priority', 16)->default('normal'); // low|normal|high
            $table->string('instructions', 2000)->nullable();
            $table->timestamps();
        });

        Schema::create('learning_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('organisation_id')->nullable()->constrained('organisations')->nullOnDelete();
            $table->foreignId('source_template_id')->nullable()->constrained('learning_plan_templates')->nullOnDelete();
            $table->string('title', 160);
            $table->string('cadence', 16)->default('weekly');
            $table->string('status', 24)->default('draft'); // draft|active|paused|completed|archived
            $table->date('starts_on');
            $table->date('ends_on')->nullable();
            $table->string('notes', 2000)->nullable();
            $table->timestamps();

            $table->index(['teacher_id', 'student_id', 'status']);
        });

        Schema::create('learning_plan_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('learning_plan_id')->constrained('learning_plans')->cascadeOnDelete();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->string('origin', 24)->default('assigned'); // assigned|suggested
            $table->string('item_status', 24)->default('planned'); // planned|released|skipped|paused
            $table->string('kind', 24);
            $table->string('hifz_category', 24)->default('sabaq');
            $table->unsignedTinyInteger('surah_number');
            $table->unsignedSmallInteger('ayah_start');
            $table->unsignedSmallInteger('ayah_end');
            $table->unsignedTinyInteger('repetition_target')->nullable();
            $table->date('due_on')->nullable();
            $table->string('priority', 16)->default('normal');
            $table->string('instructions', 2000)->nullable();
            $table->foreignId('teacher_assignment_id')->nullable()->constrained('teacher_assignments')->nullOnDelete();
            $table->foreignId('weak_spot_id')->nullable()->constrained('memorisation_weak_spots')->nullOnDelete();
            $table->timestamps();

            $table->index(['learning_plan_id', 'item_status']);
        });

        Schema::table('teacher_assignments', function (Blueprint $table) {
            $table->foreignId('learning_plan_id')->nullable()->after('learning_group_id')->constrained('learning_plans')->nullOnDelete();
            $table->foreignId('learning_plan_item_id')->nullable()->after('learning_plan_id')->constrained('learning_plan_items')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('teacher_assignments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('learning_plan_item_id');
            $table->dropConstrainedForeignId('learning_plan_id');
        });
        Schema::dropIfExists('learning_plan_items');
        Schema::dropIfExists('learning_plans');
        Schema::dropIfExists('learning_plan_template_items');
        Schema::dropIfExists('learning_plan_templates');
    }
};

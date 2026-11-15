<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('revision_reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('source_type', 32);
            $table->string('source_key', 191);
            $table->unsignedTinyInteger('surah_number');
            $table->unsignedSmallInteger('ayah_start');
            $table->unsignedSmallInteger('ayah_end');
            $table->timestamp('due_at');
            $table->string('priority', 16)->default('normal');
            $table->string('status', 16)->default('upcoming');
            $table->timestamp('snoozed_until')->nullable();
            $table->timestamp('notified_in_app_at')->nullable();
            $table->timestamp('emailed_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->string('completed_via', 32)->nullable();
            $table->json('session_settings')->nullable();
            $table->foreignId('teacher_assignment_recipient_id')
                ->nullable()
                ->constrained('teacher_assignment_recipients')
                ->nullOnDelete();
            $table->foreignId('memorisation_practice_plan_id')
                ->nullable()
                ->constrained('memorisation_practice_plans')
                ->nullOnDelete();
            $table->string('zone', 16)->nullable();
            $table->unsignedTinyInteger('zone_step')->nullable();
            $table->unsignedSmallInteger('interval_days')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'source_key'], 'revision_reminders_user_source_unique');
            $table->index(['user_id', 'status', 'due_at'], 'revision_reminders_user_status_due_idx');
            $table->index(['due_at', 'status'], 'revision_reminders_due_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('revision_reminders');
    }
};

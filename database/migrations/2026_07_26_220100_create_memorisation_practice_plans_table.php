<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('memorisation_practice_plans')) {
            return;
        }

        Schema::create('memorisation_practice_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('assessment_id')
                ->constrained('memorisation_assessments')
                ->cascadeOnDelete();
            $table->foreignId('session_recommendation_id')
                ->nullable()
                ->constrained('session_recommendations')
                ->nullOnDelete();
            $table->string('title');
            $table->text('explanation')->nullable();
            $table->string('band', 16)->nullable();
            $table->string('difficulty', 16)->nullable();
            $table->string('status', 24)->default('draft');
            $table->unsignedTinyInteger('surah_number');
            $table->unsignedSmallInteger('start_ayah');
            $table->unsignedSmallInteger('end_ayah');
            $table->json('priority_ayahs')->nullable();
            $table->json('weak_words')->nullable();
            $table->json('weak_phrases')->nullable();
            $table->json('techniques')->nullable();
            $table->json('repetitions')->nullable();
            $table->json('config')->nullable();
            $table->json('user_adjustments')->nullable();
            $table->json('completion_data')->nullable();
            $table->json('retest_metrics')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['assessment_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('memorisation_practice_plans');
    }
};

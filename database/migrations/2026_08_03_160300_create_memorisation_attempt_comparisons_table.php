<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('memorisation_attempt_comparisons')) {
            return;
        }

        Schema::create('memorisation_attempt_comparisons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('previous_assessment_id')
                ->constrained('memorisation_assessments')
                ->cascadeOnDelete();
            $table->foreignId('follow_up_assessment_id')
                ->constrained('memorisation_assessments')
                ->cascadeOnDelete();
            $table->foreignId('practice_plan_id')
                ->nullable()
                ->constrained('memorisation_practice_plans')
                ->nullOnDelete();
            $table->smallInteger('accuracy_delta')->nullable();
            $table->unsignedSmallInteger('improved_count')->default(0);
            $table->unsignedSmallInteger('unchanged_count')->default(0);
            $table->unsignedSmallInteger('new_weak_count')->default(0);
            $table->json('improved_items')->nullable();
            $table->json('unchanged_items')->nullable();
            $table->json('new_weak_items')->nullable();
            $table->string('summary_key', 32)->nullable();
            $table->string('summary', 500)->nullable();
            $table->json('metrics')->nullable();
            $table->timestamps();

            $table->unique(
                ['previous_assessment_id', 'follow_up_assessment_id'],
                'attempt_comparisons_pair_unique'
            );
            $table->index(['user_id', 'created_at'], 'attempt_comparisons_user_created_idx');
            $table->index(['practice_plan_id'], 'attempt_comparisons_plan_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('memorisation_attempt_comparisons');
    }
};

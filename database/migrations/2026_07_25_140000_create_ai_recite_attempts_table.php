<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ai_recite_attempts')) {
            return;
        }

        Schema::create('ai_recite_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('session_recommendation_id')
                ->nullable()
                ->constrained('session_recommendations')
                ->nullOnDelete();
            $table->foreignId('user_session_id')
                ->nullable()
                ->constrained('user_sessions')
                ->nullOnDelete();
            $table->unsignedTinyInteger('attempt_number')->default(1);
            $table->unsignedTinyInteger('accuracy_percent')->nullable();
            $table->string('band', 16)->nullable();
            $table->json('ayah_range')->nullable();
            $table->json('color_counts')->nullable();
            $table->json('weak_words')->nullable();
            $table->json('word_statuses')->nullable();
            $table->json('plan_snapshot')->nullable();
            $table->timestamps();

            $table->unique(
                ['session_recommendation_id', 'attempt_number'],
                'ai_recite_attempts_rec_attempt_unique'
            );
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_recite_attempts');
    }
};

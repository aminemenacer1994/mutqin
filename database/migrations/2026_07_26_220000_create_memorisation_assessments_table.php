<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('memorisation_assessments')) {
            return;
        }

        Schema::create('memorisation_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_session_id')
                ->nullable()
                ->constrained('user_sessions')
                ->nullOnDelete();
            $table->foreignId('session_recommendation_id')
                ->nullable()
                ->constrained('session_recommendations')
                ->nullOnDelete();
            $table->foreignId('previous_assessment_id')
                ->nullable()
                ->constrained('memorisation_assessments')
                ->nullOnDelete();
            $table->unsignedTinyInteger('surah_number');
            $table->unsignedSmallInteger('start_ayah');
            $table->unsignedSmallInteger('end_ayah');
            $table->string('assessment_type', 32)->default('memorisation_detection');
            $table->string('surah_name')->nullable();
            $table->json('recognition_data')->nullable();
            $table->json('word_results')->nullable();
            $table->json('ayah_results')->nullable();
            $table->json('error_classifications')->nullable();
            $table->json('weakness_analysis')->nullable();
            $table->unsignedTinyInteger('overall_accuracy')->nullable();
            $table->decimal('confidence', 5, 4)->nullable();
            $table->unsignedInteger('duration_ms')->nullable();
            $table->string('friendly_summary', 500)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['surah_number', 'start_ayah', 'end_ayah']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('memorisation_assessments');
    }
};

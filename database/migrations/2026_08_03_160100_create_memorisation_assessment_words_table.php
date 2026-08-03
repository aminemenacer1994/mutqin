<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('memorisation_assessment_words')) {
            return;
        }

        Schema::create('memorisation_assessment_words', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('assessment_id')
                ->constrained('memorisation_assessments')
                ->cascadeOnDelete();
            $table->unsignedTinyInteger('surah_number');
            $table->unsignedSmallInteger('ayah_number');
            $table->unsignedSmallInteger('word_index');
            $table->string('verse_key', 16)->nullable();
            $table->unsignedSmallInteger('expected_position')->nullable();
            $table->string('detected_token', 120)->nullable();
            $table->string('result_type', 24);
            $table->decimal('confidence', 5, 4)->nullable();
            $table->unsignedSmallInteger('retry_count')->default(0);
            $table->string('first_result_type', 24)->nullable();
            $table->string('final_result_type', 24)->nullable();
            $table->boolean('out_of_order')->default(false);
            $table->timestamp('first_detected_at')->nullable();
            $table->timestamp('final_detected_at')->nullable();
            $table->timestamps();

            $table->unique(
                ['assessment_id', 'surah_number', 'ayah_number', 'word_index'],
                'assessment_words_assessment_ayah_word_unique'
            );
            $table->index(['user_id', 'surah_number', 'ayah_number', 'word_index'], 'assessment_words_user_quran_idx');
            $table->index(['user_id', 'result_type', 'created_at'], 'assessment_words_user_result_created_idx');
            $table->index(['assessment_id', 'result_type'], 'assessment_words_assessment_result_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('memorisation_assessment_words');
    }
};

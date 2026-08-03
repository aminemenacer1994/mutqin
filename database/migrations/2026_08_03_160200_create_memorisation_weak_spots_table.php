<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('memorisation_weak_spots')) {
            return;
        }

        Schema::create('memorisation_weak_spots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('spot_type', 16); // word | ayah | phrase
            $table->unsignedTinyInteger('surah_number');
            $table->unsignedSmallInteger('ayah_number');
            $table->unsignedSmallInteger('word_index')->nullable();
            $table->string('verse_key', 16)->nullable();
            $table->string('spot_key', 64);
            $table->string('severity', 16)->default('moderate');
            $table->string('status', 24)->default('active'); // active | improving | resolved | dormant
            $table->string('trend', 24)->nullable(); // improving | stable | regressing | unknown
            $table->unsignedInteger('affected_attempt_count')->default(1);
            $table->timestamp('first_identified_at')->nullable();
            $table->timestamp('last_identified_at')->nullable();
            $table->timestamp('last_recalled_at')->nullable();
            $table->foreignId('source_assessment_id')
                ->nullable()
                ->constrained('memorisation_assessments')
                ->nullOnDelete();
            $table->foreignId('last_assessment_id')
                ->nullable()
                ->constrained('memorisation_assessments')
                ->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'spot_key'], 'weak_spots_user_spot_key_unique');
            $table->index(['user_id', 'status', 'last_identified_at'], 'weak_spots_user_status_last_idx');
            $table->index(['user_id', 'surah_number', 'ayah_number'], 'weak_spots_user_ayah_idx');
            $table->index(['user_id', 'severity'], 'weak_spots_user_severity_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('memorisation_weak_spots');
    }
};

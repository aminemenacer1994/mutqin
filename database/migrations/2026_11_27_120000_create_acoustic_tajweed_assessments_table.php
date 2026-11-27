<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('acoustic_tajweed_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('memorisation_assessment_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('ai_recite_attempt_id')->nullable()->constrained('ai_recite_attempts')->nullOnDelete();
            $table->string('status', 32)->default('pending');
            $table->string('qiraat', 32)->default('hafs');
            $table->string('provider', 64)->default('null');
            $table->string('provider_version', 64)->nullable();
            $table->string('pipeline_version', 32)->default('mutqin-acoustic-v0');
            $table->string('audio_quality_status', 32)->nullable();
            $table->json('findings')->nullable();
            $table->json('metadata')->nullable();
            $table->string('teacher_verification_status', 32)->default('pending');
            $table->json('teacher_verification')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('acoustic_tajweed_assessments');
    }
};
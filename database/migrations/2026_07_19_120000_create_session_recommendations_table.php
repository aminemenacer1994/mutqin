<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('session_recommendations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('source_session_id')->nullable()->constrained('user_sessions')->nullOnDelete();
            $table->unsignedSmallInteger('surah_number')->nullable();
            $table->unsignedSmallInteger('ayah_start')->nullable();
            $table->unsignedSmallInteger('ayah_end')->nullable();
            $table->string('recommendation_type', 40);
            $table->string('reason_code', 64);
            $table->string('session_mode', 32)->nullable();
            $table->boolean('accepted')->nullable();
            $table->boolean('chose_other')->default(false);
            $table->unsignedBigInteger('started_session_id')->nullable();
            $table->json('payload')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['user_id', 'accepted']);
            $table->index(['user_id', 'surah_number', 'ayah_start', 'ayah_end']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('session_recommendations');
    }
};

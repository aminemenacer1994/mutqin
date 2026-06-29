<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('learning_analytics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('session_date');
            $table->unsignedInteger('sessions_completed')->default(0);
            $table->unsignedInteger('total_minutes')->default(0);
            $table->unsignedInteger('ayahs_memorised')->default(0);
            $table->unsignedInteger('ayahs_reviewed')->default(0);
            $table->unsignedInteger('streak_day')->default(0);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'session_date']);
            $table->index('user_id');
            $table->index(['user_id', 'session_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('learning_analytics');
    }
};

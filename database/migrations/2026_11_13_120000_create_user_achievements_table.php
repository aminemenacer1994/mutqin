<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Persist earned achievements by stable achievement_id (not display name).
 * Future badges only need new catalog IDs — no schema change.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_achievements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('achievement_id', 64);
            $table->timestamp('unlocked_at');
            $table->string('unlock_source', 40)->default('evaluation');
            $table->json('progress_snapshot')->nullable();
            $table->timestamp('notified_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'achievement_id'], 'user_achievements_user_achievement_unique');
            $table->index(['user_id', 'unlocked_at']);
            $table->index(['achievement_id', 'unlocked_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_achievements');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds the remaining composite index requested for fast user-scoped lookups.
 * The other requested indexes (user_id, (user_id, surah_number) on sessions and
 * progress, and (user_id, session_date) on analytics) already exist in their
 * respective create migrations.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_last_positions', function (Blueprint $table) {
            $table->index(['user_id', 'surah_number'], 'user_last_positions_user_surah_index');
        });
    }

    public function down(): void
    {
        Schema::table('user_last_positions', function (Blueprint $table) {
            $table->dropIndex('user_last_positions_user_surah_index');
        });
    }
};

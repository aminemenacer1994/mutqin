<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Optional learner practice preferences for achievements (timezone + weekly goal).
 * Reversible: column drop only; does not touch session or AI history.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'practice_preferences')) {
                $table->json('practice_preferences')->nullable()->after('ai_session_settings');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'practice_preferences')) {
                $table->dropColumn('practice_preferences');
            }
        });
    }
};

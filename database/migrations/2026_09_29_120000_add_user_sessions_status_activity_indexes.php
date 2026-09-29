<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Composite indexes for dashboard activity + session history:
 * user_id + status + last_activity_at / ended_at.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_sessions', function (Blueprint $table) {
            if (! Schema::hasIndex('user_sessions', 'user_sessions_user_status_activity_idx')) {
                $table->index(
                    ['user_id', 'status', 'last_activity_at'],
                    'user_sessions_user_status_activity_idx'
                );
            }
            if (! Schema::hasIndex('user_sessions', 'user_sessions_user_status_ended_idx')) {
                $table->index(
                    ['user_id', 'status', 'ended_at'],
                    'user_sessions_user_status_ended_idx'
                );
            }
        });
    }

    public function down(): void
    {
        Schema::table('user_sessions', function (Blueprint $table) {
            if (Schema::hasIndex('user_sessions', 'user_sessions_user_status_activity_idx')) {
                $table->dropIndex('user_sessions_user_status_activity_idx');
            }
            if (Schema::hasIndex('user_sessions', 'user_sessions_user_status_ended_idx')) {
                $table->dropIndex('user_sessions_user_status_ended_idx');
            }
        });
    }
};

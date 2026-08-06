<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_sessions', function (Blueprint $table) {
            if (! Schema::hasIndex('user_sessions', 'user_sessions_user_id_ended_at_index')) {
                $table->index(['user_id', 'ended_at']);
            }
        });
    }

    public function down(): void
    {
        Schema::table('user_sessions', function (Blueprint $table) {
            if (Schema::hasIndex('user_sessions', 'user_sessions_user_id_ended_at_index')) {
                $table->dropIndex(['user_id', 'ended_at']);
            }
        });
    }
};

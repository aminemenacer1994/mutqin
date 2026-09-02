<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Expand-only: nullable last_login_at so existing rows stay valid without a backfill.
 * Application code (User::touchLastLogin) writes values after deploy.
 * Index supports admin activity filters before they become hot-path queries.
 *
 * Do not use Schema::hasColumn here to fake idempotency — a failed migration must
 * remain pending so operators can see and fix the real state.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('last_login_at')->nullable()->after('email_verified_at');
            $table->index('last_login_at', 'users_last_login_at_index');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_last_login_at_index');
            $table->dropColumn('last_login_at');
        });
    }
};

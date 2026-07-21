<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Historically this migration dropped and recreated `users` so password
     * could be nullable on SQLite. That breaks on MySQL when other tables
     * (e.g. memorisation_sync_states) already reference users.
     *
     * Password nullability and Google columns are already handled by:
     * - 2026_06_01_094554_add_google_auth_columns_to_users_table
     * - 2026_06_01_102723_make_password_nullable_in_users_table
     */
    public function up(): void
    {
        //
    }

    public function down(): void
    {
        //
    }
};

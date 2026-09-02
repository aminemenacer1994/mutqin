<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Small data migration: grant is_admin to the primary Google admin mailbox.
 * Wrapped in a transaction where the driver supports it.
 *
 * Rollback limit: down() intentionally does not revoke admin — reversing this
 * in production without a verified ops decision would lock out operators.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            DB::table('users')
                ->whereRaw('LOWER(email) = ?', ['menacer72@gmail.com'])
                ->update(['is_admin' => true]);
        });
    }

    public function down(): void
    {
        // Intentionally empty — do not revoke production admin access on rollback.
    }
};

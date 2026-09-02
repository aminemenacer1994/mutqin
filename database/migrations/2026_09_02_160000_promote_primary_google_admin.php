<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Permanently grant the persisted admin role to the primary Google admin mailbox.
     * Effective privilege still also requires verified email + MUTQIN_ADMIN_EMAILS match.
     */
    public function up(): void
    {
        DB::table('users')
            ->whereRaw('LOWER(email) = ?', ['menacer72@gmail.com'])
            ->update(['is_admin' => true]);
    }

    public function down(): void
    {
        // Intentionally empty — do not revoke production admin access on rollback.
    }
};

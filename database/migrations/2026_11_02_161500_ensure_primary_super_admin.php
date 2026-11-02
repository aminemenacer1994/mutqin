<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Idempotent: primary platform super admin (Amine Menacer).
 * Requires users.is_admin, verified email, and MUTQIN_ADMIN_EMAILS allowlist at runtime.
 */
return new class extends Migration
{
    private const PRIMARY_SUPER_ADMIN_EMAIL = 'menacer72@gmail.com';

    public function up(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        $rows = DB::table('users')
            ->whereRaw('LOWER(email) = ?', [self::PRIMARY_SUPER_ADMIN_EMAIL])
            ->get(['id', 'email_verified_at']);

        $now = now();

        foreach ($rows as $row) {
            $updates = ['is_admin' => true];
            if ($row->email_verified_at === null) {
                $updates['email_verified_at'] = $now;
            }

            DB::table('users')->where('id', $row->id)->update($updates);
        }
    }

    public function down(): void
    {
        // Intentionally empty — do not revoke production super admin on rollback.
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_admin')->default(false)->after('email');
        });

        // One-time bootstrap from legacy MUTQIN_ADMIN_EMAILS so existing admins keep access.
        $emails = array_values(array_filter(array_map(
            static fn (string $email): string => strtolower(trim($email)),
            explode(',', (string) env('MUTQIN_ADMIN_EMAILS', ''))
        )));

        if ($emails !== []) {
            DB::table('users')
                ->whereIn(DB::raw('LOWER(email)'), $emails)
                ->update(['is_admin' => true]);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_admin');
        });
    }
};

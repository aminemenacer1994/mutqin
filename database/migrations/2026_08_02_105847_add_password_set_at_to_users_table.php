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
            $table->timestamp('password_set_at')->nullable()->after('password');
        });

        // Email/password accounts already chose a password.
        DB::table('users')
            ->whereNull('google_id')
            ->whereNotNull('password')
            ->update(['password_set_at' => DB::raw('created_at')]);

        // Legacy Google-only accounts received a random unknowable password — clear it.
        DB::table('users')
            ->whereNotNull('google_id')
            ->whereNull('password_set_at')
            ->update(['password' => null]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('password_set_at');
        });
    }
};

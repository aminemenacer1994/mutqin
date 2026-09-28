<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'theme')) {
            return;
        }

        // light-mode was the historical factory default — not an explicit user choice.
        DB::table('users')->where('theme', 'light-mode')->update([
            'theme' => 'dark-mode',
        ]);
    }

    public function down(): void
    {
        // Cannot distinguish migrated rows from users who chose dark after deploy.
    }
};

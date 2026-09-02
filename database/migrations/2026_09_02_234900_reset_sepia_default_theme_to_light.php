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

        DB::table('users')->whereIn('theme', ['sepia', 'sepia-mode'])->update([
            'theme' => 'light-mode',
        ]);
    }

    public function down(): void
    {
        // One-way correction: leftover sepia defaults should not be restored.
    }
};

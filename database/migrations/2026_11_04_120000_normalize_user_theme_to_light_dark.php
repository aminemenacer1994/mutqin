<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'theme')) {
            Schema::table('users', function ($table) {
                $table->string('theme', 10)->nullable()->after('locale');
            });
        }

        DB::table('users')
            ->whereNull('theme')
            ->orWhere('theme', '')
            ->orWhereIn('theme', ['sepia', 'sepia-mode', 'light-mode', 'light'])
            ->update(['theme' => 'light']);

        DB::table('users')
            ->whereIn('theme', ['dark-mode', 'dark'])
            ->update(['theme' => 'dark']);
    }

    public function down(): void
    {
        // Non-destructive: leave normalized light/dark values in place.
    }
};
